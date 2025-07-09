/**
 * Simplified Socket Client
 * Single-file implementation for WebSocket communication
 */
import { io } from 'socket.io-client';
import {auth} from "@/lib/firebase/config";
import EventEmitter from 'events';

// Configuration
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Socket Events
const EVENTS = {
  // Connection Events
  CONNECTION: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CONNECT_ERROR: 'connect_error',
    RECONNECT: 'reconnect',
    RECONNECT_ATTEMPT: 'reconnect_attempt',
    RECONNECT_FAILED: 'reconnect_failed',
  },
  
  // Authentication Events
  AUTH: {
    ERROR: 'auth_error',
    SUCCESS: 'auth_success',
    TOKEN_EXPIRED: 'token_expired',
  },
  
  // Message Events
  MESSAGE: {
    SEND: 'message:send',
    RECEIVE: 'message:receive',
    RETRY: 'message:retry',
    READ: 'message:read',
    DELIVERED: 'message:delivered',
    STATUS: 'message:status',
    DELETE: 'message:delete',
    EDIT: 'message:edit',
    LIKED: 'message:liked',
  },
  
  // Conversation Events
  CONVERSATION: {
    JOIN: 'conversation:join',
    LEAVE: 'conversation:leave',
    LIST: 'conversation:list',
    MESSAGES: 'conversation:messages',
    CREATE: 'conversation:create',
    UPDATE: 'conversation:update',
    DELETE: 'conversation:delete',
    MEMBER_JOIN: 'conversation:member_join',
    MEMBER_LEAVE: 'conversation:member_leave',
  },
  
  // Typing Events
  TYPING: {
    START: 'typing:start',
    STOP: 'typing:stop',
    INDICATOR: 'typing:indicator',
  },
  
  // Usage Events
  USAGE: {
    UPDATE: 'usage:update',
    LIMIT_REACHED: 'usage:limit_reached',
    WARNING: 'usage:warning',
  },
  
  // Error Events
  ERROR: {
    GENERAL: 'error',
    VALIDATION: 'validation_error',
    RATE_LIMIT: 'rate_limit_error',
    SERVER: 'server_error',
  },
};

// Socket.IO connection options
const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

/**
 * SocketClient Class
 * Manages WebSocket connections and communication
 */
class SocketClient {
  constructor() {
    // Socket instance
    this.socket = null;
    
    // Connection state
    this._isConnecting = false;
    this._lastError = null;
    
    // Event emitter for local events
    this._eventEmitter = new EventEmitter();
    
    // Debug mode
    this.debug = process.env.NODE_ENV === 'development';
  }
  
  // Getters for connection state
  get isConnected() {
    return this.socket?.connected ?? false;
  }
  
  get isConnecting() {
    return this._isConnecting;
  }
  
  get connectionError() {
    return this._lastError;
  }
  
  get socketId() {
    return this.socket?.id ?? null;
  }
  
  /**
   * Connect to socket server
   * @returns {Promise<void>}
   */
  async connect() {
    // Prevent multiple simultaneous connection attempts
    if (this._isConnecting) {
      if (this.debug) console.log('[Socket] Already connecting...');
      return this._waitForConnection();
    }
    
    if (this.isConnected) {
      if (this.debug) console.log('[Socket] Already connected');
      return;
    }
    
    try {
      this._isConnecting = true;
      this._lastError = null;
      
      // Wait for Firebase authentication
      if (this.debug) console.log('[Socket] Waiting for authentication...');
      const token = await this._waitForAuth();
      
      // Create socket connection
      if (this.debug) console.log('[Socket] Creating socket connection...');
      this.socket = io(SOCKET_URL, {
        ...SOCKET_OPTIONS,
        auth: { token },
      });
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Wait for connection to be established
      await this._waitForConnection();
      
      if (this.debug) console.log('[Socket] Connected successfully');
      
    } catch (error) {
      this._handleError(error, 'connect');
    } finally {
      this._isConnecting = false;
    }
  }
  
