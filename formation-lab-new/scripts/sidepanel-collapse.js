/**
 * Sidepanel Collapse/Expand Functionality
 * Allows users to toggle the sidepanel visibility to maximize pitch space
 */

let isSidepanelCollapsed = false;
let autoCloseTimeout = null;
const AUTO_CLOSE_DELAY = 4000; // 4 seconds before auto-collapse

/**
 * Initialize sidepanel collapse functionality
 */
export function initSidepanelCollapse() {
  const hoverBar = document.getElementById('sidepanelHoverBar');
  const sidepanel = document.querySelector('.flab-sidepanel');
  const app = document.querySelector('.flab-app');

  if (!hoverBar || !app || !sidepanel) {
    console.warn('Sidepanel hover bar, sidepanel, or app container not found');
    return;
  }

  // Check localStorage for saved state (default to expanded/false)
  const savedState = localStorage.getItem('flab-sidepanel-collapsed');
  if (savedState === 'true') {
    isSidepanelCollapsed = true;
    collapseSidepanel(app);
  } else {
    // Ensure expanded state
    isSidepanelCollapsed = false;
    localStorage.setItem('flab-sidepanel-collapsed', 'false');
  }

  // Add hover handler - expand on hover when collapsed
  hoverBar.addEventListener('mouseenter', () => {
    if (isSidepanelCollapsed) {
      expandSidepanel(app);
      // Start auto-close timer
      startAutoCloseTimer(app, sidepanel);
    }
  });

  // Track when mouse leaves sidepanel area to trigger auto-close
  sidepanel.addEventListener('mouseleave', () => {
    if (isSidepanelCollapsed === false) {
      clearAutoCloseTimer();
    }
  });

  // Track when mouse re-enters sidepanel to cancel auto-close
  sidepanel.addEventListener('mouseenter', () => {
    if (isSidepanelCollapsed === false) {
      clearAutoCloseTimer();
      // Restart timer if user leaves again
      document.addEventListener('mousemove', handleMouseMove);
    }
  });

  // Allow double-click on hover bar to collapse
  hoverBar.addEventListener('dblclick', () => {
    if (!isSidepanelCollapsed) {
      clearAutoCloseTimer();
      collapseSidepanel(app);
    }
  });

  console.log('✅ Sidepanel collapse functionality initialized');
}

/**
 * Handle mouse move to track when user moves away from sidepanel
 */
function handleMouseMove(e) {
  const sidepanel = document.querySelector('.flab-sidepanel');
  const hoverBar = document.getElementById('sidepanelHoverBar');

  if (!sidepanel || !hoverBar || isSidepanelCollapsed) {
    document.removeEventListener('mousemove', handleMouseMove);
    return;
  }

  // Check if mouse is over sidepanel or hover bar
  const isOverSidepanel = sidepanel.matches(':hover');
  const isOverHoverBar = hoverBar.matches(':hover');

  if (!isOverSidepanel && !isOverHoverBar) {
    // User moved away, start the auto-close timer
    startAutoCloseTimer(document.querySelector('.flab-app'), sidepanel);
    document.removeEventListener('mousemove', handleMouseMove);
  }
}

/**
 * Collapse the sidepanel
 */
function collapseSidepanel(app) {
  app.classList.add('flab-app--sidepanel-collapsed');
  isSidepanelCollapsed = true;
  localStorage.setItem('flab-sidepanel-collapsed', 'true');
  console.log('Sidepanel collapsed');
}

/**
 * Expand the sidepanel
 */
function expandSidepanel(app) {
  app.classList.remove('flab-app--sidepanel-collapsed');
  isSidepanelCollapsed = false;
  localStorage.setItem('flab-sidepanel-collapsed', 'false');
  console.log('Sidepanel expanded');
}

/**
 * Start auto-close timer
 */
function startAutoCloseTimer(app, sidepanel) {
  // Clear any existing timer first
  clearAutoCloseTimer();

  // Set new timer to auto-collapse after delay
  autoCloseTimeout = setTimeout(() => {
    if (isSidepanelCollapsed === false) {
      console.log('⏱️ Auto-closing sidepanel after timeout');
      collapseSidepanel(app);
    }
  }, AUTO_CLOSE_DELAY);

  console.log(`⏱️ Auto-close timer started (${AUTO_CLOSE_DELAY}ms)`);
}

/**
 * Clear auto-close timer
 */
function clearAutoCloseTimer() {
  if (autoCloseTimeout !== null) {
    clearTimeout(autoCloseTimeout);
    autoCloseTimeout = null;
  }
}

/**
 * Get sidepanel state
 */
export function isSidepanelHidden() {
  return isSidepanelCollapsed;
}
