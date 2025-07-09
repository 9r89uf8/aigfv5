/**
 * DeepSeek configuration
 * Manages DeepSeek API client and settings
 */
import OpenAI from 'openai';
import { config } from './environment.js';
import logger from '../utils/logger.js';

let deepseekClient = null;

/**
 * Initialize DeepSeek client
 * @returns {OpenAI} DeepSeek client instance (using OpenAI SDK)
 */
export const initializeDeepSeek = () => {
  try {
    if (!config.deepseek.apiKey) {
      logger.warn('DeepSeek API key not configured');
      return null;
    }

    // Debug: Log the configuration being used
    logger.info('DeepSeek configuration', {
      baseURL: config.deepseek.baseURL,
      hasApiKey: !!config.deepseek.apiKey,
      apiKeyStart: config.deepseek.apiKey ? config.deepseek.apiKey.substring(0, 10) + '...' : 'none'
    });

    deepseekClient = new OpenAI({
      baseURL: config.deepseek.baseURL,
      apiKey: config.deepseek.apiKey,
      maxRetries: 3,
      timeout: 30000 // 30 seconds
    });

    logger.info('DeepSeek client initialized successfully');
    return deepseekClient;
  } catch (error) {
    logger.error('Failed to initialize DeepSeek:', error);
    return null;
  }
};

/**
 * Get DeepSeek client
 * @returns {OpenAI} DeepSeek client instance
 */
export const getDeepSeekClient = () => {
  if (!deepseekClient) {
    deepseekClient = initializeDeepSeek();
  }
  return deepseekClient;
};

/**
 * DeepSeek model configurations
 */
export const AI_MODELS = {
  DEEPSEEK_REASONER: 'deepseek-reasoner',
  DEEPSEEK_CHAT: 'deepseek-chat'
};

/**
 * Default AI settings
 */
export const DEFAULT_AI_SETTINGS = {
  model: AI_MODELS.DEEPSEEK_CHAT,
  temperature: 1.3,
  maxTokens: 500,
  stream: false
};

/**
 * Content filter settings (simplified - DeepSeek doesn't have moderation API)
 */
export const CONTENT_FILTER = {
  // Prohibited content patterns
  prohibited: [
    /\b(kill|murder|suicide|harm)\s+(yourself|myself|someone)\b/gi,
    /\b(illegal|crime|criminal)\s+activity\b/gi,
    /\b(hate|racist|discrimination)\b/gi
  ],
  
  // Basic content categories for local filtering
  categories: {
    violence: { threshold: 0.7, action: 'block' },
    selfHarm: { threshold: 0.6, action: 'block' },
    sexual: { threshold: 0.8, action: 'warn' },
    harassment: { threshold: 0.7, action: 'block' },
    illegal: { threshold: 0.6, action: 'block' }
  }
};

/**
 * Response formatting options
 */
export const RESPONSE_FORMATS = {
  text: {
    type: 'text',
    maxLength: 4000,
    allowMarkdown: true,
    allowEmojis: true
  },
  audio: {
    type: 'audio',
    format: 'mp3',
    voice: 'alloy',
    speed: 1.0
  },
  media: {
    type: 'media',
    maxSuggestions: 3,
    includeGifs: true
  }
};

/**
 * Check if DeepSeek is configured
 * @returns {boolean} True if configured
 */
export const isDeepSeekConfigured = () => {
  return !!config.deepseek.apiKey;
};

/**
 * Get model info
 * @param {string} modelId - Model ID
 * @returns {Object} Model information
 */
export const getModelInfo = (modelId) => {
  const modelInfo = {
    [AI_MODELS.DEEPSEEK_REASONER]: {
      name: 'DeepSeek Reasoner',
      contextWindow: 32000,
      costPer1kTokens: { input: 0.14, output: 0.28 },
      capabilities: ['text', 'code', 'reasoning', 'creative', 'thinking']
    },
    [AI_MODELS.DEEPSEEK_CHAT]: {
      name: 'DeepSeek Chat',
      contextWindow: 32000,
      costPer1kTokens: { input: 0.14, output: 0.28 },
      capabilities: ['text', 'code', 'conversation', 'creative']
    }
  };

  return modelInfo[modelId] || {
    name: 'Unknown Model',
    contextWindow: 32000,
    costPer1kTokens: { input: 0.14, output: 0.28 },
    capabilities: ['text']
  };
};

/**
 * Calculate token cost
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {string} model - Model ID
 * @returns {number} Cost in USD
 */
export const calculateTokenCost = (inputTokens, outputTokens, model) => {
  const modelInfo = getModelInfo(model);
  const inputCost = (inputTokens / 1000) * modelInfo.costPer1kTokens.input;
  const outputCost = (outputTokens / 1000) * modelInfo.costPer1kTokens.output;
  return Number((inputCost + outputCost).toFixed(6));
};

export default {
  initializeDeepSeek,
  getDeepSeekClient,
  isDeepSeekConfigured,
  AI_MODELS,
  DEFAULT_AI_SETTINGS,
  CONTENT_FILTER,
  RESPONSE_FORMATS,
  getModelInfo,
  calculateTokenCost
};