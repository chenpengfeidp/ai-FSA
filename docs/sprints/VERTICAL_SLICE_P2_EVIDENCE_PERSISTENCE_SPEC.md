# Platform Slice P.2 — Durable Evidence Persistence

## Goal

Introduce the first Prisma domain models aligned with `docs/12_DATABASE.md` /
`docs/19_DATABASE_ERD.md`, and implement a PostgreSQL-backed
`EvidenceRepository` so vertical-slice import/query can survive API restart,
without moving Feature/Rule/Analysis off the existing port contract.

## Locked decisions

1. No side tables: first models are the catalog/match/evidence tables listed below.
2. Runtime `EvidenceType` maps to `evidence_items.evidence_type`:
   - `ODDS` → `market_signal`
   - all other vertical-slice kinds → `fact`
   - kind stored as `metric_key` = `kind:<EvidenceType>`
   - payload + freshness/quality/provenance live in `value_json` (`schema_version: 1`)
3. Domain `MatchId` strings (`match-example-*`, `odds:*`) map through
   `matches.external_key` (doc 12 amendment); `matches.id` remains UUID.
4. Domain Evidence string ids map to UUID PKs via UUID v5 (fixed FAS namespace).
5. `EVIDENCE_REPOSITORY_MODE=memory|postgres` (default `memory`; Compose uses
   `postgres` after migrate).
6. `EvidenceRepository` becomes async (`Promise`-returning) so Postgres I/O is
   honest at the port boundary.

## Inclusions

- Prisma models + first migration for:
  `competitions`, `seasons`, `teams`, `matches` (with `external_key`),
  `match_participants`, `data_sources`, `source_records`, `evidence_items`
- `PrismaEvidenceRepository` in `@fas/database` implementing `@fas/evidence`
  `EvidenceRepository` (map to/from domain `Evidence`; never export Prisma rows)
- Ensure-match on save: create minimal competition/season/team/match rows when
  `external_key` is missing
- Config `EVIDENCE_REPOSITORY_MODE`; API Nest wiring selects memory vs postgres
- Compose / `.env.example` notes for migrate then postgres mode
- Async port + consumer updates (`EvidenceService`, `EvidenceQueryService`,
  `EvidenceImportPipeline`, API controllers, tests)

## Exclusions

- `evidence_conflicts`, analysis snapshots/runs/revisions
- Match results / result versions (ADR-004 path deferred)
- Jobs, Redis, BullMQ, pgvector
- Exporting bare `PrismaClient` to apps
- shots/xG STATISTICS; Chinese UI (parallel ZH-1); Evaluation-qualified calibration

## Mapping (domain → row)

| Domain field | Persistence |
|---|---|
| `Evidence.id` | `evidence_items.id` = UUID v5(`fas-evidence`, id); original id also in `value_json.domain.id` |
| `Evidence.matchId` | resolve/ensure `matches` by `external_key`; FK `match_id` |
| `Evidence.source` / `sourceId` | ensure `data_sources` by name; `source_records.external_record_id` |
| `Evidence.type` | `metric_key` = `kind:<type>`; `evidence_type` via locked map |
| `Evidence.payload` + meta | `value_json` |
| `Evidence.quality` | map to `quality_status` (`verified`→`valid`, `unverified`→`valid`, `rejected`→`rejected`) |
| `Evidence.freshness` | inside `value_json` |
| `Evidence.collectedAt` / `eventTime` | `retrieved_at` / `observed_at` (source_record + item) |

Duplicate `save` of the same domain id throws `DuplicateEvidenceError` (unique PK).

## Acceptance

- Schema validates with models; first migration applies cleanly against local Postgres
- `EVIDENCE_REPOSITORY_MODE=memory`: existing API/unit tests pass without Postgres
- `EVIDENCE_REPOSITORY_MODE=postgres`: import then `GET /api/evidence/match/:id`
  returns rows after API process restart
- `pnpm --filter @fas/database test`, `@fas/config test`, `@fas/api test`, and
  `pnpm validate` pass

## Authorization

Planning gate for first Prisma models. Implementation follows this spec and the
`matches.external_key` amendment in `docs/12_DATABASE.md`.
