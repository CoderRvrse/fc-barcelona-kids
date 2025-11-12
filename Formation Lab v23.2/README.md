# Formation Lab v23.4.7 - Youth Soccer Tactics Board

Professional youth soccer tactics board with drag-and-drop player placement, pass arrow creation, and export functionality. Built with a premium Barcelona Blaugrana color theme.

## Features

### Core Functionality
- **Drag-and-Drop Players**: Easily position players on the soccer pitch
- **Pass Arrows**: Create tactical pass plays with customizable arrow styles (Solid, Comic Flat, Comic Halftone)
- **Multiple Pass Styles**: Choose from 3 distinct arrow head designs
- **Export Formations**: Save your tactics as PNG or JSON for sharing and archiving
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### Visual Design
- **Barcelona Blaugrana Theme**: Official FC Barcelona colors throughout the UI
  - Blue (Blau): `#004D98` / `rgba(0, 77, 152, 1)`
  - Claret (Grana): `#A50044` / `rgba(168, 19, 62, 1)`
  - Gold: `#EDBB00` / `rgba(237, 187, 0, 1)`
  - Yellow (Senyera): `#FFED02` / `rgba(255, 237, 2, 1)`
  - Red: `#DB0030` / `rgba(219, 0, 48, 1)`

- **Dark & Light Mode**: Full theme support with Barcelona colors adapted for both modes
- **Animated Borders**: Dynamic corner animations and scrolling text along pitch edges
- **Premium UI Components**: Smooth transitions and professional interactions

### Tools & Controls
- **Select Mode**: Choose players to work with
- **Pass Mode**: Draw pass arrows on the pitch
- **Erase Mode**: Remove players or pass arrows
- **Help System**: Built-in guidance for all features
- **Share Menu**: Export and share formations via social media or link copying
- **Theme Toggle**: Switch between dark and light modes
- **Fullscreen Mode**: Expanded view for detailed tactical work

## Installation

```bash
npm install
npm run build
npm run serve
```

## Architecture

### Directory Structure
```
Formation Lab/
├── index.html                      # Main HTML
├── scripts/                        # Source JavaScript
│   ├── main.js                    # Entry point
│   ├── ui.js                      # UI management
│   ├── state.js                   # Application state
│   ├── drag.js                    # Player movement
│   ├── pass.js                    # Pass arrows
│   ├── render.js                  # Canvas rendering
│   ├── export.js                  # Export functionality
│   ├── fullscreen.js              # Fullscreen mode
│   ├── border-animations.js       # Border effects
│   └── [other modules]
├── styles/                        # CSS files
│   ├── main.css                   # Core styles
│   ├── light-mode.css             # Light theme
│   └── components/                # Component styles
│       ├── toolbar.css            # Tool buttons
│       ├── topbar.css             # Top controls
│       ├── fullscreen.css         # Fullscreen UI
│       ├── share.css              # Share menu
│       ├── pitch-border.css       # Border animations
│       └── field.css              # Pitch styling
├── assets/                        # Icons and images
└── dist/                          # Production build
```

## Barcelona Blaugrana Color Palette

All components use official Barcelona colors:

```css
/* Blue (Blau) - Primary */
#004D98 / rgba(0, 77, 152, 1)

/* Claret (Grana) - Secondary */
#A50044 / rgba(168, 19, 62, 1)

/* Gold - Accent */
#EDBB00 / rgba(237, 187, 0, 1)

/* Yellow (Senyera) - Accent Light */
#FFED02 / rgba(255, 237, 2, 1)

/* Red - Accent Dark */
#DB0030 / rgba(219, 0, 48, 1)
```

## Tools Button Styling Guide

### Main Tools Button (`.flab-controls-tab`)
**Location**: Bottom of pitch, opens main controls panel
- **File**: `styles/components/topbar.css` (lines 3-51)
- **Colors**: Barcelona gold gradient with blue text
- **Light Mode**: `styles/light-mode.css` (lines 407-419)

### Toolbar Tool Buttons (`.flab-tool`)
**Location**: Left sidebar (Select, Pass, Erase, Help)
- **File**: `styles/components/toolbar.css` (lines 153-192)
- **Colors**: Barcelona gold gradient
- **Light Mode**: `styles/light-mode.css` (lines 76-98)

### Fullscreen Tools Button (`.flab-fullscreen-controls__handle`)
**Location**: Bottom of fullscreen overlay
- **File**: `styles/components/fullscreen.css` (lines 845-897)
- **Colors**: Barcelona gold gradient
- **Light Mode**: `styles/light-mode.css` (lines 490-512)

### Share Menu & Buttons
**Location**: Social sharing overlay
- **File**: `styles/components/share.css` (lines 53-168)
- **Colors**: Barcelona blue-claret menu with gold buttons
- **Light Mode**: Integrated in same file

## Common Tasks

### Change Button Colors
Update these files to change all button colors:
1. `styles/components/toolbar.css` - Tool buttons
2. `styles/components/topbar.css` - Main controls button
3. `styles/components/fullscreen.css` - Fullscreen buttons
4. `styles/components/share.css` - Share menu
5. `styles/light-mode.css` - Light mode for all above

### Update Theme Mode
- **Activation**: Add `theme-light` class to `<body>`
- **Toggle Button**: Search `btnTheme` in `index.html`
- **All Styles**: `styles/light-mode.css`

### Customize Animated Borders
- **Logic**: `scripts/border-animations.js`
- **Styles**: `styles/components/pitch-border.css`
- **Adjust Speed**: Modify animation durations (default 20s colors, 8s pulses)

### Add New Tool Button
1. Add HTML in `index.html`
2. Add CSS in `styles/components/toolbar.css` (uses `.flab-tool` class)
3. Add light mode in `styles/light-mode.css`
4. Add handler in `scripts/ui.js`

## Build Commands

```bash
# Install dependencies
npm install

# Development (uses /scripts/ directly)
npm run serve

# Production build (minifies to /dist/scripts/)
npm run build
```

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Deployment to GitHub

```bash
git add .
git commit -m "feat: update formation lab with new features"
git push origin main
```

## Development Guide
See `CLAUDE.md` for detailed developer documentation, common issues, and file locations.

## Version
- **Current**: v23.4.7.1
- **Build**: v23.4.7.2
- **Theme**: Barcelona Blaugrana with dark/light mode support
