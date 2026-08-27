# PVS-3 — Production Live Fixture End-to-End Validation Completion Report

**Sprint id:** PVS-3  
**Roadmap citation:** `docs/40_PRODUCT_ROADMAP.md` (v0.2 baseline vertical-slice product phase; PVS-3 is not a named doc-40 id and was explicitly authorized by the task brief)  
**Architecture Freeze:** v0.3  
**Validation date:** 2026-08-26  
**Result:** **BLOCKED — live success criterion not met**  
**Production changes:** None  

---

## 1. Executive verdict

PVS-3 does **not** claim a successful live fixture analysis.

Two independent prerequisites blocked the requested production smoke:

1. Starting the API with `FOOTBALL_DATA_PROVIDER_MODE=live` failed closed with:

   ```text
   ConfigurationValidationError: Invalid environment configuration: API_FOOTBALL_KEY.
   variable: API_FOOTBALL_KEY
   code: MISSING_API_FOOTBALL_KEY
   message: API_FOOTBALL_KEY is required when FOOTBALL_DATA_PROVIDER_MODE is live.
   ```

2. A second startup attempt using the recorded provider reached Nest composition but the
   production application failed to boot:

   ```text
   UnknownDependenciesException:
   Nest can't resolve dependencies of the AnalysisController
   (GenerateMatchReportUseCase, ?, OddsSnapshotPrimerBridge, ...)
   argument Function at index [1]
   ```

   Root cause from the current production implementation:
   `apps/api/src/analysis.controller.ts` imports
   `DiscoverFixtureByTeamsUseCase` with `import type`, while Nest requires that class as runtime
   constructor metadata. The emitted metadata is therefore `Function`, not
   `DiscoverFixtureByTeamsUseCase`, even though `apps/api/src/evidence.module.ts` registers the
   correct class provider.

Consequently:

- the live upcoming catalog could not be queried;
- no real upcoming fixture was selected;
- neither `POST /api/analyze` nor `POST /api/analyze/match/:matchId` could be called;
- no real report exists to compare twice or render in Workspace;
- PVS-3's success criterion is **not satisfied**.

No fallback fixture, provider payload, Evidence, or prediction was fabricated.

---

## 2. Requested live fixture record

| Field | Result |
|---|---|
| Home team | **Not selected — live catalog unavailable** |
| Away team | **Not selected — live catalog unavailable** |
| Competition | **Not selected** |
| Kickoff | **Not selected** |
| matchId | **Not resolved** |
| Provider | Intended: API-Football; **not reached** |
| Schedule source | Intended: `football-data`; **not observed at runtime** |
| Fixture discovery | **BLOCKED** |

The task required catalog-first selection of a currently upcoming real fixture. Because live
configuration validation failed before application startup, selecting a cassette or old example
would not satisfy that requirement and was not substituted as live evidence.

---

## 3. Provider configuration used

### Live attempt

```bash
FOOTBALL_DATA_PROVIDER_MODE=live \
PROJECTION_POLICY_PIN=v2 \
ODDS_PROVIDER_MODE=recorded \
DATABASE_CLIENT_MODE=stub \
EVIDENCE_REPOSITORY_MODE=memory \
pnpm dev:api
```

Result: **failed closed** with `MISSING_API_FOOTBALL_KEY`.

### Recorded fallback attempt

```bash
PORT=3002 \
FOOTBALL_DATA_PROVIDER_MODE=recorded \
PROJECTION_POLICY_PIN=v2 \
ODDS_PROVIDER_MODE=recorded \
DATABASE_CLIENT_MODE=stub \
EVIDENCE_REPOSITORY_MODE=memory \
pnpm dev:api
```

Result: build and TypeScript watch compilation passed, then Nest startup failed on unresolved
`AnalysisController` dependency index 1.

Odds remained recorded as allowed by the sprint. Live odds were neither required nor attempted.

---

## 4. Exact prerequisites and rerun procedure

### Missing live credential

Set a valid API-Sports key without committing it:

```bash
export API_FOOTBALL_KEY="<configured-api-sports-key>"
export FOOTBALL_DATA_PROVIDER_MODE=live
export PROJECTION_POLICY_PIN=v2
export ODDS_PROVIDER_MODE=recorded
```

The repository's `scripts/dev-api.mjs` also loads these values from the ignored root `.env`.

### Production startup defect

Before the HTTP smoke can run, the Nest runtime constructor metadata for
`DiscoverFixtureByTeamsUseCase` must resolve to the registered class provider. The present
type-only import in `apps/api/src/analysis.controller.ts` prevents that. PVS-3 is validation-only,
so this report records the defect and does not modify production code.

### Exact smoke procedure after both prerequisites are resolved

```bash
pnpm dev:api
pnpm dev:web

curl -s "http://127.0.0.1:3001/api/matches/upcoming"

curl -s -X POST "http://127.0.0.1:3001/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "homeTeam": "<home team from live catalog>",
    "awayTeam": "<away team from live catalog>",
    "date": "<YYYY-MM-DD from live catalog>"
  }'
```

