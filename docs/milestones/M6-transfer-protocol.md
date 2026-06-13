# Milestone M6: Transfer Protocol Specification

## Summary
Implemented the binary DataChannel protocol as a concrete encoder/decoder in the shared package. All 7 message types (FILE_META, CHUNK, CHUNK_ACK, VERIFY_REQUEST, VERIFY_RESPONSE, ERROR, CANCEL) have encode/decode functions with 14 round-trip tests.

## Files Added
- `packages/shared/src/protocol-io.ts` — encodeMessage, decodeMessage, ProtocolError
- `packages/shared/src/__tests__/protocol-io.test.ts` — 14 unit tests
- `packages/shared/vitest.config.ts` — Vitest configuration

## Files Modified
- `packages/shared/src/index.ts` — Added exports for encodeMessage, decodeMessage, ProtocolError
- `packages/shared/package.json` — Added test script and vitest dependency
- `package.json` — Added shared package to root test pipeline

## Design Decisions
- Big-endian wire format (network byte order)
- 5-byte envelope: 1 byte type + 4 bytes payload length
- TextEncoder/TextDecoder for UTF-8 string encoding
- Fixed 32-byte SHA-256 hashes (no length prefix needed)
- Conditional receiverHash in VERIFY_RESPONSE (saves 32 bytes on match)

## Testing Evidence
```
✓ shared: 14 tests passed
✓ server: 33 tests passed
✓ client: 17 tests passed
✓ Total: 64 tests passed
```

## Next Milestone
**M7: Frontend — WebRTC Connection Hook** — Create the useWebRTC hook that manages RTCPeerConnection lifecycle, handles offer/answer creation, ICE candidate processing, and DataChannel setup. This is the first milestone that establishes an actual P2P connection.
