/**
 * Chat Layout
 * Wraps chat routes with AuthGuard for seamless auth protection
 * No loading states - optimistic rendering with auth protection
 */
'use client';

import AuthGuard from '@/components/auth/AuthGuard';

export default function ChatLayout({ children }) {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}