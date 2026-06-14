# M19: Speed/ETA Indicators

## What was done

### 1. Real elapsed time for sender speed (useFileTransfer.ts)
- Removed hardcoded `100ms` in `transferStore.updateSpeed(chunk.data.length, 100)`
- Added `lastSpeedUpdateRef` to track real wall-clock time between chunks
- Sender now computes: `updateSpeed(bytes, now - lastSpeedUpdateRef.current)`
- Timer initialized before the chunk-send loop and reset on each chunk

### 2. Receiver speed tracking (useFileTransfer.ts)
- Receiver now calls `transferStore.updateSpeed(msg.data.length, elapsedMs)` on each incoming CHUNK
- `lastSpeedUpdateRef` is initialized on FILE_META receipt
- Receiver checkpoint restoration now updates `bytesTransferred` for accurate residual-ETA calculation
- Receiver no longer shows zero speed — speed/ETA updates in real time

### 3. Bug fix: ETA off-by-one in `transferStore.updateSpeed` (`transferStore.ts:99`)
- `remainingBytes` was computed from `state.bytesTransferred` (pre-update), causing ETA to be based on the full file size for the first call
- Fixed: uses `newBytesTransferred = state.bytesTransferred + bytes` before computing remaining bytes
- ETA is now consistent: transfer of 100 KB at 10 KB/s shows 9s remaining, not 10s

### 4. UI improvements (Transfer.tsx)
- Added `formatFileSize` helper for human-readable byte display (B/KB/MB/GB)
- Added progress line: `formatFileSize(bytesTransferred) / formatFileSize(fileSize)` below the stats grid
- Stats grid reordered: Speed, ETA, Avg Speed, Chunks

### 5. Expanded test coverage (stores.test.ts)
Added 5 new transferStore tests:
| Test | What it verifies |
|---|---|
| `should calculate instantaneous speed correctly` | Current speed = bytes / elapsed * 1000 |
| `should apply exponential moving average for speed` | EMA formula (70/30 split) across 3 updates |
| `should accumulate bytesTransferred` | Consecutive updates sum correctly |
| `should calculate ETA based on remaining bytes and average speed` | ETA = (fileSize - transferred) / avgSpeed * 1000 |
| `should return zero ETA when no file size is set` | ETA is 0 when fileSize is null |
| `should return zero speed when elapsed time is zero` | Speed is 0 when elapsedMs = 0 |

### Test results
- **146 tests pass** (17 shared + 33 server + 96 client)
- All typechecks pass
- 9 test files (9/9 pass)

## Files Modified
- `packages/client/src/stores/transferStore.ts` — fixed ETA off-by-one in `updateSpeed`
- `packages/client/src/hooks/useFileTransfer.ts` — real elapsed time for sender, speed tracking for receiver, bytesTransferred for checkpoint restore
- `packages/client/src/pages/Transfer.tsx` — improved stats grid, file size progress line, `formatFileSize` helper
- `packages/client/src/__tests__/stores.test.ts` — +5 speed/ETA tests (28 total)
