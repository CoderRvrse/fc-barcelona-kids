// Error Handler module for Formation Lab - global error boundary & user feedback
import { showToast } from './ui-toast.js';

// Error message mapping for user-friendly feedback
const ERROR_MESSAGES = {
  // Network errors
  'network': 'No internet connection. Your changes are saved locally.',
  'fetch-failed': 'Failed to connect to server. Please check your internet connection.',
  'timeout': 'Request timed out. Please try again.',

  // Auth errors (for future Firebase integration)
  'auth/network-request-failed': 'No internet connection. Please try again.',
  'auth/user-not-found': 'Please sign in to save to the cloud.',
  'auth/requires-recent-login': 'Please sign in again for security.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',

  // Storage errors (for future Firebase integration)
  'storage/quota-exceeded': 'Cloud storage is full. Please delete some old formations.',
  'storage/unauthorized': 'You do not have permission to access this formation.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple attempts. Please try again later.',

  // Validation errors
  'validation/invalid-data': 'Formation data is invalid. Please check and try again.',
  'validation/missing-fields': 'Required information is missing.',
  'validation/corrupted-data': 'Formation data is corrupted. Try resetting to default.',

  // Freemium limits (for future)
  'freemium/limit-reached': 'Free tier allows 5 formations. Upgrade to Pro for unlimited.',
  'freemium/feature-locked': 'This feature requires a Pro subscription.',

  // Export errors
  'export/canvas-error': 'Failed to export image. Try reducing field complexity.',
  'export/pdf-error': 'PDF export failed. This feature requires Pro subscription.',
  'export/download-failed': 'Download failed. Please try again.',

  // Generic fallback
  'unknown': 'Something went wrong. Please try refreshing the page.',
  'generic': 'An error occurred. Please try again.'
};

// Error context for analytics (future)
let errorLog = [];
const MAX_ERROR_LOG = 50;

/**
 * Get user-friendly error message from error object or code
 * @param {Error|string} error - Error object or error code
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyError(error) {
  // Handle Error objects
  if (error instanceof Error) {
    // Check if error message matches a known pattern
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES['network'];
    }
    if (message.includes('timeout')) {
      return ERROR_MESSAGES['timeout'];
    }
    if (message.includes('quota')) {
      return ERROR_MESSAGES['storage/quota-exceeded'];
    }

    // Check for Firebase error codes (format: "auth/error-code")
    const firebaseMatch = error.message.match(/^([a-z]+\/[a-z-]+)/);
    if (firebaseMatch && ERROR_MESSAGES[firebaseMatch[1]]) {
      return ERROR_MESSAGES[firebaseMatch[1]];
    }

    // Return generic message for unknown errors
    return ERROR_MESSAGES['unknown'];
  }

  // Handle string error codes
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || ERROR_MESSAGES['generic'];
  }

  // Fallback
  return ERROR_MESSAGES['unknown'];
}

/**
 * Handle global application errors
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred (e.g., 'export', 'save')
 * @param {boolean} showUser - Whether to show error to user (default: true)
 */
export function handleError(error, context = 'unknown', showUser = true) {
  // Log to console in development
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    console.error(`[FLAB Error] ${context}:`, error);
  }

  // Add to error log for analytics
  errorLog.push({
    timestamp: new Date().toISOString(),
    context,
    message: error.message || String(error),
    stack: error.stack || null
  });

  // Keep log size manageable
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.shift();
  }

  // Show user-friendly message
  if (showUser) {
    const userMessage = getUserFriendlyError(error);
    showToast(userMessage, 'error');
  }

  // Future: Send to analytics/error tracking service
  // logErrorToAnalytics(error, context);
}

/**
 * Handle global uncaught errors
 * @param {ErrorEvent} event - Error event
 */
function handleGlobalError(event) {
  const error = event.error || new Error(event.message);
  handleError(error, 'global', true);

  // Prevent default error handling (already logged)
  event.preventDefault();
}

/**
 * Handle unhandled promise rejections
 * @param {PromiseRejectionEvent} event - Promise rejection event
 */
function handleUnhandledRejection(event) {
  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason));

  handleError(error, 'promise', true);

  // Prevent default handling
  event.preventDefault();
}

/**
 * Initialize global error handlers
 */
export function initErrorHandler() {
  // Remove old dev-only error handlers if they exist
  window.onerror = null;

  // Add new global error handlers
  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  console.log('✅ Error handler initialized');
}

/**
 * Get error log (for debugging or analytics)
 * @returns {Array} Array of error objects
 */
export function getErrorLog() {
  return [...errorLog];
}

/**
 * Clear error log
 */
export function clearErrorLog() {
  errorLog = [];
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error reporting
 * @returns {Function} Wrapped function
 */
export function withErrorHandler(fn, context) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      handleError(error, context, true);
      throw error; // Re-throw for caller to handle if needed
    }
  };
}

// Export error messages for testing
export { ERROR_MESSAGES };
