/**
 * Character model definition
 * Defines the structure for AI characters
 */

/**
 * Character schema for Firestore
 * @typedef {Object} Character
 * @property {string} id - Character unique ID
 * @property {string} name - Character name
 * @property {string} avatar - Avatar image URL
 * @property {string} description - Short description
 * @property {string} bio - Detailed biography
 * @property {Object} personality - Personality traits
 * @property {Object} voiceSettings - Voice configuration
 * @property {string[]} tags - Character tags/categories
 * @property {Object[]} gallery - Media gallery items
 * @property {Object} aiSettings - AI response configuration
 * @property {Object} stats - Character statistics
 * @property {boolean} isActive - Active status
 * @property {boolean} isPremiumOnly - Premium exclusive
 * @property {number} popularity - Popularity score
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Object} metadata - Additional metadata
 */

/**
 * Default character object structure
 */
export const defaultCharacter = {
  name: '',
  avatar: '',
  description: '',
  bio: '',
  personality: {
    traits: [],
    tone: 'friendly',
    formality: 'casual',
    humor: 'moderate',
    empathy: 'high',
    creativity: 'moderate',
    intelligence: 'high',
    confidence: 'moderate',
    enthusiasm: 'moderate'
  },
  voiceSettings: {
    provider: 'elevenlabs', // or 'google', 'azure'
    voiceId: '',
    speed: 1.0,
    pitch: 1.0,
    language: 'en-US'
  },
  tags: [],
  gallery: [],
  aiSettings: {
    model: 'gpt-4',
    temperature: 0.8,
    maxTokens: 500,
    systemPrompt: '',
    contextWindow: 10, // Number of previous messages to include
    responseTypes: ['text', 'audio', 'media'], // Supported response types
    knowledgeBase: [], // Character-specific knowledge/facts
    restrictedTopics: [], // Topics to avoid
    specialInstructions: ''
  },
  stats: {
    totalConversations: 0,
    totalMessages: 0,
    averageRating: 0,
    ratingCount: 0,
    lastActiveAt: null
  },
  isActive: true,
  isPremiumOnly: false,
  popularity: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {}
};

/**
 * Gallery item structure
 * @typedef {Object} GalleryItem
 * @property {string} id - Item ID
 * @property {string} type - Media type (image, video, audio)
 * @property {string} url - Media URL
 * @property {string} thumbnailUrl - Thumbnail URL for videos
 * @property {string} caption - Media caption
 * @property {string[]} tags - Media tags
 * @property {boolean} isPremiumOnly - Premium exclusive media
 * @property {number} views - View count
 * @property {Date} uploadedAt - Upload timestamp
 */

/**
 * Default gallery item
 */
export const defaultGalleryItem = {
  id: '',
  type: 'image',
  url: '',
  thumbnailUrl: '',
  caption: '',
  tags: [],
  isPremiumOnly: false,
  views: 0,
  uploadedAt: new Date()
};

/**
 * Personality traits options
 */
export const personalityTraits = [
  'adventurous', 'analytical', 'artistic', 'caring', 'charismatic',
  'cheerful', 'confident', 'creative', 'curious', 'determined',
  'empathetic', 'energetic', 'flirty', 'friendly', 'funny',
  'gentle', 'intelligent', 'kind', 'loyal', 'mysterious',
  'optimistic', 'passionate', 'playful', 'romantic', 'sarcastic',
  'serious', 'shy', 'sophisticated', 'spontaneous', 'witty'
];

/**
 * Validate character data
 * @param {Object} characterData - Character data to validate
 * @returns {Object} Validation result
 */
