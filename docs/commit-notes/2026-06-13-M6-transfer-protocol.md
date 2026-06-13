# Commit Notes — M6: Transfer Protocol Specification

**Date**: 2026-06-13
**Commit**: `5cd0ee3` — `feat: implement DataChannel protocol encoder/decoder`

---

## What Was Built

Implementation-ready binary protocol encoder/decoder for the DataChannel transfer protocol:

- **encodeMessage()**: Serializes all 7 message types (FILE_META, CHUNK, CHUNK_ACK, VERIFY_REQUEST, VERIFY_RESPONSE, ERROR, CANCEL) to binary ArrayBuffer with a 5-byte envelope (type + payload length)
- **decodeMessage()**: Deserializes binary ArrayBuffer back to typed message objects
- **ProtocolError**: Custom error class for decode failures (short messages, payload overflow, unknown types)
- **Big-endian wire format**: All multi-byte integers are network byte order

## Why It Was Built

Before implementing file transfer code, the binary protocol must be specified and implemented as a concrete encoder/decoder. This defines the exact wire format that both sender and receiver will use over the DataChannel. Having this as a shared module ensures both sides agree on byte layouts, field ordering, and type encoding.

## Key Files Changed

```
packages/shared/src/protocol-io.ts            - NEW: encodeMessage/decodeMessage + helpers
packages/shared/src/__tests__/protocol-io.test.ts - NEW: 14 round-trip tests
packages/shared/vitest.config.ts              - NEW: Vitest config
packages/shared/package.json                  - MODIFIED: Added test script + vitest dep
package.json                                  - MODIFIED: Added shared to test pipeline
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Big-endian (network byte order) | Standard for binary protocols; avoids endianness surprises |
| 5-byte envelope | 1 byte type + 4 bytes length = room for up to 4 GB payloads |
| TextEncoder/TextDecoder for strings | Native, fast, UTF-8 safe; no dependency needed |
| 32-byte fixed SHA-256 hashes | Deterministic size; no length prefix needed for hashes |
| Conditional receiverHash in VERIFY_RESPONSE | Empty hash on match saves 32 bytes per verification |

## Testing Performed

14 tests pass covering all message types:
- FILE_META round-trip with file name, size, MIME type
- CHUNK round-trip with small and large (16 KB) data payloads
- CHUNK_ACK with OK and RETRY status
- VERIFY_REQUEST with hash
- VERIFY_RESPONSE matching and non-matching (with receiver hash)
- ERROR with code and message
- CANCEL with reason and message
- Protocol error cases: short messages, payload overflow, unknown types