Run the final `POST /api/analyze` twice without changing inputs, retain both complete JSON
responses, and compare the fields listed in §9.

---

## 5. Complete pipeline status

| Stage | Live runtime status | Recorded/component evidence |
|---|---|---|
| Fixture Discovery | **BLOCKED** | Application discovery tests pass |
| Evidence Import | **NOT RUN live** | Existing analysis/component tests pass |
| Feature Extraction | **NOT RUN live** | Analysis suite passes |
| Rule Evaluation | **NOT RUN live** | Analysis suite passes |
| Football State | **NOT RUN live** | Analysis suite verifies six deterministic dimensions |
| Match Script | **NOT RUN live** | Analysis suite passes |
| Unified Probability Matrix | **NOT RUN live** | Unified-matrix tests pass |
| Projection V2 | **NOT RUN live** | Analysis suite pins active V2 artifact and passes |
| Confidence | **NOT RUN live** | Analysis tests pass |
| Explainable Report | **NOT RUN live** | Web render tests pass with a V2 report fixture |
| Production HTTP app | **FAIL** | Nest dependency-resolution error |

This is not equivalent to a production HTTP success. Component evidence is recorded only to
identify which implementation layers remain healthy below the two runtime blockers.

---

## 6. Prediction integrity audit

### Static implementation trace

The current implementation still expresses one production V2 probability chain:

```text
FeatureBundle
  → computeFootballState
  → generateMatchScriptSet
  → buildLambdasV2
  → computeMultiScriptProjection
  → merged ProbabilityMatrix
  → deriveMatrixPredictions
  → Projection / Report
```

Code audit findings:

- `computeProjectionV2` computes Football State, Match Scripts, per-script matrices and one merged
  matrix before creating the deterministic projection and framework metadata.
- `deriveMatrixPredictions` derives raw 1X2 marginals, scorelines, goal ranges, BTTS and O/U by
  aggregating cells from that one matrix.
- `computeDeterministicProjectionV2` consumes that same merged matrix for scorelines and goal
  range.
- Final displayed deterministic 1X2 is the merged matrix's 1X2 marginals followed by the existing
  pinned calibration transform (`oneXTwoBasis = "post_calibration_only"`). This is not a second
  independent probability model.
- Rules do not perform a second V2 1X2 softmax. The V2 limitation text explicitly states that
  unified-matrix 1X2 receives calibration only.
- `projectionFramework.unifiedMatrix.derived` exposes raw matrix-derived BTTS and O/U; Workspace
  displays those values and does not recompute them.

### Component validation evidence

`@fas/analysis` passed **25 files / 100 tests**, including assertions that:

- Match Script weights merge per-script matrices;
- sealed projection scorelines and goal-range values align with the unified matrix;
- BTTS and Over/Under are derived from each script matrix;
- the active V2 runtime artifact is `projection.v3.replay`;
- Football State has six deterministic dimensions and Feature provenance;
- replay is deterministic for unchanged sealed input.

### Runtime verdict

**Static/component integrity: PASS. Live production integrity: UNVALIDATED.**

No live final winner, scoreline, goal range, BTTS or O/U values exist for this sprint.

---

## 7. Explainability and provenance audit

The current contracts support the requested chain:

| Layer | Runtime provenance surface |
|---|---|
| Evidence → Feature | Feature bundle and Feature evidence references |
| Feature → Rule | Rule results reference evaluated Feature inputs |
| Feature → Football State | each Football State dimension exposes `sourceRefs`; envelope exposes `driverFeatureNames` |
| Football State → Match Script | each script exposes `footballStateRefs`, `activationReasons`, `activatingRules`, and `strengtheningFeatures` |
| Match Script → Projection | each active script exposes weight, λ values, per-script probabilities and weighted merge contribution |
| Unified Matrix → output | matrix checksum, merge algorithm, derivation policy and derivation notes |
| Production policy | `analysisProvenance.projectionPolicyPin` |
| Fixture resolution | requested/resolved teams, orientation, kickoff, competition, matchId, provider and schedule source |

The Workspace's V2 section displays per-script λ/probabilities, merge contributions, unified
matrix checksum, 1X2, scorelines, goal range, BTTS and O/U.

However, because no production report was created, PVS-3 cannot honestly explain why a particular
real home/away side was favored, why particular scripts activated, why a particular goal
environment was selected, or why confidence was high/medium/low. Those are
**UNVALIDATED live**, not inferred from test fixtures.

---

## 8. Failure-path validation

| Required case | Result |
|---|---|
| Valid real fixture | **BLOCKED** — no key, then API boot failure |
| Fixture not found | Component test **PASS** (`FIXTURE_NOT_FOUND`, no Workspace navigation); production HTTP not run |
| Ambiguous fixture | Component test **PASS** (`FIXTURE_AMBIGUOUS` with two candidates); Workspace requires explicit user selection; production HTTP not run |
| Missing live credential | **PASS fail-closed behavior** — startup rejects `MISSING_API_FOOTBALL_KEY` |
| Production dependency failure | **PASS fail-closed behavior** — no server, no report, no prediction |

