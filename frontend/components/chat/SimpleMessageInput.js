/**
 * Simple Message Input
 * Clean message input component with send button
 */
'use client';

import { useState, useRef, useEffect } from 'react';

export default function SimpleMessageInput({ 
  onSendMessage, 
  onTyping, 
  disabled = false, 
  placeholder = "Type a message..." 
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Handle typing indicators
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, onTyping]);

  // Stop typing when component unmounts
  useEffect(() => {
    return () => {
      if (isTyping) {
        onTyping?.(false);
      }
    };
  }, [isTyping, onTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isSending) {
      return;
    }

    try {
      setIsSending(true);
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }

      // Send message
      await onSendMessage(trimmedMessage);
      
      // Clear input
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
  };

  const canSend = message.trim() && !disabled && !isSending;

  return (
    <div className="flex items-end space-x-3">
      {/* Message Input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={`w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />
        
        {/* Character count (optional) */}
        {message.length > 100 && (
          <div className="absolute bottom-2 right-12 text-xs text-gray-400">
            {message.length}/500
          </div>
        )}
      </div>

      {/* Send Button */}
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={!canSend}
        className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
          canSend
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isSending ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
        ) : (
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
            />
          </svg>
        )}
      </button>
    </div>
  );
}