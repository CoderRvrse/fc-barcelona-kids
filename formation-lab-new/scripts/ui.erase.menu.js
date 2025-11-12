// Erase dropdown menu module for Formation Lab
import { FLAB } from './state.js';
import { renderArrows, clearLastPass, clearAllPasses } from './pass.js';
import { showToast } from './ui.js';

let open = false;
let selectedIndex = -1;
let lastFocusedElement = null;

function ensureMenu() {
  let m = document.getElementById('eraseMenu');
  if (!m) {
    m = document.createElement('div');
    m.id = 'eraseMenu';
    m.className = 'erase-menu';
    m.hidden = true;
    document.getElementById('ui-portal')?.appendChild(m);
  } else if (m.parentElement?.id !== 'ui-portal') {
    document.getElementById('ui-portal')?.appendChild(m);
  }
  return m;
}

function placeMenuFixed(menu, anchor) {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = Math.round(r.left), top = Math.round(r.bottom) + 6;

  // Measure menu size for edge detection
  menu.style.visibility = 'hidden';
  menu.hidden = false;
  const mw = menu.offsetWidth || 240, mh = menu.offsetHeight || 180;
  menu.hidden = true;
  menu.style.visibility = '';

  // Edge-aware positioning
  if (left + mw > vw - 8) left = Math.max(8, vw - mw - 8);
  if (top + mh > vh - 8) top = Math.max(8, r.top - mh - 6); // flip above

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function createMenuItem(text, hint = '', danger = false, onClick = () => {}) {
  const el = document.createElement('div');
  el.className = 'erase-menu__item';
  el.setAttribute('role', 'menuitem');
  el.setAttribute('tabindex', '0');

  if (danger) {
    el.classList.add('erase-menu__danger');
  }

  const name = document.createElement('span');
  name.textContent = text;

  const hintSpan = document.createElement('span');
  hintSpan.className = 'erase-menu__hint';
  hintSpan.textContent = hint;

  el.append(name, hintSpan);

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      onClick();
    }
  });

  return el;
}

function createDivider() {
  const div = document.createElement('div');
  div.className = 'erase-menu__divider';
  return div;
}

function renderMenu() {
  const m = ensureMenu();
  m.innerHTML = '';
  m.setAttribute('role', 'menu');

  // Clear all passes
  const clearAllItem = createMenuItem('Clear all passes', '', true, () => {
    if ((FLAB.arrows || []).length === 0) {
      showToast('No passes to clear');
      closeMenu();
      return;
    }
    if (confirm('Clear ALL passes? This action cannot be undone!')) {
      clearAllPasses();
      renderArrows();
      showToast('⚠️ Cleared all passes (cannot be undone with Redo)', 'warning');
      closeMenu();
    }
  });

  m.append(clearAllItem);

  // Add divider before future sections (only if we have optional modules)
  if (window.__mod_markers || window.__mod_notes) {
    m.append(createDivider());
  }

  // Future: markers section (when markers module exists)
  if (window.__mod_markers) {
    const clearMarkersItem = createMenuItem('Clear markers', '', true, () => {
      if (confirm('Delete all markers?')) {
        // clearAllMarkers?.(); // Will be implemented when markers module exists
        showToast('Cleared all markers');
        closeMenu();
      }
    });
    m.append(clearMarkersItem);
  }

  // Future: notes section (when notes module exists)
  if (window.__mod_notes) {
    const clearNotesItem = createMenuItem('Clear notes', '', false, () => {
      // setNotes?.(''); // Will be implemented when notes module exists
      showToast('Cleared notes');
      closeMenu();
    });
    m.append(clearNotesItem);
  }

  // Only show "CLEAR ALL" option if we have optional modules
  if (window.__mod_markers || window.__mod_notes) {
    m.append(createDivider());

    const clearAllDataItem = createMenuItem('CLEAR ALL (passes, markers, notes)', '', true, () => {
      if (confirm('This will clear EVERYTHING (passes, markers, notes). This action cannot be undone!')) {
        clearAllPasses();
        renderArrows();
        // clearAllMarkers?.(); // Future
        // setNotes?.(''); // Future
        showToast('⚠️ Cleared everything (cannot be undone with Redo)', 'warning');
        closeMenu();
      }
    });

    m.append(clearAllDataItem);
  }

  return m;
}

