/**
 * Centralized Redis key definitions
 * Prevents typos and makes keys easy to maintain
 */
import { config } from '../config/environment.js';

// Existing keys (from cacheService)
export const CACHE_KEYS = {
  CHARACTER: 'character',
  MESSAGES: 'messages',
  CONVERSATION: 'conversation'
};

// Batch write keys
export const BATCH_WRITE_KEYS = {
  PENDING_MESSAGES: 'pending_messages',
  CONVERSATION_META: 'conversation_meta',
  WRITE_TIMER: 'write_timer',
  WRITE_QUEUE: 'write_queue', // Sorted set for tracking conversations to write
  DLQ: 'dlq:failed_writes'
};

// Key builder functions
export const buildKey = (prefix, ...parts) => {
  return `${prefix}:${parts.join(':')}`;
};

export const buildBatchWriteKey = (type, conversationId) => {
  return buildKey(BATCH_WRITE_KEYS[type], conversationId);
};

export const buildCacheKey = (type, ...identifiers) => {
  return buildKey(config.redis.keyPrefix, type, ...identifiers);
};