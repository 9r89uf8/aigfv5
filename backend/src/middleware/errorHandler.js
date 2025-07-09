/**
 * Error handling middleware
 * Centralizes error responses and logging
 */
import logger from '../utils/logger.js';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ApiError(404, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ApiError(400, message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message);
  }

  // Firebase auth errors
  if (err.code?.startsWith('auth/')) {
    const message = getFirebaseAuthErrorMessage(err.code);
    error = new ApiError(401, message);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * 404 Not Found handler
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`
    }
  });
};

/**
 * Get user-friendly Firebase auth error messages
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly message
 */
const getFirebaseAuthErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/invalid-token': 'Invalid authentication token',
    'auth/token-expired': 'Authentication token has expired',
    'auth/invalid-credential': 'Invalid credentials provided',
    'auth/user-not-found': 'User not found',
    'auth/wrong-password': 'Incorrect password'
  };
  
  return errorMessages[errorCode] || 'Authentication error';
};

export default {
  ApiError,
  asyncHandler,
  errorHandler,
  notFound
}; 