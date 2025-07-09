import { getRedisClient } from '../config/redis.js';
import { config } from '../config/environment.js';
import { saveConversation } from '../services/firebaseService.js';
import { BATCH_WRITE_KEYS, buildBatchWriteKey } from '../utils/redisKeys.js';
import logger from '../utils/logger.js';

let isRunning = false;
let intervalId = null;
let lastRunTimestamp = Date.now();
let isShuttingDown = false;

// Initialize the batch write worker
export const initializeBatchWriteWorker = async () => {
  if (!config.batchWrite.enabled) {
    logger.info('Batch write worker is disabled');
    return;
  }

  logger.info('Initializing batch write worker', {
    delaySeconds: config.batchWrite.delaySeconds,
    pollIntervalSeconds: config.batchWrite.pollIntervalSeconds
  });

  // Start the polling interval
  intervalId = setInterval(processWriteQueue, config.batchWrite.pollIntervalSeconds * 1000);

  // Process immediately on startup
  await processWriteQueue();
};

// Main processing function
const processWriteQueue = async () => {
  if (isRunning || isShuttingDown) {
    return;
  }

  isRunning = true;
  lastRunTimestamp = Date.now();

  try {
    const redis = getRedisClient();
    const conversationsProcessed = [];
    
    // Get conversations that are due for writing (score <= current time)
    const now = Date.now();
    const dueConversations = await redis.zRangeByScore(
      BATCH_WRITE_KEYS.WRITE_QUEUE,
      '-inf',
      now
    );
    
    for (const conversationId of dueConversations) {
      try {
        await writeConversationBatch(conversationId);
        conversationsProcessed.push(conversationId);
        
        // Remove from queue after successful processing
        await redis.zRem(BATCH_WRITE_KEYS.WRITE_QUEUE, conversationId);
      } catch (error) {
        logger.error('Error processing conversation batch', { conversationId, error });
        // Leave in queue to retry next time
      }
    }

    if (conversationsProcessed.length > 0) {
      logger.info('Batch write queue processed', {
        conversationsProcessed: conversationsProcessed.length
      });
    }

  } catch (error) {
    logger.error('Error processing write queue', { error });
  } finally {
    isRunning = false;
  }
};

// Write a single conversation batch
const writeConversationBatch = async (conversationId) => {
  const redis = getRedisClient();

  try {
    // Fetch all pending data
    const [messages, metadata] = await Promise.all([
      redis.lRange(buildBatchWriteKey('PENDING_MESSAGES', conversationId), 0, -1),
      redis.hGetAll(buildBatchWriteKey('CONVERSATION_META', conversationId))
    ]);

    if (messages.length === 0) {
      // Clean up empty queue
      await cleanupConversationKeys(conversationId);
      return;
    }

    // Check batch size limit
    let messagesToWrite = messages;
    if (messages.length > config.batchWrite.maxMessagesPerBatch) {
      logger.warn('Batch size exceeded, truncating', {
        conversationId,
        originalSize: messages.length,
        maxSize: config.batchWrite.maxMessagesPerBatch
      });
      messagesToWrite = messages.slice(-config.batchWrite.maxMessagesPerBatch);
    }

    // Parse messages
    const parsedMessages = messagesToWrite.map(msg => JSON.parse(msg));

    // Attempt write with retries
    await retry(
      () => saveConversation(conversationId, metadata.userId, metadata.characterId, parsedMessages),
      { retries: config.batchWrite.retryAttempts }
    );

    // Success - clean up Redis keys
    await cleanupConversationKeys(conversationId);

    logger.info('Batch write successful', {
      conversationId,
      messageCount: parsedMessages.length
    });

  } catch (error) {
    // Failed after retries - move to DLQ
    await handleFailedWrite(conversationId, error);
  }
};

// Clean up Redis keys after successful write
const cleanupConversationKeys = async (conversationId) => {
  const redis = getRedisClient();
  const multi = redis.multi();

  multi.del(buildBatchWriteKey('PENDING_MESSAGES', conversationId));
  multi.del(buildBatchWriteKey('CONVERSATION_META', conversationId));

  await multi.exec();
};

// Handle failed writes
const handleFailedWrite = async (conversationId, error) => {
  const redis = getRedisClient();

  logger.error(`Failed to write batch after ${config.batchWrite.retryAttempts} retries`, {
    conversationId,
    error: error.message
  });

  try {
    // Get the failed data
    const [messages, metadata] = await Promise.all([
      redis.lRange(buildBatchWriteKey('PENDING_MESSAGES', conversationId), 0, -1),
      redis.hGetAll(buildBatchWriteKey('CONVERSATION_META', conversationId))
    ]);

    // Add to DLQ
    await redis.rPush(BATCH_WRITE_KEYS.DLQ, JSON.stringify({
      conversationId,
      messages,
      metadata,
      failedAt: Date.now(),
      error: error.message
    }));

    // Clean up original keys to prevent reprocessing
    await cleanupConversationKeys(conversationId);

  } catch (dlqError) {
    logger.error('Failed to add to DLQ', { conversationId, error: dlqError });
  }
};

// Simple retry helper
const retry = async (fn, options = {}) => {
  const { retries = 3 } = options;
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError;
};

// Graceful shutdown
export const shutdownBatchWriteWorker = async () => {
  if (!config.batchWrite.enabled) {
    return;
  }

  logger.info('Shutting down batch write worker...');
  isShuttingDown = true;

  // Stop the interval
  if (intervalId) {
    clearInterval(intervalId);
  }

  // Process queue one last time
  await processWriteQueue();

  logger.info('Batch write worker shut down');
};

// Health check
export const getBatchWriteHealth = async () => {
  const redis = getRedisClient();
  const dlqSize = await redis.lLen(BATCH_WRITE_KEYS.DLQ);
  const timeSinceLastRun = Date.now() - lastRunTimestamp;

  return {
    status: timeSinceLastRun < (config.batchWrite.pollIntervalSeconds * 2 * 1000) ? 'healthy' : 'degraded',
    lastRun: lastRunTimestamp,
    dlqSize,
    isRunning,
    config: {
      enabled: config.batchWrite.enabled,
      delaySeconds: config.batchWrite.delaySeconds,
      pollIntervalSeconds: config.batchWrite.pollIntervalSeconds
    }
  };
};

export default {
  initializeBatchWriteWorker,
  shutdownBatchWriteWorker,
  getBatchWriteHealth
};