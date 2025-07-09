/**
 * API client configuration
 */
/**client.js */
import axios from 'axios';
import { auth } from '../firebase/config';

// Create axios instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get current user token if available
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token expired or invalid - handled by authStore
          break;
        case 403:
          console.error('Access forbidden:', error.response.data.message);
          break;
        case 404:
          console.error('Resource not found:', error.response.data.message);
          break;
        case 429:
          console.error('Rate limit exceeded:', error.response.data.message);
          break;
        case 500:
          console.error('Server error:', error.response.data.message);
          break;
      }
    } else if (error.request) {
      console.error('Network error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 