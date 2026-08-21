# PVS-1 — Production Prediction Vertical Slice Completion Report

**Sprint id:** PVS-1  
**Roadmap citation:** `docs/40_PRODUCT_ROADMAP.md` (product development phase)  
**Architecture Freeze:** v0.3  
**Completion date:** 2026-08-21  
**Prior audit:** `docs/sprints/PREDICTION_VERTICAL_SLICE/PREDICTION_VERTICAL_SLICE_READINESS_AUDIT.md`

---

## Executive summary

PVS-1 closes the production vertical slice identified in the readiness audit:

1. **Production API now pins Projection V2** via explicit `PROJECTION_POLICY_PIN` config (default `"v2"`).
2. **`POST /api/analyze`** resolves fixtures by `homeTeam` + `awayTeam` (+ optional `date`) against the existing Match Center catalog, then runs the **existing** `GenerateMatchReportUseCase` / `AnalyzeMatchUseCase` pipeline.
3. **Reports expose `analysisProvenance`** (`projectionPolicyPin`, optional `fixtureResolution`) so V2 usage is auditable.
4. **BTTS / Over-Under** remain derived from the unified matrix via `projectionFramework.unifiedMatrix.derived` (already surfaced in Workspace multi-script section once V2 is active).

**Verdict:** Production analyze path is **V2-capable** for known fixtures and recorded team-name discovery. Live Rosenborg vs Fredrikstad still requires live catalog + credentials (not in recorded cassettes).

---

## Original readiness gaps addressed

| Gap | PVS-1 resolution |
|-----|------------------|
| API `projectionPolicyPin` defaulted to `"v1"` | `@fas/config` `PROJECTION_POLICY_PIN` (default `"v2"`) wired in `apps/api/src/evidence.module.ts` |
| No team-name fixture resolution | `DiscoverFixtureByTeamsUseCase` + `POST /api/analyze` |
| V2 provenance not visible on reports | `analysisProvenance` on `AnalysisReport` |
| BTTS/O-U not in deterministic DTO | Exposed via existing `projectionFramework.unifiedMatrix.derived` (no second calculation) |

**Not changed:** projection parameter catalog, calibration candidate1 (NON-DEFAULT), sealed prediction contract, Evaluation/Calibration definitions.

---

## Files changed

### Config & composition root

- `packages/config/src/environment.ts` — `ProjectionConfig`, env `PROJECTION_POLICY_PIN`
- `packages/config/test/environment.spec.ts`
- `apps/api/src/evidence.module.ts` — V2 pin + `DiscoverFixtureByTeamsUseCase`

### Fixture discovery

- `packages/application/src/fixture/normalize-team-name.ts`
- `packages/application/src/fixture/discover-fixture-by-teams.ts`
- `packages/application/src/discover-fixture-by-teams-use-case.ts`
- `packages/application/src/index.ts`
- `packages/application/test/discover-fixture-by-teams.spec.ts`
- `apps/api/src/upcoming-fixture-catalog.bridge.ts`

### API

- `apps/api/src/analysis.controller.ts` — `POST /api/analyze`
- `apps/api/src/http-response.dto.ts` — fixture discovery + `analysisProvenance` DTOs
- `apps/api/test/pvs-1-production-vertical-slice.spec.ts`
- `apps/api/test/import-evidence-workflow.spec.ts` — V2 limitation expectation

### Analysis & report provenance

- `packages/analysis/src/domain/analysis-provenance.ts`
- `packages/analysis/src/index.ts`
- `packages/report/src/domain/analysis-report.ts`
- `packages/report/src/use-case/generate-match-report-use-case.ts`
- `packages/report/test/report-builder.spec.ts`

### Workspace

- `apps/web/src/types/analysis.ts`
- `apps/web/src/services/api.ts` — `analyzeByTeams()`
- `apps/web/src/components/explainable-report/fixture-resolution-section.tsx`
- `apps/web/src/components/explainable-report/explainable-match-report.tsx`
- `apps/web/src/copy/zh.ts`

---

## Production V2 wiring

```typescript
// apps/api/src/evidence.module.ts
const productionProjectionPolicyPin = apiConfig.projection.policyPin; // default "v2"

new AnalyzeMatchUseCase(..., productionProjectionPolicyPin);
new GenerateMatchReportUseCase(..., productionProjectionPolicyPin);
```

Inspect at runtime:

- `GET /api/projection-parameters` → active `projection.v3.replay`
- Analyze response → `analysisProvenance.projectionPolicyPin === "v2"`
- Analyze response → `projectionFramework.parameterVersionLabel === "projection.v3.replay"`
- Analyze response → `footballState`, `deterministic.scorelinesBasis === "match_script_merged_v2"`

V1 replay paths remain available by constructing `AnalyzeMatchUseCase` with `"v1"` in tests/replay sidecars (unchanged).

---

## Fixture discovery design

**Input:** `homeTeam`, `awayTeam`, optional `date` (`YYYY-MM-DD`)

