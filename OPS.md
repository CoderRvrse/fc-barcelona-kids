# Operations Guide

This guide covers day-to-day operations for the FC Barcelona Kids website CI/CD pipeline.

## 🚀 Quick Start

### Branch Protection Setup (One-time)
1. Go to **Settings** → **Branches** → **Add rule** for `main`
2. Enable:
   - ☑️ **Require pull request before merging**
   - ☑️ **Require status checks to pass**
     - ☑️ `Lint`
     - ☑️ `Link Check`
   - ☑️ **Dismiss stale approvals when new commits are pushed** (recommended)
   - ☑️ **Require branches up to date before merging** (optional)

### Development Workflow
```bash
# Before pushing, run local preflight
bash scripts/preflight.sh

# Create PR → Lint + Link Check run automatically
# Merge to main → Deploy + Smoke Test run automatically
```

## 🔧 Pipeline Components

### 1. **Deploy Pipeline** (`pages.yml`)
- **Triggers**: Push to `main` with site file changes
- **Runtime**: ~33 seconds
- **Artifacts**: `workspace-tree`, `smoke-logs`
- **Smoke Tests**: Hero SVG, assets, service worker

### 2. **Lint Check** (`lint.yml`)
- **Triggers**: PRs + push to `main` with JS changes
- **Runtime**: ~18 seconds
- **Tool**: ESLint 8 via npx (lockfile-free)

### 3. **Link Check** (`links.yml`)
- **Triggers**: PRs + push to `main` with HTML/MD changes
- **Runtime**: ~8 minutes (max)
- **Skips**: Forks, Dependabot, social media domains
- **Artifact**: `lychee-report` (JSON)

### 4. **Auto-Regression Guard** (`auto-regression.yml`)
- **Triggers**: When Deploy workflow fails
- **Action**: Creates labeled issue with failure details
- **Labels**: `ci`, `regression`

### 5. **Live Monitor** (`monitor.yml`)
- **Schedule**: Daily 06:00 UTC
- **Manual**: Can trigger via GitHub Actions UI
- **Purpose**: Basic site health check

## 🛠️ Common Operations

### Force Service Worker Refresh
When you change JS/CSS/assets that are cached:

1. **Bump cache version** in `sw.js`:
   ```javascript
   const VERSION = 'v11'; // increment from v10
   ```

2. **Force client refresh** (DevTools Console):
   ```javascript
   navigator.serviceWorker?.getRegistration()?.then(r => {
     r?.update(); r?.waiting?.postMessage?.('SKIP_WAITING');
   });
   ```

### Manual Smoke Tests
```bash
ROOT=https://coderrvrse.github.io/fc-barcelona-kids

# Check hero components present
curl -fsSL "$ROOT/" | grep -E 'id="heroTitleSvg"|id="hero-title"'

# Verify critical assets
curl -fsSI "$ROOT/assets/soccer-ball.svg" | grep -i 'content-type: *image/svg+xml'
curl -fsSI "$ROOT/assets/FC_Barcelona_logo.svg" | grep -i 'content-type: *image/svg+xml'

# Service worker health
curl -fsSI "$ROOT/sw.js" | head -n1   # expect HTTP/2 200
```

### Debugging Failed Runs

1. **Open the failed run** in GitHub Actions
2. **Download artifacts**:
   - `workspace-tree` → What files were deployed
   - `smoke-logs` → Exact curl headers and validation results
   - `lychee-report` → JSON of link check failures (if link check failed)

3. **For Deploy failures**: Check auto-created regression issue

4. **Common fixes**:
   - **Broken pipe errors**: Usually cosmetic, check if smoke tests actually passed
   - **Link timeouts**: Check `.lychee.toml` excludes, consider adding problem domains
   - **Asset 404s**: Verify file paths and service worker cache

### Adding New Critical Assets

If you add assets that must be validated:

1. **Add to service worker** (`sw.js`):
   ```javascript
   cache.addAll([
     '/fc-barcelona-kids/',
     '/fc-barcelona-kids/assets/new-critical-asset.svg',
     // ... existing assets
   ]);
   ```

2. **Add smoke test** in `pages.yml`:
   ```yaml
   # Add to curl checks section
   curl -fsSI "$ROOT/assets/new-critical-asset.svg" | grep -Ei '^content-type: *image/svg\+xml' >/dev/null
   ```

3. **Bump service worker version**

## 📊 Performance Targets

- **Total CI time**: 2-3 minutes per push
- **Deploy success rate**: >95%
- **Lint success rate**: >98% (ESLint parse errors)
- **Link check success rate**: >90% (external dependency tolerant)

## 🚨 Troubleshooting

### Deploy Keeps Failing
1. Check `smoke-logs` artifact for exact curl errors
2. Test manually with curl commands above
3. If persistent, temporarily disable smoke tests and investigate

### Lint Suddenly Failing
1. Usually new syntax errors or ESLint config changes
2. Run `npx eslint@8 "scripts/**/*.js"` locally
3. Fix errors or adjust `.github/workflows/lint.yml`

### Link Check Too Noisy
1. Add problematic domains to `.lychee.toml` exclude list
2. Adjust timeout/retry settings
3. Consider raising max acceptable HTTP status codes

### Service Worker Not Updating
1. Verify version bump in `sw.js`
2. Check browser cache and force hard refresh
3. Use DevTools → Application → Service Workers → Update

## 🔒 Security Notes

- **No lockfiles**: Keeps CI surface minimal, uses npx for tools
- **Minimal permissions**: Workflows only get necessary permissions
- **Timeout protection**: All jobs have strict time limits
- **Artifact retention**: Limited to 7-14 days for storage efficiency

## 📈 Monitoring

Check these regularly:
- [![Deploy](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/pages.yml/badge.svg)](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/pages.yml)
- [![Lint](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/lint.yml/badge.svg)](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/lint.yml)
- [![Link Check](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/links.yml/badge.svg)](https://github.com/CoderRvrse/fc-barcelona-kids/actions/workflows/links.yml)

## 🎯 Success Metrics

**Green Pipeline** = All badges green + no open regression issues + site responds correctly to manual curl tests

**Red Pipeline** = Investigate artifacts first, then manual testing, then adjust workflow if needed