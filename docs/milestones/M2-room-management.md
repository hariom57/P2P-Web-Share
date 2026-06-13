# Milestone M2: Backend — Room Management Service

## Summary
Implemented the RoomManager service for in-memory room lifecycle management and wired it into the Socket.io server with create/join/leave/disconnect event handlers. Includes 23 unit tests.

## Files Added
- `packages/server/src/services/room-manager.ts` — RoomManager class with full CRUD, TTL, peer tracking
- `packages/server/src/__tests__/room-manager.test.ts` — 23 unit tests
- `packages/server/vitest.config.ts` — Vitest configuration

## Files Modified
- `packages/server/src/index.ts` — Added create-room, join-room, leave-room, disconnect event handlers

## Design Decisions
- In-memory Map storage for ephemeral rooms (no database dependency)
- 6-char alphanumeric room IDs (36^6 combinations, collision-resistant)
- 30-min TTL with 5-min reconnection window on peer disconnect
- Periodic cleanup interval (60s) avoids per-room timer overhead
- Custom RoomError class for typed signaling error codes

## Testing Evidence
```
✓ src/__tests__/room-manager.test.ts (23 tests) 8ms
Test Files  1 passed (1)
Tests       23 passed (23)
Duration    429ms
```

## Next Milestone
**M3: Backend — Socket.io Signaling Events** — Implement offer/answer exchange, ICE candidate forwarding, file metadata relay, and peer disconnection cleanup for active transfers. This completes the signaling server.
