# M18: Transfer History

## What was done

### 1. IndexedDB History Store (`services/history-store.ts`)
- Schema: `{ roomId, role, fileName, fileSize, fileType, totalChunks, chunksTransferred, status, sha256Hash, speedAvgBps, startedAt, completedAt }`
- Primary key: `roomId` (auto-upsert — one entry per transfer)
- Indexes on `startedAt` (sorted desc), `status`, `role`
- CRUD operations: `saveHistoryEntry`, `getAllHistoryEntries`, `getHistoryEntry`, `deleteHistoryEntry`, `clearAllHistory`

### 2. Zustand History Store (`stores/historyStore.ts`)
- State: `entries[]`, `isLoading`, `filterRole`, `filterStatus`
- Actions: `loadEntries`, `addEntry`, `removeEntry` (also deletes checkpoint chunks), `clearAll`, `setFilterRole`, `setFilterStatus`
- `loadEntries` applies active filters (role/status) to the loaded data
- `removeEntry` cascades: deletes history entry + associated checkpoints + chunk data

### 3. Integration into useFileTransfer
- **Sender complete** (VERIFY_RESPONSE match=true): saves `completed` entry with transfer stats
- **Sender error** (VERIFY_RESPONSE match=false): saves `error` entry
- **Sender cancel**: saves `cancelled` entry
- **Receiver complete** (VERIFY_REQUEST, match=true): saves `completed` entry with SHA-256 hash
- **Receiver cancel** (CANCEL received): saves `cancelled` entry
- **Receiver error** (ERROR received): saves `error` entry

### 4. History Dashboard Page (`pages/History.tsx`)
- Route: `/history`
- Lists all transfers with: file name, size, role, status badge, timestamp, progress %
- Status badges: `completed` (green), `error` (red), `cancelled` (yellow), `interrupted` (gray)
- Filter controls: role dropdown (All/Sender/Receiver), status dropdown (All/Completed/Error/Cancelled)
- Per-entry "Delete" button — removes entry + wipes associated checkpoint data from M17
- "Clear All" button with confirmation modal
- "Back" navigation to landing page

### 5. Navigation
- Landing page: "Transfer History" link added below file drop zone
- Route added to App.tsx: `<Route path="/history" element={<History />} />`

## Integration with M17
- `historyStore.removeEntry` calls `deleteCheckpoint` + `deleteRoomChunks` before `deleteHistoryEntry`
- Deleting a completed history entry cleans up any leftover checkpoint data

## Test results
- **141 tests pass** (17 shared + 33 server + 91 client)
- All typechecks pass
- 5 new history-store IndexedDB tests (CRUD, sorting, upsert)
- 3 new Zustand historyStore tests (initial state, add/list, role filter)
- 9 test files total (9/9 pass)

## Files Created
- `packages/client/src/services/history-store.ts`
- `packages/client/src/stores/historyStore.ts`
- `packages/client/src/pages/History.tsx`
- `packages/client/src/__tests__/history-store.test.ts`

## Files Modified
- `packages/client/src/hooks/useFileTransfer.ts` — history saves on complete/error/cancel for both sender and receiver
- `packages/client/src/App.tsx` — added `/history` route
- `packages/client/src/pages/Landing.tsx` — added "Transfer History" link
- `packages/client/src/__tests__/stores.test.ts` — added history store tests (+3)
