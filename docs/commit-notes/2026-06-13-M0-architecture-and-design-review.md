# Commit Notes — M0: Architecture & Design Review

**Date**: 2026-06-13
**Commit**: `9b4571f`

---

## What Was Built

Completed the full architecture and design documentation for the P2P Web Share project. This milestone establishes the blueprint for all subsequent implementation work.

### Documentation Created:
1. **System Architecture** — C4-model diagrams (system context, containers, components) in Mermaid
2. **Signaling Protocol** — Complete Socket.io event catalog with TypeScript interfaces for every event payload, sequence diagrams for room creation, WebRTC handshake, and disconnection
3. **DataChannel Protocol** — Binary message envelope specification (type + length + payload), 7 message types with binary layouts, chunk lifecycle state machine, sliding window flow control algorithm, timeout and error recovery
4. **Encryption Protocol** — AES-GCM 256-bit, deterministic IV from sequence number, key export/import via base64url, key transmission through URL hash fragment, SHA-256 integrity verification
5. **State Management** — 4 Zustand stores (room, connection, transfer, UI) with complete TypeScript interfaces, state transition diagrams, and hook-level interaction patterns
6. **Architecture Decision Records** — 6 ADRs covering Zustand, AES-GCM, in-memory storage, binary protocol, flow control, and monorepo structure

## Why It Was Built

- Provides a single source of truth for how the system works before writing implementation code
- Ensures all team members (and future AI agents) have the same mental model
- Captures rationale for key decisions so they don't need to be rediscovered
- Makes the implementation phase faster by eliminating ambiguity about protocols and data formats

## Key Files Changed

```
ArenaAI.md                          - Learning guide (existing)
IMPLEMENTATION_PLAN.md              - Updated roadmap with M0, phases, performance/security milestones
Prompt.md                           - Original project prompt (existing)
docs/architecture.md                - NEW: C4 architecture diagrams (Mermaid)
docs/signaling-protocol.md          - NEW: Socket.io event catalog and flows
docs/datachannel-protocol.md        - NEW: Binary message format and transfer protocol
docs/encryption-protocol.md         - NEW: AES-GCM encryption design
docs/state-management.md            - NEW: Zustand store architecture
docs/adr/ADR-001-*.md               - NEW: Zustand over Context API
docs/adr/ADR-002-*.md               - NEW: AES-GCM for encryption
docs/adr/ADR-003-*.md               - NEW: In-memory room storage
docs/adr/ADR-004-*.md               - NEW: Binary DataChannel protocol
docs/adr/ADR-005-*.md               - NEW: Sliding window flow control
docs/adr/ADR-006-*.md               - NEW: Monorepo with workspaces
docs/milestones/M0-*.md             - NEW: M0 milestone summary
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Binary DataChannel protocol | Zero serialization overhead; chunk data is already binary |
| AES-GCM with deterministic IV | No need to transmit IV; sequence number is unique per chunk |
| Key in URL hash | Hash fragment never sent to server; browser enforces this |
| Sliding window flow control | Prevents buffer bloat while maximizing throughput |
| Zustand over Context API | Selector subscriptions avoid re-renders on high-frequency updates |
| In-memory room storage | No database dependency for ephemeral signaling data |
| npm workspaces | Minimal tooling for a 2-package monorepo |

## Testing Performed

No implementation code exists to test. Documentation was verified for:
- **Completeness**: All protocols and events are documented with payload schemas
- **Consistency**: Payload types match across signaling and DataChannel protocols
- **Feasibility**: All designs use browser-native APIs (Web Crypto, WebRTC) or well-known libraries (Socket.io, Zustand)
- **Sequence correctness**: Flow diagrams were traced step-by-step for room creation, WebRTC handshake, chunk transfer, and error recovery
