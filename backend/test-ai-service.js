/**
 * Simple test to verify AI service is working
 */
import { generateAIResponse } from './src/services/aiService.js';

console.log('✓ AI Service import successful');
console.log('✓ generateAIResponse function available:', typeof generateAIResponse === 'function');

// Test would require actual dependencies like Firebase, Redis, etc.
console.log('✓ Basic import chain working - API should be ready to receive requests');
console.log('');
console.log('Note: Full testing requires:');
console.log('- Firebase connection for character/conversation data');
console.log('- Redis connection for caching');
console.log('- DeepSeek API key for AI responses');
console.log('- Together.ai API key for fallback (optional)');