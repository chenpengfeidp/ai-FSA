# PVS-4 — China Sports Lottery Fixture Authority + Multi-Source PRE_MATCH Evidence — Implementation Review

| Field | Value |
|---|---|
| Sprint id | **PVS-4** |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` (PVS-4 amendment applied) |
| Gate | `CHINA_LOTTERY_FIXTURE_AUTHORITY_MULTI_SOURCE_PREMATCH_EVIDENCE_IMPLEMENTATION_GATE.md` |
| Date | 2026-09-13 |
| Implementation authorization | Human-approved gate |
| Production code | **Yes** (bounded scope) |
| Recommendation | **A. PASS — PVS-4 IMPLEMENTED** |
| Real Class A verification | **NOT ATTEMPTED** (no live lottery operator run in this sprint) |
| `authentic_prematch_seal` | **NOT_FOUND** (unchanged) |
| Historical Evaluation Intake | **C_BLOCKED** (unchanged) |

---

## 1. Summary

Implemented manifest-first China Sports Lottery fixture intake, canonical
`lottery:csl:` identities, CORE + 1X2/AH/O/U Evidence import through existing
`ImportMatchUseCase` / `normalizeFixtureEvidenceSet`, and API operator surfaces
`POST /api/lottery/manifest` and `GET /api/lottery/fixtures`. Analyze and
PRE_MATCH seal paths are **unchanged**; lottery matches route through
`CompositeLotteryFirstMatchProvider` without API-Football fixture authority.

---

## 2. Files changed

### Added

- `packages/application/src/lottery/*` (manifest validation, registry, provider, bundle mapping)
- `packages/application/src/import-lottery-manifest-use-case.ts`
- `packages/application/test/pvs-4-lottery-manifest.spec.ts`
- `packages/application/test/fixtures/pvs-4-lottery-manifest.json`
- `apps/api/src/lottery.controller.ts`
- `apps/api/src/lottery-fixture-registry.singleton.ts`
- This review document

### Modified

- `packages/application/src/index.ts`
- `packages/application/package.json` (test devDependencies)
- `packages/evidence-normalizer/src/fixture/fixture-evidence-normalizer.ts` (MATCH_INFO competition/authority fields)
- `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts` (`additionalOdds[]`)
- `apps/api/src/evidence.module.ts` (lottery-first match provider, controller)
- `docs/40_PRODUCT_ROADMAP.md` (PVS-4 section)
- `docs/PROJECT_STATE.md`
- `docs/PROJECT_INDEX.md`
- `pnpm-lock.yaml` (workspace devDependency link)

### Not touched (per gate)

- Projection V2, Rule math, Calibration, Validation, Historical Intake, seal hash semantics, FIP, Architecture Freeze, new Engine, new package.

---

## 3. Contract implemented

- Schema `lottery-fixture-manifest.v1`
- `matchId = lottery:csl:{salesIssueId}:{lotteryMatchCode}`
- `scheduleSource = china-sports-lottery`, `fixtureAuthority = lottery-official-list`
- Failure codes: duplicate, ambiguous, orientation, kickoff conflict, incomplete identity, invalid manifest
- Hybrid manifest-first CORE + market bundle (no generic scraping)

---

## 4. Tests

| Matrix | Result |
|---|---|
| T01–T19, T23–T25 | **PASS** — `packages/application/test/pvs-4-lottery-manifest.spec.ts` |
| T20 Postgres seal persist | **NOT RUN** (no Postgres in this sprint CI slice) |
| T21–T22 reload/checksum | **Deferred** to product-aligned Class A verification (existing seal unit tests unchanged) |
| T17–T18 | Covered by governance + manifest authority metadata (`usedRecordedFallback: false` on lottery list) |
| Regression | `@fas/application` 42/42; `@fas/evidence-normalizer` suite run |

Commands:

```bash
pnpm --filter @fas/application test
pnpm --filter @fas/evidence-normalizer test
pnpm --filter @fas/api typecheck
```

---

## 5. Real verification status

**NOT ATTEMPTED.** No live operator lottery list or pre-kickoff production seal run
was executed. Implementation proves architecture on recorded cassette only.

---

## 6. Next gate

**AUTHENTIC_PREMATCH_SEAL_CAPTURE_REAL_ARTIFACT_VERIFICATION** using product-aligned
recipe (lottery fixture + durable Postgres + governed analyze). Not Historical
Evaluation Intake.

---

## 7. API usage (operator)

```http
POST /api/lottery/manifest
Content-Type: application/json

<lottery-fixture-manifest.v1 JSON>
```

```http
GET /api/lottery/fixtures
POST /api/analyze/match/lottery:csl:20260913:001
```

Ensure `EVIDENCE_REPOSITORY_MODE=postgres` for seal capture when verifying Class A.
