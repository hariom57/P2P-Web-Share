# Commit Notes — M1: Initialize Monorepo Structure

**Date**: 2026-06-13
**Commit**: `377b638`

---

## What Was Built

The monorepo foundation with three packages and shared tooling:

- **Root configuration**: npm workspaces, TypeScript base config, ESLint flat config, Prettier, `.gitignore`
- **`@p2p-share/shared`**: Protocol types, Socket.io event interfaces, DataChannel message types, constants
- **`@p2p-share/server`**: Express + Socket.io scaffold with CORS, health check endpoint, environment config
- **`@p2p-share/client`**: Vite + React + TypeScript + Tailwind CSS scaffold with dark mode, dev proxy to server

## Why It Was Built

The entire project depends on a solid monorepo structure with shared types. Without this foundation, frontend and backend would have incompatible type definitions and duplicated configuration. The shared package ensures both sides agree on protocol shapes, event names, and constant values.

## Key Files Changed

```
package.json                 - Root workspace config with dev/build/lint/typecheck/test scripts
tsconfig.base.json           - Shared TypeScript compiler options
eslint.config.js             - ESLint flat config with typescript-eslint
.prettierrc                  - Formatter settings
.gitignore                   - Ignore patterns for node_modules, dist, env
packages/
  shared/
    src/constants.ts         - ROOM_ID_LENGTH, ROOM_TTL_MS, MAX_CHUNK_SIZE, etc.
    src/events.ts            - RoomEventMap, ClientEventMap, ServerEventMap interfaces
    src/protocol.ts          - MessageType enum, chunk/ack/verify/error message types
    src/types.ts             - FileMeta, TransferProgress, PeerInfo, RoomInfo
    src/index.ts             - Barrel export
  server/
    src/index.ts             - Express app, HTTP server, Socket.io, health check
    .env.example             - PORT, CLIENT_ORIGIN
  client/
    src/main.tsx             - React entry point
    src/App.tsx              - Root component (placeholder)
    src/index.css            - Tailwind directives, dark color-scheme
    vite.config.ts           - Dev server + proxy to backend
    tailwind.config.js       - Dark mode via class strategy
    postcss.config.js        - PostCSS with Tailwind + Autoprefixer
    index.html               - HTML shell
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| npm workspaces (not Turborepo/Nx) | Appropriate for 3 packages; zero additional tooling |
| Shared package for types | Single source of truth for protocol/event shapes across client and server |
| DOM lib in shared tsconfig | WebRTC types (RTCSessionDescriptionInit, RTCIceCandidateInit) are DOM APIs |
| Vite proxy for dev | Avoids CORS issues in development; production uses same-origin deployment |
| `tsx` for server dev | Fast TypeScript execution without compile step; supports watch mode |
| Dark mode via `class` strategy | Tailwind `darkMode: 'class'` allows manual toggle and system preference fallback |

## Testing Performed

- **TypeScript type checking**: All 3 packages pass `tsc --noEmit` with zero errors
- **Shared package build**: `tsc` compiles successfully
- **Server startup**: Express server starts on port 3001 and responds to health checks
- **Client build**: Vite production build succeeds (142 KB JS, 4.9 KB CSS)
- **npm install**: Clean install of all 399 dependencies completes without errors
