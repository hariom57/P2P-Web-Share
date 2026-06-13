# ADR-002: AES-GCM for End-to-End Encryption

## Status
Accepted

## Context
File data transferred over WebRTC DataChannels must be encrypted end-to-end so that even if the signaling server or network infrastructure is compromised, file contents remain confidential. The encryption must be performant for large files, supported in all modern browsers via the Web Crypto API, and resistant to tampering.

## Decision
Use AES-GCM (256-bit key) with deterministic IV derived from chunk sequence number.

## Consequences

### Positive
- Native Web Crypto API support in all modern browsers (no WASM or library needed)
- GCM provides both confidentiality and authenticity (MAC) in a single mode
- 16-byte per-chunk overhead only (authentication tag)
- Deterministic IV eliminates the need to transmit IV alongside each chunk
- 256-bit key provides long-term security margin
- No dependency on external crypto libraries

### Negative
- No forward secrecy — if key is compromised, all past transfers using that key are readable
- URL hash-based key transmission is visible in browser history
- AES-GCM has a 64 GB limit per key (irrelevant for file transfers)
- Not post-quantum secure

## Alternatives Considered
- **ChaCha20-Poly1305**: Not natively available in Web Crypto API (requires library). Better performance on mobile but adds dependency weight.
- **AES-CBC + HMAC**: Requires two primitives, more complex, padding oracle concerns.
- **Plain WebRTC DTLS**: WebRTC already encrypts with DTLS, but the signaling server sits in the control path. E2E adds a layer independent of transport.
- **No encryption**: Violates the requirement that the server never sees file data in plaintext.

## Related
- Encryption Protocol: `/docs/encryption-protocol.md`
- ADR-003: In-Memory Room Storage (key never persisted server-side)
