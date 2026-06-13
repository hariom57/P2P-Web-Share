# ADR-004: Binary DataChannel Protocol (Not JSON)

## Status
Accepted

## Context
File chunks sent over the WebRTC DataChannel need to be efficiently transmitted with minimal overhead. The DataChannel supports both string (UTF-8) and binary (ArrayBuffer) message formats. File chunks can be up to 64 KB, and a file transfer may involve thousands of chunks. Serialization overhead per chunk must be minimized.

## Decision
Use a custom binary protocol over ArrayBuffer for all DataChannel messages.

## Consequences

### Positive
- Zero serialization overhead for binary data (chunks are already bytes)
- Fixed-size headers allow efficient parsing with DataView
- ~28 bytes overhead per message vs ~80+ bytes for equivalent JSON encoding
- For a 100 MB file (6400 chunks at 16 KB each), saves ~333 KB in overhead
- No Base64 encoding needed for binary chunk data (JSON would require 33% expansion)
- Deterministic message parsing — no schema validation at parse time

### Negative
- More complex to debug (cannot read raw messages as text)
- Need to implement custom serialization/deserialization
- Harder to extend — requires versioning strategy
- Byte order must be explicitly specified (big-endian chosen)

## Performance Comparison

| Aspect | Binary | JSON + Base64 |
|--------|--------|---------------|
| Chunk header overhead | 8 bytes | ~80 bytes |
| Binary data encoding | Raw bytes | Base64 (33% larger) |
| Parse time (16 KB chunk) | ~0.01 ms | ~0.5 ms |
| Total overhead (100 MB file) | ~50 KB | ~2.5 MB |

## Wire Format
See `/docs/datachannel-protocol.md` for the complete message specification.

## Alternatives Considered
- **JSON messages**: Simple to implement and debug, but high overhead for binary data
- **MessagePack**: Reduces JSON overhead but still requires encoding binary data
- **CBOR**: Similar to MessagePack, less browser-native
- **Protocol Buffers**: Requires schema compilation, heavy dependency
- **Raw ArrayBuffer with fixed offsets**: Chosen approach for minimal overhead

## Related
- DataChannel Protocol: `/docs/datachannel-protocol.md`
