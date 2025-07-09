/**
 * Environment configuration module
 * Centralizes environment variable access with validation
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Validates required environment variables
 * @throws {Error} If required variables are missing
 */
const validateEnvironment = () => {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Validate on module load
validateEnvironment();

/**
 * Environment configuration object
 */
export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    tokenUri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    authProviderCertUrl: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    clientCertUrl: process.env.FIREBASE_CLIENT_CERT_URL
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'aim',
    ttl: {
      default: parseInt(process.env.REDIS_TTL_DEFAULT || '3600'), // 1 hour
      session: parseInt(process.env.REDIS_TTL_SESSION || '86400'), // 24 hours
      cache: parseInt(process.env.REDIS_TTL_CACHE || '300'), // 5 minutes (for general short-term caching)
      userProfile: parseInt(process.env.REDIS_TTL_USER_PROFILE || '3600'), // 1 hour (user profiles change occasionally)
      character: parseInt(process.env.REDIS_TTL_CHARACTER || '21600'), // 6 hours (character data changes rarely)
      conversation: parseInt(process.env.REDIS_TTL_CONVERSATION || '1800'), // 30 minutes (conversations change frequently)
      // Batch operation TTLs
      conversationBuffer: parseInt(process.env.REDIS_TTL_CONVERSATION_BUFFER || '900'), // 15 minutes (conversation buffer)
      conversationContext: parseInt(process.env.REDIS_TTL_CONVERSATION_CONTEXT || '900'), // 15 minutes (conversation context cache)
      // Additional TTL values for hardcoded areas
      messages: parseInt(process.env.REDIS_TTL_MESSAGES || '3600'), // 1 hour (message cache)
      messageList: parseInt(process.env.REDIS_TTL_MESSAGE_LIST || '1800'), // 30 minutes (message list cache)
      queueCompleted: parseInt(process.env.REDIS_TTL_QUEUE_COMPLETED || '86400'), // 24 hours (completed job cleanup)
      queueFailed: parseInt(process.env.REDIS_TTL_QUEUE_FAILED || '604800') // 7 days (failed job cleanup)
    }
  },
  
  // DeepSeek configuration
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  },
  
  // Google Cloud configuration (for TTS)
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
  },
  
  // Stripe configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  
  // Storage configuration
  storage: {
    bucket: process.env.STORAGE_BUCKET,
    cdnBaseUrl: process.env.CDN_BASE_URL
  },
  
  // AI Context configuration
  ai: {
    // Maximum number of messages to include in conversation context for AI
    maxContextMessages: parseInt(process.env.AI_MAX_CONTEXT_MESSAGES || '50'), // Increased from 20 to 50 for debugging
    // Minimum number of messages to ensure context has substance
    minContextMessages: parseInt(process.env.AI_MIN_CONTEXT_MESSAGES || '2'),
    // Enable debug logging for AI context
    debugContext: process.env.AI_DEBUG_CONTEXT === 'true' || process.env.NODE_ENV === 'development'
  },
  
  // Batch write configuration
  batchWrite: {
    enabled: process.env.BATCH_WRITE_ENABLED === 'true' || process.env.BATCH_WRITE_ENABLED === undefined,
    delaySeconds: parseInt(process.env.BATCH_WRITE_DELAY || '120'), // 2 minutes
    pollIntervalSeconds: parseInt(process.env.BATCH_WRITE_POLL_INTERVAL || '30'),
    maxMessagesPerBatch: parseInt(process.env.BATCH_WRITE_MAX_MESSAGES || '500'),
    retryAttempts: parseInt(process.env.BATCH_WRITE_RETRY_ATTEMPTS || '3'),
    dlqKey: 'dlq:failed_writes'
  }
};

export default config; 