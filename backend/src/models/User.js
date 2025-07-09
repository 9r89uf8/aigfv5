/**
 * User model definition
 * Defines the structure and validation for user documents
 */

/**
 * User schema for Firestore
 * @typedef {Object} User
 * @property {string} uid - Firebase Auth UID (document ID)
 * @property {string} email - User email address
 * @property {string} username - Unique username
 * @property {string} [displayName] - Display name
 * @property {string} [photoURL] - Profile photo URL
 * @property {boolean} isPremium - Premium subscription status
 * @property {Date} [premiumExpiresAt] - Premium expiration date
 * @property {string[]} [roles] - User roles (e.g., 'admin')
 * @property {Object} preferences - User preferences
 * @property {Date} createdAt - Account creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Date} [lastLoginAt] - Last login timestamp
 * @property {boolean} isActive - Account active status
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Default user object structure
 */
export const defaultUser = {
  email: '',
  username: '',
  displayName: '',
  photoURL: '',
  isPremium: false,
  premiumExpiresAt: null,
  roles: [],
  preferences: {
    notifications: true,
    theme: 'light',
    language: 'en'
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
  isActive: true,
  metadata: {}
};


/**
 * Validate user data
 * @param {Object} userData - User data to validate
 * @returns {Object} Validation result
 */
export const validateUser = (userData) => {
  const errors = [];
  
  // Email validation
  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Valid email is required');
  }
  
  // Username validation
  if (!userData.username || userData.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (!isValidUsername(userData.username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Check if email is valid
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if username is valid
 * @param {string} username - Username to validate
 * @returns {boolean} Is valid
 */
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username);
};

/**
 * Sanitize user data for public display
 * @param {User} user - User object
 * @returns {Object} Sanitized user data
 */
export const sanitizeUser = (user) => {
  const { 
    email,
    metadata,
    ...publicData 
  } = user;
  
  return {
    ...publicData,
    email: maskEmail(email)
  };
};

/**
 * Mask email for privacy
 * @param {string} email - Email to mask
 * @returns {string} Masked email
 */
const maskEmail = (email) => {
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.substring(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
};


export default {
  defaultUser,
  validateUser,
  sanitizeUser
}; 