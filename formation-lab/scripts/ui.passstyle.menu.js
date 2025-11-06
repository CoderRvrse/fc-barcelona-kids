import { FLAB, PASS_STYLES, PASS } from './state.js';
import { saveSettings } from './persist.js';
import { renderArrows, rebuildAllMarkers, forceArrowRefresh } from './pass.js';
import { updateMarkerColors } from '../assets/arrows/simple-markers.js';

const STYLE_HINTS = {
  solid: 'Clean solid arrows',
  'comic-flat': 'Hand-drawn look',
  'comic-halftone': 'Dotted comic style'
};

const PRESETS = [
  '#ffd166', '#ff5858', '#5cffb0', '#66a3ff', '#ffe66d',
  '#ff9fe5', '#b28dff', '#ffb86b', '#00e1ff', '#ffffff'
];

let isOpen = false;
let focusedIndex = 0;

function normaliseHex(hex) {
  if (!hex) return '#ffd166';
  const value = hex.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return value.toLowerCase();
  }
  return '#ffd166';
}

function setAppColor(hex) {
  const colour = normaliseHex(hex);
  console.log(`🎨 Setting app color to: ${colour}`);
  PASS.color = colour;
  document.documentElement.style.setProperty('--pass-color', colour);
  try {
    updateMarkerColors?.(colour);
    setTimeout(() => updateMarkerColors?.(colour), 16);
  } catch (err) {
    console.warn('updateMarkerColors failed', err);
  }
  PASS.recent = [colour, ...PASS.recent.filter(c => c !== colour)].slice(0, 3);
  saveSettings?.({ passColor: PASS.color, passRecent: PASS.recent });
  rebuildAllMarkers?.();
  renderArrows?.();
  forceArrowRefresh?.();
}

function ensureMenuContainer() {
  let menu = document.getElementById('passStyleMenu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'passStyleMenu';
    menu.className = 'passstyle-menu';
    menu.hidden = true;
    (document.getElementById('ui-portal') || document.body).appendChild(menu);
  }
  return menu;
}

function placeMenu(menu, anchor) {
  const rect = anchor.getBoundingClientRect();
  menu.hidden = false;
  menu.style.left = '0px';
  menu.style.top = '-9999px';
  const width = menu.offsetWidth || 240;
  const height = menu.offsetHeight || 220;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = Math.round(rect.left);
  let top = Math.round(rect.bottom) + 6;
  if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
  if (top + height > vh - 8) top = Math.max(8, rect.top - height - 6);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function createStyleRow(styleDef) {
  const el = document.createElement('div');
  el.className = 'passstyle__item';
  el.setAttribute('role', 'menuitemradio');
  el.tabIndex = 0;
  el.innerHTML = `<span>${styleDef.label}</span><span class="passstyle__hint">${STYLE_HINTS[styleDef.key] || ''}</span>`;
  if (FLAB.passStyle === styleDef.key) el.setAttribute('aria-checked', 'true');

  const choose = (event) => {
    event.stopPropagation();
    FLAB.passStyle = styleDef.key;
    const trigger = document.getElementById('btnPassStyle');
    const nameSpan = trigger ? trigger.querySelector('.passstyle-trigger__name') : null;
    if (nameSpan) {
      nameSpan.textContent = styleDef.label;
    }
    saveSettings?.({ passStyle: styleDef.key });
    renderArrows?.();
    closeMenu();
  };

  el.addEventListener('click', choose);
  el.addEventListener('keydown', evt => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      choose(evt);
    }
  });
  return el;
}

