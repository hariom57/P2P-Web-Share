# M17b — Receiver Checkpoint and Resume

## What was done

### 1. DataChannel protocol: RESUME / RESUME_ACK messages
- Added `MessageType.RESUME = 0x07` and `MessageType.RESUME_ACK = 0x08` to the binary protocol
- Added `ResumeMessage` (lastAcknowledgedChunk) and `ResumeAckMessage` (lastReceivedChunk) interfaces
- Added encode/decode functions and wired into the protocol message switch
- **No Socket.io changes needed** — resume handshake is pure DataChannel

### 2. IndexedDB chunk persistence
- Bumped `DB_VERSION` to 2, added `chunks` object store with composite key `[roomId, sequence]`
- New functions: `saveChunk(roomId, seq, data)`, `loadAllChunks(roomId)`, `deleteRoomChunks(roomId)`
- Chunks are stored individually (not batched) to avoid single-record size limits
- `roomId` index enables efficient per-room queries

### 3. Sender-side resume (useFileTransfer.sendFile)
- After FILE_META is acknowledged, loads checkpoint from IndexedDB
- If `lastAcknowledgedChunk > 0`, sends `RESUME` message on DataChannel with sender's lastAcknowledgedChunk
- Waits for `RESUME_ACK` with 5-second timeout (falls back to fresh transfer on timeout)
- On success: `resumePoint = min(sender.ack, receiver.lastReceived)`, seeks chunker to `resumePoint + 1`, updates progress

### 4. Receiver-side resume (useFileTransfer message handler)
- **RESUME handler**: loads stored chunks from IndexedDB into `receivedChunks` Map, sends `RESUME_ACK` with its `lastReceivedChunk`
- **FILE_META handler**: if checkpoint exists with `lastReceivedChunk > 0`, loads stored chunks before processing
- **CHUNK handler**: saves each encrypted chunk to IndexedDB via `saveChunk`, updates checkpoint every 10 chunks
- **Cleanup**: on VERIFY_RESPONSE (receiver completes), CANCEL, or ERROR — calls `deleteRoomChunks` + `deleteCheckpoint`

### 5. Tests
- 3 new protocol-io tests (RESUME round-trip × 2, RESUME_ACK round-trip)
- 4 new checkpoint-store tests (save/load single chunk, multiple chunks, delete, cross-room isolation)
- 2 new useFileTransfer tests (RESUME with checkpoint, RESUME without checkpoint)

## Design decisions
- **DataChannel resume** avoids Socket.io dependency — resume protocol is self-contained within the peer-to-peer connection
- **Chunks stored encrypted** — no key material on disk (encryption key is in URL hash fragment, never persisted)
- **Individual chunk records** — avoids IndexedDB per-record size limits for large files
- **Periodic checkpoint saves** (every 10 chunks on both sides) balances write overhead vs recovery granularity
- **Sender-initiated resume** — sender drives the negotiation because it has the original File object for re-chunking

## Test results
- 127 tests pass (17 shared + 33 server + 77 client)
- All typechecks pass
