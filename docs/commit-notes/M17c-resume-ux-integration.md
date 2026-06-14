# M17c — Resume UX Integration

## What was done

### 1. Resume Zustand Store (`resumeStore.ts`)
- New store tracking: `hasResumableTransfer`, `role`, `fileName`, `fileSize`, `totalChunks`, `lastReceivedChunk`, `lastActivity`, `resumeAction`
- Actions: `setResumableTransfer`, `setResumeAction`, `clearResumableTransfer`
- Used by Room page for detection and Transfer page for state handoff

### 2. ResumePrompt Component (`components/ResumePrompt.tsx`)
- Modal overlay showing: file name, size, progress %, time since last activity
- Progress bar visual showing how much was already transferred
- Three options:
  - **Resume**: sender → opens file picker to select original file; receiver → sets resume flag
  - **Start Over**: deletes checkpoint + stored chunks, continues fresh
  - (Implicit Discard: closing the page or navigating away)
- Handles sender vs receiver flow differently (sender needs to re-select the file)

### 3. Checkpoint Detection (Room page)
- On `Room.tsx` mount: checks IndexedDB for checkpoint matching `roomId` from URL
- If found with `lastReceivedChunk > 0`: populates `resumeStore` and shows `ResumePrompt` overlay
- Detection is non-blocking — WebRTC connection proceeds underneath
- `handleResume` callback: sets `resumeAfterConnect` flag in `data-channel-registry`
- Navigation to Transfer page passes `isResuming: true` in location state

### 4. Transfer Page Resume Flow (`Transfer.tsx`)
- On mount: checks `isResuming` from location state or `getResumeAfterConnect()` from registry
- If sender + resuming + no file in memory: shows "Select File" UI for resume
- User selects the original file → triggers `sendFile` → which internally handles RESUME protocol
- Receiver resumes automatically via existing RESUME/RESUME_ACK protocol
- Cleans up `resumeAfterConnect` flag on unmount

### 5. Checkpoint Management Utilities (`checkpoint-store.ts`)
- `getCheckpointAge(cp)`: computes age from timestamp
- `isCheckpointStale(cp)`: checks if older than 30 minutes (room TTL)
- `cleanupStaleCheckpoints()`: removes all stale checkpoints, returns count

### 6. Data-Channel Registry Extensions
- `setResumeAfterConnect(v)` / `getResumeAfterConnect()`: module-level resume flag
- `resetAll()`: resets all module-level state (data channel, file, key, resume flag)

### 7. Repository Fix
- Fixed `saveCheckpoint` to not auto-override `timestamp` — callers now control it

## Tests
- 3 resume store tests (initial state, set metadata, set action + clear)
- 3 checkpoint management tests (fresh not stale, old is stale, cleanup)
- 3 new store tests: **20 total in stores.test.ts**
- 3 new checkpoint tests: **12 total in checkpoint-store.test.ts**

## Test results
- 133 tests pass (17 shared + 33 server + 83 client)
- All typechecks pass

## UX Flow
```
Room page loads with roomId
  ↓
Check IndexedDB for checkpoint
  ↓
Checkpoint found → Show ResumePrompt modal
  ├─ Resume (sender) → File picker → file in registry → WebRTC → Transfer → sendFile → RESUME protocol
  ├─ Resume (receiver) → flag set → WebRTC → Transfer → auto-handles RESUME_ACK
  └─ Start Over → delete checkpoint + chunks → proceed fresh
```