The fixture resolver tests also pass exact, normalized, swapped-orientation and date-filtered
resolution. The runtime boot failure prevents claiming these through `POST /api/analyze`.

---

## 9. Determinism comparison

### Required real-fixture comparison

**NOT EXECUTED.** No live fixture report could be produced once, therefore it could not be
produced twice.

The following required real-runtime values remain unvalidated:

- resolved fixture and home/away orientation;
- Football State checksum/dimensions;
- Match Script set checksum/scripts/weights;
- unified matrix checksum;
- 1X2;
- scorelines;
- goal range;
- BTTS;
- O/U;
- confidence.

### Component evidence only

`@fas/analysis` passed all 100 tests, including deterministic replay checksum comparisons on the
same sealed context. No intentional randomness was found in the inspected Projection V2 path;
stable checksums and deterministic tie-breaking are used. This does not replace the required
twice-run live comparison, where provider changes and timestamps must also be observed.

---

## 10. Workspace rendering validation

`@fas/web` passed **10 files / 49 tests**, including:

- analyze-by-teams form rendering;
- successful submission and navigation;
- explicit loading state;
- fixture-not-found without navigation;
- ambiguous candidate rendering and explicit selection;
- projection-policy failure;
- V2 report rendering of fixture-resolution provenance, Football State, Match Scripts, unified
  matrix BTTS and O/U.

This is a component render against a deterministic V2 DTO fixture. Because the production API
did not boot, a live report could not be loaded in a browser. Therefore:

**Workspace component capability: PASS. Live Workspace rendering: UNVALIDATED.**

---

## 11. Validation commands and results

| Command | Result |
|---|---|
| Live-configured `pnpm dev:api` | **BLOCKED** — `MISSING_API_FOOTBALL_KEY` |
| Recorded-configured `pnpm dev:api` | **FAIL** — Nest unresolved `AnalysisController` dependency |
| `pnpm --filter @fas/application test -- discover-fixture-by-teams.spec.ts` | **PASS** — 3 files / 23 tests |
| `pnpm --filter @fas/analysis test` | **PASS** — 25 files / 100 tests |
| `pnpm --filter @fas/web test -- analyze-by-teams-form.spec.tsx` | **PASS** — 10 files / 49 tests |
| `pnpm --filter @fas/api test -- pvs-1-production-vertical-slice.spec.ts` | **FAIL** — Nest initialization abort / worker errors; 3 unrelated files passed and 1 skipped, but the PVS HTTP suite did not complete successfully |

The API failure is consistent between direct development startup and the Nest-based test path.

---

## 12. Required completion fields

| Field | Result |
|---|---|
| Fixture | **None — live catalog unavailable** |
| Kickoff | **None** |
| Competition | **None** |
| matchId | **None** |
| Provider | Intended API-Football; **not reached** |
| Evidence status | **UNVALIDATED live** |
| Feature status | **UNVALIDATED live**; component tests pass |
| Rule status | **UNVALIDATED live**; component tests pass |
| Football State status | **UNVALIDATED live**; deterministic component tests pass |
| Match Script status | **UNVALIDATED live**; component tests pass |
| Unified Matrix status | **UNVALIDATED live**; integrity component tests pass |
| Projection status | **UNVALIDATED live** |
| Confidence status | **UNVALIDATED live** |
| Final prediction | **None** |
| 1X2 | **None** |
| Top scorelines | **None** |
| Goal range | **None** |
| BTTS | **None** |
| O/U | **None** |
| Provenance | Contract/static audit PASS; no live values |
| Determinism result | Component PASS; required live two-run comparison NOT EXECUTED |
| Failure-path result | Credential and boot failures fail closed; resolver/UI component failures PASS |
| Workspace result | Component rendering PASS; live rendering UNVALIDATED |

---

## 13. Known limitations and stop boundary

1. A valid `API_FOOTBALL_KEY` is required to perform the live catalog and Evidence smoke.
2. The current production Nest app cannot boot until the `DiscoverFixtureByTeamsUseCase`
   constructor token is available as runtime metadata.
3. No HTTP result exists for the recorded fallback either; recorded validation is limited to
   component/integration suites below Nest startup.
4. Provider freshness, pre-match xG/injury/lineup honest absence and live catalog coverage remain
   unobserved.
5. Real provider data may change between the two determinism requests; the rerun must separate
   provider changes/timestamps from algorithmic nondeterminism.
6. PVS-3 remains **BLOCKED**, not partially successful.

Stop here after documentation updates. Do not start calibration or tuning work.

---

## 14. Governance confirmation

- Production artifact remains **`projection.v3.replay`**.
- Production `projectionPolicyPin` remains **`v2`**.
- No V1 fallback was observed or used; the runtime failed before analysis.
- No calibration candidate was promoted.
- No P2K-CAL-3 work was performed.
- No λ, base rate, group factor, Dixon–Coles ρ, Candidate 1, Candidate 2, Evaluation,
  Calibration, Unified Probability Matrix contract, Feature semantics, Rule semantics or sealed
  Evaluation History was changed.
- No production code was changed.

