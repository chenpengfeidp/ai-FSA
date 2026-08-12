# P2K-A + P2K-B — Durable Evaluation History + PostgreSQL Projection Replay Sidecar

**Status:** COMPLETED (coding)  
**Sprint ids:** P2K-A, P2K-B  
**Roadmap citation:** Continues the P2* Projection / Evaluation durability line after P2H / P2I / P2J; authorized by `docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md` and task request. Doc 40 may not yet list P2K by name.  
**Architecture Freeze:** v0.3 (unchanged)  
**Date:** 2026-08-12  

---

## 1. What P2K-A implemented

- Made platform persistence **explicit and observable** via `ApiConfig.platformPersistence`:
  - `mode`: `memory` | `postgres`
  - `controlledBy`: `EVIDENCE_REPOSITORY_MODE` (existing composition contract; no silent alternate switch)
  - `stores`: `evidence`, `evaluationHistory`, `projectionReplaySidecar`
- API composition (`runtime-database.ts`) selects History via `platformPersistence.mode`
- Postgres mode uses existing `PrismaEvaluationHistoryRepository` / `evaluation_history_items` — **no duplicate History table**, no `EvaluationHistoryRecord` redesign
- Postgres mode never silently falls back to memory
- Memory mode remains for local/dev/tests
- Observability: `GET /version` returns `platformPersistenceMode`; config tests assert the surface

## 2. What P2K-B implemented

- Prisma model `ProjectionReplaySidecarItem` + migration
- Port extensions: `findByHistoryId`, `ConflictProjectionReplaySidecarError`, schema version constant
- In-memory adapter: idempotent same-content save; explicit conflict on different content
- `PrismaProjectionReplaySidecarRepository` in `@fas/database`
- Wired into `createFasDatabase` and API composition when platform mode is postgres
- Existing report dual-write path unchanged in ownership (History then Sidecar)
- Sidecar failure after History save surfaces as `PROJECTION_REPLAY_SIDECAR_FAILED` (not silent success)

## 3. Prisma changes

**New migration:** `packages/database/prisma/migrations/20260812000000_p2k_projection_replay_sidecar/migration.sql`

Table `projection_replay_sidecar_items`:

| Column | Notes |
| --- | --- |
| `id` | UUID PK |
| `history_id` | unique; FK → `evaluation_history_items.history_id` ON DELETE RESTRICT |
| `match_id` | indexed |
| `schema_version` | `projection-replay-sidecar.p2k.b` |
| `content_sha256` | CHAR(64) |
| `context_json` | JSONB compact `SealedProjectionReplayContext` |
| `saved_at` | timestamptz |

**Evaluation History schema:** unchanged.

## 4. Repository changes

| Package | Change |
| --- | --- |
| `@fas/statistics` | Sidecar port + conflict error + memory idempotency + `findByHistoryId` |
| `@fas/database` | `PrismaProjectionReplaySidecarRepository`; `FasDatabaseHandle.projectionReplaySidecarRepository` |
| `@fas/report` | Explicit sidecar failure code / messaging |
| `@fas/config` | `platformPersistence` observability surface |

## 5. Composition-root changes

`apps/api/src/runtime-database.ts`:

- `EVIDENCE_REPOSITORY_MODE=postgres` → Evidence **and** Evaluation History **and** Projection Replay Sidecar use Prisma
- `memory` (default) → process-local History + Sidecar
- `getApiPlatformPersistenceMode()` for diagnostics

## 6. Restart durability status

| Layer | Unit / process-boundary tests | Live PostgreSQL integration |
| --- | --- | --- |
| Memory History/Sidecar | PASS — explicitly **not** durable across new repository instances | N/A |
| Postgres History | Tests written (recreate `createFasDatabase` handle) | **BLOCKED** — no live Postgres on `127.0.0.1:5432` in this environment |
| Postgres Sidecar | Tests written | **BLOCKED** (same) |
| History + Sidecar together | Tests written | **BLOCKED** (same) |

To un-block:

```bash
# Start validation Postgres (Compose/local), then:
export DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation
pnpm --filter @fas/database prisma:migrate
pnpm --filter @fas/database test
```

## 7. Test coverage

**PASS (always):**

- Config `platformPersistence` observability
- In-memory sidecar round-trip / idempotency / conflict / non-durability
- Existing statistics P2H/P2I, analysis R1B governance (Baseline A default; Candidate C non-default)
- Report / API workflow tests
- Full `pnpm test` (with Postgres suites skipped when DB unreachable)

**SKIPPED / BLOCKED (infra):**

- 6× P2K Postgres History/Sidecar durability tests
- 4× Prisma Evidence repository tests
- 2× API Evidence postgres HTTP tests

## 8. Known PostgreSQL environment limitations

This run could not reach PostgreSQL at `127.0.0.1:5432`. Migration file is present but **not deployed** here. Do not claim live restart durability PASS without running the migrate + database test commands above.

## 9. Explicit non-implementations

- Replay Cohort — **NOT** implemented  
- Replay Run — **NOT** implemented  
- Candidate A/B replay / Match Script runtime override — **NOT** implemented  
- Candidate C — **NOT** promoted (Baseline A remains production default)  
- Population calibration / new metrics / Engines / Providers / Features / Rules — **NOT** in scope  
- Football State / Match Script / Projection / Poisson / Market math — **unchanged**

## 10. Next authorized slice

**P2K-C — Sidecar completeness + backfill policy**

(Query History rows missing sidecar; optional re-analyze/backfill; V2 cohort eligibility = sidecar-complete + FINISHED outcome.)

---

## Final checklist (task output)

1. **Files changed** — see git status; primary: config platformPersistence, statistics sidecar port/memory, database Prisma model/migration/adapter, API runtime + version observability, report sidecar failure code, tests, this report, PROJECT_STATE / PROJECT_INDEX  
2. **Prisma migration created** — `20260812000000_p2k_projection_replay_sidecar`  
3. **Active persistence mode** — default `memory`; `EVIDENCE_REPOSITORY_MODE=postgres` + `DATABASE_CLIENT_MODE=live` → durable Evidence + History + Sidecar  
4. **History durability** — existing Prisma History used; mode explicit; no silent memory fallback in postgres mode  
5. **Sidecar durability** — Postgres adapter implemented; dual-write on report path  
6. **Restart test** — unit/memory PASS; Postgres integration **BLOCKED** (no live DB)  
7. **Idempotency/conflict** — same content → success; different content → `ConflictProjectionReplaySidecarError`  
8. **Scoped tests** — config/statistics/database/report/analysis/api PASS (postgres suites skipped)  
9. **quality / typecheck / build** — PASS  
10. **Full test** — PASS with infra skips; Postgres durability **BLOCKED**  
11. **Baseline A** remains production default; **Candidate C** remains non-default; **no prediction semantics changed**  
12. **Next step:** P2K-C — Sidecar completeness + backfill policy  
