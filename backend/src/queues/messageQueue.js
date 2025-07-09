import { Queue } from 'bullmq';
import { initializeRedis, getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

let messageQueue = null;

export const initializeMessageQueue = async () => {
  if (messageQueue) {
    logger.warn('Message queue already initialized');
    return messageQueue;
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

    messageQueue = new Queue('message-processing', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    messageQueue.on('error', (error) => {
      logger.error('Message queue error:', error);
    });

    // Add connection event listeners
    messageQueue.on('waiting', (job) => {
      logger.debug('Job waiting in queue', { jobId: job.id, name: job.name });
    });

    messageQueue.on('active', (job) => {
      logger.debug('Job started processing', { jobId: job.id, name: job.name });
    });

    messageQueue.on('completed', (job) => {
      logger.debug('Job completed', { jobId: job.id, name: job.name });
    });

    messageQueue.on('failed', (job, err) => {
      logger.error('Job failed', { jobId: job.id, name: job.name, error: err.message });
    });

    logger.info('Message queue initialized successfully');
    return messageQueue;
  } catch (error) {
    logger.error('Failed to initialize message queue:', error);
    throw error;
  }
};

export const getMessageQueue = () => {
  if (!messageQueue) {
    throw new Error('Message queue not initialized. Call initializeMessageQueue() first.');
  }
  return messageQueue;
};

export const addMessageJob = async (data) => {
  try {
    const queue = getMessageQueue();
    
    const job = await queue.add('process-message', data, {
      priority: 1,
      delay: 0,
    });

    logger.info('Message job added to queue', { 
      jobId: job.id, 
      conversationId: data.conversationId 
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add message job:', error);
    throw error;
  }
};

export const getQueueStats = async () => {
  try {
    const queue = getMessageQueue();
    
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    throw error;
  }
};

export const closeQueue = async () => {
  if (messageQueue) {
    try {
      await messageQueue.close();
      messageQueue = null;
      logger.info('Message queue closed');
    } catch (error) {
      logger.error('Error closing message queue:', error);
      throw error;
    }
  }
};