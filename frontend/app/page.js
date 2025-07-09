/**
 * Home Page
 * Simplified to redirect to chat or login based on auth status
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/stores/authStore';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();

  useEffect(() => {
    // Wait for auth to initialize
    if (!initialized) return;
    
    if (user) {
      // User is authenticated, redirect to chat
      router.push('/chat');
    } else {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  }, [user, loading, initialized, router]);

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}