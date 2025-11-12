// Preset dropdown menu module for Formation Lab
import { FLAB } from './state.js';
import { listPresets, getDefaultPresetName, deletePreset, setDefaultPreset, getPreset, savePreset } from './storage.js';
import { snapshotCurrentPlayersCanonical, applyPlayersCanonical } from './presets.js';
import { logPresetSave, logPresetApply, logPresetSetDefault, logPresetDelete } from './logger.js';
import { showToast } from './ui.js';

let open = false;
let selectedIndex = -1;
let lastFocusedElement = null;

function focusFirst() {
  const firstItem = document.querySelector('#presetMenu .preset-menu__item[tabindex="0"]');
  if (firstItem) {
    firstItem.focus();
    selectedIndex = 0;
  }
}

function trapFocus(e) {
  if (e.key !== 'Tab') return;

  const focusableItems = [...document.querySelectorAll('#presetMenu .preset-menu__item[tabindex="0"]')];
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

function placeMenuFixed(menu, anchor) {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = Math.round(r.left), top = Math.round(r.bottom) + 6;

  // Ensure menu is visible by measuring its size
  menu.style.visibility = 'hidden';
  menu.hidden = false;
  const mw = menu.offsetWidth || 240, mh = menu.offsetHeight || 200;
  menu.hidden = true;
  menu.style.visibility = '';

  // Edge-aware positioning
  if (left + mw > vw - 8) left = Math.max(8, vw - mw - 8);
  if (top + mh > vh - 8) top = Math.max(8, r.top - mh - 6); // flip above

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function ensureMenu() {
  let m = document.getElementById('presetMenu');
  if (!m) {
    m = document.createElement('div');
    m.id = 'presetMenu';
    m.className = 'preset-menu';
    m.hidden = true;
    document.getElementById('ui-portal')?.appendChild(m);   // << portal
  } else if (m.parentElement?.id !== 'ui-portal') {
    document.getElementById('ui-portal')?.appendChild(m);
  }
  return m;
}

function renderMenu() {
  const menu = ensureMenu();
  const items = listPresets();
  const defaultPreset = getDefaultPresetName();

  menu.innerHTML = '';

  // Quick action: save current
  const quickAction = document.createElement('div');
  quickAction.className = 'preset-menu__item preset-menu__quick-action';
  quickAction.setAttribute('role', 'menuitem');
  quickAction.setAttribute('tabindex', '0');
  quickAction.innerHTML = `<span class="preset-menu__name">➕ Save current as preset…</span>`;
  quickAction.addEventListener('click', () => {
    const name = prompt('Preset name:', '4-3-3 tuned');
    if (!name) return;
    const snap = snapshotCurrentPlayersCanonical();
    savePreset(name, snap);
    logPresetSave(name, snap);
    showToast(`Preset saved: ${name}`);
    closeMenu();
    renderMenu(); // Refresh the menu
  });
  menu.appendChild(quickAction);

  // Divider
  const divider = document.createElement('div');
  divider.className = 'preset-menu__divider';
  menu.appendChild(divider);

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'preset-menu__empty';
    empty.textContent = 'No presets saved yet.';
    menu.appendChild(empty);
    return;
  }

  items.forEach((preset, i) => {
    const row = document.createElement('div');
    row.className = 'preset-menu__item';
    row.setAttribute('role', 'menuitem');
    row.dataset.index = i;

    const nameContainer = document.createElement('div');
    nameContainer.className = 'preset-menu__name';
    nameContainer.textContent = preset.name;

    if (preset.name === defaultPreset) {
      const badge = document.createElement('span');
      badge.className = 'preset-menu__badge';
      badge.textContent = '(Default)';
      nameContainer.appendChild(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'preset-menu__actions';

    const btnApply = document.createElement('button');
    btnApply.className = 'preset-menu__btn';
    btnApply.textContent = 'Apply';
    btnApply.addEventListener('click', (e) => {
      e.stopPropagation();
      const presetData = getPreset(preset.name);
      if (presetData) {
        applyPlayersCanonical(presetData.players);
        logPresetApply(preset.name, presetData);
        showToast(`Applied preset: ${preset.name}`);
      }
      closeMenu();
    });

    const btnDefault = document.createElement('button');
    btnDefault.className = 'preset-menu__btn';
    btnDefault.textContent = 'Default';
    btnDefault.addEventListener('click', (e) => {
      e.stopPropagation();
      setDefaultPreset(preset.name);
      logPresetSetDefault(preset.name);
      showToast(`Set default: ${preset.name}`);
      renderMenu(); // Refresh badges
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'preset-menu__btn preset-menu__btn--delete';
    btnDelete.textContent = 'Delete';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Delete preset "${preset.name}"?`)) return;
      deletePreset(preset.name);
      logPresetDelete(preset.name).catch(console.error);
      showToast(`Deleted preset: ${preset.name}`);
      renderMenu(); // Refresh the menu
    });

    actions.append(btnApply, btnDefault, btnDelete);
    row.append(nameContainer, actions);

    // Entire row applies preset on click
    row.addEventListener('click', () => btnApply.click());
    row.setAttribute('tabindex', '0');

    menu.appendChild(row);
  });
}

function openMenu(anchor) {
  // Store currently focused element to restore later
  lastFocusedElement = document.activeElement;

  const menu = ensureMenu();
  renderMenu();
  placeMenuFixed(menu, anchor);
  menu.hidden = false;
  open = true;
  selectedIndex = -1;
  menu.setAttribute('role', 'menu');

  // Trigger smooth animation
  requestAnimationFrame(() => {
    menu.classList.add('is-open');
    // Focus first item after animation starts
    setTimeout(focusFirst, 50);
  });

  // keep it stuck to the button on scroll/resize
  const relayout = () => placeMenuFixed(menu, anchor);
  window.addEventListener('scroll', relayout, { passive: true });
  window.addEventListener('resize', relayout);

  menu.__relayout = relayout;

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick, { once: true });
  }, 0);

  // Keyboard navigation and focus trapping
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('keydown', trapFocus);
}

function closeMenu() {
  const menu = document.getElementById('presetMenu');
  if (!open || !menu) return;

  // Smooth close animation
  menu.classList.remove('is-open');

  setTimeout(() => {
    menu.hidden = true;
    open = false;
    selectedIndex = -1;

    // Restore focus to original element
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }, 120); // Match CSS transition duration

  // Cleanup event listeners
  window.removeEventListener('scroll', menu.__relayout);
  window.removeEventListener('resize', menu.__relayout);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('keydown', trapFocus);

  // Safety cleanup
  if (menu.__relayout) {
    menu.__relayout = null;
  }
}

function handleOutsideClick(e) {
  const menu = document.getElementById('presetMenu');
  const manageButton = document.getElementById('btnManagePresets');

  if (!menu.contains(e.target) && e.target !== manageButton) {
    closeMenu();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    closeMenu();
    return;
  }

  const menu = document.getElementById('presetMenu');
  const items = [...menu.querySelectorAll('.preset-menu__item[role="menuitem"]')];

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
  }
}

export function wirePresetDropdown() {
  const btn = document.getElementById('btnManagePresets');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (open) {
      closeMenu();
    } else {
      openMenu(btn);
    }
  });
}

window.__mod_presetmenu = true;