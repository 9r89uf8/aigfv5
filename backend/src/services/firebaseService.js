/**
 * Simple Firebase Service
 * Basic CRUD operations for conversations and messages
 */
import { getFirebaseFirestore } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { getMessageList, pushMessage, deleteCacheValue, buildCacheKey, getCacheValue, setCacheValue } from './cacheService.js';
import { config } from '../config/environment.js';

const db = getFirebaseFirestore();

/**
 * Get or create a conversation between user and character
 * @param {string} userId - User ID
 * @param {string} characterId - Character ID
 * @returns {Promise<Object>} Conversation data
 */
export const getOrCreateConversation = async (userId, characterId) => {
  const conversationId = `${userId}_${characterId}`;
  const startTime = Date.now();
  
  try {
    // Build cache key for conversation metadata
    const cacheKey = buildCacheKey('conversation', conversationId);
    
    // Check cache first
    logger.debug('Checking conversation cache', { conversationId, cacheKey });
    const cacheStartTime = Date.now();
    const cachedConversation = await getCacheValue(cacheKey);
    const cacheTime = Date.now() - cacheStartTime;
    
    if (cachedConversation) {
      const totalTime = Date.now() - startTime;
      logger.info('Conversation cache HIT', { 
        conversationId, 
        cacheKey,
        cacheTime: `${cacheTime}ms`,
        totalTime: `${totalTime}ms`,
        source: 'redis'
      });
      return cachedConversation;
    }
    
    // Cache miss - check Firebase
    logger.info('Conversation cache MISS', { conversationId, cacheKey });
    const firebaseStartTime = Date.now();
    
    const conversationRef = db.collection('conversations').doc(conversationId);
    const doc = await conversationRef.get();
    
    let conversationData;
    
    if (doc.exists) {
      conversationData = { id: conversationId, ...doc.data() };
      logger.debug('Existing conversation found in Firebase', { conversationId });
    } else {
      // Create new conversation
      conversationData = {
        id: conversationId,
        userId,
        characterId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0
      };
      
      await conversationRef.set(conversationData);
      logger.info('Created new conversation', { conversationId, userId, characterId });
    }
    
    const firebaseTime = Date.now() - firebaseStartTime;
    
    // Store in cache for future requests
    const cacheSetStartTime = Date.now();
    await setCacheValue(cacheKey, conversationData, config.redis.ttl.conversation);
    const cacheSetTime = Date.now() - cacheSetStartTime;
    const totalTime = Date.now() - startTime;
    
    logger.info('Conversation cached successfully', { 
      conversationId, 
      cacheKey,
      firebaseTime: `${firebaseTime}ms`,
      cacheSetTime: `${cacheSetTime}ms`,
      totalTime: `${totalTime}ms`,
      ttl: config.redis.ttl.conversation,
      source: 'firebase',
      isNew: !doc.exists
    });
    
    return conversationData;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Error getting/creating conversation', { 
      conversationId, 
      userId, 
      characterId, 
      error: error.message, 
      totalTime: `${totalTime}ms`
    });
    throw error;
  }
};


/**
 * Get messages for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Number of messages to retrieve
 * @returns {Promise<Array>} Array of messages
 */
export const getMessages = async (conversationId, limit = 50) => {
  const startTime = Date.now();
  
  try {
    // Try to get messages from cache first
    logger.debug('Checking messages cache', { conversationId, limit });
    const cacheStartTime = Date.now();
    const cachedMessages = await getMessageList(conversationId, limit);
    const cacheTime = Date.now() - cacheStartTime;
    
    if (cachedMessages && cachedMessages.length > 0) {
      const totalTime = Date.now() - startTime;
      logger.info('Messages cache HIT', { 
        conversationId, 
        limit,
        messageCount: cachedMessages.length,
        cacheTime: `${cacheTime}ms`,
        totalTime: `${totalTime}ms`,
        source: 'redis'
      });
      return cachedMessages;
    }
    
    // Cache miss - fetch from Firebase (single document with messages array)
    logger.info('Messages cache MISS', { conversationId, limit });
    const firebaseStartTime = Date.now();
    
    const conversationRef = db.collection('conversations').doc(conversationId);
    const docSnapshot = await conversationRef.get();
    
    let orderedMessages = [];
    
    if (docSnapshot.exists) {
      const conversationData = docSnapshot.data();
      const allMessages = conversationData.messages || [];
      
      // Sort messages by timestamp and take the most recent ones up to limit
      const sortedMessages = allMessages
        .sort((a, b) => a.timestamp - b.timestamp) // Chronological order
        .slice(-limit); // Take the last N messages
      
      orderedMessages = sortedMessages;
      
      logger.debug('Messages retrieved from single document', { 
        conversationId, 
        totalMessages: allMessages.length,
        returnedMessages: orderedMessages.length,
        limit 
      });
    } else {
      logger.debug('Conversation document not found', { conversationId });
    }
    
    const firebaseTime = Date.now() - firebaseStartTime;
    
    // Populate cache for next time (push each message individually to maintain order)
    logger.debug('Populating messages cache', { conversationId, messageCount: orderedMessages.length });
    const cachePopulateStartTime = Date.now();
    
    for (const message of orderedMessages) {
      await pushMessage(conversationId, message);
    }
    
    const cachePopulateTime = Date.now() - cachePopulateStartTime;
    const totalTime = Date.now() - startTime;
    
    logger.info('Messages cached successfully', { 
      conversationId, 
      limit,
      messageCount: orderedMessages.length,
      firebaseTime: `${firebaseTime}ms`,
      cachePopulateTime: `${cachePopulateTime}ms`,
      totalTime: `${totalTime}ms`,
      source: 'firebase'
    });
    
    return orderedMessages;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Error getting messages', { 
      conversationId, 
      limit,
      error: error.message, 
      totalTime: `${totalTime}ms`
    });
    throw error;
  }
};

