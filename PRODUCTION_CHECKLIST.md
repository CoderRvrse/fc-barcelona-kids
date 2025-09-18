# Production Checklist for Bulletproof Hero

## 🚀 Pre-Deploy Validation
✅ Version bumped to v12 (HTML assets & service worker)
✅ Asset paths verified (`../assets/soccer-ball.svg`)
✅ Auto-scaffolding system implemented
✅ Fallback visibility ensured

## 🔍 Post-Deploy Smoke Tests

### 1. DOM Elements Check
Paste in DevTools Console on live site:
```js
[
  '#hero', '#heroTitle', '#heroTitleSolid', '#heroUnderline', '#heroBall'
].every(sel => !!document.querySelector(sel))
// Expected: true
```

### 2. Director Panel Tests
```js
// Layout repositioning
window.__hero?.layout?.();

// Animation replay
window.__hero?.run?.();

// Initialize if needed
window.__hero?.init?.();
```

### 3. Fallback Visibility Check
```js
// Ball should be visible even if animations fail
getComputedStyle(document.querySelector('#heroBall')).opacity
// Expected: "1" or visible value
```

### 4. Auto-Scaffold Verification
```js
// Force re-scaffold (for testing)
window.__hero?.ensureHeroDom?.('FC BARCELONA');
console.log('Hero elements exist:', !!document.querySelector('#heroTitle'));
```

## 🛠️ Troubleshooting

### Cache Issues
1. Application → Clear storage → Unregister service workers
2. Hard reload (Ctrl+Shift+R)
3. Re-run smoke tests

### Missing Animation
- Check: `window.__heroConfig` exists
- Check: GSAP loaded via CDN
- Fallback: Ball should still be visible with CSS

### Performance Check
```js
// Animation performance
console.time('hero-init');
window.__hero?.init?.();
console.timeEnd('hero-init');
```

## 🎯 Production URLs
- Live site: https://coderrvse.github.io/fc-barcelona-kids/
- Assets: `../assets/soccer-ball.svg` (relative to styles/)
- Cache: v12 (`fcb-kids-v12`)

## 🔧 Optional Enhancements

### First-Visit Only Animation
```js
if (!sessionStorage.getItem('heroSeen')) {
  window.__hero?.run?.();
  sessionStorage.setItem('heroSeen', '1');
} else {
  window.__hero?.init?.(); // Jump to final state
}
```

### Disable Auto-Scaffold (Future)
```js
window.__heroConfig = { ...window.__heroConfig, autoScaffold: false };
```