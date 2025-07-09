// API endpoints
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL

// Message limits for free tier
export const FREE_LIMITS = {
  TEXT_MESSAGES: 30,
  AUDIO_MESSAGES: 5,
  MEDIA_MESSAGES: 5,
}

// Premium subscription
export const PREMIUM = {
  PRICE: 7, // USD
  DURATION_DAYS: 15,
  CURRENCY: 'USD',
}

// File upload limits
export const FILE_LIMITS = {
  IMAGE: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  AUDIO: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: ['audio/mpeg', 'audio/wav', 'audio/webm'],
  },
}

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'ai_messaging_token',
  USER_PREFERENCES: 'ai_messaging_preferences',
  DRAFT_MESSAGES: 'ai_messaging_drafts',
} 