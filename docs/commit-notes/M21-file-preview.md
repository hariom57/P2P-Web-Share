# M21: File Preview

## What was done
Added inline file preview on the Completion page for images, text, and PDF files received via P2P transfer.

### 1. Transfer store (`stores/transferStore.ts`)
- Added `previewUrl: string | null` field and `setPreviewUrl` action
- `setPreviewUrl` auto-revokes the previous URL to prevent memory leaks
- `resetFileProgress()` and `reset()` both revoke the preview URL

### 2. Receiver download (`hooks/useFileTransfer.ts`)
- After blob reassembly and triggerDownload, calls `transferStore.setPreviewUrl(URL.createObjectURL(blob))`
- Blob URL is associated with the downloaded file and passed through to the UI

### 3. Completion page (`pages/Completion.tsx`)
- Reads `previewUrl` from navigation state
- Revokes blob URL on component unmount via `useEffect` cleanup
- **Image preview** (`image/*`): `<img>` tag with object URL, max 80vh height, rounded, object-contain
- **PDF preview** (`application/pdf`): `<embed>` tag with the URL, 80vh height
- **Text preview** (`text/*`): `<pre>` block with first 5000 characters, fetched via `fetch(url).text()`, monospace, scrollable
- Other file types show no preview (just the completion message)

### Memory management
- Previous preview URL is revoked before setting a new one in the store
- Component unmount revokes the URL to clean up blob references
- Store `reset()` and `resetFileProgress()` also revoke URLs

### Test results
- **150 tests pass** (21 shared + 33 server + 96 client)
- All typechecks pass

## Files Modified
- `packages/client/src/stores/transferStore.ts` — previewUrl field + setPreviewUrl with auto-revoke
- `packages/client/src/hooks/useFileTransfer.ts` — setPreviewUrl after receiver download
- `packages/client/src/pages/Transfer.tsx` — pass previewUrl in navigation state
- `packages/client/src/pages/Completion.tsx` — inline preview (image, PDF, text)
