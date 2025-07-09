import { initializeRedis, getRedisClient } from '../config/redis.js';
import { config } from '../config/environment.js';
import logger from '../utils/logger.js';

export const initializeCacheService = async () => {
  try {
    await initializeRedis();
    logger.info('Cache service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cache service:', error);
    throw error;
  }
};

export const buildCacheKey = (type, ...identifiers) => {
  return `${config.redis.keyPrefix}:${type}:${identifiers.join(':')}`;
};

export const getCacheValue = async (key) => {
  try {
    const redis = getRedisClient();
    const value = await redis.get(key);
    
    if (value) {
      return JSON.parse(value);
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting cache value:', error);
    return null;
  }
};

export const setCacheValue = async (key, value, ttl = config.redis.ttl.default) => {
  try {
    const redis = getRedisClient();
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await redis.setEx(key, ttl, serializedValue);
    } else {
      await redis.set(key, serializedValue);
    }
    
    logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error('Error setting cache value:', error);
  }
};

export const deleteCacheValue = async (key) => {
  try {
    const redis = getRedisClient();
    await redis.del(key);
    logger.debug(`Cache deleted: ${key}`);
  } catch (error) {
    logger.error('Error deleting cache value:', error);
  }
};

export const pushMessage = async (conversationId, message) => {
  try {
    const redis = getRedisClient();
    const key = buildCacheKey('messages', conversationId);
    
    await redis.lPush(key, JSON.stringify(message));
    
    await redis.expire(key, config.redis.ttl.messages);
    
    logger.debug(`Message pushed to cache: ${conversationId}`);
  } catch (error) {
    logger.error('Error pushing message to cache:', error);
    throw error;
  }
};

export const getMessages = async (conversationId, limit = 50) => {
  try {
    const redis = getRedisClient();
    const key = buildCacheKey('messages', conversationId);
    
    const messages = await redis.lRange(key, 0, limit - 1);
    
    return messages.map(msg => JSON.parse(msg)).reverse();
  } catch (error) {
    logger.error('Error getting messages from cache:', error);
    return [];
  }
};

export const getMessageList = getMessages;

export const clearMessages = async (conversationId) => {
  try {
    const redis = getRedisClient();
    const key = buildCacheKey('messages', conversationId);
    
    await redis.del(key);
    logger.debug(`Messages cleared for conversation: ${conversationId}`);
  } catch (error) {
    logger.error('Error clearing messages from cache:', error);
  }
};

export const getConversationKeys = async (userId) => {
  try {
    const redis = getRedisClient();
    const pattern = buildCacheKey('messages', `${userId}_*`);
    
    const keys = await redis.keys(pattern);
    return keys.map(key => key.split(':').pop());
  } catch (error) {
    logger.error('Error getting conversation keys:', error);
    return [];
  }
};

export default {
  initializeCacheService,
  buildCacheKey,
  getCacheValue,
  setCacheValue,
  deleteCacheValue,
  pushMessage,
  getMessages,
  getMessageList,
  clearMessages,
  getConversationKeys
};