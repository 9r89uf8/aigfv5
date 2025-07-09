/**
 * Socket.io authentication middleware
 * Verifies user authentication for WebSocket connections
 */
import { verifyIdToken } from '../config/firebase.js';
import { getUserById } from '../services/userService.js';
import logger from '../utils/logger.js';

/**
 * Verify socket authentication token
 * @param {Socket} socket - Socket.io socket
 * @param {Function} next - Next middleware
 */
export const verifySocketToken = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const characterId = socket.handshake.auth?.characterId || socket.handshake.query?.characterId;
    
    if (!token) {
      logger.warn('Socket connection attempt without token', { 
        address: socket.handshake.address 
      });
      return next(new Error('Authentication required'));
    }

    try {
      // Verify Firebase token
      const decodedToken = await verifyIdToken(token);
      
      // Get user from database
      const user = await getUserById(decodedToken.uid);
      
      if (!user) {
        logger.warn('Socket connection attempt with invalid user', { 
          uid: decodedToken.uid 
        });
        return next(new Error('User not found'));
      }
      
      if (!user.isActive) {
        logger.warn('Socket connection attempt with inactive user', { 
          uid: user.uid 
        });
        return next(new Error('Account deactivated'));
      }
      
      // Attach user data to socket
      socket.userId = user.uid;
      socket.user = {
        uid: user.uid,
        email: user.email,
        username: user.username,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt
      };
      
      // Attach character ID if provided
      if (characterId) {
        socket.characterId = characterId;
      }
      
      logger.debug('Socket authenticated', { 
        userId: user.uid, 
        username: user.username,
        characterId 
      });
      
      next();
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        logger.warn('Socket connection with expired token');
        return next(new Error('Token expired'));
      } else if (error.code === 'auth/argument-error') {
        logger.warn('Socket connection with invalid token format');
        return next(new Error('Invalid token'));
      }
      
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  } catch (error) {
    logger.error('Socket middleware error:', error);
    next(new Error('Internal server error'));
  }
};

/**
 * Rate limit socket events
 * @param {number} maxEvents - Maximum events per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Socket middleware
 */
export const socketRateLimit = (maxEvents = 30, windowMs = 5000) => {
  const clients = new Map();
  
  return (socket, next) => {
    const clientId = socket.userId || socket.id;
    const now = Date.now();
    
    // Get or create client record
    let client = clients.get(clientId);
    if (!client) {
      client = { count: 0, resetTime: now + windowMs };
      clients.set(clientId, client);
    }
    
    // Reset if window expired
    if (now > client.resetTime) {
      client.count = 0;
      client.resetTime = now + windowMs;
    }
    
    // Check rate limit
    if (client.count >= maxEvents) {
      logger.warn('Socket rate limit exceeded', { 
        clientId, 
        count: client.count 
      });
      return next(new Error('Rate limit exceeded'));
    }
    
    // Increment counter
    client.count++;
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const cutoff = now - windowMs * 2;
      for (const [id, data] of clients.entries()) {
        if (data.resetTime < cutoff) {
          clients.delete(id);
        }
      }
    }
    
    next();
  };
};

/**
 * Rate limit wrapper for socket event handlers
 * @param {number} maxEvents - Maximum events per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Event handler wrapper
 */
export const socketEventRateLimit = (maxEvents = 30, windowMs = 5000) => {
  const clients = new Map();
  
  return (handler) => {
    return function(data, callback) {
      const socket = this; // 'this' refers to the socket instance
      const clientId = socket.userId || socket.id;
      const now = Date.now();
      
      // Get or create client record
      let client = clients.get(clientId);
      if (!client) {
        client = { count: 0, resetTime: now + windowMs };
        clients.set(clientId, client);
      }
      
      // Reset if window expired
      if (now > client.resetTime) {
        client.count = 0;
        client.resetTime = now + windowMs;
      }
      
      // Check rate limit
      if (client.count >= maxEvents) {
        logger.warn('Socket event rate limit exceeded', { 
          clientId, 
          count: client.count,
          event: 'socket_event'
        });
        
        // If callback exists, send error response
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Rate limit exceeded' });
        }
        return;
      }
      
      // Increment counter
      client.count++;
      
      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance
        const cutoff = now - windowMs * 2;
        for (const [id, clientData] of clients.entries()) {
          if (clientData.resetTime < cutoff) {
            clients.delete(id);
          }
        }
      }
      
      // Call the original handler
      handler.call(socket, data, callback);
    };
  };
};

/**
 * Verify premium status for premium features
 * @param {Socket} socket - Socket.io socket
 * @param {Function} next - Next middleware
 */
export const requireSocketPremium = (socket, next) => {
  if (!socket.user) {
    return next(new Error('Authentication required'));
  }
  
  if (!socket.user.isPremium) {
    logger.warn('Socket premium feature access denied', { 
      userId: socket.userId 
    });
    return next(new Error('Premium subscription required'));
  }
  
  // Check if premium has expired
  if (socket.user.premiumExpiresAt && new Date(socket.user.premiumExpiresAt) < new Date()) {
    logger.warn('Socket premium expired', { 
      userId: socket.userId 
    });
    return next(new Error('Premium subscription expired'));
  }
  
  next();
};

/**
 * Log socket events for debugging
 * @param {string} eventName - Event name
 * @returns {Function} Socket middleware
 */
export const logSocketEvent = (eventName) => {
  return (socket, next) => {
    logger.debug(`Socket event: ${eventName}`, {
      userId: socket.userId,
      socketId: socket.id,
      characterId: socket.characterId
    });
    next();
  };
};

export default {
  verifySocketToken,
  socketRateLimit,
  socketEventRateLimit,
  requireSocketPremium,
  logSocketEvent
}; 