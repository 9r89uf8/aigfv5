/**
 * Simple Chat Interface
 * Clean, simple chat interface that works with our simplified backend
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import useSimpleChatStore from '@/stores/simpleChatStore';
import SimpleMessageBubble from './SimpleMessageBubble';
import SimpleMessageInput from './SimpleMessageInput';
import SimpleTypingIndicator from './SimpleTypingIndicator';

export default function SimpleChatInterface({ character, characterId, className = '' }) {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const {
    getMessages,
    getTypingUsers,
    isConnected,
    sendMessage,
    sendTyping,
    loadMessages,
    currentConversationId
  } = useSimpleChatStore();

  const messages = getMessages();
  const typingUsers = getTypingUsers();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Load initial messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId).catch(console.error);
    }
  }, [currentConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content) => {
    try {
      await sendMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (isTyping) => {
    sendTyping(isTyping);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center py-4">
            <div className="inline-flex items-center px-3 py-2 rounded-full bg-yellow-100 text-yellow-800 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              Connecting...
            </div>
          </div>
        )}

        {/* Welcome Message */}
        {messages.length === 0 && isConnected && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <img
                src={character?.avatar || '/default-avatar.png'}
                alt={character?.name || 'Character'}
                className="w-12 h-12 rounded-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start a conversation with {character?.name || 'the character'}
            </h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              {character?.description || 'Send a message to begin your conversation!'}
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <SimpleMessageBubble
            key={message.id}
            message={message}
            character={character}
            isTemporary={message.isTemporary}
          />
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <SimpleTypingIndicator 
            character={character}
            typingUsers={typingUsers}
          />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <SimpleMessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={!isConnected}
          placeholder={
            !isConnected 
              ? "Connecting..." 
              : `Message ${character?.name || 'character'}...`
          }
        />
      </div>
    </div>
  );
}