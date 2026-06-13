# ADR-001: Use Zustand over React Context API

## Status
Accepted

## Context
The application requires global state management across multiple pages (landing, room, transfer, completion). State includes room data, WebRTC connection state, transfer progress, and UI preferences. React's Context API was considered but has known performance issues with frequent updates (transfer progress updates at ~100ms intervals).

## Decision
Use Zustand for all global state management.

## Consequences

### Positive
- Selector-based subscriptions prevent unnecessary re-renders (critical for progress updates)
- No provider nesting — stores are imported directly
- Built-in devtools middleware for debugging
- Simple API (no reducers, actions, or dispatch)
- Tiny bundle size (~1 KB)
- TypeScript inference works naturally

### Negative
- Another dependency to maintain
- Team must learn Zustand patterns
- DevTools require browser extension for full debugging

## Alternatives Considered
- **React Context**: Would cause full subtree re-renders on every progress update. Workarounds (multiple contexts, useMemo) add complexity without eliminating the issue.
- **Redux Toolkit**: Overkill for this application size. More boilerplate and concepts (slices, thunks, selectors).
- **Jotai**: Similar atomic approach but less ecosystem familiarity and no devtools integration.
- **Valtio**: Proxy-based approach could cause subtle mutation bugs and harder TypeScript inference.

## Related
- State Management Architecture: `/docs/state-management.md`
