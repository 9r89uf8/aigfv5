/**
 * Simple Authentication middleware
 * Verifies Firebase ID tokens
 */
import { verifyIdToken } from '../config/firebase.js';
import logger from '../utils/logger.js';

/**
 * Verify Firebase token and attach user to request
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const authenticate = async (req, res, next) => {
  let token;
  
  // Extract token from Authorization header or query param
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No authentication token provided'
    });
  }
  
  try {
    // Verify the Firebase token
    const decodedToken = await verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

/**
 * Optional authentication - attaches user if token is present but doesn't require it
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export const optionalAuth = async (req, res, next) => {
  let token;
  
  // Extract token from Authorization header or query param
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return next();
  }
  
  try {
    // Verify the Firebase token
    const decodedToken = await verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
  } catch (error) {
    // For optional auth, just log the error and continue
    logger.debug('Optional authentication failed:', error.message);
  }
  
  next();
};

export default {
  authenticate,
  optionalAuth
};