**Source:** Existing `UpcomingMatchesBoard` (recorded Football Data + fixture demos; live when configured)

**Normalization:** deterministic whitespace/case/punctuation + common token stripping (`FC`, `Hyundai FC`, etc.)

**Outcomes:**

| Case | Response |
|------|----------|
| Single match | `{ ok: true, ...AnalysisReport }` with `fixtureResolution` |
| No match | `{ ok: false, error: { code: "FIXTURE_NOT_FOUND", ... } }` |
| Multiple same kickoff | `{ ok: false, error: { code: "FIXTURE_AMBIGUOUS", candidates: [...] } }` |
| Multiple different kickoffs, no date | earliest kickoff selected deterministically |
| Swapped home/away | resolved with `homeAwaySwapped: true` |

---

## Request / response examples

### Discover + analyze (recorded)

```http
POST /api/analyze
Content-Type: application/json

{
  "homeTeam": "FC Seoul",
  "awayTeam": "Ulsan Hyundai FC"
}
```

Success (excerpt):

```json
{
  "matchId": "football:100001",
  "analysisProvenance": {
    "projectionPolicyPin": "v2",
    "fixtureResolution": {
      "requestedHomeTeam": "FC Seoul",
      "requestedAwayTeam": "Ulsan Hyundai FC",
      "resolvedMatchId": "football:100001",
      "scheduleSource": "football-data",
      "providerSource": "api-football"
    }
  },
  "projectionFramework": {
    "parameterVersionLabel": "projection.v3.replay",
    "frameworkVersion": "projectionFramework.unifiedMatrix.v1"
  },
  "footballState": { "policyVersion": "footballState.v1" }
}
```

### Fixture not found

```json
{
  "ok": false,
  "error": {
    "code": "FIXTURE_NOT_FOUND",
    "message": "No fixture found for \"Rosenborg\" vs \"Fredrikstad\"."
  }
}
```

### Existing matchId path (unchanged)

```http
POST /api/analyze/match/football:100001
```

---

## End-to-end execution path

```text
POST /api/analyze { homeTeam, awayTeam, date? }
  → UpcomingMatchesBoard.listUpcoming()
  → discoverFixtureByTeams()
  → matchId
  → primers (scores, football, odds)
  → GenerateMatchReportUseCase.execute(matchId, { fixtureResolution })
       → AnalyzeMatchUseCase (projectionPolicyPin = "v2")
            → Import → Feature → Rule
            → computeProjectionV2()
                 → Football State → Match Script → Unified Matrix
       → ReportBuilder + analysisProvenance overlay
```

---

## Failure behavior

- **Fixture not found:** structured error; no prediction fabricated.
- **Ambiguous fixture:** structured error with `candidates`; no arbitrary pick when kickoff ties.
- **V2 policy not `"v2"`:** `POST /api/analyze` returns `PROJECTION_POLICY_UNAVAILABLE` (no silent V1 fallback).
- **Missing provider evidence:** existing analyze/import error paths unchanged.
- **matchId analyze:** continues to work; now uses V2 by default.

---

## Tests & quality gates

| Check | Result |
|-------|--------|
| `pnpm quality` | Pass |
| `pnpm typecheck` | Pass (with `DATABASE_URL`) |
| `@fas/application` fixture discovery tests | Pass |
| `@fas/api` PVS-1 + import-evidence-workflow | Pass |
| `@fas/report` report-builder | Pass (updated for provenance) |

**Note:** `apps/api/test/evidence-postgres-persistence.spec.ts` may crash workers in parallel turbo runs (pre-existing infra test); PVS-1 API tests pass when run directly.

---

## Remaining limitations

1. **Recorded catalog** only includes K League + Veikkausliiga (+ fixture demos) — Rosenborg vs Fredrikstad requires live Football Data + `API_FOOTBALL_KEY`.
2. **Team normalization** is token-based, not fuzzy — partial names (`"Ulsan"`) work via suffix rules; arbitrary aliases do not.
3. **BTTS/O-U** appear under `projectionFramework.unifiedMatrix.derived`, not top-level `deterministic` fields (preserves sealed prediction contract).
4. **Workspace analyze-by-teams UI** — API client added; Match Center still primarily matchId-driven (fixture resolution section shows when provenance present).

---

## Next recommended sprint

**PVS-2 — Match Center Analyze-by-Teams UX & Live Fixture Smoke Path**

- Add Workspace / Match Center form calling `POST /api/analyze`
- Document live Eliteserien smoke procedure (`API_FOOTBALL_KEY` + upcoming board)
- Optional: top-level `deterministic.marketOutcomes` mirror of unified-matrix BTTS/O-U (additive DTO only)

**Not recommended next:** P2K-CAL-3 (calibration tuning) until live vertical slice smoke is validated.

---

## Governance confirmation

- Production artifact: **`projection.v3.replay`** (unchanged)
- **`projection.v3.calibration.candidate1`:** `isActive: false`, not promoted
- No Evaluation History mutation
- No new Provider, Engine, or Architecture document
