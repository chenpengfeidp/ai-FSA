# PVS-3.1 — Production Runtime Boot Fix Completion Report

**Sprint id:** PVS-3.1  
**Roadmap:** `docs/40_PRODUCT_ROADMAP.md` (v0.2 baseline vertical-slice product phase; PVS-3.1 is an explicitly authorized maintenance follow-up, not a separately named doc-40 sprint)  
**Architecture Freeze:** v0.3  
**Completion date:** 2026-08-26  
**Result:** **PASS — recorded production HTTP runtime restored**  
**Scope:** Production Nest dependency-metadata fix, focused regression test, recorded HTTP smoke, and validation only

---

## 1. Goal, inputs, outputs, and acceptance

### Goal

Remove the production runtime blocker recorded by PVS-3 without changing fixture discovery,
analysis, Projection V2, calibration, or Unified Probability Matrix behavior.

### Inputs

- PVS-3 blocked validation evidence:
  `PVS-3_LIVE_FIXTURE_END_TO_END_VALIDATION_COMPLETION_REPORT.md`
- Existing `AnalysisController`
- Existing `DiscoverFixtureByTeamsUseCase` provider registration in `EvidenceModule`
- Recorded API-Football cassette fixture `football:100001`
- Production policy pin `PROJECTION_POLICY_PIN=v2`

### Outputs

- Runtime constructor metadata for `AnalysisController` now references the concrete
  `DiscoverFixtureByTeamsUseCase` class.
- A focused Nest regression assertion covers use-case and controller resolution.
- Recorded production HTTP startup and endpoint smoke evidence.
- This completion report.

### Acceptance verdict

All PVS-3.1 recorded-runtime acceptance criteria passed. This does **not** complete the separate
live API-Football validation because no `API_FOOTBALL_KEY` was available.

---

## 2. Original PVS-3 blocker

PVS-3's recorded fallback failed during Nest application startup:

```text
UnknownDependenciesException:
Nest can't resolve dependencies of the AnalysisController
argument Function at index [1]
```

`EvidenceModule` already registered `DiscoverFixtureByTeamsUseCase`. The failure occurred before
any route could serve a request, so neither the upcoming catalog nor the analysis HTTP path was
available.

---

## 3. Root cause and exact code change

`apps/api/src/analysis.controller.ts` used:

```ts
import type { DiscoverFixtureByTeamsUseCase } from "@fas/application";
```

Type-only imports are erased from emitted JavaScript. Nest's reflected constructor metadata
therefore saw `Function`, not the registered use-case class.

The only production code change was:

```ts
// biome-ignore lint/style/useImportType: NestJS uses the use case class as constructor metadata.
import { DiscoverFixtureByTeamsUseCase } from "@fas/application";
```

The existing provider registration in `apps/api/src/evidence.module.ts` remains unchanged. No
provider, token abstraction, module, or dependency-injection architecture was added.

---

## 4. Regression test

`apps/api/test/pvs-1-production-vertical-slice.spec.ts` now explicitly verifies that a real Nest
application can resolve:

- `DiscoverFixtureByTeamsUseCase`; and
- `AnalysisController`, whose constructor consumes that use case.

The same suite starts Nest on an ephemeral HTTP port and continues to exercise the production
analysis routes. This guards against reintroducing a type-only constructor dependency.

---

## 5. Recorded runtime startup result

Configuration:

```bash
PORT=3002 \
FOOTBALL_DATA_PROVIDER_MODE=recorded \
PROJECTION_POLICY_PIN=v2 \
ODDS_PROVIDER_MODE=recorded \
DATABASE_CLIENT_MODE=stub \
EVIDENCE_REPOSITORY_MODE=memory \
pnpm dev:api
```

Result: **PASS**

Observed startup evidence:

```text
EvidenceModule dependencies initialized
Mapped {/api/analyze, POST} route
Mapped {/api/matches/upcoming, GET} route
Nest application successfully started
API listening on http://127.0.0.1:3002
```

The previous `UnknownDependenciesException` did not recur.

---

## 6. HTTP smoke results

### `GET /api/matches/upcoming`

Result: **HTTP success**

- `ok`: `true`
- `footballDataProviderMode`: `recorded`
- `oddsProviderMode`: `recorded`
- `scheduleSource`: `football-data`
- `usedRecordedFallback`: `false`
- fixture count: `10`
- target fixture:
  - matchId: `football:100001`
  - home: `FC Seoul`
  - away: `Ulsan Hyundai FC`
  - competition: `K League 1`
  - kickoff: `2026-07-19T10:30:00+00:00`
  - provider: `api-football`
  - provider method: `recorded-snapshot`

### `POST /api/analyze`

Request:

```json
{
  "homeTeam": "FC Seoul",
  "awayTeam": "Ulsan Hyundai FC"
}
```

Result: **HTTP success through the running production Nest application**

This was not a direct invocation of an application service. The request used
`http://127.0.0.1:3002/api/analyze` and returned a complete report.

Fixture resolution:

- `matchId`: `football:100001`
- resolved orientation: FC Seoul home / Ulsan Hyundai FC away
- `homeAwaySwapped`: `false`
- schedule source: `football-data`
- provider source: `api-football`

