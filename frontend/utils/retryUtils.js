/**
 * Retry utility for handling network errors and transient failures
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if should retry (default: checks for network errors)
 * @returns {Promise} The result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = isRetryableError
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} Whether the error is retryable
 */
export function isRetryableError(error) {
  // Network errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // HTTP status codes that are retryable
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.response && retryableStatusCodes.includes(error.response.status)) {
    return true;
  }
  
  // Firebase auth session expired
  if (error.code === 'auth/user-token-expired' || error.code === 'auth/id-token-expired') {
    return true;
  }
  
  return false;
}

/**
 * Handle session expiration errors
 * @param {Error} error - The error to check
 * @param {Function} onSessionExpired - Callback when session is expired
 * @returns {boolean} Whether the error was a session expiration
 */
export function handleSessionExpiration(error, onSessionExpired) {
  const sessionExpiredCodes = [
    'auth/user-token-expired',
    'auth/id-token-expired',
    'auth/user-disabled',
    'auth/user-not-found'
  ];
  
  if (error.code && sessionExpiredCodes.includes(error.code)) {
    onSessionExpired();
    return true;
  }
  
  // Check for 401 Unauthorized
  if (error.response && error.response.status === 401) {
    onSessionExpired();
    return true;
  }
  
  return false;
}

/**
 * Create a retry-enabled version of a service method
 * @param {Function} serviceMethod - The service method to wrap
 * @param {Object} retryOptions - Options for retry behavior
 * @returns {Function} The wrapped function with retry capability
 */
export function withRetry(serviceMethod, retryOptions = {}) {
  return async (...args) => {
    return retryWithBackoff(() => serviceMethod(...args), retryOptions);
  };
}