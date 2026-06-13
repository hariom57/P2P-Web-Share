# Milestone M9: Frontend — WebRTC DataChannel File Transfer

## Summary
Created the `useFileTransfer` hook that orchestrates the complete file transfer lifecycle over a WebRTC DataChannel: metadata exchange, chunk transmission with sliding-window flow control, integrity verification, cancel, and error handling.

New total: **83 tests passing** (36 client + 33 server + 14 shared)

## Files Added
- `packages/client/src/hooks/useFileTransfer.ts` — Core file transfer hook
- `packages/client/src/__tests__/useFileTransfer.test.ts` — 4 unit tests

## Design Decisions
- **Single hook, dual role**: `useFileTransfer` handles both sender and receiver via the same DataChannel message listener pattern — `sendFile()` triggers sender path, while incoming messages are handled by the effect.
- **Sliding-window flow control**: sender maintains `inFlightRef` Set of unacknowledged sequences; window size starts at `MIN_WINDOW_SIZE` and adapts. Sender blocks when window is full and polls every 10ms.
- **Backpressure via `bufferedamountlow`**: `waitForBufferedAmountLow` defers sends until the DataChannel's internal buffer drains below `MAX_BUFFERED_AMOUNT`.
- **Promise-based ACK/VERIFY wait**: `sendResolveRef` bridges the event-driven message handler to the async `sendFile` generator, enabling clean `await` patterns for meta-acknowledgement and verification response.
- **Cancellation is cooperative**: `cancelledRef` flag stops the send loop, aborts the FileChunker, and sends a CANCEL message to the peer.
- **Cancelled commit**: `@testing-library/react` and `@testing-library/dom` added to devDependencies for hook testing.

## Previous Commit Sneak
This milestone also includes the shared protocol-io module build (had to run `npm run build -w packages/shared` to expose exports to the client).

## Next Milestone
**M10: SHA-256 Integrity Verification** — Implement `computeSHA256` utility function for browser-native cryptographic hashing of files and data buffers. Wire into the `useFileTransfer` hook's VERIFY_REQUEST/VERIFY_RESPONSE cycle.
