/**
 * ID Generation Utilities
 * Provides consistent UUID generation for messages across frontend and backend
 */

/**
 * Generate a unique message ID
 * Uses crypto.randomUUID() when available, falls back to timestamp-based ID
 * @returns {string} Unique message ID
 */
export const generateMessageId = () => {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers or environments without crypto.randomUUID
  // This creates a UUID v4-like string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Validate that a string is a valid UUID format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid UUID format
 */
export const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export default {
  generateMessageId,
  isValidUUID
};