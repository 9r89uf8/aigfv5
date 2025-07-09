/**
 * Simplified Chat Page
 * Hardcoded to use character ID: YNVCWyWNuxdw19TNFUuZ
 * Auth protection handled by layout - no auth logic needed here
 */
'use client';

import { useEffect, useState } from 'react';
import useSimpleChatStore from '@/stores/simpleChatStore';
import useAuthStore from '@/stores/authStore';
import SimpleChatInterface from '@/components/chat/SimpleChatInterface';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

// Hardcoded character ID for testing
const TEST_CHARACTER_ID = 'YNVCWyWNuxdw19TNFUuZ';

export default function ChatPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [character, setCharacter] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Store hooks
  const { 
    initialize, 
    joinConversation, 
    leaveConversation, 
    isConnected, 
    isConnecting, 
    connectionError,
    cleanup
  } = useSimpleChatStore();
  
  const { user, initialized: authInitialized } = useAuthStore();

  useEffect(() => {
    // Only initialize when auth is ready and we haven't initialized yet
    if (authInitialized && user && !hasInitialized) {
      // Add a small delay to ensure Firebase has fully initialized
      const initTimer = setTimeout(() => {
        initializePage();
        setHasInitialized(true);
      }, 200);
      
      return () => clearTimeout(initTimer);
    }
  }, [authInitialized, user, hasInitialized]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      leaveConversation();
      cleanup();
    };
  }, []);

  const initializePage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch character data directly
      try {
        const response = await apiClient.get(`/characters/${TEST_CHARACTER_ID}`);
        setCharacter(response.data.character || response.data);
      } catch (err) {
        console.error('Failed to fetch character:', err);
        
        // If character doesn't exist, create a fallback
        setCharacter({
          id: TEST_CHARACTER_ID,
          name: 'Test Character',
          description: 'A test character for development',
          avatar: null
        });
      }

      // Initialize chat connection with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          if (!isConnected && !isConnecting) {
            await initialize();
          }
          
          // Join conversation with hardcoded character
          await joinConversation(TEST_CHARACTER_ID);
          break; // Success, exit loop
          
        } catch (initError) {
          retryCount++;
          console.error(`Chat initialization attempt ${retryCount} failed:`, initError);
          
          // Special handling for auth timing issues
          if (initError.message?.includes('Authentication required') || 
              initError.message?.includes('Authentication timeout')) {
            // Auth issue - wait longer before retry
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            } else {
              // If all retries fail due to auth, redirect to login
              window.location.href = '/login';
              return;
            }
          } else if (retryCount < maxRetries) {
            // Other errors - normal exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          } else {
            throw initError; // All retries failed
          }
        }
      }

    } catch (err) {
      console.error('Failed to initialize chat page:', err);
      setError(err.message || 'Failed to initialize chat');
      toast.error('Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryConnection = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await initializePage();
    } catch (err) {
      toast.error('Failed to reconnect');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state - only for chat initialization
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Chat Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={initializePage}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Connection error state
  if (connectionError && !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-yellow-500 text-4xl mb-4">📡</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{connectionError}</p>
          <button
            onClick={handleRetryConnection}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left section - Character info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <img
                src={character?.avatar || '/default-avatar.png'}
                alt={character?.name || 'Character'}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-gray-900 truncate">
                  {character?.name || 'Test Character'}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    isConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`}></span>
                  <span className="truncate">{isConnected ? 'Online' : 'Connecting...'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right section - Logout button */}
          <div className="flex-shrink-0">
            <button
              onClick={() => {
                import('@/stores/authStore').then(({ default: useAuthStore }) => {
                  useAuthStore.getState().logout();
                });
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors px-3 py-2 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <SimpleChatInterface 
        character={character}
        characterId={TEST_CHARACTER_ID}
        className="flex-1"
      />
    </div>
  );
}