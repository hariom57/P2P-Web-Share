# ADR-005: Chunked Transfer with Sliding Window Flow Control

## Status
Accepted

## Context
Files must be transferred over WebRTC DataChannels. Browsers impose a `bufferedAmount` limit (~1 MB in most browsers) on queued data. Exceeding this causes data loss or connection stall. Additionally, network conditions vary — a simple send-all approach would overwhelm the receiver or cause buffer bloat.

## Decision
Implement chunked transfer with a sliding window flow control algorithm.

## Consequences

### Positive
- `bufferedAmount` is kept below browser limits, preventing data loss
- Automatic adaptation to network conditions via window sizing
- Chunk acknowledgement provides reliable delivery information
- Enables transfer resume (last acknowledged chunk is known)
- Window-based concurrency allows pipelining without overwhelming the peer

### Negative
- ACK overhead (one message per chunk)
- More complex sender logic than naive send-all
- Window sizing tuning is heuristic-based

## Flow Control Algorithm
```typescript
// Window adapts between MIN (4) and MAX (64) concurrent chunks
// Increases on fast ACKs, decreases on buffer pressure
// Throttled by datachannel.bufferedAmount < MAX_BUFFERED_AMOUNT (1 MB)
```

Detailed algorithm: `/docs/datachannel-protocol.md#flow-control`

## Alternatives Considered
- **Send-all chunks**: Hits browser `bufferedAmount` limit, causes data loss.
- **ACK every N chunks (cumulative ACK)**: Reduces ACK overhead but lacks precise retransmit targeting.
- **Rate-based pacing**: Sends at a fixed rate, but cannot dynamically adapt to receiver capacity.
- **Streams API backpressure**: Good abstraction but not available in all target browsers for MVP.

## Related
- DataChannel Protocol: `/docs/datachannel-protocol.md`
