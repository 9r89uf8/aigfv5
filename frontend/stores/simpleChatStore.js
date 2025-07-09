/**
 * Simple Chat Store
 * Replaces the complex modular chat store with a simple solution
 * that matches our simplified backend
 */
'use client';

import { create } from 'zustand';
import socketClient from '@/lib/socket';
import apiClient from '@/lib/api/client';

const useSimpleChatStore = create((set, get) => ({
  // Connection state
  socket: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  
  // Current conversation
  currentConversationId: null,
  currentCharacterId: null,
  
  // Messages - simple array organized by conversation
  conversations: {}, // { conversationId: { messages: [], character: {} } }
  
  // Typing indicators
  typingUsers: new Set(),
  
  // Initialize socket connection
  initialize: async () => {
    const state = get();
    
    // Don't initialize if already connected or connecting
    if (state.isConnected || state.isConnecting) {
      console.log('Socket already connected or connecting, skipping initialization');
      return;
    }
    
    try {
      set({ isConnecting: true, connectionError: null });
      
      // Connect to socket with auth check
      try {
        await socketClient.connect();
      } catch (connectError) {
        console.error('Socket connection error:', connectError);
        
        // Provide more helpful error messages
        let errorMessage = connectError.message;
        
        if (connectError.message?.includes('Authentication required') || 
            connectError.message?.includes('Authentication timeout')) {
          errorMessage = 'Waiting for authentication. The page will reload automatically...';
          
          // For auth issues, wait a bit and let the page retry
          setTimeout(() => {
            if (!get().isConnected) {
              console.log('Auth not ready after timeout, suggesting page reload');
              set({ connectionError: 'Authentication is taking longer than expected. Please reload the page.' });
            }
          }, 3000);
        }
        
        throw new Error(errorMessage);
      }
      
      // Set up event listeners
      get().setupSocketListeners();
      
      set({ 
        isConnected: true, 
        isConnecting: false,
        socket: socketClient
      });
      
      console.log('Simple chat store initialized successfully');
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      set({ 
        isConnecting: false, 
        connectionError: error.message,
        isConnected: false
      });
      throw error;
    }
  },
  
  // Set up socket event listeners
  setupSocketListeners: () => {
    // Message received
    socketClient.on('message:receive', (data) => {
      console.log('[ChatStore DEBUG] message:receive handler called:', {
        data,
        hasMessage: !!data.message,
        conversationId: data.conversationId,
        currentConversationId: get().currentConversationId
      });
      
      const { message, conversationId } = data;
      get().addMessageToConversation(conversationId, message);
    });
    
    // Typing indicators
    socketClient.on('typing:start', (data) => {
      set((state) => ({
        typingUsers: new Set([...state.typingUsers, data.userId])
      }));
    });
    
    socketClient.on('typing:stop', (data) => {
      set((state) => {
        const newTypingUsers = new Set(state.typingUsers);
        newTypingUsers.delete(data.userId);
        return { typingUsers: newTypingUsers };
      });
    });
    
    // Connection events
    socketClient.on('connected', () => {
      console.log('Socket connected event received');
      set({ isConnected: true, connectionError: null });
    });
    
    socketClient.on('disconnected', () => {
      console.log('Socket disconnected event received');
      set({ isConnected: false });
    });
    
    socketClient.on('error', (data) => {
      console.error('Socket error event:', data);
      set({ connectionError: data.error });
    });
    
    socketClient.on('auth_error', (data) => {
      console.error('Socket auth error event:', data);
      set({ connectionError: 'Authentication error: ' + (data.error || 'Please login again') });
    });
    
    // Message error handling
    socketClient.on('message:error', (data) => {
      console.error('Message error:', data);
      // Could add error message to UI here
    });
  },
  
  // Join a conversation
  joinConversation: async (characterId) => {
    try {
      const { socket } = get();
      if (!socket || !socket.isConnected) {
        throw new Error('Socket not connected');
      }
      
      // Get user from auth store
      let user;
      try {
        const authStore = await import('@/stores/authStore').then(m => m.default);
        user = authStore.getState().user;
        
        // Double-check auth is ready
        if (!user || !authStore.getState().initialized) {
          throw new Error('Authentication not ready');
        }
      } catch (authError) {
        console.error('Auth check failed in joinConversation:', authError);
        throw new Error('Please wait for authentication to complete');
      }
      
      const conversationId = `${user.uid}_${characterId}`;
      
      // Join conversation via socket
      const response = await socketClient.joinConversation(conversationId);
      
      // Initialize conversation in store if not exists
      if (!get().conversations[conversationId]) {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              messages: response.messages || [],
              character: response.conversation?.character || null
            }
          }
        }));
      }
      
      // Update current conversation
      set({
        currentConversationId: conversationId,
        currentCharacterId: characterId
      });
      
      console.log('Joined conversation:', conversationId);
      return { conversationId, messages: response.messages || [] };
    } catch (error) {
      console.error('Failed to join conversation:', error);
      throw error;
    }
  },
  
  // Leave current conversation
  leaveConversation: () => {
    const { currentConversationId, socket } = get();
    
    if (currentConversationId && socket && socket.isConnected) {
      socketClient.leaveConversation(currentConversationId);
    }
    
    set({
      currentConversationId: null,
      currentCharacterId: null
    });
  },
  
  // Send a message
  sendMessage: async (content, type = 'text') => {
    try {
      const { currentConversationId, currentCharacterId, socket } = get();
      
      if (!socket || !socket.isConnected) {
        throw new Error('Socket not connected');
      }
      
      if (!currentConversationId || !currentCharacterId) {
        throw new Error('No active conversation');
      }
      
      // Create temporary user message for optimistic update
      const tempMessage = {
        id: 'temp_' + Date.now(),
        sender: 'user',
        type,
        content,
        timestamp: Date.now(),
        isTemporary: true
      };
      
      // Add temporary message to UI
      get().addMessageToConversation(currentConversationId, tempMessage);
      
      // Send message via socket
      const response = await socketClient.sendMessage({
        characterId: currentCharacterId,
        content,
        type
      });
      
      // Remove temporary message and add real message
      get().removeTemporaryMessage(currentConversationId, tempMessage.id);
      
      if (response.message) {
        get().addMessageToConversation(currentConversationId, response.message);
      }
      
      return response;
    } catch (error) {
      // Remove temporary message on error
      const { currentConversationId } = get();
      if (currentConversationId) {
        get().removeTemporaryMessage(currentConversationId, 'temp_' + Date.now());
      }
      
      console.error('Failed to send message:', error);
      throw error;
    }
  },
  
  // Add message to conversation
  addMessageToConversation: (conversationId, message) => {
    set((state) => {
      const conversation = state.conversations[conversationId] || { messages: [] };
      const existingIndex = conversation.messages.findIndex(m => m.id === message.id);
      
      let updatedMessages;
      if (existingIndex >= 0) {
        // Update existing message
        updatedMessages = [...conversation.messages];
        updatedMessages[existingIndex] = message;
      } else {
        // Add new message in chronological order
        updatedMessages = [...conversation.messages, message].sort(
          (a, b) => a.timestamp - b.timestamp
        );
      }
      
      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...conversation,
            messages: updatedMessages
          }
        }
      };
    });
  },
  
  // Remove temporary message
  removeTemporaryMessage: (conversationId, tempId) => {
    set((state) => {
      const conversation = state.conversations[conversationId];
      if (!conversation) return state;
      
      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...conversation,
            messages: conversation.messages.filter(m => m.id !== tempId)
          }
        }
      };
    });
  },
  
  // Get messages for current conversation
  getMessages: () => {
    const { currentConversationId, conversations } = get();
    if (!currentConversationId || !conversations[currentConversationId]) {
      return [];
    }
    return conversations[currentConversationId].messages || [];
  },
  
  // Send typing indicator
  sendTyping: (isTyping) => {
    const { currentConversationId, socket } = get();
    if (socket && socket.isConnected && currentConversationId) {
      socketClient.sendTyping(currentConversationId, isTyping);
    }
  },
  
  // Get typing users
  getTypingUsers: () => {
    return Array.from(get().typingUsers);
  },
  
  // Load messages from API (for older messages)
  loadMessages: async (conversationId, limit = 50) => {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}/messages`, {
        params: { limit }
      });
      
      if (response.data.success) {
        // Add messages to store
        response.data.messages.forEach(message => {
          get().addMessageToConversation(conversationId, message);
        });
        
        return response.data.messages;
      }
      
      throw new Error(response.data.error || 'Failed to load messages');
    } catch (error) {
      console.error('Failed to load messages:', error);
      throw error;
    }
  },
  
  // Cleanup and disconnect
  cleanup: () => {
    const { socket } = get();
    
    // Leave current conversation
    get().leaveConversation();
    
    // Disconnect socket
    if (socket) {
      socketClient.disconnect();
    }
    
    // Reset state
    set({
      socket: null,
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      currentConversationId: null,
      currentCharacterId: null,
      conversations: {},
      typingUsers: new Set()
    });
  }
}));

export default useSimpleChatStore;