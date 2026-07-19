# Platform Slice P.1 — Database-Aware API Readiness (MF-11)

## Goal

Wire the existing no-model `@fas/database` client into the API so `GET /health/ready` reflects PostgreSQL reachability, without introducing Prisma domain models or durable Evidence tables.

## Inclusions

- `DATABASE_URL` required for API config (PostgreSQL URL);
- `DATABASE_CLIENT_MODE=live|stub` (`stub` default in `NODE_ENV=test`; `live` otherwise);
- `ping()` on `DatabaseClientLifecycle` (`SELECT 1`) + stub client for offline tests;
- API injects `@fas/database` and returns HTTP 503 `{ status: "not_ready", reason }` when live ping fails;
- Compose: inject `DATABASE_URL`, `DATABASE_CLIENT_MODE=live`, `depends_on` postgres healthy;
- `.env.example` + `PROJECT_STATE` updates.

## Exclusions

- Prisma `model` / migrations / seeds;
- Durable Evidence / Match repositories;
- Jobs, Redis, BullMQ, pgvector;
- Switching the vertical-slice analyze path off in-memory storage;
- Evaluation-qualified calibration; Chinese UI (parallel).

## Acceptance

- Schema remains model-free;
- With `DATABASE_CLIENT_MODE=stub`, API tests pass without a live Postgres;
- With Compose live mode, `/health/ready` is ready when Postgres is up and not_ready when it is down;
- `pnpm --filter @fas/database test`, `@fas/config test`, `@fas/api test` pass.
