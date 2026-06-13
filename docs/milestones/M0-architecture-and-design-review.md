# Milestone M0: Architecture & Design Review

## Summary
Completed the full architecture and design documentation for the P2P Web Share project. All protocol specifications, architectural decisions, system diagrams, and state management designs are documented before any implementation code is written.

## Files Added
- `docs/architecture.md` — System context, container, and component diagrams (Mermaid C4)
- `docs/signaling-protocol.md` — Complete Socket.io event catalog with payload schemas and sequence flows
- `docs/datachannel-protocol.md` — Binary message format, chunk lifecycle, flow control, error recovery
- `docs/encryption-protocol.md` — AES-GCM key generation, per-chunk encryption, IV derivation, key-in-hash design
- `docs/state-management.md` — Zustand store architecture with roomStore, connectionStore, transferStore, uiStore
- `docs/adr/ADR-001-use-zustand-over-context-api.md`
- `docs/adr/ADR-002-aes-gcm-for-encryption.md`
- `docs/adr/ADR-003-in-memory-room-storage.md`
- `docs/adr/ADR-004-binary-datachannel-protocol.md`
- `docs/adr/ADR-005-chunked-transfer-with-flow-control.md`
- `docs/adr/ADR-006-monorepo-with-workspaces.md`
- `docs/commit-notes/` — Directory for per-commit learning documents
- `docs/milestones/` — Directory for per-milestone summaries
- `docs/diagrams/` — Directory for standalone diagram exports

## Files Modified
- `IMPLEMENTATION_PLAN.md` — Updated with M0, phased milestones, Transfer Protocol spec, Performance Optimization, Security Hardening, and final deliverables checklist

## Design Decisions
- **Monorepo with npm workspaces**: Separate `packages/client` and `packages/server` with shared types
- **Zustand over Context API**: Selector-based subscriptions prevent re-renders on high-frequency progress updates
- **Binary DataChannel protocol**: Custom binary envelope (type + length + payload) for zero-overhead chunk transfer
- **AES-GCM with deterministic IV**: Sequence number as IV eliminates IV transmission while ensuring uniqueness
- **Key in URL hash**: Encryption key transmitted to receiver via URL fragment (never sent to server)
- **Sliding window flow control**: Adaptive window size prevents buffer bloat while maximizing throughput
- **In-memory room storage**: Ephemeral Map with TTL — no database dependency for MVP

## Testing Evidence
No implementation to test in M0. Documentation reviewed for:
- Completeness: All protocols, events, payloads, and flows documented
- Consistency: Payload schemas match between signaling and DataChannel protocols
- Feasibility: All designs use browser-native APIs (Web Crypto, WebRTC, Socket.io)

## Next Milestone
**M1: Initialize Monorepo Structure** — Set up the actual project with Vite + React frontend, Express + TypeScript backend, npm workspaces, shared types, and development tooling.
