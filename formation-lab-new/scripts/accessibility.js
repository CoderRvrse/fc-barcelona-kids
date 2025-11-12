// Accessibility module for Formation Lab - WCAG 2.1 AA compliance
// Provides screen reader announcements, focus management, keyboard navigation

let announcer = null;

/**
 * Initialize announcer element for screen readers
 */
function ensureAnnouncer() {
  if (announcer) return;

  announcer = document.createElement('div');
  announcer.id = 'flab-announcer';
  announcer.className = 'sr-only';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');

  document.body.appendChild(announcer);
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' (default) or 'assertive'
 */
export function announce(message, priority = 'polite') {
  ensureAnnouncer();

  // Set priority
  announcer.setAttribute('aria-live', priority);

  // Clear previous announcement
  announcer.textContent = '';

  // Add new announcement after a brief delay (ensures screen reader picks it up)
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);

  // Clear after 5 seconds
  setTimeout(() => {
    announcer.textContent = '';
  }, 5000);
}

/**
 * Trap focus within an element (for modals)
 * @param {HTMLElement} element - Element to trap focus in
 * @returns {Function} Cleanup function
 */
export function trapFocus(element) {
  if (!element) return () => {};

  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Set focus to element with optional delay
 * @param {HTMLElement|string} target - Element or selector
 * @param {number} delay - Delay in ms (default: 0)
 */
export function setFocus(target, delay = 0) {
  const element = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!element) return;

  setTimeout(() => {
    element.focus();
  }, delay);
}

/**
 * Get all focusable elements in container
 * @param {HTMLElement} container - Container element
 * @returns {NodeList} Focusable elements
 */
export function getFocusableElements(container = document) {
  return container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
}

/**
 * Add skip link to main content
 */
function addSkipLink() {
  const existing = document.getElementById('flab-skip-link');
  if (existing) return;

  const skipLink = document.createElement('a');
  skipLink.id = 'flab-skip-link';
  skipLink.className = 'flab-skip-link';
  skipLink.href = '#flab-main-content';
  skipLink.textContent = 'Skip to main content';

  document.body.insertBefore(skipLink, document.body.firstChild);

  // Add ID to main content if not present
  const mainContent = document.querySelector('.flab-pitch-wrapper');
  if (mainContent && !mainContent.id) {
    mainContent.id = 'flab-main-content';
    mainContent.setAttribute('tabindex', '-1'); // Make focusable
  }
}

/**
 * Add ARIA landmarks
 */
function addLandmarks() {
  // Add navigation landmark to sidebar
  const sidebar = document.querySelector('.flab-sidepanel');
  if (sidebar && !sidebar.hasAttribute('role')) {
    sidebar.setAttribute('role', 'navigation');
    sidebar.setAttribute('aria-label', 'Formation tools');
  }

  // Add main landmark to pitch area
  const pitchWrapper = document.querySelector('.flab-pitch-wrapper');
  if (pitchWrapper && !pitchWrapper.hasAttribute('role')) {
    pitchWrapper.setAttribute('role', 'main');
    pitchWrapper.setAttribute('aria-label', 'Formation field');
  }

  // Add region landmark to toolbar
  const toolbar = document.querySelector('.flab-toolbar');
  if (toolbar && !toolbar.hasAttribute('role')) {
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Tool selection');
  }

  // Add region landmark to actions
  const actions = document.querySelector('.flab-actions');
  if (actions && !actions.hasAttribute('role')) {
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Formation actions');
  }
}

/**
 * Enhance keyboard navigation for tools
 */
function enhanceToolKeyboardNav() {
  const toolbar = document.querySelector('.flab-toolbar');
  if (!toolbar) return;

  const tools = toolbar.querySelectorAll('.flab-tool');
  if (tools.length === 0) return;

  tools.forEach((tool, index) => {
    // Add keyboard handler
    tool.addEventListener('keydown', (e) => {
      let nextTool = null;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          // Move to next tool
          nextTool = tools[index + 1] || tools[0];
          e.preventDefault();
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          // Move to previous tool
          nextTool = tools[index - 1] || tools[tools.length - 1];
          e.preventDefault();
          break;

        case ' ':
        case 'Enter':
          // Activate tool
          tool.click();
          e.preventDefault();
          break;
      }

      if (nextTool) {
        nextTool.focus();
      }
    });
  });
}

