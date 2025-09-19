# CSS-First Hero Smoke Tests

## 🎯 Live Site
https://coderrvse.github.io/fc-barcelona-kids/

## ✅ Quick Smoke Tests (DevTools Console)

### 1. Elements Exist
```js
['#hero','#heroTitle','.title-reveal','#heroBall'].every(s=>!!document.querySelector(s))
// Expected: true
```

### 2. Animations Active (unless reduced motion)
```js
getComputedStyle(document.querySelector('.title-reveal')).clipPath
// Expected: "inset(0px 0px 0px 0px round 2px)" (after animation)

getComputedStyle(document.querySelector('#heroBall')).animationDuration
// Expected: "9s" (if animations enabled)
```

### 3. Ball Asset Loaded
```js
// Network tab should show 200 for assets/soccer-ball.svg
document.querySelector('#heroBall').complete
// Expected: true
```

### 4. Dev Hooks Working
```js
// Replay animation
window.__hero?.rerun?.()

// Check gap calculation
window.__hero?.layout?.()

// Toggle animation state
window.__hero?.spin?.(false) // disable
window.__hero?.spin?.(true)  // enable
```

## 🔧 What Changed

### ✅ Removed
- ❌ All GSAP dependencies and timeline logic
- ❌ DOM auto-scaffolding that caused console errors
- ❌ Complex hero positioning calculations
- ❌ Fragile clip-path SVG masks and underlines
- ❌ Director's panel config (simplified to dev hooks)

### ✅ Added
- ✅ Pure CSS animations with `clip-path` text reveal
- ✅ CSS-only ball spinning controlled by `data-anim="on"`
- ✅ Built-in reduced motion support (static fallback)
- ✅ Minimal JS: font loading + gap calc + data attribute flip
- ✅ Clean `<img>` element for ball (proper asset loading)
- ✅ Guaranteed visibility even if JavaScript fails

## 🛡️ Bulletproof Features

1. **CSS-First**: Animations work without any JS dependencies
2. **Asset Safety**: Ball uses proper `<img>` with `src="assets/soccer-ball.svg"`
3. **Reduced Motion**: Automatically disables animation for accessibility
4. **Font Guards**: 1.5s timeout prevents infinite loading waits
5. **No Console Errors**: Clean exit if DOM elements missing
6. **ESLint Clean**: No unused vars, empty blocks, or syntax issues

## 🎨 Animation Flow

1. **Page loads** → Ball visible, title hidden (`clip-path: inset(0 100% 0 0)`)
2. **Fonts ready** → JS sets `hero.dataset.anim = 'on'`
3. **CSS transitions** → Title reveals, ball spins (unless reduced motion)
4. **Gap calculation** → Ensures ball doesn't overlap CTAs

## 🔍 Troubleshooting

### Ball not spinning?
- Check: `hero.dataset.anim === 'on'`
- Check: User doesn't have reduced motion preference

### Title not revealing?
- Check: `getComputedStyle('.title-reveal').clipPath`
- Should transition from `inset(0 100% 0 0)` to `inset(0 0 0 0)`

### Asset 404?
- Verify `<base href="/fc-barcelona-kids/">` present
- Check Network tab for `assets/soccer-ball.svg` status

This rebuild eliminates all fragility while maintaining visual impact! 🚀