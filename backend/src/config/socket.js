/**
 * Simple Socket.io configuration
 * Basic WebSocket connections without Redis adapter
 */
import { Server } from 'socket.io';
import { config } from './environment.js';
import logger from '../utils/logger.js';

let io = null;

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 * @returns {Server} Socket.io instance
 */
export const initializeSocket = (server) => {
  try {
    // Create Socket.io server
    io = new Server(server, {
      cors: {
        origin: config.isDevelopment 
          ? ['http://localhost:3001', 'http://localhost:3000']
          : process.env.FRONTEND_URL,
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    logger.info('Socket.io server initialized');
    return io;
  } catch (error) {
    logger.error('Failed to initialize Socket.io:', error);
    throw error;
  }
};

/**
 * Get Socket.io instance
 * @returns {Server} Socket.io instance
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit event to specific user
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const emitToUser = (userId, event, data) => {
  try {
    const socketIO = getSocketIO();
    socketIO.to(`user:${userId}`).emit(event, data);
  } catch (error) {
    logger.error('Error emitting to user:', error);
  }
};

/**
 * Emit event to conversation room
 * @param {string} userId - User ID
 * @param {string} characterId - Character ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const emitToConversation = (userId, characterId, event, data) => {
  try {
    const socketIO = getSocketIO();
    const room = `conversation:${userId}_${characterId}`;
    socketIO.to(room).emit(event, data);
  } catch (error) {
    logger.error('Error emitting to conversation:', error);
  }
};

/**
 * Socket.io event names
 */
export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Message events
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVE: 'message:receive',
  MESSAGE_STATUS: 'message:status',
  MESSAGE_READ: 'message:read',
  
  // Typing events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  
  // Conversation events
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',
  
  // Error events
  MESSAGE_ERROR: 'message:error'
};

export default {
  initializeSocket,
  getSocketIO,
  emitToUser,
  emitToConversation,
  SOCKET_EVENTS
};