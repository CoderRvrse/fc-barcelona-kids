# Formation Lab v23.4.3

> Youth soccer tactics board with drag, pass arrows, and instant exports

[![CI Status](https://github.com/anthropics/formation-lab/workflows/audit/badge.svg)](https://github.com/anthropics/formation-lab/actions)

Formation Lab is a modern web application for designing soccer formations and tactical plays. Built with vanilla JavaScript ES6 modules, it features intuitive drag-and-drop player positioning, sophisticated pass arrow drawing, and high-quality PNG export capabilities.

## ✨ Features

- **🎯 Drag & Drop**: Intuitive player positioning with halo-edge pass origins
- **➡️ Pass Arrows**: Draw straight or curved passes (Alt + drag) with 3 SVG arrowhead styles
- **📱 Responsive**: Landscape/portrait orientation with view transforms
- **💾 Settings Persistence**: Your preferences save automatically across sessions
- **📸 Export**: High-quality PNG export with canvas rendering parity
- **⚡ Performance**: Optimized for 60fps interactions with micro-optimizations
- **🛡️ Quality Assured**: 20+ automated checks with CI pipeline

## 🚀 Quick Start

### Development

```bash
# Serve locally (port 5500)
npm run serve

# Visit http://127.0.0.1:5500/
```

### Production Build

```bash
# Install dependencies
npm install

# Build minified version
npm run build

# Outputs to dist/scripts/ with sourcemaps
```

### Quality Audit

```bash
# Headless CI audit
node scripts/ci-audit.mjs

# Browser audit (in dev tools)
import('./scripts/audit.js').then(m=>m.runAudit())
```

## Run locally

**Important:** Run via HTTP server (not file://) to avoid CORS issues with external assets.

### Option 1: Node.js
```bash
npx http-server -p 5500 .
# or
npx serve -l 5500 .
```

### Option 2: Python
```bash
python -m http.server 5500
```

Then open [http://127.0.0.1:5500/](http://127.0.0.1:5500/) in your browser.

For development updates, perform a hard refresh (Shift+Reload) to bust caches.

## Deploy to GitHub Pages

1. Push this folder to a repository named however you like.
2. In repository settings, enable GitHub Pages for the `main` branch (root directory).
3. After the first publish (or any update), trigger a hard refresh to ensure the new `CACHE_VERSION` (`v23.2.1`) activates.

To reset the app at any time, reload the page or use the in-app reset button.
