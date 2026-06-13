# M17a — Checkpoint Initial Wiring

## What was done
- Added `seek(chunkIndex)` and `getCurrentSequence()` to `FileChunker` to support resuming from a previous checkpoint
- Wired periodic checkpoint saving into `useFileTransfer` sender:
  - Initial checkpoint saved after FILE_META is acknowledged
  - Incremental checkpoint saved every 10 chunks during transfer
  - Checkpoint loaded on start to seek chunker past already-sent chunks
  - Checkpoint deleted on completion or cancellation
- Added `roomId` option to `useFileTransfer` hook
- Passed `roomId` from `Transfer.tsx` page
- Added 3 tests for `FileChunker.seek()` (forward seek, negative clamp, beyond-total clamp)

## Why
Enable large file transfer resume across page reloads or disconnections. The sender persists progress to IndexedDB so if interrupted it can skip already-acknowledged chunks on restart.

## Architecture notes
- Checkpoint is keyed by `roomId` — only one checkpoint per room
- Resume logic: on send start, load checkpoint → if `lastAcknowledgedChunk > 0`, call `chunker.seek(lastAcknowledgedChunk + 1)` → skip to next unacknowledged chunk
- Periodic save interval (every 10 chunks) is coarse; can be tuned for reliability vs write amplification

## Next
Wire receiver-side checkpoint saving (periodic save on received chunks) and resume negotiation protocol.
