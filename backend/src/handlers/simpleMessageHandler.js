/**
 * Simple Message Handler
 * Async message processing with BullMQ queue
 */
import { getMessages } from '../services/firebaseService.js';
import { pushMessage } from '../services/cacheService.js';
import { addMessageJob } from '../queues/messageQueue.js';
import logger from '../utils/logger.js';

/**
 * Register simple message handlers on socket
 * @param {Socket} socket - Socket.io socket instance
 * @param {Object} io - Socket.io server instance
 */
export const registerMessageHandlers = (socket, io) => {
  
  /**
   * Handle sending a message - async queue flow
   */
  socket.on('message:send', async (data, callback) => {
    try {
      const { characterId, content, type = 'text' } = data;
      const userId = socket.userId;
      
      if (!characterId || !content) {
        return callback({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }
      
      logger.info('Processing message', { userId, characterId, type });
      
      // 1. Construct conversationId directly (no DB read needed)
      // The worker will handle creating the conversation if it doesn't exist
      const conversationId = `${userId}_${characterId}`;
      
      // 2. Create user message object
      const timestamp = Date.now();
      const messageId = `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const userMessage = {
        id: messageId,
        sender: 'user',
        type,
        content,
        timestamp,
        conversationId
      };
      
      // 3. Save user message to Redis list immediately
      logger.debug('Saving user message to cache', { conversationId, messageId: userMessage.id });
      await pushMessage(conversationId, userMessage);
      logger.debug('User message saved to cache', { conversationId, messageId: userMessage.id });
      
      // 4. Emit user message to conversation room (excluding sender)
      socket.to(`conversation:${conversationId}`).emit('message:receive', {
        message: userMessage,
        conversationId
      });
      
      // 5. Return success immediately
      callback({ 
        success: true, 
        message: userMessage,
        conversationId 
      });
      
      // 6. Queue AI response job (don't wait for completion)
      logger.debug('Queueing AI response job', { conversationId, characterId, userId });
      addMessageJob({
        conversationId,
        characterId,
        userMessage,
        userId
      }).then(job => {
        logger.debug('AI response job queued successfully', { conversationId, jobId: job.id });
      }).catch(error => {
        logger.error('Failed to queue AI response job:', error);
      });
      
    } catch (error) {
      logger.error('Error processing message:', error);
      
      // Return error to user
      callback({ 
        success: false, 
        error: 'Failed to process message' 
      });
    }
  });
  
  /**
   * Handle joining a conversation room
   */
  socket.on('conversation:join', async (data, callback) => {
    try {
      const { conversationId } = data;
      const userId = socket.userId;
      
      if (!conversationId) {
        return callback({ 
          success: false, 
          error: 'Conversation ID required' 
        });
      }
      
      // Extract characterId from conversationId (format: userId_characterId)
      const parts = conversationId.split('_');
      const characterId = parts[parts.length - 1];

      // Join the conversation room
      socket.join(`conversation:${conversationId}`);
      
      // Get messages - no need to fetch conversation data
      // The conversation will be created when the first message is sent
      const messages = await getMessages(conversationId, 50);
      
      callback({ 
        success: true, 
        conversationId,
        messages 
      });

      
    } catch (error) {
      logger.error('Error joining conversation:', error);
      callback({ 
        success: false, 
        error: 'Failed to join conversation' 
      });
    }
  });
  
  /**
   * Handle leaving a conversation room
   */
  socket.on('conversation:leave', (data) => {
    try {
      const { conversationId } = data;
      
      socket.leave(`conversation:${conversationId}`);
      
    } catch (error) {
      logger.error('Error leaving conversation:', error);
    }
  });
  
  /**
   * Handle typing indicators
   */
  socket.on('typing:start', (data) => {
    try {
      const { conversationId } = data;
      const userId = socket.userId;
      
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId,
        conversationId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      logger.error('Error handling typing start:', error);
    }
  });
  
  socket.on('typing:stop', (data) => {
    try {
      const { conversationId } = data;
      const userId = socket.userId;
      
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      logger.error('Error handling typing stop:', error);
    }
  });
};

export default {
  registerMessageHandlers
};