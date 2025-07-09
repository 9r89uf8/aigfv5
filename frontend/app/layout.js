/**layout.js */
'use client';

import { useEffect } from 'react';
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast';
import useAuthStore from '@/stores/authStore';
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})



export default function RootLayout({ children }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth listener
    const unsubscribe = initializeAuth();
    
    // Cleanup on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased safe-top safe-bottom safe-left safe-right`}>
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              margin: '16px',
              padding: '16px',
              maxWidth: '500px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
} 