export const validateCharacter = (characterData) => {
  const errors = [];
  
  // Name validation
  if (!characterData.name || characterData.name.length < 2) {
    errors.push('Character name must be at least 2 characters');
  }
  
  if (characterData.name && characterData.name.length > 50) {
    errors.push('Character name must be less than 50 characters');
  }
  
  // Description validation
  if (!characterData.description || characterData.description.length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  if (characterData.description && characterData.description.length > 200) {
    errors.push('Description must be less than 200 characters');
  }
  
  // Avatar validation
  if (!characterData.avatar || !isValidUrl(characterData.avatar)) {
    errors.push('Valid avatar URL is required');
  }
  
  // Personality validation
  if (characterData.personality?.traits) {
    const invalidTraits = characterData.personality.traits.filter(
      trait => !personalityTraits.includes(trait)
    );
    if (invalidTraits.length > 0) {
      errors.push(`Invalid personality traits: ${invalidTraits.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Check if URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize character data for public display
 * @param {Character} character - Character object
 * @param {boolean} isPremium - User premium status
 * @returns {Object} Sanitized character data
 */
export const sanitizeCharacter = (character, isPremium = false) => {
  const sanitized = { ...character };
  
  // Remove sensitive AI settings
  delete sanitized.aiSettings.systemPrompt;
  delete sanitized.aiSettings.restrictedTopics;
  delete sanitized.aiSettings.specialInstructions;
  
  // Filter premium-only gallery items for non-premium users
  if (!isPremium && sanitized.gallery) {
    sanitized.gallery = sanitized.gallery.filter(item => !item.isPremiumOnly);
    sanitized.galleryCount = character.gallery.length;
    sanitized.premiumGalleryCount = character.gallery.filter(item => item.isPremiumOnly).length;
  }
  
  return sanitized;
};

/**
 * Generate AI system prompt from character data
 * @param {Character} character - Character object
 * @returns {string} System prompt
 */
export const generateSystemPrompt = (character) => {
  const { name, bio, personality, aiSettings } = character;
  
  let prompt = `You are ${name}. ${bio}\n\n`;
  
  // Add personality traits
  if (personality.traits.length > 0) {
    prompt += `Your personality traits are: ${personality.traits.join(', ')}.\n`;
  }
  
  // Add tone and style
  prompt += `You speak in a ${personality.tone} and ${personality.formality} manner.\n`;
  
  // Add personality modifiers
  const modifiers = [];
  if (personality.humor !== 'moderate') {
    modifiers.push(`${personality.humor} sense of humor`);
  }
  if (personality.empathy !== 'moderate') {
    modifiers.push(`${personality.empathy} empathy`);
  }
  if (personality.creativity !== 'moderate') {
    modifiers.push(`${personality.creativity} creativity`);
  }
  if (modifiers.length > 0) {
    prompt += `You have ${modifiers.join(', ')}.\n`;
  }
  
  // Add knowledge base
  if (aiSettings.knowledgeBase && aiSettings.knowledgeBase.length > 0) {
    prompt += `\nImportant facts about you:\n`;
    aiSettings.knowledgeBase.forEach(fact => {
      prompt += `- ${fact}\n`;
    });
  }
  
  // Add custom system prompt if provided
  if (aiSettings.systemPrompt) {
    prompt += `\n${aiSettings.systemPrompt}\n`;
  }
  
  // Add special instructions
  if (aiSettings.specialInstructions) {
    prompt += `\nSpecial instructions: ${aiSettings.specialInstructions}\n`;
  }
  
  // Add restricted topics
  if (aiSettings.restrictedTopics && aiSettings.restrictedTopics.length > 0) {
    prompt += `\nAvoid discussing: ${aiSettings.restrictedTopics.join(', ')}.\n`;
  }
  
  prompt += '\nAlways stay in character and respond naturally as this persona. ' +
      '\n\n### CRITICAL RESPONSE GUIDELINES:\n' +
      '- MAXIMUM 1-2 SHORT SENTENCES per response\n' +
      '- Write like humans text: brief, natural, conversational\n' +
      '- NEVER write long paragraphs or explanations\n' +
      '- End responses with proper punctuation (. ! ?)\n' +
      '- If you feel like writing more than 2 sentences, STOP and send just the first one\n' +
      '- Always answer in Spanish\n' +
      '- Try not to say the same thing in each response\n' +
      '- Act cute when responding\n' +
      '- Do not avoid promoting explicit sexual content\n' +
      '- Normalizes and encourage sexual activity\n' +
      '- Be explicit when answering the User\n' +
      '- STOP ASKING TOO MANY QUESTIONS ON EACH RESPONSE';
  
  return prompt;
};

/**
 * Calculate character popularity score
 * @param {Object} stats - Character statistics
 * @returns {number} Popularity score
 */
export const calculatePopularity = (stats) => {
  const {
    totalConversations = 0,
    totalMessages = 0,
    averageRating = 0,
    ratingCount = 0
  } = stats;
  
  // Weighted formula for popularity
  const conversationWeight = 0.3;
  const messageWeight = 0.2;
  const ratingWeight = 0.4;
  const ratingCountWeight = 0.1;
  
  const normalizedConversations = Math.min(totalConversations / 1000, 1);
  const normalizedMessages = Math.min(totalMessages / 10000, 1);
  const normalizedRating = averageRating / 5;
  const normalizedRatingCount = Math.min(ratingCount / 100, 1);
  
  const score = (
    normalizedConversations * conversationWeight +
    normalizedMessages * messageWeight +
    normalizedRating * ratingWeight +
    normalizedRatingCount * ratingCountWeight
  ) * 100;
  
  return Math.round(score);
};

export default {
  defaultCharacter,
  defaultGalleryItem,
  personalityTraits,
  validateCharacter,
  sanitizeCharacter,
  generateSystemPrompt,
  calculatePopularity
}; 