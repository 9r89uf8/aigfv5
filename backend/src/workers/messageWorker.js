import { Worker } from 'bullmq';
import { initializeRedis, getRedisClient } from '../config/redis.js';
import { getCharacterById } from '../services/characterService.js';
import { generateResponse } from '../services/deepseekService.js';
import { pushMessage } from '../services/cacheService.js';
import { saveConversation, getMessages } from '../services/firebaseService.js';
import logger from '../utils/logger.js';
import { BATCH_WRITE_KEYS, buildBatchWriteKey } from '../utils/redisKeys.js';
import { config } from '../config/environment.js';

let messageWorker = null;

export const initializeWorker = async (io) => {
  if (messageWorker) {
    logger.warn('Message worker already initialized');
    return messageWorker;
  }

  try {
    await initializeRedis();
    
    // BullMQ needs a different connection format
    const redisConnection = {
      host: 'redis-12036.c270.us-east-1-3.ec2.redns.redis-cloud.com',
      port: 12036,
      username: 'default',
      password: 'zj0MCyaQpzN8X9JF5icXDzUEsHiij6zr'
    };

    messageWorker = new Worker('message-processing', async (job) => {
      return await processMessage(job.data, io);
    }, {
      connection: redisConnection,
      concurrency: 5,
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    messageWorker.on('completed', (job) => {
      logger.info('Message job completed', { jobId: job.id });
    });

    messageWorker.on('failed', (job, err) => {
      logger.error('Message job failed', { jobId: job.id, error: err.message });
    });

    messageWorker.on('error', (error) => {
      logger.error('Message worker error:', error);
    });

    logger.info('Message worker initialized successfully');
    return messageWorker;
  } catch (error) {
    logger.error('Failed to initialize message worker:', error);
    throw error;
  }
};

export const processMessage = async (data, io) => {
  const { conversationId, characterId, userMessage, userId } = data;
  
  try {
    logger.info('Processing message job', { conversationId, characterId, userId });

    // 1. Get character data (Redis-first with Firebase fallback)
    logger.debug('Fetching character data', { characterId });
    const character = await getCharacterById(characterId);
    if (!character) {
      throw new Error(`Character not found: ${characterId}`);
    }

    // 2. Get conversation history (Redis-first with Firebase fallback)
    logger.debug('Fetching conversation history', { conversationId, limit: 20 });
    const conversationHistory = await getMessages(conversationId, 20);
    logger.debug('Conversation history retrieved', { 
      conversationId, 
      messageCount: conversationHistory.length,
      source: conversationHistory.length > 0 ? 'cache or firebase' : 'none'
    });

    // 3. Log data sources for DeepSeek API call
    logger.info('DeepSeek API call data sources', {
      conversationId,
      characterId,
      dataSources: {
        character: {
          id: character.id,
          name: character.name,
          hasDescription: !!character.description,
          hasPersonality: !!character.personality,
          hasTraits: !!(character.traits && character.traits.length > 0),
          source: 'Redis-first (character cache)'
        },
        conversationHistory: {
          messageCount: conversationHistory.length,
          source: 'Redis-first (message cache with Firebase fallback)'
        },
        userMessage: {
          content: userMessage.content,
          type: userMessage.type,
          source: 'Current request'
        }
      }
    });

    // 4. Emit typing indicator for AI
    if (io) {
      io.to(`conversation:${conversationId}`).emit('typing:start', {
        userId: characterId,
        isAI: true,
        conversationId,
        timestamp: Date.now()
      });
    }
    
    // 5. Generate AI response
    const aiResponse = await generateResponse({
      character,
      conversationHistory,
      userMessage: userMessage.content
    });

    // 6. Create AI message object
    const timestamp = Date.now();
    const messageId = `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const aiMessage = {
      id: messageId,
      sender: 'character',
      type: 'text',
      content: aiResponse,
      timestamp,
      conversationId,
      characterId
    };

    // 7. Save AI message to cache
    await pushMessage(conversationId, aiMessage);

    // 8. Stop typing indicator and emit AI message to conversation room
    if (io) {
      // Stop typing indicator
      io.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId: characterId,
        isAI: true,
        conversationId,
        timestamp: Date.now()
      });
      
      // Emit the AI message
      io.to(`conversation:${conversationId}`).emit('message:receive', {
        message: aiMessage,
        conversationId
      });
    }

    // 9. Queue messages for delayed batch write
    if (config.batchWrite.enabled) {
      await queueMessagesForBatchWrite(conversationId, userId, characterId, [userMessage, aiMessage]);
    } else {
      // Fallback to immediate write if batch writing is disabled
      saveConversation(conversationId, userId, characterId, [userMessage, aiMessage])
        .catch(error => {
          logger.error('Error saving conversation to Firebase:', error);
        });
    }

    logger.info('Message processed successfully', { 
      conversationId, 
      characterId, 
      messageId: aiMessage.id 
    });

    return { success: true, messageId: aiMessage.id };
  } catch (error) {
    logger.error('Error processing message:', error);
    
    // Send error message to user
    if (io) {
      const errorMessage = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender: 'system',
        type: 'error',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: Date.now(),
        conversationId
      };

      io.to(`conversation:${conversationId}`).emit('message:receive', {
        message: errorMessage,
        conversationId
      });
    }

    throw error;
  }
};

const queueMessagesForBatchWrite = async (conversationId, userId, characterId, messages) => {
  const redis = getRedisClient();
  const multi = redis.multi();
  
  try {
    // 1. Add messages to pending queue
    for (const message of messages) {
      multi.rPush(
        buildBatchWriteKey('PENDING_MESSAGES', conversationId),
        JSON.stringify(message)
      );
    }
    
    // 2. Store conversation metadata (using hSet for multiple fields)
    multi.hSet(
      buildBatchWriteKey('CONVERSATION_META', conversationId),
      {
        userId,
        characterId,
        createdAt: Date.now().toString()
      }
    );
    
    // 3. Add to write queue with timestamp when it should be written
    const writeTime = Date.now() + (config.batchWrite.delaySeconds * 1000);
    multi.zAdd(BATCH_WRITE_KEYS.WRITE_QUEUE, {
      score: writeTime,
      value: conversationId
    });
    
    await multi.exec();
    
    logger.info('Messages queued for batch write', {
      conversationId,
      messageCount: messages.length,
      delaySeconds: config.batchWrite.delaySeconds
    });
  } catch (error) {
    logger.error('Error queuing messages for batch write', { conversationId, error });
    // Fallback to immediate write on queue failure
    await saveConversation(conversationId, userId, characterId, messages);
  }
};

export const shutdownWorker = async (worker) => {
  if (worker) {
    try {
      await worker.close();
      logger.info('Message worker shut down successfully');
    } catch (error) {
      logger.error('Error shutting down message worker:', error);
      throw error;
    }
  }
};

export const getWorker = () => {
  return messageWorker;
};