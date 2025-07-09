# Delayed Batch Firebase Writes Implementation Plan

## Overview
This document outlines the implementation plan for reducing Firebase write operations from 3 writes per message interaction to 1 write by implementing a delayed batch writing system. Messages are cached in Redis and batch-written to Firebase after a 2-minute delay.

## Goals
- Reduce Firebase write operations by up to 80% in active conversations
- Maintain real-time user experience through Redis caching
- Implement reliable eventual consistency with Firebase
- Provide graceful degradation and error handling

## Architecture Summary
- **Current**: User Message → AI Response → Immediate Firebase Write (3 writes)
- **New**: User Message → AI Response → Redis Cache → Delayed Batch Write (1 write after 2 minutes)

---

## Phase 1: Foundation Setup (Configuration & Redis Keys)                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │ 1.1 Update Environment Configuration                                                                                                                   │ │
│ │                                                                                                                                                        │ │
│ │ File: backend/src/config/environment.js                                                                                                                │ │
│ │ // Add new configuration section                                                                                                                       │ │
│ │ batchWrite: {                                                                                                                                          │ │
│ │   enabled: process.env.BATCH_WRITE_ENABLED === 'true' || true,                                                                                         │ │
│ │   delaySeconds: parseInt(process.env.BATCH_WRITE_DELAY || '120'), // 2 minutes                                                                         │ │
│ │   pollIntervalSeconds: parseInt(process.env.BATCH_WRITE_POLL_INTERVAL || '30'),                                                                        │ │
│ │   maxMessagesPerBatch: parseInt(process.env.BATCH_WRITE_MAX_MESSAGES || '500'),                                                                        │ │
│ │   retryAttempts: parseInt(process.env.BATCH_WRITE_RETRY_ATTEMPTS || '3'),                                                                              │ │
│ │   dlqKey: 'dlq:failed_writes'                                                                                                                          │ │
│ │ }                                                                                                                                                      │ │
│ │                                                                                                                                                        │ │
│ │ 1.2 Create Centralized Redis Keys File                                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │ New file: backend/src/utils/redisKeys.js                                                                                                               │ │
│ │ /**                                                                                                                                                    │ │
│ │  * Centralized Redis key definitions                                                                                                                   │ │
│ │  * Prevents typos and makes keys easy to maintain                                                                                                      │ │
│ │  */                                                                                                                                                    │ │
│ │                                                                                                                                                        │ │
│ │ // Existing keys (from cacheService)                                                                                                                   │ │
│ │ export const CACHE_KEYS = {                                                                                                                            │ │
│ │   CHARACTER: 'character',                                                                                                                              │ │
│ │   MESSAGES: 'messages',                                                                                                                                │ │
│ │   CONVERSATION: 'conversation'                                                                                                                         │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Batch write keys                                                                                                                                    │ │
│ │ export const BATCH_WRITE_KEYS = {                                                                                                                      │ │
│ │   PENDING_MESSAGES: 'pending_messages',                                                                                                                │ │
│ │   CONVERSATION_META: 'conversation_meta',                                                                                                              │ │
│ │   WRITE_TIMER: 'write_timer',                                                                                                                          │ │
│ │   DLQ: 'dlq:failed_writes'                                                                                                                             │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Key builder functions                                                                                                                               │ │
│ │ export const buildKey = (prefix, ...parts) => {                                                                                                        │ │
│ │   return `${prefix}:${parts.join(':')}`;                                                                                                               │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ export const buildBatchWriteKey = (type, conversationId) => {                                                                                          │ │
│ │   return buildKey(BATCH_WRITE_KEYS[type], conversationId);                                                                                             │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ export const buildCacheKey = (type, ...identifiers) => {                                                                                               │ │
│ │   return buildKey(config.redis.keyPrefix, type, ...identifiers);                                                                                       │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ Phase 2: Modify Message Worker                                                                                                                         │ │
│ │                                                                                                                                                        │ │
│ │ 2.1 Update Imports and Remove Immediate Firebase Write                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │ File: backend/src/workers/messageWorker.js                                                                                                             │ │
│ │                                                                                                                                                        │ │
│ │ Add imports:                                                                                                                                           │ │
│ │ import { BATCH_WRITE_KEYS, buildBatchWriteKey } from '../utils/redisKeys.js';                                                                          │ │
│ │                                                                                                                                                        │ │
│ │ Remove:                                                                                                                                                │ │
│ │ // 8. Save conversation to Firebase (async, optimized single write)                                                                                    │ │
│ │ saveConversation(conversationId, userId, characterId, [userMessage, aiMessage])                                                                        │ │
│ │   .catch(error => {                                                                                                                                    │ │
│ │     logger.error('Error saving conversation to Firebase (optimized):', error);                                                                         │ │
│ │   });                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │ Replace with:                                                                                                                                          │ │
│ │ // 8. Queue messages for delayed batch write                                                                                                           │ │
│ │ if (config.batchWrite.enabled) {                                                                                                                       │ │
│ │   await queueMessagesForBatchWrite(conversationId, userId, characterId, [userMessage, aiMessage]);                                                     │ │
│ │ } else {                                                                                                                                               │ │
│ │   // Fallback to immediate write if batch writing is disabled                                                                                          │ │
│ │   saveConversation(conversationId, userId, characterId, [userMessage, aiMessage])                                                                      │ │
│ │     .catch(error => {                                                                                                                                  │ │
│ │       logger.error('Error saving conversation to Firebase:', error);                                                                                   │ │
│ │     });                                                                                                                                                │ │
│ │ }                                                                                                                                                      │ │
│ │                                                                                                                                                        │ │
│ │ 2.2 Add Queue Function                                                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │ Add to: backend/src/workers/messageWorker.js                                                                                                           │ │
│ │ const queueMessagesForBatchWrite = async (conversationId, userId, characterId, messages) => {                                                          │ │
│ │   const redis = getRedisClient();                                                                                                                      │ │
│ │   const pipeline = redis.pipeline();                                                                                                                   │ │
│ │                                                                                                                                                        │ │
│ │   try {                                                                                                                                                │ │
│ │     // 1. Add messages to pending queue                                                                                                                │ │
│ │     for (const message of messages) {                                                                                                                  │ │
│ │       pipeline.rPush(                                                                                                                                  │ │
│ │         buildBatchWriteKey('PENDING_MESSAGES', conversationId),                                                                                        │ │
│ │         JSON.stringify(message)                                                                                                                        │ │
│ │       );                                                                                                                                               │ │
│ │     }                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │     // 2. Store conversation metadata (using hSet for multiple fields)                                                                                 │ │
│ │     pipeline.hSet(                                                                                                                                     │ │
│ │       buildBatchWriteKey('CONVERSATION_META', conversationId),                                                                                         │ │
│ │       {                                                                                                                                                │ │
│ │         userId,                                                                                                                                        │ │
│ │         characterId,                                                                                                                                   │ │
│ │         createdAt: Date.now().toString()                                                                                                               │ │
│ │       }                                                                                                                                                │ │
│ │     );                                                                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │     // 3. Set/reset the write timer                                                                                                                    │ │
│ │     pipeline.setEx(                                                                                                                                    │ │
│ │       buildBatchWriteKey('WRITE_TIMER', conversationId),                                                                                               │ │
│ │       config.batchWrite.delaySeconds,                                                                                                                  │ │
│ │       '1'                                                                                                                                              │ │
│ │     );                                                                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │     await pipeline.exec();                                                                                                                             │ │
│ │                                                                                                                                                        │ │
│ │     logger.info('Messages queued for batch write', {                                                                                                   │ │
│ │       conversationId,                                                                                                                                  │ │
│ │       messageCount: messages.length,                                                                                                                   │ │
│ │       delaySeconds: config.batchWrite.delaySeconds                                                                                                     │ │
│ │     });                                                                                                                                                │ │
│ │   } catch (error) {                                                                                                                                    │ │
│ │     logger.error('Error queuing messages for batch write', { conversationId, error });                                                                 │ │
│ │     // Fallback to immediate write on queue failure                                                                                                    │ │
│ │     await saveConversation(conversationId, userId, characterId, messages);                                                                             │ │
│ │   }                                                                                                                                                    │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ Phase 3: Create Batch Write Worker                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ 3.1 Create Main Worker File                                                                                                                            │ │
│ │                                                                                                                                                        │ │
│ │ New file: backend/src/workers/batchWriteWorker.js                                                                                                      │ │
│ │                                                                                                                                                        │ │
│ │ import { getRedisClient } from '../config/redis.js';                                                                                                   │ │
│ │ import { config } from '../config/environment.js';                                                                                                     │ │
│ │ import { saveConversation } from '../services/firebaseService.js';                                                                                     │ │
│ │ import { BATCH_WRITE_KEYS, buildBatchWriteKey } from '../utils/redisKeys.js';                                                                          │ │
│ │ import logger from '../utils/logger.js';                                                                                                               │ │
│ │                                                                                                                                                        │ │
│ │ let isRunning = false;                                                                                                                                 │ │
│ │ let intervalId = null;                                                                                                                                 │ │
│ │ let lastRunTimestamp = Date.now();                                                                                                                     │ │
│ │ let isShuttingDown = false;                                                                                                                            │ │
│ │                                                                                                                                                        │ │
│ │ // Initialize the batch write worker                                                                                                                   │ │
│ │ export const initializeBatchWriteWorker = async () => {                                                                                                │ │
│ │   if (!config.batchWrite.enabled) {                                                                                                                    │ │
│ │     logger.info('Batch write worker is disabled');                                                                                                     │ │
│ │     return;                                                                                                                                            │ │
│ │   }                                                                                                                                                    │ │
│ │                                                                                                                                                        │ │
│ │   logger.info('Initializing batch write worker', {                                                                                                     │ │
│ │     delaySeconds: config.batchWrite.delaySeconds,                                                                                                      │ │
│ │     pollIntervalSeconds: config.batchWrite.pollIntervalSeconds                                                                                         │ │
│ │   });                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │   // Start the polling interval                                                                                                                        │ │
│ │   intervalId = setInterval(processWriteQueue, config.batchWrite.pollIntervalSeconds * 1000);                                                           │ │
│ │                                                                                                                                                        │ │
│ │   // Process immediately on startup                                                                                                                    │ │
│ │   await processWriteQueue();                                                                                                                           │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Main processing function                                                                                                                            │ │
│ │ const processWriteQueue = async () => {                                                                                                                │ │
│ │   if (isRunning || isShuttingDown) {                                                                                                                   │ │
│ │     return;                                                                                                                                            │ │
│ │   }                                                                                                                                                    │ │
│ │                                                                                                                                                        │ │
│ │   isRunning = true;                                                                                                                                    │ │
│ │   lastRunTimestamp = Date.now();                                                                                                                       │ │
│ │                                                                                                                                                        │ │
│ │   try {                                                                                                                                                │ │
│ │     const redis = getRedisClient();                                                                                                                    │ │
│ │     const conversationsProcessed = [];                                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │     // Use SCAN to find expired timers                                                                                                                 │ │
│ │     const stream = redis.scanStream({                                                                                                                  │ │
│ │       match: `${BATCH_WRITE_KEYS.WRITE_TIMER}:*`,                                                                                                      │ │
│ │       count: 100                                                                                                                                       │ │
│ │     });                                                                                                                                                │ │
│ │                                                                                                                                                        │ │
│ │     for await (const keys of stream) {                                                                                                                 │ │
│ │       for (const key of keys) {                                                                                                                        │ │
│ │         const conversationId = key.split(':').pop();                                                                                                   │ │
│ │         const ttl = await redis.ttl(key);                                                                                                              │ │
│ │                                                                                                                                                        │ │
│ │         // Process if timer expired or about to expire                                                                                                 │ │
│ │         if (ttl < 0) {                                                                                                                                 │ │
│ │           await writeConversationBatch(conversationId);                                                                                                │ │
│ │           conversationsProcessed.push(conversationId);                                                                                                 │ │
│ │         }                                                                                                                                              │ │
│ │       }                                                                                                                                                │ │
│ │     }                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │     if (conversationsProcessed.length > 0) {                                                                                                           │ │
│ │       logger.info('Batch write queue processed', {                                                                                                     │ │
│ │         conversationsProcessed: conversationsProcessed.length                                                                                          │ │
│ │       });                                                                                                                                              │ │
│ │     }                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │   } catch (error) {                                                                                                                                    │ │
│ │     logger.error('Error processing write queue', { error });                                                                                           │ │
│ │   } finally {                                                                                                                                          │ │
│ │     isRunning = false;                                                                                                                                 │ │
│ │   }                                                                                                                                                    │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Write a single conversation batch                                                                                                                   │ │
│ │ const writeConversationBatch = async (conversationId) => {                                                                                             │ │
│ │   const redis = getRedisClient();                                                                                                                      │ │
│ │                                                                                                                                                        │ │
│ │   try {                                                                                                                                                │ │
│ │     // Fetch all pending data                                                                                                                          │ │
│ │     const [messages, metadata] = await Promise.all([                                                                                                   │ │
│ │       redis.lRange(buildBatchWriteKey('PENDING_MESSAGES', conversationId), 0, -1),                                                                     │ │
│ │       redis.hGetAll(buildBatchWriteKey('CONVERSATION_META', conversationId))                                                                           │ │
│ │     ]);                                                                                                                                                │ │
│ │                                                                                                                                                        │ │
│ │     if (messages.length === 0) {                                                                                                                       │ │
│ │       // Clean up empty queue                                                                                                                          │ │
│ │       await cleanupConversationKeys(conversationId);                                                                                                   │ │
│ │       return;                                                                                                                                          │ │
│ │     }                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │     // Check batch size limit                                                                                                                          │ │
│ │     let messagesToWrite = messages;                                                                                                                    │ │
│ │     if (messages.length > config.batchWrite.maxMessagesPerBatch) {                                                                                     │ │
│ │       logger.warn('Batch size exceeded, truncating', {                                                                                                 │ │
│ │         conversationId,                                                                                                                                │ │
│ │         originalSize: messages.length,                                                                                                                 │ │
│ │         maxSize: config.batchWrite.maxMessagesPerBatch                                                                                                 │ │
│ │       });                                                                                                                                              │ │
│ │       messagesToWrite = messages.slice(-config.batchWrite.maxMessagesPerBatch);                                                                        │ │
│ │     }                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │     // Parse messages                                                                                                                                  │ │
│ │     const parsedMessages = messagesToWrite.map(msg => JSON.parse(msg));                                                                                │ │
│ │                                                                                                                                                        │ │
│ │     // Attempt write with retries                                                                                                                      │ │
│ │     await retry(                                                                                                                                       │ │
│ │       () => saveConversation(conversationId, metadata.userId, metadata.characterId, parsedMessages),                                                   │ │
│ │       { retries: config.batchWrite.retryAttempts }                                                                                                     │ │
│ │     );                                                                                                                                                 │ │
│ │                                                                                                                                                        │ │
│ │     // Success - clean up Redis keys                                                                                                                   │ │
│ │     await cleanupConversationKeys(conversationId);                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │     logger.info('Batch write successful', {                                                                                                            │ │
│ │       conversationId,                                                                                                                                  │ │
│ │       messageCount: parsedMessages.length                                                                                                              │ │
│ │     });                                                                                                                                                │ │
│ │                                                                                                                                                        │ │
│ │   } catch (error) {                                                                                                                                    │ │
│ │     // Failed after retries - move to DLQ                                                                                                              │ │
│ │     await handleFailedWrite(conversationId, error);                                                                                                    │ │
│ │   }                                                                                                                                                    │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Clean up Redis keys after successful write                                                                                                          │ │
│ │ const cleanupConversationKeys = async (conversationId) => {                                                                                            │ │
│ │   const redis = getRedisClient();                                                                                                                      │ │
│ │   const pipeline = redis.pipeline();                                                                                                                   │ │
│ │                                                                                                                                                        │ │
│ │   pipeline.del(buildBatchWriteKey('PENDING_MESSAGES', conversationId));                                                                                │ │
│ │   pipeline.del(buildBatchWriteKey('CONVERSATION_META', conversationId));                                                                               │ │
│ │   pipeline.del(buildBatchWriteKey('WRITE_TIMER', conversationId));                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │   await pipeline.exec();                                                                                                                               │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Handle failed writes                                                                                                                                │ │
│ │ const handleFailedWrite = async (conversationId, error) => {                                                                                           │ │
│ │   const redis = getRedisClient();                                                                                                                      │ │
│ │                                                                                                                                                        │ │
│ │   logger.error(`Failed to write batch after ${config.batchWrite.retryAttempts} retries`, {                                                             │ │
│ │     conversationId,                                                                                                                                    │ │
│ │     error: error.message                                                                                                                               │ │
│ │   });                                                                                                                                                  │ │
│ │                                                                                                                                                        │ │
│ │   try {                                                                                                                                                │ │
│ │     // Get the failed data                                                                                                                             │ │
│ │     const [messages, metadata] = await Promise.all([                                                                                                   │ │
│ │       redis.lRange(buildBatchWriteKey('PENDING_MESSAGES', conversationId), 0, -1),                                                                     │ │
│ │       redis.hGetAll(buildBatchWriteKey('CONVERSATION_META', conversationId))                                                                           │ │
│ │     ]);                                                                                                                                                │ │
│ │                                                                                                                                                        │ │
│ │     // Add to DLQ                                                                                                                                      │ │
│ │     await redis.rPush(BATCH_WRITE_KEYS.DLQ, JSON.stringify({                                                                                           │ │
│ │       conversationId,                                                                                                                                  │ │
│ │       messages,                                                                                                                                        │ │
│ │       metadata,                                                                                                                                        │ │
│ │       failedAt: Date.now(),                                                                                                                            │ │
│ │       error: error.message                                                                                                                             │ │
│ │     }));                                                                                                                                               │ │
│ │                                                                                                                                                        │ │
│ │     // Clean up original keys to prevent reprocessing                                                                                                  │ │
│ │     await cleanupConversationKeys(conversationId);                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │   } catch (dlqError) {                                                                                                                                 │ │
│ │     logger.error('Failed to add to DLQ', { conversationId, error: dlqError });                                                                         │ │
│ │   }                                                                                                                                                    │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Simple retry helper                                                                                                                                 │ │
│ │ const retry = async (fn, options = {}) => {                                                                                                            │ │
│ │   const { retries = 3 } = options;                                                                                                                     │ │
│ │   let lastError;                                                                                                                                       │ │
│ │                                                                                                                                                        │ │
│ │   for (let i = 0; i <= retries; i++) {                                                                                                                 │ │
│ │     try {                                                                                                                                              │ │
│ │       return await fn();                                                                                                                               │ │
│ │     } catch (error) {                                                                                                                                  │ │
│ │       lastError = error;                                                                                                                               │ │
│ │       if (i < retries) {                                                                                                                               │ │
│ │         // Exponential backoff                                                                                                                         │ │
│ │         await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));                                                                      │ │
│ │       }                                                                                                                                                │ │
│ │     }                                                                                                                                                  │ │
│ │   }                                                                                                                                                    │ │
│ │                                                                                                                                                        │ │
│ │   throw lastError;                                                                                                                                     │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Graceful shutdown                                                                                                                                   │ │
│ │ export const shutdownBatchWriteWorker = async () => {                                                                                                  │ │
│ │   if (!config.batchWrite.enabled) {                                                                                                                    │ │
│ │     return;                                                                                                                                            │ │
│ │   }                                                                                                                                                    │ │
│ │                                                                                                                                                        │ │
│ │   logger.info('Shutting down batch write worker...');                                                                                                  │ │
│ │   isShuttingDown = true;                                                                                                                               │ │
│ │                                                                                                                                                        │ │
│ │   // Stop the interval                                                                                                                                 │ │
│ │   if (intervalId) {                                                                                                                                    │ │
│ │     clearInterval(intervalId);                                                                                                                         │ │
│ │   }                                                                                                                                                    │ │
│ │                                                                                                                                                        │ │
│ │   // Process queue one last time                                                                                                                       │ │
│ │   await processWriteQueue();                                                                                                                           │ │
│ │                                                                                                                                                        │ │
│ │   logger.info('Batch write worker shut down');                                                                                                         │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ // Health check                                                                                                                                        │ │
│ │ export const getBatchWriteHealth = async () => {                                                                                                       │ │
│ │   const redis = getRedisClient();                                                                                                                      │ │
│ │   const dlqSize = await redis.lLen(BATCH_WRITE_KEYS.DLQ);                                                                                              │ │
│ │   const timeSinceLastRun = Date.now() - lastRunTimestamp;                                                                                              │ │
│ │                                                                                                                                                        │ │
│ │   return {                                                                                                                                             │ │
│ │     status: timeSinceLastRun < (config.batchWrite.pollIntervalSeconds * 2 * 1000) ? 'healthy' : 'degraded',                                            │ │
│ │     lastRun: lastRunTimestamp,                                                                                                                         │ │
│ │     dlqSize,                                                                                                                                           │ │
│ │     isRunning,                                                                                                                                         │ │
│ │     config: {                                                                                                                                          │ │
│ │       enabled: config.batchWrite.enabled,                                                                                                              │ │
│ │       delaySeconds: config.batchWrite.delaySeconds,                                                                                                    │ │
│ │       pollIntervalSeconds: config.batchWrite.pollIntervalSeconds                                                                                       │ │
│ │     }                                                                                                                                                  │ │
│ │   };                                                                                                                                                   │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ export default {                                                                                                                                       │ │
│ │   initializeBatchWriteWorker,                                                                                                                          │ │
│ │   shutdownBatchWriteWorker,                                                                                                                            │ │
│ │   getBatchWriteHealth                                                                                                                                  │ │
│ │ };                                                                                                                                                     │ │
│ │                                                                                                                                                        │ │
│ │ Phase 4: Integrate with Server                                                                                                                         │ │
│ │                                                                                                                                                        │ │
│ │ 4.1 Update Server Initialization                                                                                                                       │ │
│ │                                                                                                                                                        │ │
│ │ File: backend/src/server.js                                                                                                                            │ │
│ │                                                                                                                                                        │ │
│ │ Add imports:                                                                                                                                           │ │
│ │ import { initializeBatchWriteWorker, shutdownBatchWriteWorker, getBatchWriteHealth } from './workers/batchWriteWorker.js';                             │ │
│ │                                                                                                                                                        │ │
│ │ Add after message worker initialization:                                                                                                               │ │
│ │ // Initialize batch write worker                                                                                                                       │ │
│ │ logger.info('Initializing batch write worker...');                                                                                                     │ │
│ │ await initializeBatchWriteWorker();                                                                                                                    │ │
│ │ logger.info('Batch write worker initialized');                                                                                                         │ │
│ │                                                                                                                                                        │ │
│ │ Add health endpoint (in createApp function):                                                                                                           │ │
│ │ app.get('/health/batch-write', async (req, res) => {                                                                                                   │ │
│ │   try {                                                                                                                                                │ │
│ │     const health = await getBatchWriteHealth();                                                                                                        │ │
│ │     res.json(health);                                                                                                                                  │ │
│ │   } catch (error) {                                                                                                                                    │ │
│ │     res.status(500).json({ error: 'Failed to get batch write health' });                                                                               │ │
│ │   }                                                                                                                                                    │ │
│ │ });                                                                                                                                                    │ │
│ │                                                                                                                                                        │ │
│ │ Update graceful shutdown:                                                                                                                              │ │
│ │ // Add to graceful shutdown (after message worker shutdown)                                                                                            │ │
│ │ logger.info('Shutting down batch write worker...');                                                                                                    │ │
│ │ await shutdownBatchWriteWorker();                                                                                                                      │ │
│ │                                                                                                                                                        │ │
                                                                                                                              │ │
│ │                                                                                                                                                        │ │
│ │ 5.2 Deployment Strategy                                                                                                                                │ │
│ │                                                                                                                                                        │ │
│ │ 1. Feature Flag: Use BATCH_WRITE_ENABLED=false initially                                                                                               │ │
                                                                                                                           │ │
│ │                                                                                                                                                        │ │
│ │ 6.2 Operational Runbook                                                                                                                                │ │
│ │                                                                                                                                                        │ │
│ │ - High DLQ Size: Check Firebase status, review error logs                                                                                              │ │
│ │ - Processing Delays: Check Redis memory, adjust poll interval                                                                                          │ │
│ │ - Memory Issues: Reduce batch size limit                                                                                                               │ │
│ │ - Emergency Disable: Set BATCH_WRITE_ENABLED=false and restart 