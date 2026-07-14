# ADR-002: PostgreSQL Durable Jobs for V1

## Status

Accepted

## Date

2026-07-14

## Context

Analysis generation, validation, statistics refresh, and artifact cleanup are long-running or retryable operations that must not block HTTP requests. They require durable state, idempotency, bounded retries, crash recovery, correlation, and an auditable history.

FAS v1 targets modest throughput in a local or single-host deployment. PostgreSQL is already the authoritative datastore, and no measured queue workload currently justifies an additional Redis dependency.

## Decision

PostgreSQL will provide the durable job queue for v1.

- The API creates job rows transactionally with the domain operation that requests the work.
- Workers claim runnable rows using transactional locking with `FOR UPDATE SKIP LOCKED`.
- Claimed jobs receive an owner and expiring lease; workers renew heartbeats while executing.
- Expired leases make interrupted work eligible for recovery.
- Jobs record type, schema-versioned payload references, priority, availability, attempts, maximum attempts, idempotency key, correlation ID, status, result reference, and redacted failure details.
- Handlers are idempotent, retries are bounded, and external provider calls never run inside database transactions.
- PostgreSQL remains the audit system of record even if dispatch changes later.
- Redis and BullMQ are deferred to a measured Phase 2 need and must remain optional v1 dependencies.

## Consequences

### Positive

- Job creation and related domain changes can be committed atomically.
- One datastore provides durability, recovery, traceability, and simpler v1 operations.
- `FOR UPDATE SKIP LOCKED` supports safe concurrent worker claims.
- Leases and heartbeats allow worker-crash recovery without an external coordinator.
- The job abstraction permits a later BullMQ adapter without changing domain semantics.

### Negative

- Queue traffic adds load and vacuum/index maintenance requirements to PostgreSQL.
- Polling can add latency and inefficient queries if scheduling and indexes are poorly designed.
- Lease duration, heartbeat, retry, and idempotency policies require careful testing.
- PostgreSQL is not intended to match specialized brokers for very high throughput or advanced queue features.
- A later BullMQ migration introduces dual concerns: dispatch in Redis and authoritative audit state in PostgreSQL.

## Alternatives Considered

- **Redis with BullMQ in v1:** deferred because there is no measured throughput, scheduling, or distributed-coordination requirement that offsets another operational dependency.
- **In-process queues:** rejected because process restarts would lose work and horizontal workers would lack safe coordination.
- **Direct synchronous execution in the API:** rejected because AI and statistics workloads would increase HTTP latency and weaken recovery.
- **A managed message broker:** rejected for v1 because its operational and integration complexity is not justified by current scale.

## Adoption/Review Triggers

Evaluate Redis/BullMQ or another dispatch adapter when measured evidence shows one or more of:

- queue age or claim latency misses service targets after query and index optimization;
- polling or job-table contention materially affects transactional workloads;
- worker throughput cannot meet demand by adding replicas with PostgreSQL leases;
- required scheduling, prioritization, rate limiting, or distributed coordination is impractical in the job table;
- operational metrics show PostgreSQL queue load threatens system-of-record reliability.

Phase 2 adoption requires load tests, failure/recovery tests, an explicit migration and rollback plan, and continued PostgreSQL audit authority.

## References

- [00_PROJECT_BIBLE.md](../00_PROJECT_BIBLE.md)
- [04_ARCHITECTURE.md](../04_ARCHITECTURE.md)
- [12_DATABASE.md](../12_DATABASE.md)
- [14_MONOREPO.md](../14_MONOREPO.md)
- [15_DEVELOPMENT_GUIDE.md](../15_DEVELOPMENT_GUIDE.md)
