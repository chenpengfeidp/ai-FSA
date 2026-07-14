# ADR-001: Modular Monolith and TypeScript Monorepo

## Status

Accepted

## Date

2026-07-14

## Context

FAS v1 needs strong domain and engine boundaries, shared contracts, reproducible local and single-host deployment, and a full-TypeScript development model. The expected scale and team structure do not justify distributed-service coordination, duplicated contracts, or independent deployment of each engine.

The web, HTTP API, and long-running worker have different runtime responsibilities, but they share application and domain behavior. Framework, persistence, and provider details must remain outside domain logic.

## Decision

FAS will be implemented as a modular monolith in a pnpm workspace coordinated by Turborepo.

- `apps/web` is a Next.js App Router application.
- `apps/api` is the NestJS REST API composition root.
- `apps/worker` is a separate NestJS worker process sharing application and domain packages with the API.
- PostgreSQL is the system of record, accessed through Prisma adapters.
- Domain and application packages declare inward-facing ports; infrastructure packages implement adapters for Prisma, AI providers, jobs, storage, and observability.
- Framework and vendor types do not cross into domain contracts.
- Docker Compose defines the v1 deployment topology for web, API, worker, PostgreSQL, and optional object storage.
- Modules remain independently owned and testable, but are not deployed as independent services in v1.

## Consequences

### Positive

- Shared TypeScript contracts and workspace tooling reduce contract drift.
- API and worker reuse the same application behavior without network hops.
- Ports and adapters keep Next.js, NestJS, Prisma, and provider SDK concerns at the system edges.
- A single PostgreSQL consistency boundary supports traceability and atomic lifecycle operations.
- Docker Compose provides reproducible local and single-host deployment with limited operational overhead.
- Turborepo enables incremental builds and focused quality gates.

### Negative

- Package boundaries require explicit linting, architecture tests, and reviewer discipline.
- A single repository and coordinated release can increase build and change coupling.
- API and worker cannot be versioned independently without compatibility planning.
- The shared database can tempt modules to bypass owning application contracts.
- Future extraction may require migration work if module ownership and public contracts are not preserved.

## Alternatives Considered

- **Independent microservices:** rejected for v1 because operational, network, consistency, and contract-management costs exceed demonstrated scaling or ownership needs.
- **Separate repositories:** rejected because shared TypeScript contracts, coordinated migrations, and cross-cutting quality gates are central to v1.
- **Single Next.js full-stack process:** rejected because explicit NestJS modules and a separately scalable durable-job worker better isolate transport and long-running workloads.
- **Framework-coupled domain modules:** rejected because they would weaken testability, portability, and dependency direction.

## Adoption/Review Triggers

Review this decision when:

- a module requires independent scaling, ownership, deployment cadence, or reliability isolation;
- measured build or repository coordination costs materially impede delivery;
- API and worker compatibility needs require independent release trains;
- the shared database prevents required isolation or availability targets;
- a proposed dependency changes the full-TypeScript or ports/adapters boundary.

Any extraction must preserve explicit contracts, module ownership, auditability, and the governing epistemic rules.

## References

- [00_PROJECT_BIBLE.md](../00_PROJECT_BIBLE.md)
- [04_ARCHITECTURE.md](../04_ARCHITECTURE.md)
- [12_DATABASE.md](../12_DATABASE.md)
- [14_MONOREPO.md](../14_MONOREPO.md)
- [15_DEVELOPMENT_GUIDE.md](../15_DEVELOPMENT_GUIDE.md)
