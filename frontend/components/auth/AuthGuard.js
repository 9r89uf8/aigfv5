/**
 * AuthGuard component that waits for Firebase auth restoration
 * Shows fast loading, then authenticated content
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/stores/authStore';

export default function AuthGuard({ children, requireVerified = false }) {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
    } else if (initialized && user && requireVerified && !user.emailVerified) {
      router.push('/verify-email');
    }
  }, [user, initialized, requireVerified, router]);

  // Show loading until Firebase finishes checking auth state
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render if redirecting
  if (!user || (requireVerified && !user.emailVerified)) {
    return null;
  }

  return children;
}