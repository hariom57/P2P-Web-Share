# Milestone M16: End-to-End Encryption

## Summary
Implemented AES-GCM 256-bit encryption for all file chunks. The sender generates a key before creating the room, embeds it in the share URL as a hash fragment (`#key=base64`), and encrypts every chunk before DataChannel transmission. The receiver extracts the key from the URL, stores it, and decrypts chunks during verification.

Key is NEVER sent to the server — browsers strip hash fragments from HTTP requests.

Total tests: **110 passing** (63 client + 33 server + 14 shared)

## Files Added
- `packages/client/src/services/encryption.ts` — AES-GCM 256 service (generate, encrypt, decrypt, export/import)
- `packages/client/src/__tests__/encryption.test.ts` — 7 unit tests

## Modified
- `packages/client/src/services/data-channel-registry.ts` — added encryptionKey storage
- `packages/client/src/hooks/useFileTransfer.ts` — encrypt on send, decrypt on verify
- `packages/client/src/pages/Landing.tsx` — generate key, embed in URL hash
- `packages/client/src/pages/Room.tsx` — extract key from URL hash, import

## Design Decisions
- **AES-GCM 256**: provides authenticated encryption (detects tampering via GCM auth tag)
- **Deterministic IV**: 12 bytes where first 4 are sequence number (big-endian), rest are zero. No IV transmission needed; both sides derive the same IV from the sequence number.
- **Decryption at verify time**: Receiver stores encrypted chunks as-received, only decrypts during VERIFY_REQUEST (before hash check and blob assembly). This keeps the CHUNK handler fast.
- **Key via hash fragment**: `#key=base64` appended to share URL. The key is never part of any HTTP request. Both `btoa`/`atob` (base64) and `crypto.subtle` are available in all modern browsers.
- **No key rotation**: Single static key per transfer session. Sufficient for single-file MVP.

## Next Milestone
**M17: Large File Support & Resume** — Implement streaming hash, chunked file reading for large files (>2GB), and connection resume for interrupted transfers.