function focusFirst() {
  const firstItem = document.querySelector('#eraseMenu .erase-menu__item[tabindex="0"]');
  if (firstItem) {
    firstItem.focus();
    selectedIndex = 0;
  }
}

function trapFocus(e) {
  if (e.key !== 'Tab') return;

  const focusableItems = [...document.querySelectorAll('#eraseMenu .erase-menu__item[tabindex="0"]')];
  const firstItem = focusableItems[0];
  const lastItem = focusableItems[focusableItems.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === firstItem) {
      e.preventDefault();
      lastItem?.focus();
    }
  } else {
    if (document.activeElement === lastItem) {
      e.preventDefault();
      firstItem?.focus();
    }
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    closeMenu();
    return;
  }

  const menu = document.getElementById('eraseMenu');
  const items = [...menu.querySelectorAll('.erase-menu__item[role="menuitem"]')];

  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    selectedIndex = (selectedIndex + 1) % items.length;
    highlightItem(items);
    e.preventDefault();
  }

  if (e.key === 'ArrowUp') {
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    highlightItem(items);
    e.preventDefault();
  }

  if (e.key === 'Enter' && selectedIndex >= 0) {
    items[selectedIndex].click();
  }
}

function highlightItem(items) {
  items.forEach(el => el.removeAttribute('aria-current'));
  if (selectedIndex >= 0) {
    items[selectedIndex].setAttribute('aria-current', 'true');
    items[selectedIndex].focus();
  }
}

function openMenu(anchor) {
  // Store currently focused element
  lastFocusedElement = document.activeElement;

  const menu = renderMenu();
  placeMenuFixed(menu, anchor);
  menu.hidden = false;
  open = true;
  selectedIndex = 0;
  menu.setAttribute('role', 'menu');

  // Smooth animation
  requestAnimationFrame(() => {
    menu.classList.add('is-open');
    setTimeout(focusFirst, 50);
  });

  // Event listeners
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('keydown', trapFocus);

  // Click outside to close
  const onDocumentClick = (e) => {
    if (!menu.contains(e.target) && e.target !== anchor) {
      document.removeEventListener('mousedown', onDocumentClick);
      closeMenu();
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', onDocumentClick);
  }, 0);
}

function closeMenu() {
  const menu = document.getElementById('eraseMenu');
  if (!open || !menu) return;

  // Smooth close animation
  menu.classList.remove('is-open');

  setTimeout(() => {
    menu.hidden = true;
    open = false;
    selectedIndex = -1;

    // Restore focus
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }, 120); // Match CSS transition duration

  // Cleanup event listeners
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('keydown', trapFocus);
}

export function wireEraseMenu() {
  console.log('🔧 wireEraseMenu() called - initializing erase menu');

  const buttons = document.querySelectorAll('[data-mode="erase"]');
  console.log(`🔍 Found ${buttons.length} erase button(s):`, buttons);

  if (!buttons.length) {
    console.warn('⚠️ No erase buttons found with [data-mode="erase"]');
    return;
  }

  buttons.forEach((btn, index) => {
    console.log(`📌 Button ${index + 1}: id="${btn.id}" class="${btn.className}"`);

    btn.addEventListener('click', (e) => {
      console.log(`🖱️ Erase button clicked! Current mode: ${FLAB.mode}, Menu open: ${open}`);

      // Only show menu if we're not already in erase mode, or if we're clicking again
      if (FLAB.mode === 'erase') {
        console.log('✅ Mode is "erase" - toggling menu');
        e.preventDefault();
        e.stopPropagation();

        if (open) {
          console.log('📂 Menu is open - closing it');
          closeMenu();
        } else {
          console.log('📂 Menu is closed - opening it');
          openMenu(btn);
        }
      } else {
        console.log(`❌ Mode is "${FLAB.mode}" not "erase" - menu not shown (need to switch to erase mode first)`);
      }
    });
  });

  console.log('✅ wireEraseMenu() complete');
}

window.__mod_erasemenu = true;