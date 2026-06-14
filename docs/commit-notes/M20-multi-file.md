# M20: Multi-File / Folder Support

## Summary
Added sequential multi-file transfer within a single room session. Files are sent one at a time; a `BATCH_META` message lists all files upfront, and `BATCH_END` signals completion. Directory drag-and-drop is supported via `webkitGetAsEntry` recursive traversal.

## What was done

### 1. Protocol changes (`packages/shared`)
- Added `MessageType.BATCH_META = 0x09` and `MessageType.BATCH_END = 0x0A`
- Added `BatchMetaFileEntry`, `BatchMetaMessage`, `BatchEndMessage` interfaces
- Added `encodeBatchMeta`/`decodeBatchMeta`, `encodeBatchEnd`/`decodeBatchEnd` in protocol-io.ts
- Exported new types via index.ts

### 2. Landing page (`pages/Landing.tsx`)
- File input changed to `<input multiple>` for multi-file selection
- Directory drag-and-drop: recursive `webkitGetAsEntry` → `FileSystemDirectoryEntry` traversal
- File list UI with per-item remove, total count, "Clear All" button
- Calls `setActiveFiles()` (new) instead of `setActiveFile()` (legacy)

### 3. Data channel registry (`services/data-channel-registry.ts`)
- Added `activeFiles: File[]` with `setActiveFiles()` / `getActiveFiles()` accessors
- Added to `resetAll()`

### 4. Transfer store (`stores/transferStore.ts`)
- Added `BatchFileEntry` interface: `{ name, size, type, transferred }`
- Added state: `batchFiles: BatchFileEntry[]`, `currentFileIndex: number`
- Added actions: `setBatchFiles()`, `setCurrentFileIndex()`, `markBatchFileTransferred()`, `resetFileProgress()`
- `resetFileProgress()` clears per-file counters while preserving batch state

### 5. Sender logic (`hooks/useFileTransfer.ts` — `sendFiles`)
- New `sendFiles(files: File[])` replaces `sendFile(file: File)`
- Sends `BATCH_META` with file list, then loops sequentially:
  - For each file: hash → FILE_META → chunks → VERIFY_REQUEST
  - On successful verify: saves history, marks as transferred, resets file progress
  - On verify failure: sets phase to 'error', stops batch
- After last file: sends `BATCH_END`, sets phase to 'complete'
- Resume checkpoint only applies to first file (backward compat for single-file resumption)
- `batchModeRef` tracks batch context on receiver

### 6. Receiver logic (`hooks/useFileTransfer.ts` — message handler)
- `BATCH_META`: stores file list in store, sets `batchModeRef`
- `BATCH_END`: sets phase to 'complete' (only fires after last file)
- `VERIFY_REQUEST` in batch mode: downloads file but **does not** set phase to 'complete' — waits for next FILE_META or BATCH_END
- Single-file mode (no BATCH_META): unchanged behavior, phase goes to 'complete' after VERIFY_REQUEST

### 7. Transfer page (`pages/Transfer.tsx`)
- Shows "File X of Y" indicator when multiple files
- Passes all file names in navigation state (for Completion page)

### 8. Completion page (`pages/Completion.tsx`)
- Shows file count and file list summary ("3 files transferred successfully")
- Lists file names ("report.pdf, photo.jpg and 2 more")

### 9. Room page (`pages/Room.tsx`)
- Handles multi-file state (`files[]`) passed from Landing
- Shows "Sending: N files" when multiple

### 10. Tests
- 4 new protocol round-trip tests: BATCH_META (single, multiple, long names) + BATCH_END
- Existing `sendFile` → `sendFiles` rename in useFileTransfer test

## Test results
- **150 tests pass** (21 shared + 33 server + 96 client)
- All typechecks pass

## Files Created
- None (all changes to existing files)

## Files Modified
| File | Change |
|---|---|
| `packages/shared/src/types.ts` | Added `BatchFileInfo` |
| `packages/shared/src/protocol.ts` | Added BATCH_META/BATCH_END enums + interfaces |
| `packages/shared/src/protocol-io.ts` | Added encode/decode for batch messages |
| `packages/shared/src/index.ts` | Export new types |
| `packages/shared/src/__tests__/protocol-io.test.ts` | +4 batch round-trip tests |
| `packages/client/src/services/data-channel-registry.ts` | Added activeFiles |
| `packages/client/src/stores/transferStore.ts` | Batch state + actions |
| `packages/client/src/hooks/useFileTransfer.ts` | sendFiles loop, batch receiver handling |
| `packages/client/src/pages/Landing.tsx` | Multi-file selection, directory DnD, file list UI |
| `packages/client/src/pages/Room.tsx` | Multi-file state passing |
| `packages/client/src/pages/Transfer.tsx` | Batch progress indicator |
| `packages/client/src/pages/Completion.tsx` | Multi-file result display |
| `packages/client/src/__tests__/useFileTransfer.test.ts` | sendFile → sendFiles rename |

## Out of scope (future)
- Parallel multi-file transfer (multiplexing chunks across files)
- Per-file progress tracking on receiver side during batch
- Folder structure preservation when downloading directory transfers
- Web File System Access API for native save dialogs per file
