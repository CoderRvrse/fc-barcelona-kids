# FC Barcelona Junior Kids

[![Deploy](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/pages.yml/badge.svg)](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/pages.yml)
[![Lint](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/lint.yml/badge.svg)](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/lint.yml)
[![Links](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/links.yml/badge.svg)](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/links.yml)
[![Live Monitor](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/live-monitor.yml/badge.svg)](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/live-monitor.yml)

A playful, family-friendly soccer website for FC Barcelona's junior kids program.

## 🌐 Live Site

Visit: **https://coderrvse.github.io/fc-barcelona-kids/**

## 🚀 Features

- **PWA Offline Support** - Works without internet after first visit
- **Responsive Design** - Mobile-first, works on all devices
- **Accessibility** - Screen reader support, keyboard navigation
- **SEO Optimized** - Structured data, social sharing, sitemap
- **Performance** - Optimized assets, lazy loading, reduced motion support

## 🛠️ Development

```bash
# Run linting locally
npm run lint

# Check links locally
npm run links
```

## 📊 CI/CD Pipeline

- **Build & Deploy** - Automatic deployment to GitHub Pages
- **Quality Gates** - ESLint + Link checking on PRs
- **Smoke Testing** - Post-deploy validation of key functionality
- **Live Monitoring** - Daily uptime checks
- **Auto-Regression** - Automatic issue filing on deployment failures

## 📁 Architecture

- **Static Site** - Pure HTML/CSS/JavaScript (no build step required)
- **Service Worker** - Offline functionality and caching
- **GitHub Pages** - Zero-cost hosting with custom domain support
- **GitHub Actions** - Comprehensive CI/CD pipeline