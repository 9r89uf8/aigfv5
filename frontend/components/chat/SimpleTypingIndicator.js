/**
 * Simple Typing Indicator
 * Shows when character is typing
 */
'use client';

export default function SimpleTypingIndicator({ character, typingUsers = [] }) {
  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-end max-w-xs sm:max-w-md">
        {/* Character Avatar */}
        <div className="flex-shrink-0 mr-3">
          <img
            src={character?.avatar || '/default-avatar.png'}
            alt={character?.name || 'Character'}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>

        {/* Typing Bubble */}
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 relative">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600 mr-2">
              {character?.name || 'Character'} is typing
            </span>
            
            {/* Animated dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>

          {/* Message tail */}
          <div className="absolute top-3 left-0 transform -translate-x-1/2">
            <div className="w-0 h-0 border-solid border-r-8 border-r-white border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  );
}