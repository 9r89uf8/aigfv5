/**
 * Authentication store using Zustand
 * Manages user state, authentication, and token refresh
 */
import { create } from 'zustand';
import { auth } from '../lib/firebase/config';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { apiClient } from '../lib/api/client';
import toast from 'react-hot-toast';

const useAuthStore = create((set, get) => ({
  // State 
  user: null,
  loading: true,
  error: null,
  initialized: false,
  isPremium: false,
  premiumExpiresAt: null,

  // Initialize auth listener
  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Set user immediately for faster UI response
          set({
            user: {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              photoURL: firebaseUser.photoURL,
            },
            loading: false,
            initialized: true,
            error: null
          });

          // Get ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Set auth header
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
          
          // Get user data from backend (async - don't block UI)
          try {
            const response = await apiClient.get('/auth/me');
            const userData = response.data.user;
            
            // Update with full user data
            set({
              user: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                photoURL: firebaseUser.photoURL,
                ...userData
              },
              isPremium: userData.isPremium,
              premiumExpiresAt: userData.premiumExpiresAt,
            });
          } catch (backendError) {
            console.error('Error fetching backend user data:', backendError);
            // Keep the Firebase user data even if backend fails
          }

          // Set up token refresh
          get().setupTokenRefresh();
        } catch (error) {
          console.error('Error in auth state change:', error);
          set({ 
            user: firebaseUser, 
            loading: false,
            error: error.message 
          });
        }
      } else {
        // Clear auth header
        delete apiClient.defaults.headers.common['Authorization'];
        
        set({ 
          user: null, 
          isPremium: false,
          premiumExpiresAt: null,
          loading: false,
          initialized: true,
          error: null 
        });
      }
    });

    return unsubscribe;
  },

  // Token refresh
  setupTokenRefresh: () => {
    // Refresh token every 50 minutes (Firebase tokens expire after 1 hour)
    const interval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken(true);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${idToken}`;
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }
    }, 50 * 60 * 1000); // 50 minutes

    // Store interval ID for cleanup
    set({ tokenRefreshInterval: interval });
  },

  // Register new user
  register: async (email, password, username, displayName) => {
    set({ loading: true, error: null });
    
    try {
      // Check username availability first
      const checkResponse = await apiClient.get(`/auth/check-username/${username}`);
      if (!checkResponse.data.available) {
        throw new Error('Username is already taken');
      }

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update display name in Firebase
      if (displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      // Get ID token
      const idToken = await firebaseUser.getIdToken();

      // Register with backend
      const response = await apiClient.post('/auth/register', {
        idToken,
        username,
        displayName: displayName || username
      });

      // Send verification email
      await sendEmailVerification(firebaseUser);
      toast.success('Verification email sent! Please check your inbox.');

      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  // Login
  login: async (email, password) => {
    set({ loading: true, error: null });
    
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get ID token
      const idToken = await firebaseUser.getIdToken();

      // Login with backend
      const response = await apiClient.post('/auth/login', { idToken });

      toast.success('Welcome back!');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      // Clear token refresh interval
      const { tokenRefreshInterval } = get();
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }

      // Sign out from Firebase
      await signOut(auth);
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiClient.put('/auth/me', updates);
      const updatedUser = response.data.user;

      // Update Firebase profile if displayName or photoURL changed
      const currentUser = auth.currentUser;
      if (currentUser && (updates.displayName || updates.photoURL)) {
        await updateProfile(currentUser, {
          displayName: updates.displayName || currentUser.displayName,
          photoURL: updates.photoURL || currentUser.photoURL
        });
      }

      set((state) => ({
        user: { ...state.user, ...updatedUser },
        loading: false,
        error: null
      }));

      toast.success('Profile updated successfully');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  // Send password reset email
  sendPasswordReset: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  },

  // Resend verification email
  resendVerificationEmail: async () => {
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.emailVerified) {
      try {
        await sendEmailVerification(currentUser);
        toast.success('Verification email sent!');
      } catch (error) {
        toast.error(error.message);
        throw error;
      }
    }
  },

  // In useAuthStore, add this method:
  checkEmailVerificationFirebase: async () => {
    try {
      const response = await apiClient.get('/auth/verify-email');
      
      if (response.data.emailVerified) {
        // Update the local user state
        set((state) => ({
          user: { ...state.user, emailVerified: true }
        }));
        
        toast.success('Email verified successfully!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking verification:', error);
      toast.error('Failed to check verification status');
      return false;
    }
  },

  // Clear error
  clearError: () => set({ error: null })
}));



export default useAuthStore; 