# Milestone M12-M15: UI Pages

## Summary
Implemented all four UI pages that form the complete user flow: Landing → Room → Transfer → Completion. Wired them to existing stores, hooks, and services.

Total tests: **103 passing** (56 client + 33 server + 14 shared)

## Files
- `packages/client/src/services/data-channel-registry.ts` — Module-level refs for DataChannel and File (passing across navigations)
- `packages/client/src/pages/Landing.tsx` — File drop zone, room creation
- `packages/client/src/pages/Room.tsx` — Room link sharing, WebRTC negotiation
- `packages/client/src/pages/Transfer.tsx` — Progress display, send/cancel
- `packages/client/src/pages/Completion.tsx` — Success/error/cancelled states

## User Flow
1. **Landing**: User drops/selects a file → clicks "Create Share Link" → room created via socket
2. **Room**: Sender copies link and shares it; receiver joins via link → WebRTC connects → auto-navigates to Transfer
3. **Transfer**: Sender auto-sends file via `useFileTransfer.sendFile()`; both see progress bar with speed/ETA/chunks → auto-navigates to Completion
4. **Completion**: Shows success (green check), error (red X), or cancelled (gray stop) → "Share Another File" button

## Key Decisions
- **Module-level registry**: DataChannel and File are non-serializable objects passed between pages via module-level refs rather than URL state or React context. Cleaned up on unmount.
- **Sender detection**: determined by presence of file metadata in `location.state` (passed from Landing via navigation state).
- **Auto-send**: sender's `sendFile()` is triggered in a `useEffect` when the DataChannel opens on the Transfer page.
- **Auto-navigate**: Transfer monitors `transferPhase` for 'complete'/'error'/'cancelled' and navigates after 1.5s delay.

## Next Milestones
**M16-M22**: E2E encryption, large file resume, transfer history, performance optimization, security hardening, testing, documentation.
