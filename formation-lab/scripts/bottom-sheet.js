// Bottom sheet module for Formation Lab - Mobile-friendly modal alternative
// Replaces center modals with bottom sheets on mobile devices

import { isTouchDevice } from './touch-gestures.js';

let activeSheet = null;
let sheetContainer = null;

/**
 * Initialize bottom sheet container
 */
function ensureSheetContainer() {
  if (sheetContainer) return;

  sheetContainer = document.createElement('div');
  sheetContainer.id = 'flab-sheet-container';
  sheetContainer.className = 'flab-sheet-container';
  document.body.appendChild(sheetContainer);
}

/**
 * Create bottom sheet element
 */
function createBottomSheet(options) {
  const {
    title = 'Modal',
    content = '',
    buttons = [],
    dismissible = true,
    onDismiss = null
  } = options;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'flab-sheet-overlay';
  overlay.setAttribute('role', 'presentation');

  // Create sheet
  const sheet = document.createElement('div');
  sheet.className = 'flab-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'flab-sheet-title');

  // Handle (for swipe gesture visual)
  const handle = document.createElement('div');
  handle.className = 'flab-sheet-handle';
  handle.setAttribute('aria-hidden', 'true');

  // Header
  const header = document.createElement('div');
  header.className = 'flab-sheet-header';

  const titleEl = document.createElement('h2');
  titleEl.id = 'flab-sheet-title';
  titleEl.className = 'flab-sheet-title';
  titleEl.textContent = title;

  header.appendChild(titleEl);

  // Close button (if dismissible)
  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'flab-sheet-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => dismissSheet(onDismiss);
    header.appendChild(closeBtn);
  }

  // Content
  const contentEl = document.createElement('div');
  contentEl.className = 'flab-sheet-content';

  if (typeof content === 'string') {
    contentEl.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    contentEl.appendChild(content);
  }

  // Footer (buttons)
  let footer = null;
  if (buttons.length > 0) {
    footer = document.createElement('div');
    footer.className = 'flab-sheet-footer';

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = `flab-sheet-btn ${btn.variant || 'secondary'}`;
      button.textContent = btn.text;
      button.onclick = () => {
        if (btn.onClick) btn.onClick();
        if (btn.dismiss !== false) dismissSheet(onDismiss);
      };
      footer.appendChild(button);
    });
  }

  // Assemble sheet
  sheet.appendChild(handle);
  sheet.appendChild(header);
  sheet.appendChild(contentEl);
  if (footer) sheet.appendChild(footer);

  // Assemble container
  const container = document.createElement('div');
  container.appendChild(overlay);
  container.appendChild(sheet);

  // Click overlay to dismiss
  if (dismissible) {
    overlay.onclick = () => dismissSheet(onDismiss);
  }

  // Swipe down to dismiss
  if (dismissible) {
    setupSwipeToDismiss(sheet, () => dismissSheet(onDismiss));
  }

  return container;
}

/**
 * Setup swipe-to-dismiss gesture
 */
