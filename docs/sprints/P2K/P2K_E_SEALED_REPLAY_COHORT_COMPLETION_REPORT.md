# P2K-E — Sealed Replay Cohort

**Status:** COMPLETED  
**Sprint id:** P2K-E  
**Roadmap citation:** Continues P2K after P2K-D (`docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md` § P2K-E). Doc 40 may not yet list P2K by name.  
**Architecture Freeze:** v0.3 (unchanged)  
**Date:** 2026-08-12  

---

## 1. Cohort model

Domain (`@fas/statistics`):

| Field | Purpose |
| --- | --- |
| `cohortId` | Stable cohort identity |
| `schemaVersion` | `replay-cohort.p2k.e` |
| `status` | `DRAFT` \| `SEALED` |
| `specification` | Deterministic selection spec |
| `eligibilityContractVersion` | `projection-replay-eligibility.p2k.c` |
| `sidecarSchemaVersion` | Pinned Sidecar schema |
| `createdAt` / `membershipCreatedAt` / `sealedAt` | Audit timestamps (not selection keys) |
| `members[]` | Ordered `{ historyId, matchId, position }` |
| `membershipDigestSha256` | Canonical membership digest |
| `limitations` | Explicit non-claims |

Persistence (`@fas/database` Prisma):

- `ReplayCohortItem` → `replay_cohort_items`
- `ReplayCohortMemberItem` → `replay_cohort_member_items`
- Migration: `20260812120000_p2k_e_sealed_replay_cohort`

APIs:

- Pure: `selectReplayCohortMembers`, `buildReplayCohort`, `computeReplayCohortMembershipDigestSha256`
- Orchestration: `createAndSealReplayCohort`, `resolveSealedReplayCohort`
- Repos: `InMemoryReplayCohortRepository`, `PrismaReplayCohortRepository`

## 2. Membership rule

A History row enters a cohort **only** when P2K-C reports:

`replayEligible === true`

Additionally the Sidecar `schemaVersion` must equal the cohort specification pin.

## 3. Eligibility dependency

Selection calls `assessProjectionReplayEligibility` (canonical P2K-C).  
P2K-E does **not** reimplement completeness / outcome rules.

## 4. Deterministic ordering

`ordering: historyId_asc` — lexicographic `historyId` after eligibility filtering.  
Optional deterministic `maxSampleSize` takes the first N after sort.  
Optional `recordedAtFromInclusive` / `recordedAtToExclusive` filter ingest time only.

Membership selection does **not** use DB incidental order, `Date.now()`, or random UUIDs.

## 5. Membership digest

SHA-256 over canonical JSON of:

- cohort schema version
- eligibility contract version
- sidecar schema version
- ordering / maxSampleSize / recordedAt bounds
- ordered members (`position`, `historyId`, `matchId`)

Same hashing style as Sidecar content digests (`node:crypto` SHA-256).

## 6. Lifecycle / sealing

- `DRAFT` and `SEALED` statuses
- Primary path: `createAndSealReplayCohort` → SEALED in one step
- `seal(cohortId)` transitions DRAFT → SEALED without changing members
- Identical SEALED save (same digest/membership) is idempotent

## 7. Immutability

Once `SEALED`:

- no add / remove / reorder / replace membership
- conflicting save → `SealedReplayCohortImmutableError`
- silent overwrite is forbidden

## 8. Outcome-independence

Selection does **not** use:

- actual winner / score / goals
- BTTS / O-U / prediction correctness
- Candidate A/C projection results

`outcomeEvaluable` (FINISHED + scored) is required only via P2K-C `replayEligible`.

## 9. Historical-data immutability

Cohort creation references existing Evaluation History + Projection Replay Sidecar only.

Does **not**:

- refresh Providers
- regenerate Evidence / Features / Rules
- fabricate Sidecars
- alter History rows

## 10. Tests

| Suite | Coverage |
| --- | --- |
| `packages/statistics/test/sealed-replay-cohort-p2k-e.spec.ts` | Eligibility gate, determinism, digest, seal immutability, outcome-independence, no Sidecar fabrication |
| `packages/analysis/test/sealed-replay-cohort-offline-replay-p2k-e.spec.ts` | Sealed member → P2K-D offline A/C replay; Baseline A default / C non-default |
| `packages/database/test/prisma-p2k-e-sealed-replay-cohort.spec.ts` | Postgres process-boundary + sealed overwrite reject |

## 11. Quality gates

| Gate | Status |
| --- | --- |
| `pnpm quality` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (one transient `@fas/web` 5s timeout under parallel turbo; PASS on retry) |
| `pnpm build` | PASS |
| Scoped P2K-E / P2K-C / P2K-D / R1B | PASS |

## 12. PostgreSQL validation

| Check | Status |
| --- | --- |
| Migration applied to `fas_validation` | PASS |
| Sealed cohort round-trip across process boundary | PASS |
| Sealed overwrite rejected | PASS |

## 13. Architecture Freeze verification

Architecture Freeze **v0.3** unchanged.

No new Engine / Provider / Feature / Rule / Football State dimension / Match Script production behavior / Projection math / Poisson / Market→Probability.

## 14. Explicit non-goals (no performance claims)

P2K-E does **not** report Winner / Draw / Exact Score / Goal Range / BTTS / O-U accuracy, confidence calibration, Candidate C improvement, or promotion readiness.

Does **not** implement Replay Run (P2K-F) or population evaluation (P2K-G).

## 15. Next step

**P2K-F — Sealed Cohort Offline Replay Run**

---

## Files touched

- `packages/statistics/src/domain/replay-cohort.ts`
- `packages/statistics/src/replay/select-replay-cohort-members.ts`
- `packages/statistics/src/replay/build-replay-cohort.ts`
- `packages/statistics/src/replay/compute-replay-cohort-membership-digest.ts`
- `packages/statistics/src/replay/create-sealed-replay-cohort.ts`
- `packages/statistics/src/repository/replay-cohort-repository.ts`
- `packages/statistics/src/repository/in-memory-replay-cohort-repository.ts`
- `packages/statistics/src/index.ts`
- `packages/statistics/test/sealed-replay-cohort-p2k-e.spec.ts`
- `packages/analysis/test/sealed-replay-cohort-offline-replay-p2k-e.spec.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260812120000_p2k_e_sealed_replay_cohort/migration.sql`
- `packages/database/src/prisma-replay-cohort-repository.ts`
- `packages/database/src/client.ts`
- `packages/database/src/index.ts`
- `packages/database/test/prisma-p2k-e-sealed-replay-cohort.spec.ts`
- `docs/sprints/P2K/P2K_E_SEALED_REPLAY_COHORT_COMPLETION_REPORT.md`
- `docs/PROJECT_STATE.md`
- `docs/PROJECT_INDEX.md`
