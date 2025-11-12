// Toast notification system for Formation Lab - user feedback UI
// Lightweight, accessible toast notifications for errors, success, and info

// Toast queue to manage multiple toasts
let toastQueue = [];
let toastContainer = null;
const MAX_VISIBLE_TOASTS = 3;

// Toast types and their default durations (ms)
const TOAST_CONFIG = {
  error: {
    duration: 5000,
    icon: '⚠️',
    className: 'flab-toast-error'
  },
  success: {
    duration: 3000,
    icon: '✓',
    className: 'flab-toast-success'
  },
  info: {
    duration: 3000,
    icon: 'ℹ️',
    className: 'flab-toast-info'
  },
  warning: {
    duration: 4000,
    icon: '⚡',
    className: 'flab-toast-warning'
  }
};

/**
 * Initialize toast container
 */
function ensureToastContainer() {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'flab-toast-container';
  toastContainer.className = 'flab-toast-container';
  toastContainer.setAttribute('role', 'region');
  toastContainer.setAttribute('aria-label', 'Notifications');
  toastContainer.setAttribute('aria-live', 'polite');

  document.body.appendChild(toastContainer);
}

/**
 * Create toast element
 * @param {string} message - Toast message
 * @param {string} type - Toast type (error, success, info, warning)
 * @param {number} duration - Duration in milliseconds
 * @returns {HTMLElement} Toast element
 */
function createToastElement(message, type, duration) {
  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  const toast = document.createElement('div');
  toast.className = `flab-toast ${config.className}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-atomic', 'true');

  // Icon
  const icon = document.createElement('span');
  icon.className = 'flab-toast-icon';
  icon.textContent = config.icon;
  icon.setAttribute('aria-hidden', 'true');

  // Message
  const messageEl = document.createElement('span');
  messageEl.className = 'flab-toast-message';
  messageEl.textContent = message;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'flab-toast-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.onclick = () => dismissToast(toast);

  // Assemble
  toast.appendChild(icon);
  toast.appendChild(messageEl);
  toast.appendChild(closeBtn);

  return toast;
}

/**
 * Dismiss a toast
 * @param {HTMLElement} toast - Toast element to dismiss
 */
function dismissToast(toast) {
  if (!toast || !toast.parentElement) return;

  // Add exit animation
  toast.classList.add('flab-toast-exit');

  // Remove from DOM after animation
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }

    // Remove from queue
    const index = toastQueue.indexOf(toast);
    if (index > -1) {
      toastQueue.splice(index, 1);
    }

    // Show next queued toast if any
    processToastQueue();
  }, 300); // Match CSS animation duration
}

/**
 * Process toast queue and show next toast if slot available
 */
function processToastQueue() {
  const visibleToasts = toastContainer?.querySelectorAll('.flab-toast:not(.flab-toast-exit)').length || 0;

  if (visibleToasts < MAX_VISIBLE_TOASTS && toastQueue.length > 0) {
    const nextToast = toastQueue.shift();
    if (nextToast && toastContainer) {
      toastContainer.appendChild(nextToast);

      // Trigger enter animation
      requestAnimationFrame(() => {
        nextToast.classList.add('flab-toast-enter');
      });
    }
  }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'error', 'success', 'info', 'warning'
 * @param {number} customDuration - Custom duration in ms (optional)
 * @returns {HTMLElement} Toast element
 */
export function showToast(message, type = 'info', customDuration = null) {
  ensureToastContainer();

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;
  const duration = customDuration || config.duration;

  const toast = createToastElement(message, type, duration);

  // Check if we can show immediately or need to queue
  const visibleToasts = toastContainer.querySelectorAll('.flab-toast:not(.flab-toast-exit)').length;

  if (visibleToasts < MAX_VISIBLE_TOASTS) {
    // Show immediately
    toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('flab-toast-enter');
    });
  } else {
    // Add to queue
    toastQueue.push(toast);
  }

  // Auto-dismiss after duration
  setTimeout(() => {
    dismissToast(toast);
  }, duration);

  return toast;
}

/**
 * Show error toast (convenience method)
 * @param {string} message - Error message
 * @param {number} duration - Duration in ms (optional)
 */
export function showErrorToast(message, duration = null) {
  return showToast(message, 'error', duration);
}

/**
 * Show success toast (convenience method)
 * @param {string} message - Success message
 * @param {number} duration - Duration in ms (optional)
 */
export function showSuccessToast(message, duration = null) {
  return showToast(message, 'success', duration);
}

/**
 * Show info toast (convenience method)
 * @param {string} message - Info message
 * @param {number} duration - Duration in ms (optional)
 */
export function showInfoToast(message, duration = null) {
  return showToast(message, 'info', duration);
}

/**
 * Show warning toast (convenience method)
 * @param {string} message - Warning message
 * @param {number} duration - Duration in ms (optional)
 */
export function showWarningToast(message, duration = null) {
  return showToast(message, 'warning', duration);
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
  if (!toastContainer) return;

  const toasts = toastContainer.querySelectorAll('.flab-toast');
  toasts.forEach(toast => dismissToast(toast));
  toastQueue = [];
}

/**
 * Initialize toast system (called on page load)
 */
export function initToastSystem() {
  ensureToastContainer();
  console.log('✅ Toast system initialized');
}
