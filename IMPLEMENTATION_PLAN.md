# P2P Web Share — Implementation Plan

## Project Overview
Building a production-quality P2P file transfer application with WebRTC Data Channels, Socket.io signaling, end-to-end encryption, and modern UI/UX.

---

## Phases Overview

**MVP Phase (Submission Ready)** — Core functionality: room creation, WebRTC signaling, P2P file transfer, integrity verification, and production-grade UI.

**Advanced Features Phase** — E2E encryption, large file support, transfer resume, history, performance optimization, and security hardening.

---

## Milestone Roadmap

### M0: Architecture & Design Review

Before a single line of implementation code:

- **Architecture diagram** — System context, container, and component-level C4 diagrams (Mermaid)
- **Signaling protocol** — Socket.io event catalog with payload schemas and flow
- **DataChannel protocol** — Binary message format, chunk structure, control messages, flow control
- **Encryption protocol** — AES-GCM key derivation, encrypt-then-transfer, key-in-hash design
- **State management architecture** — Zustand store shape, slices, actions, derivations
- **ADR documentation** — Key architectural decisions recorded in `/docs/adr/`
- **Commit**: `docs: add architecture and design documentation (M0)`

---

## MVP Phase (Submission Ready)

### M1: Initialize Monorepo Structure
- Create root package.json with workspaces
- Set up frontend (Vite + React + TypeScript) and backend (Express + TypeScript) folders
- Configure shared TypeScript config
- Set up ESLint, Prettier, scripts
- Create `/docs/` structure including `/docs/commit-notes/` and `/docs/adr/`
- **Commit**: `chore: initialize monorepo structure with workspaces`

### M2: Backend — Express + Socket.io Server Foundation
- Create Express server with TypeScript
- Set up Socket.io server with CORS
- Implement basic health check endpoint
- Add environment configuration (dotenv)
- **Commit**: `feat: setup Express + Socket.io signaling server foundation`

### M3: Backend — Room Management Service
- Create RoomManager class with in-memory storage
- Implement room creation, joining, and cleanup
- Add room TTL (time-to-live) and max peers
- Handle peer join/leave events
- **Commit**: `feat: implement room management service with TTL`

### M4: Backend — Socket.io Signaling Events
- Implement offer/answer exchange handlers
- Implement ICE candidate exchange
- Add room-based event routing
- Handle peer disconnection cleanup
- **Commit**: `feat: implement WebRTC signaling event handlers`

### M5: Frontend — Project Setup & Core Configuration
- Initialize Vite + React + TypeScript
- Configure Tailwind CSS with dark mode
- Set up Socket.io client
- Create Zustand store for global state
- Add TypeScript types for WebRTC and file transfer
- **Commit**: `feat: initialize frontend with Vite, React, Tailwind, Zustand`

### M6: Transfer Protocol Specification
- Document DataChannel message protocol (binary format, chunk header, control messages)
- Define chunk lifecycle: queue → send → ack → verified
- Specify flow control and backpressure strategy
- Define error recovery and retry semantics
- **Commit**: `docs: specify DataChannel transfer protocol`

### M7: Frontend — WebRTC Connection Hook
- Create `useWebRTC` hook for peer connection management
- Implement offer/answer creation and handling
- Implement ICE candidate handling
- Add connection state tracking (connecting, connected, failed, closed)
- **Commit**: `feat: create useWebRTC hook for peer connection management`

### M8: Frontend — File Chunking & Reading Service
- Create FileChunker utility with configurable chunk size
- Implement FileReader-based chunk reading
- Add support for large files via Streams API
- Create progress tracking for reading phase
- **Commit**: `feat: implement file chunking and reading service`

### M9: Frontend — WebRTC DataChannel File Transfer
- Create `useFileTransfer` hook for DataChannel management
- Implement chunked sending with flow control
- Implement chunked receiving with reassembly
- Add backpressure handling for large files
- **Commit**: `feat: implement WebRTC DataChannel file transfer logic`

### M10: Frontend — SHA-256 Verification
- Create Crypto utility for SHA-256 hashing
- Implement sender-side hash calculation
- Implement receiver-side hash verification
- Add verification result to transfer state
- **Commit**: `feat: add SHA-256 file integrity verification`

### M11: Frontend — Auto Download & Blob Handling
- Implement chunk reassembly into Blob
- Add automatic download trigger on completion
- Handle memory efficiency for large files
- Add download progress UI
- **Commit**: `feat: implement automatic file download on transfer completion`

### M12: Frontend — Landing Page & Room Creation
- Create landing page with hero section
- Build drag-and-drop file upload zone
- Add file validation (size, type)
- Create room ID generation and invite link
- **Commit**: `feat: create landing page with drag-and-drop uploader`