---

## 7. V2 report and prediction outputs

### Runtime policy

- `analysisProvenance.projectionPolicyPin`: **`v2`**
- `projectionFramework.frameworkVersion`: `projectionFramework.v2.unifiedMatrix`
- `parameterArtifactId`: `projectionParams:v3.1:matchScript`
- `parameterVersionLabel`: **`projection.v3.replay`**
- Football State policy: `footballState.v1`
- Unified Matrix policy: `unifiedMatrix.v1`
- Unified Matrix merge: `convex_cell_merge_v1`
- Unified Matrix checksum: `a0682a06`

The response contains `footballState` with all six governed dimensions and
`projectionFramework.unifiedMatrix` with the matrix-derived outputs.

### Deterministic report output

- post-calibration 1X2:
  - home: `0.960526468953`
  - draw: `0.031235294685`
  - away: `0.008238236362`
- top scorelines:
  - 4–0: `0.166328953399`
  - 5–0: `0.157817664233`
  - 3–0: `0.140724109744`
- goal range:
  - 0–1: `0.049231308484`
  - 2–3: `0.273759686979`
  - 4+: `0.677009004537`
- confidence: `0.672735042007`
- recommendation: `cautious`

### Unified Matrix-derived output

- raw matrix 1X2:
  - home: `0.967682897181`
  - draw: `0.026482038696`
  - away: `0.005835064123`
- most likely scoreline: 4–0 (`0.16632895339898174`)
- BTTS:
  - yes: `0.270619246924`
  - no: `0.729380753076`
- Over/Under 2.5:
  - over: `0.848261460367`
  - under: `0.151738539633`

The response states `scorelinesBasis = "match_script_merged_v2"` and
`oneXTwoBasis = "post_calibration_only"`. Scorelines, goal ranges, BTTS, and O/U are aggregates
of the one merged matrix. The existing pinned calibration transform is the only post-matrix 1X2
step; no V1 fallback or second independent probability model was used.

---

## 8. Tests and quality gates

| Validation | Result |
|---|---|
| Focused/API suite (`@fas/api`, including PVS-1 HTTP + new DI assertion) | **PASS** — 5 files passed, 1 skipped; 33 tests passed, 2 skipped |
| Application suite | **PASS** — 3 files / 23 tests |
| Analysis suite | **PASS** — 25 files / 100 tests |
| Web suite, including PVS-2 analyze-by-teams behavior | **PASS** — 10 files / 49 tests |
| `pnpm quality` | **PASS** — 611 files; no dependency violations |
| `pnpm typecheck` without `DATABASE_URL` | Configuration prerequisite observed: Prisma rejected missing `DATABASE_URL` |
| `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/fas pnpm typecheck` | **PASS** — 41 tasks |
| `pnpm build` | **PASS** — 22 tasks |

There is no separately named PVS-2 API spec. PVS-2's analyze-by-teams behavior is covered by the
Web suite, while the PVS-1 API suite covers the same production HTTP endpoint and now the
controller dependency-resolution regression.

---

## 9. Files changed

Production/test changes:

1. `apps/api/src/analysis.controller.ts`
2. `apps/api/test/pvs-1-production-vertical-slice.spec.ts`

Delivery evidence:

3. `docs/sprints/PREDICTION_VERTICAL_SLICE/PVS-3.1_PRODUCTION_RUNTIME_BOOT_FIX_COMPLETION_REPORT.md`
4. `docs/PROJECT_STATE.md`
5. `docs/PROJECT_INDEX.md`

The pre-existing PVS-3 blocked report and its pending project-state/index updates remain part of
the same uncommitted delivery history.

---

## 10. Governance confirmation

- Production artifact remains **`projection.v3.replay`**.
- Production projection policy remains **`v2`**.
- `projection.v3.calibration.candidate1` was not modified or promoted.
- No P2K-CAL-3 work was performed.
- No λ, `baseRate`, `groupFactorMax`, Dixon–Coles ρ, calibration definition, Evaluation History,
  sealed replay cohort, Feature, Rule, Football State, Match Script, or Unified Probability
  Matrix contract was changed.
- `AnalyzeMatchUseCase` and `GenerateMatchReportUseCase` were not changed.
- Fixture discovery semantics were not changed.
- No provider or dependency-injection architecture was added.
- Existing production prediction behavior is unchanged except that Nest can now resolve the
  already-registered controller dependency.

---

## 11. Remaining live credential limitation and stop boundary

PVS-3.1 proves the **recorded production HTTP path**, not live provider success.

The live API-Football catalog and Evidence smoke still require:

```bash
export API_FOOTBALL_KEY="<configured-api-sports-key>"
export FOOTBALL_DATA_PROVIDER_MODE=live
export PROJECTION_POLICY_PIN=v2
export ODDS_PROVIDER_MODE=recorded
```

Until that credential is available and a current upcoming fixture completes through the live
HTTP path, PVS-3's live success criterion remains unvalidated.

Stop after PVS-3.1. Do not start PVS-3.2, P2K-CAL-3, calibration tuning, or candidate promotion
automatically.
