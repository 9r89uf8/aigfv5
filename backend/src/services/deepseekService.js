/**
 * Simple DeepSeek Service
 * Direct API calls to DeepSeek for message processing
 */
import { getDeepSeekClient, AI_MODELS } from '../config/deepseek.js';
import logger from '../utils/logger.js';

/**
 * Generate AI response using DeepSeek
 * @param {Object} params - Parameters for AI generation
 * @param {Object} params.character - Character data
 * @param {Array} params.conversationHistory - Previous messages
 * @param {string} params.userMessage - Current user message
 * @returns {Promise<string>} AI response
 */
export const generateResponse = async ({ character, conversationHistory, userMessage }) => {
  try {
    const client = getDeepSeekClient();
    if (!client) {
      throw new Error('DeepSeek client not initialized');
    }

    // Build the messages array for DeepSeek API
    const messages = buildMessagesArray(character, conversationHistory, userMessage);

    console.log(messages);

    // Call DeepSeek API
    const response = await client.chat.completions.create({
      model: AI_MODELS.DEEPSEEK_CHAT,
      messages,
      temperature: 1.3,
      max_tokens: 500,
      stream: false
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from DeepSeek API');
    }

    logger.info('DeepSeek response generated', {
      characterId: character.id,
      responseLength: aiResponse.length,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return aiResponse;
    
  } catch (error) {
    logger.error('Error generating DeepSeek response:', error);
    throw new Error(`AI service unavailable: ${error.message}`);
  }
};

/**
 * Build messages array for DeepSeek API
 * @param {Object} character - Character data
 * @param {Array} conversationHistory - Previous messages
 * @param {string} userMessage - Current user message
 * @returns {Array} Messages array for API
 */
const buildMessagesArray = (character, conversationHistory, userMessage) => {
  const messages = [];
  
  // System prompt with character personality
  const systemPrompt = buildSystemPrompt(character);
  messages.push({
    role: 'system',
    content: systemPrompt
  });
  
  // Add conversation history (limit to last 10 messages to keep context manageable)
  const recentHistory = conversationHistory.slice(-10);
  
  for (const msg of recentHistory) {
    if (msg.sender === 'user') {
      messages.push({
        role: 'user',
        content: msg.content
      });
    } else if (msg.sender === 'character') {
      messages.push({
        role: 'assistant',
        content: msg.content
      });
    }
  }

  return messages;
};

/**
 * Build system prompt from character data
 * @param {Object} character - Character data
 * @returns {string} System prompt
 */
const buildSystemPrompt = (character) => {
  let prompt = `You are ${character.name}`;
  
  if (character.description) {
    prompt += `. ${character.description}`;
  }
  
  if (character.personality) {
    prompt += `\n\nPersonality: ${character.personality}`;
  }
  
  if (character.traits && Array.isArray(character.traits)) {
    prompt += `\n\nKey traits: ${character.traits.join(', ')}`;
  }
  
  // Add basic conversation guidelines
  prompt += `\n\nConversation guidelines:
- Stay in character at all times
- Keep responses conversational and engaging
- Respond naturally as if you're having a real conversation
- Keep responses concise (under 200 words typically)
- Don't break character or mention that you're an AI`;
  
  return prompt;
};

/**
 * Check if DeepSeek service is available
 * @returns {boolean} True if available
 */
export const isServiceAvailable = () => {
  try {
    const client = getDeepSeekClient();
    return !!client;
  } catch {
    return false;
  }
};

export default {
  generateResponse,
  isServiceAvailable
};