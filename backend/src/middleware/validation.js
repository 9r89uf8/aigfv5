/**
 * Validation middleware
 * Centralizes input validation and sanitization
 */
import { validationResult } from 'express-validator';
import { ApiError } from './errorHandler.js';

/**
 * Check validation results middleware
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw new ApiError(400, `Validation failed: ${errorMessages.join(', ')}`, errors.array());
  }
  
  next();
};

/**
 * Sanitize input middleware
 * Removes potentially dangerous characters
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove null bytes and trim
      return obj.replace(/\0/g, '').trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj !== null && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };
  
  // Sanitize body, params, and query
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  if (req.query) req.query = sanitize(req.query);
  
  next();
};

/**
 * Common validation patterns
 */
export const validators = {
  // Username validation
  username: {
    isLength: { min: 3, max: 20 },
    matches: /^[a-zA-Z0-9_]+$/,
    errorMessage: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
  },
  
  // Email validation
  email: {
    isEmail: true,
    normalizeEmail: true,
    errorMessage: 'Please provide a valid email address'
  },
  
  // UUID validation
  uuid: {
    isUUID: 4,
    errorMessage: 'Invalid ID format'
  },
  
  // URL validation
  url: {
    isURL: {
      protocols: ['http', 'https'],
      require_protocol: true
    },
    errorMessage: 'Please provide a valid URL'
  },
  
  // Pagination validation
  pagination: {
    limit: {
      isInt: { min: 1, max: 100 },
      toInt: true,
      optional: true,
      errorMessage: 'Limit must be between 1 and 100'
    },
    offset: {
      isInt: { min: 0 },
      toInt: true,
      optional: true,
      errorMessage: 'Offset must be 0 or greater'
    }
  }
};

export default {
  checkValidation,
  sanitizeInput,
  validators
}; 