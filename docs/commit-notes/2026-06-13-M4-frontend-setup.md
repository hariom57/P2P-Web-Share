# Commit Notes — M4: Frontend Project Setup & Core Configuration

**Date**: 2026-06-13
**Commits**:
- `5cdce9d` — `feat: add Zustand stores for room, connection, transfer, and UI state`
- `a218e36` — `feat: add Socket.io client service, useSocket hook, and page routing`
- `587124b` — `test: add Zustand store unit tests`

---

## What Was Built

Complete frontend foundation with state management, Socket.io integration, and routing:

- **4 Zustand stores**: roomStore, connectionStore, transferStore, uiStore with devtools middleware
- **Socket.io client service**: Lazy singleton with connect/disconnect lifecycle
- **useSocket hook**: Connects all Socket.io server events to Zustand store actions
- **4 page components**: Landing, Room, Transfer, Completion (scaffold with Tailwind dark theme)
- **React Router DOM routing**: `"/"`, `"/room/:roomId"`, `"/transfer/:roomId"`, `"/complete/:roomId"`

## Why It Was Built

The frontend needs state management that can handle high-frequency updates (transfer progress at ~100ms intervals) without re-rendering the entire component tree. Zustand's selector-based subscriptions solve this. The Socket.io client service and useSocket hook bridge the signaling server events with the UI stores, forming the data flow backbone for all subsequent page implementations.

## Key Files Changed

```
packages/client/src/stores/roomStore.ts        - NEW: Room lifecycle state + actions
packages/client/src/stores/connectionStore.ts  - NEW: WebRTC connection state
packages/client/src/stores/transferStore.ts    - NEW: File transfer progress + speed/ETA
packages/client/src/stores/uiStore.ts          - NEW: Theme, notifications, modals
packages/client/src/stores/index.ts            - NEW: Barrel exports
packages/client/src/services/socket.ts         - NEW: Socket.io client singleton
packages/client/src/hooks/useSocket.ts         - NEW: Socket event → store bindings
packages/client/src/pages/Landing.tsx          - NEW: Landing page scaffold
packages/client/src/pages/Room.tsx             - NEW: Room page scaffold
packages/client/src/pages/Transfer.tsx         - NEW: Transfer page scaffold
packages/client/src/pages/Completion.tsx       - NEW: Completion page scaffold
packages/client/src/App.tsx                    - MODIFIED: BrowserRouter + Routes
packages/client/src/__tests__/stores.test.ts   - NEW: 17 store unit tests
packages/client/vitest.config.ts               - NEW: Vitest + jsdom config
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| 4 separate Zustand stores | Single-responsibility; prevents unnecessary cross-store re-renders |
| Lazy socket singleton | Avoids multiple connections; reconnect-safe |
| useSocket in App root | Socket connection established once, alive for entire session |
| VITE_ prefixed env vars | Vite convention for client-exposed environment variables |
| React Router DOM | Standard routing for SPAs; simple route param extraction |

## Testing Performed

17 unit tests pass:
- Room store: phase transitions (`idle→waiting→connected`), peer tracking, error state
- Connection store: state setters for all WebRTC connection states
- Transfer store: metadata setting, chunk progress (5/10 = 50%), speed EMA, error handling
- UI store: theme changes, notification add/dismiss, modal lifecycle
