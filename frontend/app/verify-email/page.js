/**verify-email/page.js */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, resendVerificationEmail, logout, checkEmailVerificationFirebase } = useAuthStore();
  const [sending, setSending] = useState(false);


  const handleResendEmail = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      toast.error('Failed to send verification email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    const isVerified = await checkEmailVerificationFirebase();
    if (isVerified) {
      router.push('/chat');
    } else {
      toast.info('Email not verified yet. Please check your inbox.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Redirect if user is already verified
  if (user?.emailVerified) {
    router.push('/chat');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Verify your email address
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              We've sent a verification email to:
            </p>
            <p className="font-medium text-gray-900">{user?.email}</p>
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Please check your email and click the verification link to continue.
              It may take a few minutes to arrive.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCheckVerification}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                I've verified my email
              </button>

              <button
                onClick={handleResendEmail}
                disabled={sending}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 px-4 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign out and try a different account
            </button>
          </div>

          <div className="mt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Check your spam folder
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      If you don't see the email in your inbox, please check your spam or junk folder.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 