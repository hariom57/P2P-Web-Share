# Milestone 17: Large File Support & Resume Capability

## Summary

M17 added vertical resume capability — from IndexedDB persistence through DataChannel protocol to UI prompts — allowing both sender and receiver to recover from page reloads and continue interrupted transfers.

## Components

### M17a: Checkpoint Initial Wiring
- `FileChunker.seek(chunkIndex)` + `getCurrentSequence()`
- Sender checkpoint save/load in `useFileTransfer`
- Periodic save every 10 chunks

### M17b: Receiver Checkpoint & Resume Protocol
- `RESUME` (0x07) and `RESUME_ACK` (0x08) DataChannel message types
- IndexedDB chunk persistence (`saveChunk`, `loadAllChunks`, `deleteRoomChunks`)
- Receiver: saves each incoming chunk, loads on RESUME, sends RESUME_ACK
- Sender: initiates RESUME handshake, calculates `min(sender.ack, receiver.recv)` resume point
- Cleanup on VERIFY_RESPONSE, CANCEL, ERROR

### M17c: Resume UX Integration
- `resumeStore` Zustand store for resume state tracking
- `ResumePrompt` component (modal with file info, progress, Resume/Start Over actions)
- Room page: auto-detects checkpoints on mount, shows prompt
- Transfer page: resume file picker for sender, automatic resume for receiver
- Checkpoint management: staleness detection, cleanup utility

## Protocol Additions
- `MessageType.RESUME = 0x07` — sent by sender before FILE_META
- `MessageType.RESUME_ACK = 0x08` — sent by receiver in response
- Resume point = `min(sender.lastAcknowledgedChunk, receiver.lastReceivedChunk)`

## Persistence
- IndexedDB v2 with `chunks` object store (composite key `[roomId, sequence]`)
- Chunks stored encrypted (key never on disk, only in URL hash fragment)
- Checkpoints auto-cleaned after 30 minutes (room TTL)

## Files Created
- `packages/client/src/stores/resumeStore.ts`
- `packages/client/src/components/ResumePrompt.tsx`

## Files Modified
- `packages/shared/src/protocol.ts` — RESUME/RESUME_ACK types
- `packages/shared/src/protocol-io.ts` — encode/decode for new types
- `packages/shared/src/index.ts` — exports
- `packages/client/src/services/checkpoint-store.ts` — v2, chunk persistence, management utils
- `packages/client/src/services/data-channel-registry.ts` — resume flag, resetAll
- `packages/client/src/hooks/useFileTransfer.ts` — resume negotiation, chunk saving, cleanup
- `packages/client/src/pages/Room.tsx` — checkpoint detection + ResumePrompt integration
- `packages/client/src/pages/Transfer.tsx` — resume file picker, isResuming state
- Various test files (+13 new test cases)

## Test Results
- **133 tests pass** (17 shared + 33 server + 83 client)
- All typechecks pass

## Next: M18 Transfer History
