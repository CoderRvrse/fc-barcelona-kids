// Loading spinner module for Formation Lab
// Shows loading states during async operations with optional messages

let spinnerContainer = null;
let activeSpinners = new Map(); // Track multiple simultaneous spinners
let spinnerIdCounter = 0;

/**
 * Initialize spinner container
 */
function ensureSpinnerContainer() {
  if (spinnerContainer) return;

  spinnerContainer = document.createElement('div');
  spinnerContainer.id = 'flab-spinner-container';
  spinnerContainer.className = 'flab-spinner-container';
  spinnerContainer.setAttribute('role', 'status');
  spinnerContainer.setAttribute('aria-live', 'polite');

  document.body.appendChild(spinnerContainer);
}

/**
 * Create a spinner element
 * @param {string} message - Loading message
 * @param {string} id - Unique spinner ID
 * @returns {HTMLElement} Spinner element
 */
function createSpinnerElement(message, id) {
  const spinner = document.createElement('div');
  spinner.className = 'flab-spinner';
  spinner.setAttribute('data-spinner-id', id);

  // Spinner SVG (circular loader)
  const spinnerSvg = `
    <svg class="flab-spinner-icon" viewBox="0 0 50 50">
      <circle class="flab-spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
    </svg>
  `;

  // Message
  const messageEl = document.createElement('span');
  messageEl.className = 'flab-spinner-message';
  messageEl.textContent = message || 'Loading...';

  spinner.innerHTML = spinnerSvg;
  spinner.appendChild(messageEl);

  return spinner;
}

/**
 * Show a loading spinner
 * @param {string} message - Loading message to display
 * @param {Object} options - Options { blocking: boolean, id: string }
 * @returns {string} Spinner ID (use to hide later)
 */
export function showSpinner(message = 'Loading...', options = {}) {
  ensureSpinnerContainer();

  const id = options.id || `spinner-${++spinnerIdCounter}`;
  const blocking = options.blocking !== false; // Default true

  // Don't create duplicate spinners
  if (activeSpinners.has(id)) {
    return id;
  }

  const spinner = createSpinnerElement(message, id);

  // Add blocking overlay if requested
  if (blocking) {
    spinner.classList.add('flab-spinner-blocking');
  }

  spinnerContainer.appendChild(spinner);
  activeSpinners.set(id, { element: spinner, message, blocking });

  // Trigger enter animation
  requestAnimationFrame(() => {
    spinner.classList.add('flab-spinner-visible');
  });

  return id;
}

/**
 * Hide a specific spinner
 * @param {string} id - Spinner ID from showSpinner
 */
export function hideSpinner(id) {
  const spinnerData = activeSpinners.get(id);
  if (!spinnerData) return;

  const { element } = spinnerData;

  // Add exit animation
  element.classList.remove('flab-spinner-visible');
  element.classList.add('flab-spinner-exit');

  // Remove from DOM after animation
  setTimeout(() => {
    if (element.parentElement) {
      element.parentElement.removeChild(element);
    }
    activeSpinners.delete(id);
  }, 300);
}

/**
 * Hide all spinners
 */
export function hideAllSpinners() {
  activeSpinners.forEach((_, id) => hideSpinner(id));
}

/**
 * Update spinner message
 * @param {string} id - Spinner ID
 * @param {string} message - New message
 */
export function updateSpinnerMessage(id, message) {
  const spinnerData = activeSpinners.get(id);
  if (!spinnerData) return;

  const messageEl = spinnerData.element.querySelector('.flab-spinner-message');
  if (messageEl) {
    messageEl.textContent = message;
  }

  // Update stored message
  spinnerData.message = message;
}

/**
 * Check if any spinners are active
 * @returns {boolean}
 */
export function hasActiveSpinners() {
  return activeSpinners.size > 0;
}

/**
 * Wrap an async function with automatic spinner
 * @param {Function} fn - Async function to wrap
 * @param {string} message - Loading message
 * @param {Object} options - Spinner options
 * @returns {Function} Wrapped function
 */
export function withSpinner(fn, message = 'Loading...', options = {}) {
  return async function(...args) {
    const spinnerId = showSpinner(message, options);
    try {
      return await fn.apply(this, args);
    } finally {
      hideSpinner(spinnerId);
    }
  };
}

/**
 * Disable button during operation
 * @param {HTMLElement} button - Button element
 * @param {string} loadingText - Text to show while loading
 * @returns {Function} Cleanup function to restore button
 */
export function disableButton(button, loadingText = 'Loading...') {
  if (!button) return () => {};

  const originalText = button.textContent;
  const wasDisabled = button.disabled;

  button.disabled = true;
  button.textContent = loadingText;
  button.classList.add('flab-button-loading');

  // Return cleanup function
  return () => {
    button.disabled = wasDisabled;
    button.textContent = originalText;
    button.classList.remove('flab-button-loading');
  };
}

/**
 * Enable button (restore from disabled state)
 * @param {HTMLElement} button - Button element
 * @param {string} text - Text to set (optional)
 */
export function enableButton(button, text = null) {
  if (!button) return;

  button.disabled = false;
  button.classList.remove('flab-button-loading');

  if (text !== null) {
    button.textContent = text;
  }
}

/**
 * Show inline loading indicator in element
 * @param {HTMLElement} element - Element to show loading in
 * @param {string} message - Loading message
 * @returns {Function} Cleanup function
 */
export function showInlineLoader(element, message = 'Loading...') {
  if (!element) return () => {};

  const originalContent = element.innerHTML;

  element.innerHTML = `
    <span class="flab-inline-loader">
      <svg class="flab-inline-loader-icon" viewBox="0 0 50 50">
        <circle class="flab-spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
      </svg>
      <span>${message}</span>
    </span>
  `;

  element.classList.add('flab-loading');

  // Return cleanup function
  return () => {
    element.innerHTML = originalContent;
    element.classList.remove('flab-loading');
  };
}

/**
 * Initialize loading spinner system
 */
export function initSpinnerSystem() {
  ensureSpinnerContainer();
  console.log('✅ Loading spinner system initialized');
}

// Convenience exports
export {
  showSpinner as show,
  hideSpinner as hide,
  hideAllSpinners as hideAll,
  updateSpinnerMessage as updateMessage
};
