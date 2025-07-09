/**
 * Conversation model definition
 * Manages user-character conversations and messages
 */

/**
 * Conversation schema for Firestore
 * @typedef {Object} Conversation
 * @property {string} id - Conversation ID
 * @property {string} userId - User ID
 * @property {string} characterId - Character ID
 * @property {Message[]} messages - Array of messages
 * @property {Date} startedAt - Conversation start time
 * @property {Date} lastMessageAt - Last message timestamp
 * @property {number} messageCount - Total message count
 * @property {boolean} isActive - Active status
 * @property {Object} metadata - Additional metadata
 */

/**
 * Message schema
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} sender - Sender type ('user' or 'character')
 * @property {string} type - Message type ('text', 'audio', 'media')
 * @property {string} content - Message content
 * @property {Object} audioData - Audio message data
 * @property {Object} mediaData - Media message data
 * @property {Date} timestamp - Message timestamp
 * @property {boolean} isRead - Read status
 * @property {boolean} hasAIResponse - Whether this user message has been answered by AI
 * @property {Object} aiMetadata - AI generation metadata
 * @property {string} replyToMessageId - ID of message this is replying to (for AI responses)
 */

/**
 * Default conversation structure
 */
export const defaultConversation = {
  userId: '',
  characterId: '',
  messages: [],
  startedAt: new Date(),
  lastMessageAt: new Date(),
  messageCount: 0,
  isActive: true,
  metadata: {}
};

/**
 * Default message structure
 */
export const defaultMessage = {
  id: '',
  sender: 'user',
  type: 'text',
  content: '',
  audioData: null,
  mediaData: null,
  timestamp: new Date(),
  isRead: false,
  hasAIResponse: false,
  aiMetadata: null,
  replyToMessageId: null
};

/**
 * Audio data structure
 * @typedef {Object} AudioData
 * @property {string} url - Audio file URL
 * @property {number} duration - Duration in seconds
 * @property {string} format - Audio format (mp3, wav, etc.)
 * @property {number} size - File size in bytes
 */

/**
 * Media data structure
 * @typedef {Object} MediaData
 * @property {string} url - Media file URL
 * @property {string} type - Media type (image, video, gif)
 * @property {string} thumbnailUrl - Thumbnail URL (for videos)
 * @property {string} caption - Media caption
 * @property {number} width - Media width
 * @property {number} height - Media height
 * @property {number} size - File size in bytes
 */

/**
 * AI metadata structure
 * @typedef {Object} AIMetadata
 * @property {string} model - AI model used
 * @property {number} tokens - Tokens consumed
 * @property {number} processingTime - Processing time in ms
 * @property {string} galleryItemId - Gallery item ID (for media responses)
 * @property {Object} parameters - AI generation parameters
 */

/**
 * Create conversation ID from user and character IDs
 * @param {string} userId - User ID
 * @param {string} characterId - Character ID
 * @returns {string} Conversation ID
 */
export const createConversationId = (userId, characterId) => {
  return `${userId}_${characterId}`;
};

/**
 * Validate message content
 * @param {Object} message - Message to validate
 * @returns {Object} Validation result
 */
export const validateMessage = (message) => {
  const errors = [];
  
  // Sender validation
  if (!['user', 'character'].includes(message.sender)) {
    errors.push('Invalid sender type');
  }
  
  // Type validation
  if (!['text', 'audio', 'media'].includes(message.type)) {
    errors.push('Invalid message type');
  }
  
  // Content validation based on type
  switch (message.type) {
    case 'text':
      if (!message.content || message.content.trim().length === 0) {
        errors.push('Text message cannot be empty');
      }
      if (message.content && message.content.length > 5000) {
        errors.push('Text message too long (max 5000 characters)');
      }
      break;
      
    case 'audio':
      if (!message.audioData || !message.audioData.url) {
        errors.push('Audio message must have audio data');
      }
      break;
      
    case 'media':
      if (!message.mediaData || !message.mediaData.url) {
        errors.push('Media message must have media data');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format message for display
 * @param {Message} message - Message to format
 * @returns {Object} Formatted message
 */
export const formatMessage = (message) => {
  const formatted = {
    id: message.id,
    sender: message.sender,
    type: message.type,
    timestamp: message.timestamp,
    isRead: message.isRead
  };
  
  // Add content based on type
  switch (message.type) {
    case 'text':
      formatted.content = message.content;
      break;
      
    case 'audio':
      formatted.audioData = {
        url: message.audioData.url,
        duration: message.audioData.duration,
        format: message.audioData.format
      };
      break;
      
    case 'media':
      formatted.mediaData = {
        url: message.mediaData.url,
        type: message.mediaData.type,
        thumbnailUrl: message.mediaData.thumbnailUrl,
        caption: message.mediaData.caption,
        width: message.mediaData.width,
        height: message.mediaData.height
      };
      break;
  }
  
  return formatted;
};

/**
 * Get conversation summary
 * @param {Conversation} conversation - Conversation object
 * @returns {Object} Conversation summary
 */
export const getConversationSummary = (conversation) => {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  
  return {
    id: conversation.id,
    userId: conversation.userId,
    characterId: conversation.characterId,
    lastMessage: lastMessage ? formatMessage(lastMessage) : null,
    lastMessageAt: conversation.lastMessageAt,
    messageCount: conversation.messageCount,
    unreadCount: conversation.messages.filter(m => !m.isRead && m.sender === 'character').length,
    isActive: conversation.isActive
  };
};

/**
 * Extract context for AI from previous messages
 * @param {Message[]} messages - Array of messages
 * @param {number} contextWindow - Number of messages to include
 * @returns {Object[]} Context messages
 */
export const extractAIContext = (messages, contextWindow = 10) => {
  // Get last N messages
  const recentMessages = messages.slice(-contextWindow);
  
  // Format for AI consumption
  return recentMessages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.type === 'text' 
      ? msg.content 
      : `[${msg.type} message: ${msg.type === 'audio' ? 'Audio file' : msg.mediaData?.caption || 'Media file'}]`
  }));
};

/**
 * Calculate conversation statistics
 * @param {Conversation} conversation - Conversation object
 * @returns {Object} Statistics
 */
export const calculateConversationStats = (conversation) => {
  const messages = conversation.messages || [];
  
  const stats = {
    totalMessages: messages.length,
    userMessages: messages.filter(m => m.sender === 'user').length,
    characterMessages: messages.filter(m => m.sender === 'character').length,
    textMessages: messages.filter(m => m.type === 'text').length,
    audioMessages: messages.filter(m => m.type === 'audio').length,
    mediaMessages: messages.filter(m => m.type === 'media').length,
    avgResponseTime: 0,
    duration: 0
  };
  
  // Calculate average response time
  let totalResponseTime = 0;
  let responseCount = 0;
  
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].sender === 'character' && messages[i-1].sender === 'user') {
      const responseTime = new Date(messages[i].timestamp) - new Date(messages[i-1].timestamp);
      totalResponseTime += responseTime;
      responseCount++;
    }
  }
  
  if (responseCount > 0) {
    stats.avgResponseTime = Math.round(totalResponseTime / responseCount / 1000); // in seconds
  }
  
  // Calculate conversation duration
  if (messages.length > 0) {
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    stats.duration = Math.round(
      (new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp)) / 1000 / 60
    ); // in minutes
  }
  
  return stats;
};

export default {
  defaultConversation,
  defaultMessage,
  createConversationId,
  validateMessage,
  formatMessage,
  getConversationSummary,
  extractAIContext,
  calculateConversationStats
}; 