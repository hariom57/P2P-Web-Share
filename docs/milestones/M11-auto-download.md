# Milestone M11: Auto Download & Blob Handling

## Summary
Created blob reassembly and auto-download utilities. The receiver now automatically reconstructs the file from received chunks on hash match and triggers a browser download.

Total tests: **103 passing** (56 client + 33 server + 14 shared)

## Files Added
- `packages/client/src/services/file-download.ts` — `reassembleFile`, `triggerDownload`, `openFileInNewTab`
- `packages/client/src/__tests__/file-download.test.ts` — 6 tests

## Modified
- `packages/client/src/hooks/useFileTransfer.ts` — wired download into VERIFY_REQUEST handler

## Design Decisions
- **Blob reassembly**: iterates chunks in sequence order (0 to totalChunks-1), handling gaps gracefully. Uses `new Blob(parts, { type })` for correct MIME type.
- **Anchor-based download**: creates an invisible `<a>` element, sets `href` to blob URL and `download` to file name, triggers click, then cleans up. This is the standard cross-browser pattern.
- **Memory cleanup**: `URL.revokeObjectURL` called immediately after click (not deferred) since the browser holds the blob reference during the download.
- **Notification**: receiver gets a success notification with the file name when download starts.

## Next Milestone
**M12: Landing Page & Room Creation** — Build the main UI pages: landing page with room creation form, room/connection page with connection status, and wire them to the existing hooks.
