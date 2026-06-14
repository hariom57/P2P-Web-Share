# M24: Bug Bash — 13 fixes across critical/high/medium/low

## Critical (2)
1. **Multi-file sender never starts** (`Transfer.tsx:13`) — `isSender` was `!!fileState?.fileName` only; multi-file transfers pass `files` array without `fileName`. Fixed to also check `fileState?.files?.length`.
2. **Infinite loop on dataChannel disconnect** (`useFileTransfer.ts:164`) — No `close`/`error` listeners caused sender's while-loop to spin forever on disconnect. Added listeners that set `cancelledRef.current = true`, show error, mark transfer phase as `error`.

## High (4)
3. **`sendResolveRef` shared between meta ack & verify** (`useFileTransfer.ts`) — A delayed CHUNK_ACK(seq=0) arriving during verify phase would call `sendResolveRef(true)`, bypassing hash verification. Split into `metaAckResolveRef` and `verifyResolveRef`.
4. **No file validation on resume** (`ResumePrompt.tsx:47`) — Sender could select a completely different file, corrupting the resumed transfer. Added name+size check with user-facing alert on mismatch.
5. **IndexedDB connection per operation** (`checkpoint-store.ts:22`) — Every check/chunk operation opened a new IndexedDB connection. Cached connection in module-level singleton with reference-counted close (`getDB()` / `withDB()`). Added `voidTransaction` helper for write ops. Cleaned up stale-checkpoint batch delete in one transaction.
6. **`traverseDirectory` hangs on permission error** (`Landing.tsx:72`) — No error handler on directory `readEntries()` could cause permanent hang. Added error callback to resolve as empty array. Also added error callback for `FileSystemFileEntry.file()`.

## Medium (5)
7. **`createRoom` permanently stuck on socket failure** (`Landing.tsx:106`) — No error recovery if socket never connects. Wrapped in try-catch, added 15s timeout that resets `isCreating` and shows user-facing message.
8. **Room cleanup race** (`Room.tsx:131`) — `setActiveDataChannel(null)` on unmount could null the channel before Transfer mounts and reads it. Now closes the underlying DataChannel before clearing.
9. **`keyFingerprint` throws on malformed base64** (`Room.tsx:13`) — `atob()` throws `InvalidCharacterError`. Wrapped in try-catch, returns `null` on failure.
10. **historyStore filter changes don't re-filter** (`historyStore.ts:73`) — Store filtered entries in DB then applied component-level filter on already-filtered set. Stored raw entries (`rawEntries`) in store; component applies filters via `useMemo`.
11. **`updateSpeed` produces NaN** (`transferStore.ts:161`) — `remainingBytes = null - number` = `NaN` when `fileSize` is `null`. Now early-returns speed/bytes updates when `fileSize === null`, skipping only the ETA calculation.

## Low (3)
12. **PreviewText missing AbortController** (`Completion.tsx:112`) — Fetch on unmounted component would call `setText`. Added `AbortController` with cleanup.
13. **`formatFileSize` duplication** — Extracted to `@p2p-share/shared` constants module, imported in both `Landing.tsx` and `Transfer.tsx`.

## Test results
- **150 tests pass** (21 + 33 + 96), all typechecks pass

## Files Modified / Created
- `packages/client/src/pages/Transfer.tsx` — isSender fix, shared formatFileSize import
- `packages/client/src/pages/Landing.tsx` — createRoom try-catch+timeout, traverseDirectory error handlers, shared formatFileSize import
- `packages/client/src/pages/Room.tsx` — keyFingerprint try-catch, cleanup race fix, import getActiveDataChannel
- `packages/client/src/pages/Completion.tsx` — PreviewText AbortController
- `packages/client/src/pages/History.tsx` — rawEntries + useMemo filter
- `packages/client/src/hooks/useFileTransfer.ts` — close/error listeners, sendResolveRef split to metaAckResolveRef+verifyResolveRef
- `packages/client/src/stores/historyStore.ts` — rawEntries-based filtering
- `packages/client/src/stores/transferStore.ts` — updateSpeed NaN guard
- `packages/client/src/services/checkpoint-store.ts` — cached DB connection, batch stale cleanup
- `packages/client/src/components/ResumePrompt.tsx` — file validation on resume
- `packages/client/src/__tests__/stores.test.ts` — updated for rawEntries
- `packages/shared/src/constants.ts` — added formatFileSize()
- `packages/shared/src/index.ts` — re-export formatFileSize
