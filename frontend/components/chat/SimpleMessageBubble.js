/**
 * Simple Message Bubble
 * Clean message display component
 */
'use client';

import { useState } from 'react';

export default function SimpleMessageBubble({ message, character, isTemporary = false }) {
  const [imageError, setImageError] = useState(false);
  
  const isUser = message.sender === 'user';
  const isCharacter = message.sender === 'character';

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl`}>
        
        {/* Avatar */}
        {isCharacter && (
          <div className="flex-shrink-0 mr-3">
            <img
              src={character?.avatar || '/default-avatar.png'}
              alt={character?.name || 'Character'}
              className="w-8 h-8 rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Message Content */}
        <div className={`relative px-4 py-2 rounded-2xl ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-900 border border-gray-200'
        } ${isTemporary ? 'opacity-60' : ''}`}>
          
          {/* Message Text */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Timestamp */}
          <div className={`text-xs mt-1 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatTime(message.timestamp)}
            {isTemporary && (
              <span className="ml-1">
                <div className="inline-block animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
              </span>
            )}
          </div>

          {/* Message tail */}
          <div className={`absolute top-3 ${
            isUser 
              ? 'right-0 transform translate-x-1/2' 
              : 'left-0 transform -translate-x-1/2'
          }`}>
            <div className={`w-0 h-0 border-solid ${
              isUser
                ? 'border-l-8 border-l-blue-600 border-t-4 border-t-transparent border-b-4 border-b-transparent'
                : 'border-r-8 border-r-white border-t-4 border-t-transparent border-b-4 border-b-transparent'
            }`}></div>
          </div>
        </div>

        {/* User Avatar Space */}
        {isUser && (
          <div className="flex-shrink-0 ml-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}