function createColorSection() {
  const wrap = document.createElement('div');
  wrap.className = 'passcolor';

  const label = document.createElement('div');
  label.className = 'passcolor__label';
  label.textContent = 'Colors';
  wrap.appendChild(label);

  const grid = document.createElement('div');
  grid.className = 'passcolor__grid';
  PRESETS.forEach(hex => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'passcolor__swatch';
    swatch.style.background = hex;
    swatch.title = hex;
    if (hex.toLowerCase() === PASS.color.toLowerCase()) swatch.classList.add('is-active');
    swatch.addEventListener('click', evt => {
      evt.stopPropagation();
      setAppColor(hex);
      updateActiveSwatches(grid);
    });
    grid.appendChild(swatch);
  });
  wrap.appendChild(grid);

  const custom = document.createElement('div');
  custom.className = 'passcolor__custom';
  const customLabel = document.createElement('div');
  customLabel.className = 'passcolor__label';
  customLabel.textContent = 'Custom';
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'passcolor__picker';
  picker.value = normaliseHex(PASS.color);
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'passcolor__btn';
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('click', evt => {
    evt.stopPropagation();
    setAppColor(picker.value);
    updateActiveSwatches(grid);
  });
  custom.append(customLabel, picker, applyBtn);
  wrap.appendChild(custom);

  if (PASS.recent?.length) {
    const recLabel = document.createElement('div');
    recLabel.className = 'passcolor__label';
    recLabel.textContent = 'Recent';
    const recentWrap = document.createElement('div');
    recentWrap.className = 'passcolor__recent';
    PASS.recent.forEach(hex => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'passcolor__swatch';
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener('click', evt => {
        evt.stopPropagation();
        setAppColor(hex);
        updateActiveSwatches(grid);
      });
      recentWrap.appendChild(sw);
    });
    wrap.append(recLabel, recentWrap);
  }

  return wrap;
}

function updateActiveSwatches(grid) {
  const target = PASS.color.toLowerCase();
  grid.querySelectorAll('.passcolor__swatch').forEach(node => node.classList.remove('is-active'));
  [...grid.children].find(node => node.title.toLowerCase() === target)?.classList.add('is-active');
}

function renderMenu() {
  const menu = ensureMenuContainer();
  menu.innerHTML = '';
  menu.setAttribute('role', 'menu');

  const styles = PASS_STYLES.map(def => ({
    key: def.key,
    label: def.label || def.key.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
  }));
  styles.forEach(styleDef => menu.appendChild(createStyleRow(styleDef)));

  const divider = document.createElement('hr');
  divider.style.cssText = 'margin: 8px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);';
  menu.appendChild(divider);
  menu.appendChild(createColorSection());
  return menu;
}

function onMenuKeydown(evt) {
  const menu = document.getElementById('passStyleMenu');
  if (!menu) return;
  const items = [...menu.querySelectorAll('.passstyle__item')];
  if (!items.length) return;
  if (evt.key === 'Escape') {
    evt.preventDefault();
    closeMenu();
    return;
  }
  if (evt.key === 'ArrowDown' || (evt.key === 'Tab' && !evt.shiftKey)) {
    evt.preventDefault();
    focusedIndex = (focusedIndex + 1) % items.length;
    items[focusedIndex].focus();
  }
  if (evt.key === 'ArrowUp' || (evt.key === 'Tab' && evt.shiftKey)) {
    evt.preventDefault();
    focusedIndex = (focusedIndex - 1 + items.length) % items.length;
    items[focusedIndex].focus();
  }
}

function openMenu(anchor) {
  const menu = renderMenu();
  placeMenu(menu, anchor);
  menu.hidden = false;
  requestAnimationFrame(() => menu.classList.add('is-open'));
  isOpen = true;
  const styles = [...menu.querySelectorAll('.passstyle__item')];
  focusedIndex = Math.max(0, styles.findIndex(el => el.getAttribute('aria-checked') === 'true'));
  styles[focusedIndex]?.focus();

  const onDocumentClick = (evt) => {
    if (!menu.contains(evt.target) && evt.target !== anchor) {
      document.removeEventListener('mousedown', onDocumentClick);
      closeMenu();
    }
  };
  document.addEventListener('mousedown', onDocumentClick, { once: true });
  document.addEventListener('keydown', onMenuKeydown);
}

function closeMenu() {
  const menu = document.getElementById('passStyleMenu');
  if (!menu || !isOpen) return;
  menu.classList.remove('is-open');
  setTimeout(() => { menu.hidden = true; }, 120);
  isOpen = false;
  document.removeEventListener('keydown', onMenuKeydown);
}

export function wirePassStyleMenu() {
  const trigger = document.getElementById('btnPassStyle');
  if (!trigger) return;
  const currentStyle = PASS_STYLES.find(s => s.key === FLAB.passStyle) || PASS_STYLES[0];
  const nameSpan = trigger.querySelector('.passstyle-trigger__name');
  if (nameSpan) {
    nameSpan.textContent = currentStyle.label || currentStyle.key;
  }
  trigger.addEventListener('click', () => {
    const menu = document.getElementById('passStyleMenu');
    if (menu && menu.hidden === false) {
      closeMenu();
    } else {
      openMenu(trigger);
    }
  });
}

export function initPassStyleMenu() {
  wirePassStyleMenu();
}

window.__mod_passstylemenu = true;
