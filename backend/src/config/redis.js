import { createClient } from 'redis';
import { config } from './environment.js';
import logger from '../utils/logger.js';

let redisClient = null;

export const initializeRedis = async () => {
  if (redisClient) {
    logger.warn('Redis already initialized');
    return redisClient;
  }

  try {
    redisClient = createClient({
      username: 'default',
      password: 'zj0MCyaQpzN8X9JF5icXDzUEsHiij6zr',
      socket: {
        host: 'redis-12036.c270.us-east-1-3.ec2.redns.redis-cloud.com',
        port: 12036
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    await redisClient.connect();
    
    logger.info('Redis client initialized successfully');
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

export const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
      throw error;
    }
  }
};

export const isRedisConnected = () => {
  return redisClient && redisClient.isOpen;
};