/**
 * Add ARIA labels to interactive elements
 */
function addAriaLabels() {
  // Field
  const field = document.querySelector('.flab-field');
  if (field && !field.hasAttribute('aria-label')) {
    field.setAttribute('aria-label', 'Soccer formation field');
    field.setAttribute('role', 'application');
  }

  // Players
  const players = document.querySelectorAll('.flab-player');
  players.forEach(player => {
    if (!player.hasAttribute('aria-label')) {
      const playerId = player.dataset.playerId || player.id;
      const number = player.querySelector('.player-number')?.textContent || playerId;
      player.setAttribute('aria-label', `Player ${number}`);
      player.setAttribute('role', 'button');
      player.setAttribute('tabindex', '0');
    }
  });

  // Tools - ensure proper ARIA pressed state
  const tools = document.querySelectorAll('.flab-tool');
  tools.forEach(tool => {
    if (!tool.hasAttribute('role')) {
      tool.setAttribute('role', 'button');
    }
    if (!tool.hasAttribute('aria-pressed')) {
      tool.setAttribute('aria-pressed', 'false');
    }
  });

  // Actions
  const actions = document.querySelectorAll('.flab-action');
  actions.forEach(action => {
    if (!action.hasAttribute('role')) {
      action.setAttribute('role', 'button');
    }
  });
}

/**
 * Add focus visible indicators
 */
function addFocusIndicators() {
  // Add CSS class on keyboard focus, remove on mouse click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('flab-keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('flab-keyboard-nav');
  });
}

/**
 * Announce mode changes to screen readers
 */
export function announceMode(mode) {
  const modeMessages = {
    select: 'Select mode activated. Click players to select them.',
    pass: 'Pass mode activated. Click to create pass arrows.',
    erase: 'Erase mode activated. Click arrows to delete them.'
  };

  const message = modeMessages[mode] || `${mode} mode activated`;
  announce(message);
}

/**
 * Announce player actions to screen readers
 */
export function announcePlayerAction(action, playerNumber) {
  const messages = {
    selected: `Player ${playerNumber} selected`,
    moved: `Player ${playerNumber} moved`,
    deselected: `Player ${playerNumber} deselected`
  };

  announce(messages[action] || action);
}

/**
 * Announce formation actions to screen readers
 */
export function announceFormationAction(action, details = '') {
  const messages = {
    saved: `Formation saved${details ? ': ' + details : ''}`,
    loaded: `Formation loaded${details ? ': ' + details : ''}`,
    reset: 'Formation reset to default',
    exported: 'Formation exported as image',
    cleared: 'All players cleared'
  };

  announce(messages[action] || action, 'assertive');
}

/**
 * Check color contrast for WCAG AA compliance
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @returns {Object} Contrast ratio and pass/fail
 */
export function checkColorContrast(foreground, background) {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (rgb) => {
    const sRGB = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return { ratio: 0, passAA: false, passAAA: false };

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);

  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio: ratio.toFixed(2),
    passAA: ratio >= 4.5,      // WCAG AA for normal text
    passAAA: ratio >= 7,        // WCAG AAA for normal text
    passAALarge: ratio >= 3,    // WCAG AA for large text
    passAAALarge: ratio >= 4.5  // WCAG AAA for large text
  };
}

/**
 * Initialize accessibility features
 */
export function initAccessibility() {
  ensureAnnouncer();
  addSkipLink();
  addLandmarks();
  addAriaLabels();
  enhanceToolKeyboardNav();
  addFocusIndicators();

  console.log('✅ Accessibility features initialized (WCAG 2.1 AA)');

  // Log color contrast check for primary colors
  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--flab-text').trim();
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--flab-bg-start').trim();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--flab-accent').trim();

    console.log('🎨 Color Contrast Check:');
    console.log('  Text on BG:', checkColorContrast(textColor || '#f5f7ff', bgColor || '#05122e'));
    console.log('  Accent:', checkColorContrast(accentColor || '#ffd447', '#0b2b66'));
  }
}

// Export for testing
// trapFocus kept private - menu modules have their own implementations
export { addAriaLabels, addLandmarks, addSkipLink };
