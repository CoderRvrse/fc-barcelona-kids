/**
 * Fullscreen mode for Formation Lab
 * Expands the pitch to fill the display and mirrors native fullscreen behavior.
 */

import { FLAB } from './state.js';

let isFullscreen = false;
let originalSidepanelDisplay = null;
let originalBodyPadding = null;
let nativeExitInProgress = false;
let fullscreenOverlayControls = null;
let fullscreenControlsHandle = null;
let toolbarPlaceholder = null;
let actionsPlaceholder = null;
let controlsSheetObserver = null;
let controlsSheetRef = null;

const NATIVE_FULLSCREEN_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange'
];

const getNativeFullscreenElement = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement ||
  null;

function requestNativeFullscreen(target = document.documentElement) {
  if (!target) return Promise.resolve(false);
  const method =
    target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.mozRequestFullScreen ||
    target.msRequestFullscreen;

  if (!method) return Promise.resolve(false);

  try {
    const result = method.call(target);
    if (result && typeof result.then === 'function') {
      return result.then(() => true).catch(err => {
        console.warn('Native fullscreen request failed:', err);
        return false;
      });
    }
    return Promise.resolve(true);
  } catch (err) {
    console.warn('Native fullscreen request failed:', err);
    return Promise.resolve(false);
  }
}

function exitNativeFullscreen() {
  const method =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;

  if (!method) return Promise.resolve(false);

  nativeExitInProgress = true;

  try {
    const result = method.call(document);
    const finish = () => {
      nativeExitInProgress = false;
      return true;
    };

    if (result && typeof result.then === 'function') {
      return result.then(finish).catch(err => {
        nativeExitInProgress = false;
        console.warn('Native fullscreen exit failed:', err);
        return false;
      });
    }

    finish();
    return Promise.resolve(true);
  } catch (err) {
    nativeExitInProgress = false;
    console.warn('Native fullscreen exit failed:', err);
    return Promise.resolve(false);
  }
}

function getFullscreenButton() {
  return document.getElementById('btnFullscreen');
}

function getFullscreenCornerButton() {
  return document.getElementById('btnFullscreenCorner');
}

function updateButtonState(button, entering) {
  if (!button) return;
  button.setAttribute('aria-pressed', entering ? 'true' : 'false');
}

function updateAllFullscreenButtons(entering) {
  const btn1 = getFullscreenButton();
  const btn2 = getFullscreenCornerButton();
  updateButtonState(btn1, entering);
  updateButtonState(btn2, entering);
}

export function toggleFullscreen() {
  if (isFullscreen) {
    exitFullscreen();
  } else {
    enterFullscreen();
  }
}

export function enterFullscreen() {
  const app = document.querySelector('.flab-app');
  const sidepanel = document.querySelector('.flab-sidepanel');

  if (!app || !sidepanel || isFullscreen) return;

  originalSidepanelDisplay = sidepanel.style.display;
  originalBodyPadding = document.body.style.padding;

  sidepanel.style.display = 'none';
  app.classList.add('flab-app--fullscreen');
  document.body.classList.add('flab-body--fullscreen');
  document.body.style.padding = '0';

  moveControlsToOverlay();
  closePitchControls();
  updateAllFullscreenButtons(true);
  addCloseButton();

  import('./orientation.js').then(({ autoOrientation }) => autoOrientation());

  window.dispatchEvent(new Event('resize'));

  isFullscreen = true;
  showFullscreenHint();
  requestNativeFullscreen(document.documentElement);
  openPitchControls();
}

export function exitFullscreen(options = {}) {
  const app = document.querySelector('.flab-app');
  const sidepanel = document.querySelector('.flab-sidepanel');

  if (!app || !sidepanel) return;
  if (!isFullscreen && !getNativeFullscreenElement() && !options.force) return;

  const skipNative = options.skipNative === true;
  isFullscreen = false;

  sidepanel.style.display = originalSidepanelDisplay || '';
  document.body.style.padding =
    originalBodyPadding !== null ? originalBodyPadding : '';

  app.classList.remove('flab-app--fullscreen');
  document.body.classList.remove('flab-body--fullscreen');

  restoreControlsFromOverlay();
  updateAllFullscreenButtons(false);
  removeCloseButton();

  setTimeout(() => {
    import('./orientation.js').then(({ autoOrientation }) => autoOrientation());
  }, 50);

  window.dispatchEvent(new Event('resize'));

  console.log('? Fullscreen mode disabled');

  if (!skipNative && getNativeFullscreenElement()) {
    exitNativeFullscreen();
  }

  closePitchControls();
}

function getControlsSheet() {
  if (controlsSheetRef && document.body.contains(controlsSheetRef)) {
    return controlsSheetRef;
  }
  controlsSheetRef = document.querySelector('.flab-controls-sheet');
  return controlsSheetRef;
}

