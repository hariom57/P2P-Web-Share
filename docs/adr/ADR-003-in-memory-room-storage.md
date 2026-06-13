# ADR-003: In-Memory Room Storage (No Database)

## Status
Accepted

## Context
The signaling server needs to track active rooms for WebRTC signaling. Requirements: rooms must be ephemeral, TTL-limited (30 minutes), and never store file data. Using a database adds deployment complexity (PostgreSQL, Redis) for a service that holds only transient connection metadata.

## Decision
Store rooms in an in-memory Map with TTL-based eviction.

## Consequences

### Positive
- Zero infrastructure dependencies — server is self-contained
- Room operations are O(1) (Map lookups)
- TTL eviction is trivial with setTimeout/clearInterval
- Room data is automatically lost on server restart (desirable for ephemeral nature)
- Easier deployment on platforms like Render/Railway without database provisioning

### Negative
- Rooms lost on server restart (transfers in progress are interrupted)
- Not horizontally scalable without sticky sessions or a shared store
- Memory limits — each room uses ~500 bytes; even 10,000 concurrent rooms is ~5 MB
- No persistence for analytics or debugging

## Scalability Analysis
- Max rooms: limited by available memory (~5 MB per 10,000 rooms)
- TTL: 30 minutes default
- Max peers per room: 2
- If horizontal scaling is needed later, migrate to Redis with the same interface

## Alternatives Considered
- **Redis**: Adds deployment dependency. Appropriate if horizontal scaling is needed, but not for MVP.
- **SQLite**: File-based, adds write overhead for ephemeral data. Overkill for transient room metadata.
- **PostgreSQL**: Heavy dependency for simple key-value storage with TTL.

## Related
- ADR-001: Use Zustand over Context API (consistent philosophy — minimal dependencies for MVP)