### M13: Frontend — Room / Connection Page
- Create room page for sender (waiting for receiver)
- Create room page for receiver (connection status)
- Implement real-time connection state indicators
- Add copy link / QR code sharing
- **Commit**: `feat: build room connection page with status indicators`

### M14: Frontend — Transfer Progress Dashboard
- Create transfer page with progress bars
- Display upload/download percentage
- Show current transfer speed and ETA
- Add connection quality indicators
- Implement smooth animations
- **Commit**: `feat: create transfer progress dashboard with speed/ETA`

### M15: Frontend — Completion & Error States
- Create completion screen with verification result
- Implement error boundary and error display
- Add retry mechanisms for failed transfers
- Create empty/invalid room handling
- **Commit**: `feat: implement completion screen and error handling`

---

## Advanced Features Phase

### M16: End-to-End Encryption (AES-GCM)
- Create encryption utility with Web Crypto API
- Implement key generation and derivation
- Encrypt chunks before sending, decrypt on receive
- Pass encryption key via URL hash (never to server)
- **Commit**: `feat: add AES-GCM end-to-end encryption layer`

### M17: Large File Support & Resume Capability
- Integrate IndexedDB for chunk checkpointing
- Implement OPFS (Origin Private File System) when available
- Add transfer resume after reconnection
- Create checkpoint synchronization between peers
- **Commit**: `feat: implement large file support with resume capability`

### M18: Transfer History (Local Only)
- Create localStorage/IndexedDB history store
- Record transfer metadata (not file data)
- Build history page with search/filter
- Add clear history functionality
- **Commit**: `feat: add local-only transfer history`

### M19: Performance Optimization
- **Adaptive chunk sizing** — Dynamically adjust chunk size based on DataChannel buffer health and network conditions
- **DataChannel buffer optimization** — Monitor bufferedAmount, implement send window, avoid buffer bloat
- **Memory profiling** — Profile heap usage during large transfers, optimize garbage collection patterns
- **Large file stress testing** — Test with 500MB+ files, measure throughput and stability
- **Commit**: `perf: optimize transfer performance with adaptive chunk sizing and buffer management`

### M20: Security Hardening
- **Rate limiting** — Apply rate limits on Socket.io events and API endpoints
- **Socket validation** — Validate socket IDs, reject malformed events
- **Input sanitization** — Sanitize room IDs, file metadata, and user inputs
- **CSP headers** — Configure Content Security Policy for frontend
- **Helmet middleware** — Add Helmet.js for HTTP security headers on backend
- **Room expiration safeguards** — Auto-clean stale rooms, enforce max lifetime
- **Commit**: `sec: harden application security with rate limiting, CSP, and input validation`

---

## Final Milestone: M21 — Testing, Documentation & Deliverables

### Testing
- Unit tests for utilities (crypto, chunking, verification)
- Component tests for UI components
- Hook tests for useWebRTC, useFileTransfer
- Integration tests for signaling flow
- E2E tests for complete transfer flow
- Generate coverage report

### Documentation & Final Deliverables
- `README.md` with features, setup, deployment
- Repository tree
- Mermaid architecture diagram
- Sequence diagrams (connection, transfer, error recovery)
- WebRTC flow diagrams
- Socket.io event diagrams
- DataChannel protocol documentation
- Coverage report
- Full git log (`git log --oneline`)
- Known limitations
- Future roadmap
- **Commit**: `test: add comprehensive test suite` then `docs: add final documentation and deliverables`

### Verification Checkpoints
Each milestone must:
1. ✅ Run linting (`npm run lint`)
2. ✅ Run type checking (`npm run typecheck`)
3. ✅ Run tests (`npm test`)
4. ✅ Manual verification of functionality
5. ✅ Generate commit note in `/docs/commit-notes/`
6. ✅ Commit with descriptive message

---

## Commit Notes & Milestone Summaries

### Commit Notes (`/docs/commit-notes/`)
After every commit generate a learning document containing:
- **What was built**
- **Why it was built**
- **Key files changed**
- **Design decisions**
- **Testing performed**

### Milestone Summaries (`/docs/milestones/`)
After every milestone generate:
- **Summary**
- **Files Added**
- **Files Modified**
- **Design Decisions**
- **Testing Evidence**
- **Next Milestone**

---

## Final Deliverables Checklist

- [ ] Repository tree
- [ ] Mermaid architecture diagram
- [ ] Sequence diagrams
- [ ] WebRTC flow diagrams
- [ ] Socket.io event diagrams
- [ ] DataChannel protocol documentation
- [ ] Coverage report
- [ ] Full git log (`git log --oneline`)
- [ ] Known limitations
- [ ] Future roadmap

---

## Git Commit Convention
All commits follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance
- `refactor:` Code restructuring
- `perf:` Performance improvements
- `sec:` Security improvements

---

## Total Milestones: 22 (M0–M21)
Each milestone = 1+ Git commits = Clean, reviewable history
