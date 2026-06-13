# Commit Notes — M2: Room Management Service

**Date**: 2026-06-13
**Commits**:
- `64c691b` — `feat: implement room management service with TTL`
- `2922c90` — `test: add room manager tests`

---

## What Was Built

**RoomManager** — An in-memory service that manages the lifecycle of signaling rooms:

- **Room creation**: Generates 6-char alphanumeric IDs, sets 30-minute TTL
- **Room joining**: Validates room existence, capacity (max 2 peers), duplicate prevention, and expiry
- **Room leaving**: Removes peers, auto-deletes empty rooms, extends TTL for reconnection window
- **Socket-to-room lookup**: Reverse mapping to find which room a socket belongs to
- **File metadata storage**: Rooms can hold file metadata (name, size, type)
- **Periodic cleanup**: 60-second interval sweeps expired rooms
- **Server integration**: Socket.io event handlers for `create-room`, `join-room`, `leave-room`, and `disconnect`

## Why It Was Built

The signaling server needs to coordinate room membership so WebRTC offers/answers can be routed between the correct peers. Room management is the foundation for all signaling — without it, peers cannot discover each other. In-memory storage is intentionally ephemeral (no database) since rooms should disappear when the server restarts.

## Key Files Changed

```
packages/server/src/services/room-manager.ts  - NEW: RoomManager class + RoomError
packages/server/src/index.ts                  - MODIFIED: Wire create-room, join-room, leave-room events
packages/server/src/__tests__/room-manager.test.ts - NEW: 23 unit tests
packages/server/vitest.config.ts              - NEW: Vitest configuration
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| In-memory Map storage | No database dependency; rooms are ephemeral by design |
| 6-char alphanumeric IDs | 36^6 = 2.1 billion combinations; collision-resistant for MVP |
| 30-min TTL + 5-min reconnection | Balances usability with resource cleanup |
| Periodic cleanup every 60s | Avoids lock contention from per-room timers |
| Error types via custom RoomError | Allows signaling server to return typed error codes |
| Socket ID as peer identifier | Simplifies reverse lookup; Socket.io assigns unique IDs |

## Testing Performed

All 23 tests pass via `vitest run`:

- **Creation**: ID format, uniqueness across 100 iterations, timestamp validity
- **Joining**: Capacity enforcement (max 2), duplicate rejection, expired room rejection, non-existent room rejection
- **Leaving**: Peer removal, room auto-deletion on empty, non-member handling
- **Lookup**: `getRoom`, `getPeerSocketIds`, `findRoomBySocketId`, `getOtherPeerSocketId`
- **Metadata**: Setting and retrieving file metadata on rooms
- **Cleanup**: Manual expiry and cleanup sweep removes expired rooms