function ensureFullscreenControlsOverlay() {
  const field = document.querySelector('.flab-field');
  if (!field) {
    console.warn('Fullscreen controls overlay target missing');
    return fullscreenOverlayControls ?? null;
  }

  if (fullscreenOverlayControls && document.body.contains(fullscreenOverlayControls)) {
    return fullscreenOverlayControls;
  }

  fullscreenOverlayControls = document.getElementById('fullscreenControlsOverlay');
  if (!fullscreenOverlayControls) {
    fullscreenOverlayControls = document.createElement('div');
    fullscreenOverlayControls.id = 'fullscreenControlsOverlay';
    fullscreenOverlayControls.className = 'flab-fullscreen-controls';
    fullscreenOverlayControls.setAttribute('aria-hidden', 'true');
    field.appendChild(fullscreenOverlayControls);
    console.debug('[FLAB] fullscreen controls overlay created');
  } else {
    console.debug('[FLAB] fullscreen controls overlay found');
  }
  bindOverlayGuards(fullscreenOverlayControls);

  if (!fullscreenControlsHandle || !document.body.contains(fullscreenControlsHandle)) {
    fullscreenControlsHandle = document.createElement('button');
    fullscreenControlsHandle.id = 'fullscreen-controls-handle';
    fullscreenControlsHandle.type = 'button';
    fullscreenControlsHandle.className = 'flab-fullscreen-controls__handle';
    fullscreenControlsHandle.setAttribute('aria-controls', fullscreenOverlayControls.id);
    fullscreenControlsHandle.setAttribute('aria-expanded', 'false');
    fullscreenControlsHandle.innerHTML = `
      <span>Tools</span>
      <svg aria-hidden="true" focusable="false" width="16" height="10" viewBox="0 0 16 10">
        <path d="M2 6l6-4 6 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    fullscreenControlsHandle.addEventListener('click', toggleFullscreenOverlay);
    field.appendChild(fullscreenControlsHandle);
    console.debug('[FLAB] fullscreen overlay handle created');
  }
  bindOverlayGuards(fullscreenControlsHandle);

  return fullscreenOverlayControls;
}

function moveControlsToOverlay() {
  const overlay = ensureFullscreenControlsOverlay();
  if (!overlay) return;

  let moved = false;

  const toolbar = document.querySelector('.flab-controls-sheet .flab-toolbar');
  if (toolbar && toolbar.parentNode !== overlay) {
    if (!toolbarPlaceholder) {
      toolbarPlaceholder = document.createComment('flab-toolbar-home');
      toolbar.parentNode.insertBefore(toolbarPlaceholder, toolbar);
    }
    overlay.appendChild(toolbar);
    moved = true;
    console.debug('[FLAB] toolbar mounted in fullscreen overlay');
  }

  const actions = document.querySelector('.flab-controls-sheet .flab-actions');
  if (actions && actions.parentNode !== overlay) {
    if (!actionsPlaceholder) {
      actionsPlaceholder = document.createComment('flab-actions-home');
      actions.parentNode.insertBefore(actionsPlaceholder, actions);
    }
    overlay.appendChild(actions);
    moved = true;
    console.debug('[FLAB] actions mounted in fullscreen overlay');
  }

  if (moved) {
    overlay.setAttribute('aria-hidden', 'false');
    overlay.dataset.active = 'true';
    logOverlayButtons('mounted');
    observeControlsSheet();
  } else {
    console.debug('[FLAB] fullscreen overlay already hydrated');
  }
}

function restoreControlsFromOverlay() {
  if (!fullscreenOverlayControls) return;

  const toolbar = fullscreenOverlayControls.querySelector('.flab-toolbar');
  if (toolbar && toolbarPlaceholder?.parentNode) {
    toolbarPlaceholder.parentNode.insertBefore(toolbar, toolbarPlaceholder);
    console.debug('[FLAB] toolbar returned to sheet');
  }

  const actions = fullscreenOverlayControls.querySelector('.flab-actions');
  if (actions && actionsPlaceholder?.parentNode) {
    actionsPlaceholder.parentNode.insertBefore(actions, actionsPlaceholder);
    console.debug('[FLAB] actions returned to sheet');
  }

  fullscreenOverlayControls.removeAttribute('data-active');
  fullscreenOverlayControls.setAttribute('aria-hidden', 'true');
  fullscreenOverlayControls.classList.remove('is-open');
  if (fullscreenControlsHandle) {
    fullscreenControlsHandle.setAttribute('aria-expanded', 'false');
  }
  disconnectControlsSheetObserver();
  controlsSheetRef = null;
  logOverlayButtons('restored');
}

function logOverlayButtons(reason) {
  if (!fullscreenOverlayControls) return;
  const buttons = fullscreenOverlayControls.querySelectorAll('button');
  console.debug(`[FLAB] fullscreen overlay ${reason} (${buttons.length} buttons)`);
  buttons.forEach(btn => {
    const label =
      btn.id ||
      btn.getAttribute('data-mode') ||
      btn.querySelector('.flab-controls-tab__label')?.textContent ||
      btn.textContent.trim();
    console.debug(`   ↳ ${label || '(unnamed control)'}`);
  });
}

function observeControlsSheet() {
  const sheet = getControlsSheet();
  if (!sheet) {
    console.warn('Fullscreen overlay: controls sheet missing');
    return;
  }
  disconnectControlsSheetObserver();
  controlsSheetObserver = new MutationObserver(syncFullscreenOverlayState);
  controlsSheetObserver.observe(sheet, { attributes: true, attributeFilter: ['class'] });
  console.debug('[FLAB] fullscreen overlay watching sheet state');
  syncFullscreenOverlayState();
}

function disconnectControlsSheetObserver() {
  controlsSheetObserver?.disconnect();
  controlsSheetObserver = null;
}

function syncFullscreenOverlayState() {
  const sheet = getControlsSheet();
  if (!sheet || !fullscreenOverlayControls) return;
  const isOpen = sheet.classList.contains('is-open');
  fullscreenOverlayControls.classList.toggle('is-open', isOpen);
  fullscreenOverlayControls.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  if (fullscreenControlsHandle) {
    fullscreenControlsHandle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  console.debug(`[FLAB] fullscreen overlay ${isOpen ? 'visible' : 'hidden'} (sheet state)`);
}

function closePitchControls() {
  const sheet = getControlsSheet();
  if (!sheet) return;
  sheet.classList.remove('is-open');
}

function openPitchControls() {
  const sheet = getControlsSheet();
  if (!sheet) return;
  sheet.classList.add('is-open');
}

function toggleFullscreenOverlay(event) {
  event?.stopPropagation();
  const sheet = getControlsSheet();
  if (!sheet) return;
  if (sheet.classList.contains('is-open')) {
    closePitchControls();
  } else {
    openPitchControls();
  }
}

function bindOverlayGuards(element) {
  if (!element || element.dataset.overlayGuard === 'true') return;
  const guard = event => event.stopPropagation();
  ['click', 'pointerdown', 'touchstart'].forEach(evt =>
    element.addEventListener(evt, guard)
  );
  element.dataset.overlayGuard = 'true';
}

function addCloseButton() {
  removeCloseButton();
  const closeBtn = document.createElement('button');
  closeBtn.id = 'fullscreen-close-btn';
  closeBtn.className = 'fullscreen-close-btn';
  closeBtn.type = 'button';
  closeBtn.innerHTML = '<span aria-hidden="true">&times;</span>';
  closeBtn.setAttribute('aria-label', 'Exit fullscreen');
  closeBtn.setAttribute('title', 'Exit fullscreen (Esc or F11)');
  closeBtn.addEventListener('click', () => exitFullscreen());
  document.body.appendChild(closeBtn);
  console.debug('[FLAB] fullscreen close button mounted');
}

function removeCloseButton() {
  const existing = document.getElementById('fullscreen-close-btn');
  if (existing) {
    existing.remove();
    console.debug('[FLAB] fullscreen close button removed');
  }
}

function showFullscreenHint() {
  const existing = document.getElementById('fullscreen-hint');
  if (existing) return;

  const toast = document.createElement('div');
  toast.id = 'fullscreen-hint';
  toast.className = 'flab-toast flab-toast--info';
  toast.style.cssText = `
    position: fixed;
    bottom: 72px;
    right: 18px;
    background: rgba(76, 175, 80, 0.95);
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 10001;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  toast.textContent = 'Press Esc or F11 to exit fullscreen';
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 250ms ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function handleFullscreenKeys(e) {
  if (e.key === 'Escape' && (isFullscreen || getNativeFullscreenElement())) {
    e.preventDefault();
    exitFullscreen();
    return;
  }

  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  }
}

function handleNativeFullscreenChange() {
  if (nativeExitInProgress) return;
  const nativeActive = !!getNativeFullscreenElement();
  if (!nativeActive && isFullscreen) {
    exitFullscreen({ skipNative: true, force: true });
  }
}

export function initFullscreen() {
  const button = getFullscreenButton();
  const cornerButton = getFullscreenCornerButton();
  if (!button && !cornerButton) {
    console.warn('Fullscreen button not found');
    return;
  }

  if (button) button.addEventListener('click', toggleFullscreen);
  if (cornerButton) cornerButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('keydown', handleFullscreenKeys);
  NATIVE_FULLSCREEN_EVENTS.forEach(evt =>
    document.addEventListener(evt, handleNativeFullscreenChange)
  );

  FLAB.fullscreenEnabled = true;
  console.log('? Fullscreen feature initialized (Hotkeys: F11 toggle, Esc exit)');
}

export function destroyFullscreen() {
  const button = getFullscreenButton();
  const cornerButton = getFullscreenCornerButton();
  if (button) button.removeEventListener('click', toggleFullscreen);
  if (cornerButton) cornerButton.removeEventListener('click', toggleFullscreen);

  document.removeEventListener('keydown', handleFullscreenKeys);
  NATIVE_FULLSCREEN_EVENTS.forEach(evt =>
    document.removeEventListener(evt, handleNativeFullscreenChange)
  );

  if (isFullscreen || getNativeFullscreenElement()) {
    exitFullscreen({ force: true });
  }

  console.log('? Fullscreen feature destroyed');
}

export function isFullscreenMode() {
  return isFullscreen;
}

window.__mod_fullscreen = true;
