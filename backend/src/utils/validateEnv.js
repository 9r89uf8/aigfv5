/**
 * Environment Variable Validation
 * Ensures all required environment variables are properly configured
 */
import logger from './logger.js';

/**
 * Required environment variables and their descriptions
 */
const REQUIRED_ENV_VARS = {
  // Server
  NODE_ENV: {
    description: 'Node environment (development, production, test)',
    default: 'development',
    validate: (value) => ['development', 'production', 'test'].includes(value)
  },
  PORT: {
    description: 'Server port',
    default: '3000',
    validate: (value) => !isNaN(parseInt(value))
  },
  
  // Firebase
  FIREBASE_PROJECT_ID: {
    description: 'Firebase project ID',
    required: true
  },
  FIREBASE_CLIENT_EMAIL: {
    description: 'Firebase service account email',
    required: true
  },
  FIREBASE_PRIVATE_KEY: {
    description: 'Firebase service account private key',
    required: true,
    sensitive: true
  },
  FIREBASE_DATABASE_URL: {
    description: 'Firebase database URL',
    required: true
  },
  
  // Redis
  REDIS_HOST: {
    description: 'Redis host',
    default: 'localhost'
  },
  REDIS_PORT: {
    description: 'Redis port',
    default: '6379',
    validate: (value) => !isNaN(parseInt(value))
  },
  REDIS_PASSWORD: {
    description: 'Redis password',
    required: false,
    sensitive: true
  },
  
  // Frontend
  FRONTEND_URL: {
    description: 'Frontend application URL',
    default: 'http://localhost:3001'
  },
  
  // JWT
  JWT_SECRET: {
    description: 'JWT signing secret',
    required: true,
    sensitive: true,
    validate: (value) => value.length >= 32
  }
};

/**
 * Optional environment variables for additional features
 */
const OPTIONAL_ENV_VARS = {
  // DeepSeek
  DEEPSEEK_API_KEY: {
    description: 'DeepSeek API key for AI features',
    sensitive: true,
    feature: 'AI Integration'
  },
  DEEPSEEK_BASE_URL: {
    description: 'DeepSeek API base URL',
    feature: 'AI Integration',
    default: 'https://api.deepseek.com'
  },
  
  // Together.ai (Fallback AI Provider)
  TOGETHER_API_KEY: {
    description: 'Together.ai API key for AI fallback when DeepSeek fails',
    sensitive: true,
    feature: 'AI Integration Fallback'
  },
  
  // Stripe
  STRIPE_SECRET_KEY: {
    description: 'Stripe secret key for payments',
    sensitive: true,
    feature: 'Payment Processing'
  },
  STRIPE_PUBLISHABLE_KEY: {
    description: 'Stripe publishable key',
    feature: 'Payment Processing'
  },
  STRIPE_WEBHOOK_SECRET: {
    description: 'Stripe webhook signing secret',
    sensitive: true,
    feature: 'Payment Processing'
  },
  
  // Storage
  STORAGE_BUCKET: {
    description: 'Google Cloud Storage bucket name',
    feature: 'Media Storage'
  },
  CDN_BASE_URL: {
    description: 'CDN base URL for media serving',
    feature: 'Media Storage'
  },
  
  // Google Cloud
  GOOGLE_CLOUD_PROJECT_ID: {
    description: 'Google Cloud project ID',
    feature: 'Cloud Services'
  },
  GOOGLE_APPLICATION_CREDENTIALS: {
    description: 'Path to Google Cloud credentials file',
    feature: 'Cloud Services'
  }
};

/**
 * Validate environment variables
 * @param {boolean} exitOnError - Exit process on validation error
 * @returns {Object} Validation results
 */
export const validateEnvironment = (exitOnError = true) => {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    features: {
      ai: false,
      payments: false,
      storage: false
    }
  };
  
  // Check required variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];
    
    if (!value && !config.default && config.required !== false) {
      results.valid = false;
      results.errors.push({
        variable: key,
        message: `Missing required environment variable: ${key} - ${config.description}`
      });
      continue;
    }
    
    // Use default if not set
    if (!value && config.default) {
      process.env[key] = config.default;
      results.warnings.push({
        variable: key,
        message: `Using default value for ${key}: ${config.default}`
      });
    }
    
    // Validate value
    if (config.validate && value) {
      if (!config.validate(value)) {
        results.valid = false;
        results.errors.push({
          variable: key,
          message: `Invalid value for ${key}: ${value}`
        });
      }
    }
  }
  
  // Check optional variables and determine available features
  for (const [key, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[key];
    
    if (!value) {
      results.warnings.push({
        variable: key,
        message: `Optional variable not set: ${key} - ${config.description} (Feature: ${config.feature})`
      });
    }
  }
  
  // Determine feature availability
  results.features.ai = !!(process.env.DEEPSEEK_API_KEY);
  results.features.aiFallback = !!(process.env.TOGETHER_API_KEY);
  results.features.payments = !!(
    process.env.STRIPE_SECRET_KEY && 
    process.env.STRIPE_PUBLISHABLE_KEY && 
    process.env.STRIPE_WEBHOOK_SECRET
  );
  results.features.storage = !!(
    process.env.STORAGE_BUCKET || 
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  
  // Log results
  if (results.errors.length > 0) {
    logger.error('Environment validation failed:', {
      errors: results.errors.length,
      details: results.errors
    });
  }
  
  if (results.warnings.length > 0) {
    logger.warn('Environment validation warnings:', {
      warnings: results.warnings.length,
      details: results.warnings.filter(w => !OPTIONAL_ENV_VARS[w.variable]?.sensitive)
    });
  }
  
  logger.info('Features enabled:', results.features);
  
  // Exit if validation failed and exitOnError is true
  if (!results.valid && exitOnError) {
    logger.error('Exiting due to environment validation errors');
    process.exit(1);
  }
  
  return results;
};

/**
 * Get safe environment summary (excludes sensitive values)
 * @returns {Object} Safe environment summary
 */
export const getEnvironmentSummary = () => {
  const summary = {
    environment: process.env.NODE_ENV,
    server: {
      port: process.env.PORT,
      url: `http://localhost:${process.env.PORT}`
    },
    services: {},
    features: {}
  };
  
  // Add service status
  summary.services.firebase = !!process.env.FIREBASE_PROJECT_ID;
  summary.services.redis = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  };
  
  // Add feature status
  const validation = validateEnvironment(false);
  summary.features = validation.features;
  
  // Add non-sensitive configuration
  summary.frontend = {
    url: process.env.FRONTEND_URL
  };
  
  if (summary.features.payments) {
    summary.stripe = {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    };
  }
  
  if (summary.features.storage) {
    summary.storage = {
      bucket: process.env.STORAGE_BUCKET,
      cdnUrl: process.env.CDN_BASE_URL
    };
  }
  
  return summary;
};

/**
 * Create example .env file content
 * @returns {string} Example .env content
 */
export const generateExampleEnv = () => {
  let content = '# AI Messaging Platform Environment Variables\n';
  content += '# Copy this to .env and fill in your values\n\n';
  
  content += '# Required Variables\n';
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    content += `# ${config.description}\n`;
    if (config.default) {
      content += `${key}=${config.default}\n`;
    } else {
      content += `${key}=\n`;
    }
    content += '\n';
  }
  
  content += '\n# Optional Variables (Enable Features)\n';
  for (const [key, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    content += `# ${config.description} (${config.feature})\n`;
    content += `# ${key}=\n\n`;
  }
  
  return content;
};

export default {
  validateEnvironment,
  getEnvironmentSummary,
  generateExampleEnv
}; 