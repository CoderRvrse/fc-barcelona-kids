# Formation Lab Changelog

## [v23.4.8] - 2025-11-10

### Added
- **UI Overlay Controls**: Top center Select/Pass/Theme buttons with 120px spacing
- **Dark/Light Mode**: Circular theme toggle button in center with icon switching (sun/moon)
- **Undo/Redo Buttons**: Top right stacked vertically (Undo at 68px, Redo at 120px, Erase at 172px)
- **Erase Menu**: Click-to-toggle menu when in erase mode with "Clear all passes" option
- **Z Key Shortcut**: Quick pass undo with warning toast (separate from Ctrl+Z redo/undo system)
- **Share Button Redesign**: Prominent full-width yellow button in Tools panel
- **Share Menu**: Floating overlay on pitch (centered) with social platform icons
- **Share Toast Notifications**: User feedback when share menu opens
- **Fullscreen Controls**: All buttons visible in fullscreen mode (Select, Pass, Theme, Undo, Redo, Erase)
- **Fullscreen Tools Panel**: Compact square styling (12px border-radius) instead of pill shape
- **Mobile Responsiveness**: Media query at 640px breakpoint for reduced button sizes
- **Keyboard Accessibility**: Tab cycling, arrow key nudging, Escape cancellation

### Changed
- **UI Layout**: Reorganized from scattered buttons to strategic corner positioning
- **Controls Tab**: Moved to bottom center of pitch (below Select/Pass/Theme)
- **Share Menu Position**: Fixed positioning (not inside Tools panel) to avoid scroll constraints
- **Fullscreen Close Button**: Hidden to prevent overlap with theme toggle
- **Tools Panel Styling**: Reduced from 999px radius (pill) to 12px (square) in fullscreen
- **Button Styling**: Consistent yellow (rgba(255, 193, 7)) across all overlay controls
- **Z-Index Management**: Proper layering (40, 35, 36 for controls)

### Fixed
- **Fullscreen Visibility**: All buttons now visible in fullscreen mode
- **Theme Toggle Blocking**: Removed X close button that was covering theme toggle
- **Share Menu Overflow**: Moved menu outside Tools panel to allow proper fixed positioning
- **Erase Button Wiring**: Fixed selector from class-based to data-mode attribute matching
- **Pass Undo**: Separated Z key from Ctrl+Z system with distinct warning messages

### Technical
- **CSS Refactoring**: Updated topbar.css and fullscreen.css for new layout
- **HTML Restructuring**: Reorganized overlay controls, moved share menu outside panel
- **JavaScript Updates**: Enhanced theme.js, share.js, ui.erase.menu.js, keyboard.js
- **Modal Management**: Auto-close Tools panel when Share button clicked
- **Event Handling**: Proper event delegation and click-outside detection for menus

### UI/UX Improvements
- More intuitive button placement (corners of viewport)
- Clear visual hierarchy with yellow accent buttons
- Responsive scaling for mobile devices
- Immersive fullscreen experience with all controls available
- Toast notifications for user feedback

---

## [v23.4.3] - 2024-01-15

### Added
- **Build System**: esbuild minification with sourcemaps (ES2020 target)
- **Settings Persistence**: LocalStorage save/load for orientation, passStyle, passWidth
- **CI/CD Pipeline**: Automated audit gate with Playwright headless testing
- **Performance Optimizations**:
  - `will-change: transform` during drag operations
  - Debounced resize handling (16ms / ~60fps)
  - Asset preloading for pitch + arrowhead SVGs
- **Enhanced Audit System**:
  - Settings persistence round-trip testing
  - View transform accuracy validation
  - NaN detection in SVG attributes
  - Single keydown handler verification

### Changed
- Service Worker cache updated to v23.4.3
- Added persist.js module to precache list
- Updated all version references across codebase

### Technical
- **Zero user-visible changes** - 100% behavioral parity maintained
- All drag/pass/export functionality identical
- New modules: `persist.js`, build system, CI infrastructure
- Module count: 13 (was 12 in v23.4.2)

### Build
```bash
npm run build   # Minify to dist/scripts/
npm run serve   # Development server
```

### Audit
```bash
node scripts/ci-audit.mjs                    # Headless CI audit
import('./scripts/audit.js').then(m=>m.runAudit())  # Browser audit
```

---

## [v23.4.2] - 2024-01-14

### Added
- Extracted keyboard.js module (2.5KB) for centralized keyboard handling
- Extracted presets.js module (1.7KB) for formation management
- Enhanced audit system with module presence checks

### Removed
- **Legacy formation.js** (47KB unused monolithic file)

### Changed
- Reduced ui.js from 9.9KB to 6.6KB (-3.3KB)
- Bundle size reduction: 113KB → 68KB (-40.3% / -45KB total)

### Technical
- Zero behavior changes - identical UX/drag/passes/export
- Better separation of concerns with ES6 modules
- Single keydown handler pattern established

---

## [v23.4.1] - 2024-01-13

### Added
- Centralized pitch asset paths in state.js (PITCH_LAND, PITCH_PORT constants)
- Asset preloading to eliminate 404 errors
- Enhanced audit system with stray reference detection

### Changed
- Updated field.css to use CSS variables for pitch backgrounds
- All modules now import pitch constants from state.js
- Service worker cache updated to v23.4.1

### Fixed
- Eliminated all 404 errors from incorrect pitch asset paths
- Single source of truth for all asset references

---

## [v23.4.0] - 2024-01-12

### Added
- Complete ES6 module system with 10 focused modules
- Dynamic imports to avoid circular dependencies
- Comprehensive audit harness with 11+ automated checks
- Module visibility markers for development debugging

### Changed
- Migrated from monolithic to modular architecture
- Zero behavioral changes - 100% feature parity maintained
- Service worker updated with all module paths

### Technical
- Clean separation: state, geometry, drag, pass, render, orientation, export, ui
- Preserved window.FLAB as single source of truth
- All features identical: drag/halo, passes, arrowheads, orientation, export