function setupSwipeToDismiss(sheet, onDismiss) {
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const handleTouchStart = (e) => {
    // Only allow drag from handle area
    const handle = sheet.querySelector('.flab-sheet-handle');
    if (!handle || !handle.contains(e.target)) return;

    startY = e.touches[0].clientY;
    isDragging = true;
    sheet.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    // Only allow downward drag
    if (deltaY > 0) {
      sheet.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    isDragging = false;
    sheet.style.transition = '';

    const deltaY = currentY - startY;

    // If dragged down more than 100px, dismiss
    if (deltaY > 100) {
      onDismiss();
    } else {
      // Snap back
      sheet.style.transform = '';
    }

    startY = 0;
    currentY = 0;
  };

  sheet.addEventListener('touchstart', handleTouchStart, { passive: true });
  sheet.addEventListener('touchmove', handleTouchMove, { passive: true });
  sheet.addEventListener('touchend', handleTouchEnd, { passive: true });
}

/**
 * Show bottom sheet
 */
export function showBottomSheet(options) {
  ensureSheetContainer();

  // Dismiss existing sheet if any
  if (activeSheet) {
    dismissSheet();
  }

  // Create and show new sheet
  const sheetElement = createBottomSheet(options);
  sheetContainer.appendChild(sheetElement);
  activeSheet = sheetElement;

  // Trigger animations
  requestAnimationFrame(() => {
    const overlay = sheetElement.querySelector('.flab-sheet-overlay');
    const sheet = sheetElement.querySelector('.flab-sheet');

    overlay.classList.add('visible');
    sheet.classList.add('visible');
  });

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  return sheetElement;
}

/**
 * Dismiss bottom sheet
 */
export function dismissSheet(callback = null) {
  if (!activeSheet) return;

  const overlay = activeSheet.querySelector('.flab-sheet-overlay');
  const sheet = activeSheet.querySelector('.flab-sheet');

  overlay.classList.remove('visible');
  sheet.classList.remove('visible');

  setTimeout(() => {
    if (activeSheet && activeSheet.parentElement) {
      activeSheet.parentElement.removeChild(activeSheet);
    }
    activeSheet = null;

    // Restore body scroll
    document.body.style.overflow = '';

    // Call callback if provided
    if (callback) callback();
  }, 300);
}

/**
 * Show modal (adaptive: bottom sheet on mobile, center modal on desktop)
 */
export function showModal(options) {
  const isMobile = isTouchDevice() && window.innerWidth <= 768;

  if (isMobile) {
    return showBottomSheet(options);
  } else {
    // Use traditional center modal for desktop
    return showCenterModal(options);
  }
}

/**
 * Show center modal (desktop fallback)
 */
function showCenterModal(options) {
  const {
    title = 'Modal',
    content = '',
    buttons = [],
    dismissible = true,
    onDismiss = null
  } = options;

  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'flab-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'flab-modal-title');

  // Modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'flab-modal-content';

  // Header
  const header = document.createElement('div');
  header.className = 'flab-modal-header';

  const titleEl = document.createElement('h2');
  titleEl.id = 'flab-modal-title';
  titleEl.textContent = title;

  header.appendChild(titleEl);

  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'flab-modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => dismissModal(modal, onDismiss);
    header.appendChild(closeBtn);
  }

  // Content
  const contentEl = document.createElement('div');
  contentEl.className = 'flab-modal-body';

  if (typeof content === 'string') {
    contentEl.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    contentEl.appendChild(content);
  }

  // Footer
  let footer = null;
  if (buttons.length > 0) {
    footer = document.createElement('div');
    footer.className = 'flab-modal-footer';

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = `flab-modal-btn ${btn.variant || 'secondary'}`;
      button.textContent = btn.text;
      button.onclick = () => {
        if (btn.onClick) btn.onClick();
        if (btn.dismiss !== false) dismissModal(modal, onDismiss);
      };
      footer.appendChild(button);
    });
  }

  // Assemble
  modalContent.appendChild(header);
  modalContent.appendChild(contentEl);
  if (footer) modalContent.appendChild(footer);
  modal.appendChild(modalContent);

  // Click outside to dismiss
  if (dismissible) {
    modal.onclick = (e) => {
      if (e.target === modal) {
        dismissModal(modal, onDismiss);
      }
    };
  }

  document.body.appendChild(modal);

  // Trigger animation
  requestAnimationFrame(() => {
    modal.classList.add('visible');
  });

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  return modal;
}

/**
 * Dismiss center modal
 */
function dismissModal(modal, callback = null) {
  modal.classList.remove('visible');

  setTimeout(() => {
    if (modal.parentElement) {
      modal.parentElement.removeChild(modal);
    }

    // Restore body scroll
    document.body.style.overflow = '';

    if (callback) callback();
  }, 300);
}

/**
 * Initialize bottom sheet system
 */
export function initBottomSheetSystem() {
  ensureSheetContainer();
  console.log('✅ Bottom sheet system initialized');
}