/**
 * Get conversations for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of conversations to retrieve
 * @returns {Promise<Array>} Array of conversations
 */
export const getUserConversations = async (userId, limit = 20) => {
  try {
    const conversationsRef = db
      .collection('conversations')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit);
    
    const snapshot = await conversationsRef.get();
    const conversations = [];
    
    snapshot.forEach(doc => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    
    return conversations;
  } catch (error) {
    logger.error('Error getting user conversations:', error);
    throw error;
  }
};

/**
 * Batch save user and AI messages atomically (now using saveConversation)
 * @param {string} conversationId - Conversation ID
 * @param {Object} userMessage - User message data
 * @param {Object} aiMessage - AI message data
 * @param {string} userId - User ID (for conversation creation)
 * @param {string} characterId - Character ID (for conversation creation)
 * @returns {Promise<Object>} Saved messages
 */
export const batchSaveMessages = async (conversationId, userMessage, aiMessage, userId, characterId) => {
  try {
    // Use the optimized saveConversation function
    await saveConversation(conversationId, userId, characterId, [userMessage, aiMessage]);
    
    logger.info('Batch saved messages (optimized)', {
      conversationId,
      userMessageId: userMessage.id,
      aiMessageId: aiMessage.id,
      operation: 'single_document_write'
    });
    
    return {
      userMessage,
      aiMessage
    };
  } catch (error) {
    logger.error('Error batch saving messages (optimized):', error);
    throw error;
  }
};

/**
 * Delete a conversation and all its messages (optimized for single document)
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<void>}
 */
export const deleteConversation = async (conversationId) => {
  try {
    // Delete conversation document (contains all messages in array)
    const conversationRef = db.collection('conversations').doc(conversationId);
    await conversationRef.delete();
    
    // Clear message cache for this conversation
    const cacheKey = buildCacheKey('messages', conversationId);
    await deleteCacheValue(cacheKey);
    
    // Clear conversation cache as well
    const conversationCacheKey = buildCacheKey('conversation', conversationId);
    await deleteCacheValue(conversationCacheKey);
    
    logger.info('Conversation deleted (optimized)', { 
      conversationId,
      operation: 'single_document_delete'
    });
  } catch (error) {
    logger.error('Error deleting conversation (optimized):', error);
    throw error;
  }
};

/**
 * Save conversation with messages in single document (optimized version)
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {string} characterId - Character ID
 * @param {Array} messages - Array of messages to save
 * @returns {Promise<void>}
 */
export const saveConversation = async (conversationId, userId, characterId, messages) => {
  const startTime = Date.now();
  
  try {
    const timestamp = Date.now();
    const conversationRef = db.collection('conversations').doc(conversationId);
    
    // Prepare update data
    const updateData = {
      userId,
      characterId,
      updatedAt: timestamp,
      lastMessage: messages[messages.length - 1]?.content || 'Message',
      messageCount: FieldValue.increment(messages.length),
      // Use arrayUnion to add messages to the messages array
      messages: FieldValue.arrayUnion(...messages)
    };
    
    // For new conversations, also set createdAt and get current document size
    const docSnapshot = await conversationRef.get();
    let currentMessageCount = 0;
    let estimatedDocSize = 0;
    
    if (!docSnapshot.exists) {
      updateData.createdAt = timestamp;
      logger.debug('Creating new conversation document', { conversationId });
    } else {
      const existingData = docSnapshot.data();
      currentMessageCount = existingData.messages ? existingData.messages.length : 0;
      
      // Estimate document size (rough calculation)
      const existingMessages = existingData.messages || [];
      estimatedDocSize = JSON.stringify(existingData).length;
      
      // Log warning if approaching Firestore document size limit (1MB)
      const newMessageSize = JSON.stringify(messages).length;
      const projectedSize = estimatedDocSize + newMessageSize;
      
      if (projectedSize > 800000) { // 800KB warning threshold
        logger.warn('Document size approaching limit', {
          conversationId,
          currentSize: `${Math.round(estimatedDocSize / 1024)}KB`,
          projectedSize: `${Math.round(projectedSize / 1024)}KB`,
          currentMessageCount,
          newMessagesCount: messages.length,
          recommendation: 'Consider implementing document splitting'
        });
      }
    }
    
    // Single write operation to save both metadata and messages
    await conversationRef.set(updateData, { merge: true });
    
    const totalTime = Date.now() - startTime;
    
    logger.info('Conversation saved optimized', { 
      conversationId, 
      messageCount: messages.length,
      totalMessagesInDoc: currentMessageCount + messages.length,
      isNew: !docSnapshot.exists,
      estimatedDocSize: estimatedDocSize > 0 ? `${Math.round(estimatedDocSize / 1024)}KB` : 'new',
      totalTime: `${totalTime}ms`,
      operation: 'single_document_write'
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Error saving conversation optimized', { 
      conversationId, 
      messageCount: messages.length,
      error: error.message,
      totalTime: `${totalTime}ms`
    });
    throw error;
  }
};

export default {
  getOrCreateConversation,
  batchSaveMessages,
  getMessages,
  getUserConversations,
  deleteConversation,
  saveConversation
};