  /**
   * Disconnect from socket server
   */
  disconnect() {
    if (this.socket) {
      if (this.debug) console.log('[Socket] Disconnecting...');
      
      // Remove all listeners
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear local event emitter
    this._eventEmitter.removeAllListeners();
    
    // Reset state
    this._isConnecting = false;
    this._lastError = null;
  }
  
  /**
   * Set up socket event listeners
   * @private
   */
  _setupEventListeners() {
    // Connection events
    this.socket.on(EVENTS.CONNECTION.CONNECT, () => {
      if (this.debug) console.log('[Socket] Connected', { id: this.socket.id });
      this._eventEmitter.emit(EVENTS.CONNECTION.CONNECT);
    });
    
    this.socket.on(EVENTS.CONNECTION.DISCONNECT, (reason) => {
      if (this.debug) console.log('[Socket] Disconnected', { reason });
      this._eventEmitter.emit(EVENTS.CONNECTION.DISCONNECT, reason);
    });
    
    this.socket.on(EVENTS.CONNECTION.CONNECT_ERROR, (error) => {
      if (this.debug) console.error('[Socket] Connection error:', error);
      this._lastError = { message: error.message, code: 'CONNECT_ERROR' };
      this._eventEmitter.emit(EVENTS.CONNECTION.CONNECT_ERROR, error);
    });
    
    // Token refresh handling
    this.socket.on(EVENTS.AUTH.TOKEN_EXPIRED, async () => {
      if (this.debug) console.log('[Socket] Token expired, refreshing...');
      try {
        const newToken = await this._waitForAuth();
        this.socket.auth = { token: newToken };
        this.socket.disconnect().connect();
      } catch (error) {
        this._handleError(error, 'token_refresh');
      }
    });
    
    // Re-emit all server events locally
    const allEvents = Object.values(EVENTS).flatMap(category => Object.values(category));
    allEvents.forEach(event => {
      this.socket.on(event, (data) => {
        if (this.debug && !event.includes('ping')) {
          console.log(`[Socket] Event received: ${event}`, data);
        }

        
        this._eventEmitter.emit(event, data);
      });
    });
    
    // Debug: log all events
    if (this.debug) {
      this.socket.onAny((event, ...args) => {
        if (!event.includes('ping') && !event.includes('pong')) {
          console.log(`[Socket] Event: ${event}`, args);
        }
      });
    }
  }
  
  /**
   * Wait for Firebase authentication
   * @private
   * @returns {Promise<string>} Auth token
   */
  async _waitForAuth() {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const user = auth.currentUser;
      if (user) {
        try {
          const token = await user.getIdToken();
          return token;
        } catch (error) {
          throw new Error(`Failed to get auth token: ${error.message}`);
        }
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Authentication timeout');
  }
  
  /**
   * Wait for socket connection to be established
   * @private
   * @returns {Promise<void>}
   */
  async _waitForConnection() {
    if (this.isConnected) return;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, SOCKET_OPTIONS.timeout);
      
      const onConnect = () => {
        clearTimeout(timeout);
        this.socket.off(EVENTS.CONNECTION.CONNECT, onConnect);
        this.socket.off(EVENTS.CONNECTION.CONNECT_ERROR, onError);
        resolve();
      };
      
      const onError = (error) => {
        clearTimeout(timeout);
        this.socket.off(EVENTS.CONNECTION.CONNECT, onConnect);
        this.socket.off(EVENTS.CONNECTION.CONNECT_ERROR, onError);
        reject(error);
      };
      
      this.socket.once(EVENTS.CONNECTION.CONNECT, onConnect);
      this.socket.once(EVENTS.CONNECTION.CONNECT_ERROR, onError);
    });
  }
  
  /**
   * Emit event with acknowledgment
   * @private
   * @param {string} event - Event name
   * @param {object} data - Event data
   * @returns {Promise<any>} Server response
   */
  async _emitWithAck(event, data) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }
    
    const requestId = Math.random().toString(36).substr(2, 9);

    
    try {
      const response = await this.socket.timeout(5000).emitWithAck(event, {
        ...data,
        requestId,
      });

      
      return response;
    } catch (error) {
      if (error.message === 'timeout') {
        throw new Error(`Request timeout for ${event}`);
      }
      throw error;
    }
  }
  
  /**
   * Send event with retry logic
   * @private
   * @param {string} event - Event name
   * @param {object} data - Event data
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<any>} Server response
   */
  async _sendWithRetry(event, data, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this._emitWithAck(event, data);
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }

        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  /**
   * Handle errors consistently
   * @private
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  _handleError(error, context) {
    const standardError = {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      context,
    };
    
    this._lastError = standardError;
    this._eventEmitter.emit('error', standardError);

    
    throw error;
  }
  
  // ==========================================
  // PUBLIC API METHODS
  // ==========================================
  
  /**
   * Send a message
   * @param {object} data - Message data
   * @returns {Promise<object>} Server response
   */
  async sendMessage(data) {
    return this._sendWithRetry(EVENTS.MESSAGE.SEND, data);
  }
  
  /**
   * Join a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<object>} Server response
   */
  async joinConversation(conversationId) {
    const response = await this._sendWithRetry(EVENTS.CONVERSATION.JOIN, { conversationId });
    return response;
  }
  
  /**
   * Leave a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<object>} Server response
   */
  async leaveConversation(conversationId) {
    return this._sendWithRetry(EVENTS.CONVERSATION.LEAVE, { conversationId });
  }
  
  /**
   * Get conversation list
   * @param {object} options - Query options
   * @returns {Promise<object>} Conversations data
   */
  async getConversations(options = {}) {
    return this._sendWithRetry(EVENTS.CONVERSATION.LIST, options);
  }
  
  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Messages data
   */
  async getMessages(conversationId, options = {}) {
    return this._sendWithRetry(EVENTS.CONVERSATION.MESSAGES, {
      conversationId,
      ...options,
    });
  }
  
  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} conversationId - Conversation ID
   */
  markMessageRead(messageId, conversationId) {
    // Fire and forget
    this.socket?.emit(EVENTS.MESSAGE.READ, { messageId, conversationId });
  }
  
  /**
   * Retry a failed message
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @param {string} characterId - Character ID
   * @returns {Promise<object>} Server response
   */
  async retryMessage(conversationId, messageId, characterId) {
    return this._sendWithRetry(EVENTS.MESSAGE.RETRY, {
      conversationId,
      messageId,
      characterId,
    });
  }
  
  /**
   * Send typing indicator
   * @param {string} conversationId - Conversation ID
   * @param {boolean} isTyping - Whether user is typing
   */
  sendTyping(conversationId, isTyping) {
    // Fire and forget
    const event = isTyping ? EVENTS.TYPING.START : EVENTS.TYPING.STOP;
    this.socket?.emit(event, { conversationId });
  }
  
  // ==========================================
  // EVENT BUS METHODS
  // ==========================================
  
  /**
   * Subscribe to socket events
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   */
  on(event, handler) {
    this._eventEmitter.on(event, handler);
  }
  
  /**
   * Unsubscribe from socket events
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   */
  off(event, handler) {
    this._eventEmitter.off(event, handler);
  }
  
  /**
   * Subscribe to socket event once
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   */
  once(event, handler) {
    this._eventEmitter.once(event, handler);
  }
  
  /**
   * Get connection status
   * @returns {object} Status information
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      socketId: this.socketId,
      lastError: this.connectionError,
    };
  }
}

// Create and export singleton instance
const socketClient = new SocketClient();
export default socketClient;

// Also export the class for testing
export { SocketClient, EVENTS };