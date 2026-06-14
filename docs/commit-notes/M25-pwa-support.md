# M25: PWA Support — Offline-ready installable app

## What was done

### 1. Web App Manifest (`public/manifest.json`)
- `display: standalone` — app runs in its own window
- Dark theme colors matching the app (`#030712` background, `#1e293b` theme)
- SVG icon with `any maskable` purpose for adaptive icons
- Proper start URL and scope

### 2. Service Worker (`public/sw.js`)
- **Install**: caches app shell (`/`, `/index.html`) on install, `skipWaiting()` for immediate activation
- **Activate**: clears old caches, `clients.claim()` for instant takeover
- **Fetch strategy**:
  - `navigate` requests — Network First, fall back to cached `/` (offline SPA fallback)
  - Same-origin static assets — Cache First, then network with cache update
  - `socket.io` — excluded from caching
- **Cache name**: `p2p-share-v1`

### 3. Service Worker Registration (`src/main.tsx`)
- Registers `/sw.js` on `window.load` with `'serviceWorker' in navigator` guard
- Non-blocking — app works without SW

### 4. PWA Icons (`public/icons/icon.svg`)
- SVG icon with up/down arrow design representing P2P transfer
- Dark slate background, blue/indigo gradient arrows
- References: `manifest.json`, `index.html` (favicon + apple-touch-icon)

### 5. HTML Updates (`index.html`)
- `theme-color` meta tag
- `description` meta tag
- `manifest.json` link
- SVG favicon + apple-touch-icon

### Test results
- **150 tests pass** (21 + 33 + 96), all typechecks pass

## Files Created / Modified
- `packages/client/public/manifest.json` — **new**, PWA manifest
- `packages/client/public/sw.js` — **new**, service worker
- `packages/client/public/icons/icon.svg` — **new**, app icon
- `packages/client/index.html` — manifest link, meta tags, favicon
- `packages/client/src/main.tsx` — SW registration
