You are a Senior Full-Stack Engineer, WebRTC Specialist, Technical Architect, UI/UX Engineer, QA Engineer, DevOps Engineer, and Technical Documentation Writer.

Your task is to build a complete production-quality project from scratch.

PROJECT TITLE:
"P2P Web Share — Direct Browser-to-Browser File Transfer"

TECH STACK:

Frontend:

* React.js (Vite)
* Tailwind CSS
* Socket.io Client
* WebRTC Data Channels
* Crypto API
* Zustand or Context API for state management

Backend:

* Node.js
* Express.js
* Socket.io

Deployment:

* Frontend: Vercel
* Backend: Render or Railway

==================================================
PROJECT REQUIREMENTS
====================

Build the entire application end-to-end.

The application must allow:

1. Sender uploads a file.
2. Unique room is generated.
3. Shareable link is created.
4. Receiver opens link.
5. Signaling server establishes WebRTC connection.
6. File transfers directly peer-to-peer.
7. Server NEVER stores file data.
8. Receiver automatically downloads file after completion.

Core features:

A. Room Creation

* Drag and drop upload area
* File size validation (<50MB MVP)
* Generate unique Room ID
* Generate invite link

B. WebRTC Signaling

* Socket.io signaling server
* ICE candidate exchange
* Offer/Answer flow
* Room-based signaling

C. Direct Transfer

* FileReader API
* Chunked file transfer
* WebRTC DataChannel
* Efficient memory handling

D. Verification

* SHA-256 hashing
* Verify file integrity
* Transfer success confirmation

E. Progress UI

* Upload percentage
* Download percentage
* Current speed
* ETA
* Connection status

F. Error Handling

* Network failures
* Peer disconnects
* Invalid rooms
* Timeouts
* Retry messaging

G. Auto Download

* Reassemble chunks
* Blob generation
* Auto-download trigger

==================================================
ADVANCED FEATURES
=================

Implement ALL of the following if possible:

1. Large File Support (>500MB)

   * IndexedDB
   * Streams API
   * OPFS when supported

2. End-to-End Encryption

   * AES-GCM
   * Encrypt before transfer
   * Key passed through URL hash
   * Signaling server never sees key

3. Resume Downloads

   * Chunk checkpointing
   * Resume after reconnect

4. Multi-Peer Support

   * Mesh network
   * Parallel chunk distribution

5. Transfer History

   * Local only
   * No server storage

==================================================
UI/UX REQUIREMENTS
==================

Create a modern polished UI.

Design style:

* Minimal
* Modern
* Professional
* Dark mode
* Responsive
* Mobile friendly

Include:

* Landing page
* Drag-and-drop uploader
* Room page
* Connection page
* Transfer page
* Completion screen

Animations:

* Smooth transitions
* Progress animations
* Connection indicators

==================================================
PROJECT STRUCTURE
=================

Create a scalable structure.

Frontend:

/src
/components
/pages
/hooks
/context
/services
/utils
/types
/styles

Backend:

/src
/routes
/socket
/services
/utils
/middleware

==================================================
DOCUMENTATION
=============

Generate:

1. README.md
2. Architecture.md
3. API.md
4. Deployment.md
5. Contributing.md

README must contain:

* Features
* Architecture
* Setup
* Local development
* Deployment
* Screenshots placeholders
* Future improvements

==================================================
GIT WORKFLOW (VERY IMPORTANT)
=============================

Do NOT build everything in one giant commit.

Work incrementally.

After EVERY meaningful milestone:

1. Run tests
2. Verify functionality
3. Commit changes

Use professional commit messages.

Example format:

feat: initialize monorepo structure

feat: implement socket signaling server

feat: create room management service

feat: add WebRTC peer connection handler

feat: implement file chunk transmission

feat: add transfer progress tracking

feat: add SHA-256 verification

feat: implement automatic download flow

feat: create responsive transfer dashboard

feat: add AES-GCM encryption layer

feat: implement transfer resume support

docs: add architecture documentation

chore: prepare deployment configuration

At the end provide:

git log --oneline

showing complete learning-friendly history.

==================================================
ENGINEERING STANDARDS
=====================

Follow:

* SOLID principles
* DRY
* Clean Architecture
* Type safety where possible
* Proper error boundaries
* Reusable components
* No dead code
* No placeholder implementations

==================================================
TESTING
=======

Create tests for:

Frontend:

* Components
* Hooks
* Utilities

Backend:

* Socket events
* Room management
* Hash verification

Integration:

* File transfer flow
* Reconnection flow

Provide test coverage report.

==================================================
DELIVERABLES
============

Generate:

1. Complete source code
2. Backend code
3. Frontend code
4. Config files
5. Documentation
6. Tests
7. Deployment configuration
8. Environment examples

==================================================
WORKFLOW
========

You must proceed in phases.

For each phase:

1. Explain what is being built.
2. Implement it.
3. Run verification.
4. Commit changes.
5. Show commit message.
6. Continue to next phase.

Never skip commits.

Never leave TODOs.

Never stop until the entire application is complete and runnable.

At the end provide:

* Final architecture diagram (Mermaid)
* Full project tree
* Setup instructions
* Deployment instructions
* Git commit history
* Future enhancement roadmap

Begin implementation now.


Before implementation begins, update the roadmap with the following requirements:

1. Add M0: Architecture & Design Review before all milestones.

   * Architecture diagram
   * Signaling protocol
   * DataChannel protocol
   * Encryption protocol
   * State management architecture
   * ADR documentation

2. Split milestones into:

   * MVP Phase (Submission Ready)
   * Advanced Features Phase

3. Add a Transfer Protocol Specification milestone before file transfer implementation.

4. Create /docs/commit-notes/.
   After every commit generate a learning document containing:

   * What was built
   * Why it was built
   * Key files changed
   * Design decisions
   * Testing performed

5. After every milestone generate:

   * Summary
   * Files Added
   * Files Modified
   * Design Decisions
   * Testing Evidence
   * Next Milestone

6. Add Performance Optimization milestone:

   * Adaptive chunk sizing
   * DataChannel buffer optimization
   * Memory profiling
   * Large file stress testing

7. Add Security Hardening milestone:

   * Rate limiting
   * Socket validation
   * Input sanitization
   * CSP headers
   * Helmet middleware
   * Room expiration safeguards

8. Final deliverables must include:

   * Repository tree
   * Mermaid architecture diagram
   * Sequence diagrams
   * WebRTC flow diagrams
   * Socket.io event diagrams
   * DataChannel protocol documentation
   * Coverage report
   * Full git log
   * Known limitations
   * Future roadmap

Update the roadmap first. Wait for approval. Do not start implementation until the revised roadmap is accepted.
