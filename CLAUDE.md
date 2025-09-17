# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website for FC Barcelona Juniors kids football academy built with vanilla HTML, CSS, and JavaScript. The site features modern design with animations, interactive components, and responsive layout.

## Common Development Commands

**Development server:**
```bash
npm run dev
# or
npm run serve
```
Starts live-server on port 3000 with live reloading

**Production build:**
```bash
npm run build
```
Creates optimized production files in `dist/` directory with minified CSS/JS

**Validation and testing:**
```bash
npm run validate:html     # Validate HTML structure
npm run validate:css      # Lint CSS with stylelint
npm run validate:accessibility  # Run axe accessibility tests
npm run test:lighthouse   # Generate performance reports
npm run test:performance  # Run lighthouse and open report
```

**Clean project:**
```bash
npm run clean
```
Removes `dist/` and `reports/` directories

## Architecture

### File Structure
- `index.html` - Single page application with all content
- `styles/main.css` - Complete stylesheet with CSS custom properties and animations
- `scripts/main.js` - Vanilla JavaScript with modular functions (no frameworks)
- `assets/` - Images and media files (currently empty, uses external images)
- `dist/` - Generated production files (created by build process)

### Key Technical Features
- **CSS Architecture**: Uses CSS custom properties for theming (Barcelona brand colors), responsive grid layouts, and CSS animations
- **JavaScript**: Vanilla JS with intersection observers for scroll animations, smooth scrolling, carousel functionality, form validation, and GSAP integration
- **Performance**: Lazy loading, reduced motion support, intersection observers for efficiency
- **Accessibility**: ARIA attributes, screen reader support, keyboard navigation, focus management

### Main JavaScript Modules
- Scroll progress tracking and smooth scrolling
- Navigation toggle and active link management
- Intersection observer-based animations
- Parallax effects (when motion not reduced)
- Typewriter text animation
- Statistics counter animation
- Skill progress bars
- Testimonial carousel with touch/swipe support
- Form validation with visual feedback
- Performance monitoring (development only)

### CSS Structure
- CSS custom properties for consistent theming
- Mobile-first responsive design with breakpoints at 900px and 720px
- Reduced motion support via `@media (prefers-reduced-motion: reduce)`
- Component-based organization (hero, about, coaches, schedule, etc.)
- Advanced animations and transitions throughout

## Deployment

The project automatically deploys to GitHub Pages via GitHub Actions when pushed to the `main` branch. The workflow:
1. Installs Node.js dependencies
2. Runs `npm run build` to create optimized files
3. Deploys the `dist/` folder to GitHub Pages

## Notes for Development

- This is a static site with no backend dependencies
- Uses external images from Unsplash
- GSAP is loaded via CDN for enhanced animations
- All animations respect user's motion preferences
- Form is functional but uses mock submission (timeout simulation)
- Performance metrics are logged in development environments