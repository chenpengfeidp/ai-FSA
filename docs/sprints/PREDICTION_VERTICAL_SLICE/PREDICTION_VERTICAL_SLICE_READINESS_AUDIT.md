# Prediction Vertical Slice — Readiness Audit

**Sprint id:** PREDICTION_VERTICAL_SLICE_READINESS_AUDIT  
**Roadmap citation:** `docs/40_PRODUCT_ROADMAP.md` (product development phase; no new architecture)  
**Architecture Freeze:** v0.3  
**Audit date:** 2026-08-20  
**Method:** Code-path trace only (not documentation inference)  
**Production changes:** None  

---

## Executive verdict

| Question | Answer |
|----------|--------|
| Can the system analyze a real match given **Home Team + Away Team + Fixture/Match ID**? | **PARTIAL** |
| Can the system analyze a known **`matchId`** through import → report? | **YES** (recorded cassettes; live with credentials) |
| Does the **production API** execute the full **Projection V2** stack (Football State → Match Script → Unified Matrix)? | **NO** — API composition root pins **`projectionPolicyPin = "v1"`** |
| Is **team-name fixture resolution** implemented? | **NO** |

**Smallest blocking gap:** Production API does not pass `projectionPolicyPin: "v2"` in `apps/api/src/evidence.module.ts`, so Football State, Match Script, and Unified Probability Matrix are computed only in validation/replay paths — not in `POST /api/analyze/match/:matchId`.

**Second blocking gap:** No use-case resolves `(homeTeam, awayTeam[, date])` → `matchId`. User must discover `matchId` from `GET /api/matches/upcoming` or know a cassette id.

---

## A. Current runtime pipeline diagram

### A.1 What production API actually runs today (default)

```text
POST /api/analyze/match/:matchId
  OR POST /api/v1/match-analysis { matchId }
        │
        ├─ ScoresSnapshotPrimerBridge.ensureScores()
        ├─ UpcomingMatchesBoardBridge.listUpcoming()   // primes odds:* shells
        ├─ FootballMatchPrimerBridge.ensureMatch()     // live football:* only
        ├─ OddsSnapshotPrimerBridge.ensurePreMatch1x2()
        │
        └─ GenerateMatchReportUseCase.execute(matchId)
              └─ AnalyzeMatchUseCase.execute()          // projectionPolicyPin defaults "v1"
                    ├─ ImportMatchUseCase
                    │     └─ CompositeFootballFirstLookup.getMatch(matchId)
                    │           → normalizeFixtureEvidenceSet → EvidenceImportPipeline
                    ├─ EvidenceQueryService.findByMatch()
                    ├─ FeatureExtractor.extractBundle()   // feature.v2.m1b.manager
                    ├─ RuleEvaluator.evaluate()           // rule.mvp.m1b.manager (87 rules)
                    ├─ computeMatchProjection(pin="v1")
                    │     └─ computeDeterministicMatchProjection()
                    │           foundation λ + independent Poisson
                    │           + rule-channel softmax 1X2 adjust
                    │           + population calibration artifact
                    ├─ buildScenarioSet()
                    ├─ computeIntelligenceConfidence()
                    └─ createAnalysisResult()
                          (footballState UNDEFINED, projectionFramework UNDEFINED)
              └─ ReportBuilder.build()
                    └─ buildMvpIntelligenceNarrative()  // local deterministic, not LLM
```

**Code anchors:**  
`apps/api/src/analysis.controller.ts` → `packages/report/src/use-case/generate-match-report-use-case.ts` → `packages/analysis/src/use-case/analyze-match-use-case.ts` → `packages/analysis/src/projection/compute-match-projection.ts` (pin branch) → `packages/analysis/src/projection/compute-deterministic-projection.ts`

**API wiring:** `apps/api/src/evidence.module.ts` constructs `AnalyzeMatchUseCase` **without** `projectionPolicyPin` → `DEFAULT_PROJECTION_POLICY_PIN = "v1"` (`packages/analysis/src/projection-v2/resolve-projection-policy.ts`).

### A.2 Implemented but NOT production-default (V2 path)

```text
computeMatchProjection(pin="v2")
  └─ computeProjectionV2()
        ├─ computeFootballState()              // 6 dimensions
        ├─ generateMatchScriptSet()            // Baseline A catalog (6 scripts)
        ├─ buildLambdasV2()                    // feature-group λ
        ├─ computeMultiScriptProjection()      // per-script matrix → merge
        │     └─ optional Dixon–Coles (candidate artifact only)
        └─ computeDeterministicProjectionV2()
              unified matrix → 1X2 / scorelines / goal range
              oneXTwoBasis: post_calibration_only (rules do NOT move 1X2)
```

**Used in:** P2K validation bootstraps (`packages/report/src/validation/bootstrap-*-validation-history-sidecar.ts`), offline replay (`packages/analysis/src/replay/*`), tests — **not** in API module factory.

### A.3 Target UX pipeline (user expectation) vs gap

| Expected stage | Production API today |
|----------------|---------------------|
| Fixture Resolution by team names | **Missing** — matchId required |
| Provider → Evidence | **Ready** (recorded default; live optional) |
| Feature / Rule | **Ready** |
| Football State | **Not wired** (V2 only) |
| Match Script | **Not wired** (V2 only) |
| Projection V2 + Unified Matrix | **Not wired** (V2 only) |
| BTTS / O-U in report | **Not exposed** (computed internally in V2 matrix; not in `DeterministicMatchProjection` / API DTO) |
| Explainable Report | **Partial** (rules + scenarios; no Football State / Match Script sections on V1 path) |

---

## B. Stage-by-stage readiness table

| # | Stage | Status | Primary code path | Notes |
|---|--------|--------|-------------------|-------|
| 1 | Fixture resolution (matchId) | **READY** | `CompositeFootballFirstLookup.getMatch` | Requires known provider id |
| 1b | Fixture resolution (home + away names) | **NOT IMPLEMENTED** | — | No search/lookup endpoint |
| 2 | Provider → Evidence import | **READY** | `ImportMatchUseCase` + `normalizeFixtureEvidenceSet` | Idempotent persist |
| 2b | Live provider fetch | **PARTIAL** | `LiveApiSportsMatchCatalog.ensureMatchBundle` | Needs `API_FOOTBALL_KEY`; pre-match gaps for lineup/injury/xG |
| 3 | Evidence normalization | **READY** | `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts` | |
| 4 | Feature extraction | **READY** | `FeatureExtractor.extractBundle` | Pin: `feature.v2.m1b.manager` |
| 5 | Rule evaluation | **READY** | `RuleEvaluator.evaluate` | Pin: `rule.mvp.m1b.manager` |
| 6 | Football State | **PARTIAL** | `computeFootballState` | Implemented; **not invoked** on API V1 pin |
| 7 | Match Script | **PARTIAL** | `generateMatchScriptSet` | Implemented; **not invoked** on API V1 pin |
| 8 | Projection V2 λ | **PARTIAL** | `buildLambdasV2` | V2 pin only |
| 9 | Unified Probability Matrix | **PARTIAL** | `computeMultiScriptProjection` + merge | V2 pin only |
| 10 | 1X2 / scorelines / goal range | **READY** (V1) / **PARTIAL** (V2 semantics) | V1: Poisson + rule softmax; V2: matrix-derived | API uses V1 |
| 11 | BTTS / O-U in user report | **NOT IMPLEMENTED** | `deriveMatrixPredictions` | Matrix computes; not surfaced in `AnalysisReport.deterministic` |
| 12 | Calibration (1X2) | **READY** | `applyCalibration` + pinned artifact | Default `population_demo_v1` in API tests |
| 13 | Confidence | **READY** | `computeIntelligenceConfidence` | Separate from projection confidence on V2 |
| 14 | Report + narrative | **READY** | `ReportBuilder` + `buildMvpIntelligenceNarrative` | Local deterministic; LLM adapter injected but unused |
| 15 | Workspace explainability (Football State / Scripts) | **PARTIAL** | `apps/web/src/components/explainable-report/*` | UI copy: requires V2 pin (`zh.ts` lines 290–295) |

---

## C. Real vs recorded vs mock coverage (by stage)

| Stage | LIVE PROVIDER | RECORDED CASSETTE | MOCK / FIXTURE | DERIVED | MISSING |
|-------|---------------|-------------------|----------------|---------|---------|
| Schedule / matchId discovery | `LiveApiSportsMatchCatalog.listUpcoming` | `RecordedFootballCatalog.listUpcoming` | `FixtureProvider.listMatchSummaries` | — | Team-name search |
| Match bundle fetch | API-Sports HTTP | `match-bundles-*.json` | `FixtureProvider` static map | — | — |
| Club Intelligence | `/standings` | cassette standings | — | `mapClubIntelligenceFromStandings` | — |
| Player Intelligence | `/players/squads` + stats | cassette | — | availability cross-ref | — |
| Manager Intelligence | `/coachs` | cassette | — | — | — |
| Injury / Suspension | `/injuries?fixture=` | cassette | — | — | Often absent live pre-match |
| Lineup | `/fixtures/lineups` | cassette (confirmed) | — | — | Often absent live pre-match |
| Advanced Statistics | season + fixture stats | cassette | goals-proxy via `@fas/provider-odds` | `stats-from-form` fallback | Fixture advanced often empty live |
| Expected Goals | fixture statistics xG | cassette multi-window | — | — | Usually missing live pre-match |
| Match Context | schedule-derived | cassette | — | rest/travel derivation | — |
| Venue | fixture payload | cassette | fixture MATCH_INFO | — | — |
| Odds | The Odds API | `@fas/provider-odds` cassettes | fixture static odds | overlay on `match-example*` | **Not wired to `football:*` ids** |
| Football State | — | — | — | from Features | Not on API V1 |
| Match Script | — | — | — | from Football State | Not on API V1 |
| Projection V2 | — | — | — | — | API uses V1 pin |

**Default env:** `FOOTBALL_DATA_PROVIDER_MODE=recorded`, `ODDS_PROVIDER_MODE=recorded` (`@fas/config`, documented in `docs/PROJECT_STATE.md`).

---

## 1. Fixture resolution (detailed)

| Capability | Status | Evidence |
|------------|--------|----------|
| Accept Home Team + Away Team as analyze input | **NOT IMPLEMENTED** | Controllers accept `matchId` only |
| Resolve teams → fixture | **NOT IMPLEMENTED** | No lookup use-case |
| Obtain real fixture/match id | **PARTIAL** | User picks from `GET /api/matches/upcoming` or uses known id |
| API for fixture lookup | **PARTIAL** | `GET /api/matches/upcoming` lists rows with `matchId`, `homeTeam`, `awayTeam`, `kickoff` |
| Date/season/league required? | **Optional filters** | `listUpcoming({ fromDate, toDate })` on catalog; league scoped via `FOOTBALL_DATA_LEAGUE_IDS` in live mode |
| Minimum real input | **`matchId` string** | e.g. `football:100001`, `football:244001`, `match-example`, `odds:evt_*` |

**Wiring:** `apps/api/src/match-provider.factory.ts`, `apps/api/src/upcoming-matches.factory.ts`, `packages/provider-football/src/composite/football-match-provider.ts`, `packages/provider-odds/src/composite/enriched-match-provider.ts`.

**Rosenborg vs Fredrikstad (user example):** No recorded cassette contains Eliteserien clubs. Eliteserien (`103`) is in `packages/provider-football/src/catalog/default-league-ids.ts` for **live** mode only. Analysis would require: live credentials → upcoming board → copy `matchId` → analyze. **Cannot** start from team names alone today.

---

## 2. Provider → Evidence (domain matrix)

| Domain | Provider | Normalizer | EvidenceType | football:100001 | football:244001 | match-example | Live pre-match |
|--------|----------|------------|--------------|-----------------|-----------------|---------------|----------------|
| Club Intelligence | `@fas/provider-football` | `parseClubIntelligence` | `CLUB_INTELLIGENCE` | Yes (2) | Yes | No | From standings |
| Player Intelligence | `@fas/provider-football` | `parsePlayers` | `PLAYER` | Yes (≥4) | Partial | No | Capped squad |
| Manager Intelligence | `@fas/provider-football` | `parseManagerIntelligence` | `MANAGER_INTELLIGENCE` | Yes (2) | — | No | `/coachs` |
| Injury | `@fas/provider-football` | `parseAvailabilityAbsences` | `INJURY` | Yes (1) | — | No | Often missing |
| Suspension | same | same | `SUSPENSION` | Yes (1) | — | No | Often missing |
| Lineup | `@fas/provider-football` | `parseConfirmedLineups` | `LINEUP` | Yes (2) | — | No | Often missing |
| Advanced Statistics | `@fas/provider-football` | `parseStatistics` | `STATISTICS` | Yes + advanced | Yes | Yes (fixture) | Season yes; fixture advanced often empty |
| Expected Goals | `@fas/provider-football` | `parseExpectedGoals` | `EXPECTED_GOALS` | Yes (multi) | — | No | Usually missing |
| Match Context | `@fas/provider-football` | `parseMatchContext` | `MATCH_CONTEXT` | Yes (2) | — | No | Schedule-derived |
| Venue | fixture mapper | `parseVenue` | `VENUE` | Yes | Yes | Via MATCH_INFO | Yes |
| Odds / Market | `@fas/provider-odds` | `parseOdds` | `ODDS` | **No** | **No** | Yes (+ AH/O/U) | Mapped ids only |
| TEAM_FORM / H2H | football / odds | parsers | `TEAM_FORM`, `HEAD_TO_HEAD` | Yes | Yes | Yes | Yes / proxy |

**Runtime entry:** `ImportMatchUseCase.execute` → `apps/api/src/import.controller.ts` (`POST /api/import/match/:matchId`).

**Catalog authority:** `docs/50_EVIDENCE_CATALOG.md`.

---

## 3. Evidence → Feature

**Extractor:** `packages/feature/src/extraction/feature-extractor.ts` — `FeatureExtractor.extractBundle()`  
**Model pin:** `feature.v2.m1b.manager` (`packages/feature/src/domain/feature-bundle.ts`)

| Feature family | Source Evidence | Used by Projection (V2 λ weights) | Used by Projection (V1 path) |
|----------------|-----------------|-----------------------------------|------------------------------|
| Core match | `MATCH_INFO` | indirect (ratings) | foundation ratings |
| Form / momentum / ratings | `TEAM_FORM`, `STATISTICS` | Yes (many weights) | foundation + rule channels |
| xG quality | `EXPECTED_GOALS` | Yes (`xg` group) | via rules + enriched ratings |
| Match context | `MATCH_CONTEXT` | Yes | via rules |
| Club strength | `CLUB_INTELLIGENCE` | Yes | via rules |
| Player availability / attack | `PLAYER`, `INJURY`, `SUSPENSION` | Yes | via rules + availability features |
| Manager pressure/risk | `MANAGER_INTELLIGENCE` | Yes (Football State pressure/risk features) | via rules (M1B edges) |
| Market intelligence | `ODDS` | **No λ weights** | **No λ**; rules `channel: none` |
| Venue | `VENUE` | Yes (`venueAdvantage`) | via rules |
| H2H | `HEAD_TO_HEAD` | indirect | rule channel only |

**Evidence imported but weak / non-λ prediction use:**

- **`LINEUP`:** Normalized and stored; enriches PLAYER payloads; no dedicated lineup Feature family in extractor grep — primarily provenance / player squad context.
- **`ODDS` / market Features:** Extracted (`extractMarketIntelligenceFeatures`) and displayed; **market rules are findings-only** (`channel: "none"`); **not** in `FEATURE_ENRICHED_LAMBDA_FEATURE_WEIGHTS`.
- **Referee / weather:** Not active product surfaces.

---

## 4. Feature → Rule

**Evaluator:** `packages/rule/src/evaluation/rule-evaluator.ts` — static catalog, `rule.mvp.m1b.manager`.

| Rule family | Affects Football State? | Affects V1 Projection 1X2? | Affects V2 Projection 1X2? | Role |
|-------------|-------------------------|------------------------------|----------------------------|------|
| Presence / absence honesty | No | No | No | Gating / explainability |
| Football comparative edges (`home+` / `away+`) | No (State from Features) | **Yes** (softmax) | **No** (`post_calibration_only`) | V1 signal; V2 explainability |
| Market findings (`MARKET_*`, steam, sharp) | No | No | No | Explainability + confidence conflict |
| Manager / Player / Club edges | No | Yes (V1) | No (V2) | Same pattern |

Rules **do not** activate Match Scripts (explicit in `match-script-generator.ts` limitations).

---

## 5. Football State

**Implementation:** `packages/analysis/src/projection-v2/football-state/compute-football-state.ts`

| Dimension | Feature inputs (sample) | Thresholds | Consumer |
|-----------|-------------------------|------------|----------|
| attackState | attack ratings, xG attack, form, player attack | `lowThreshold` 0.34 / `mediumThreshold` 0.67 | Match Script scoring |
| defenseState | defense ratings, xG defense, discipline | same | Match Script |
| controlState | possession, chance creation, club strength | same | Match Script |
| transitionState | finishing efficiency, form splits, xG dominance | same | Match Script |
| pressureState | fatigue, rotation, manager tenure/stability | same | Match Script |
| riskState | availability penalties, discipline, manager change risk | same | Match Script |

**Affects Match Script / Projection:** Yes **when V2 pin active** — `generateMatchScriptSet({ footballState })` → script weights → λ modifiers → merged matrix.

**Production API:** **BLOCKED** — V1 pin skips `computeFootballState` entirely.

---

## 6. Match Script

**Generator:** `packages/analysis/src/projection-v2/match-script/match-script-generator.ts`  
**Production tables:** `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` = Baseline A (`packages/analysis/src/projection-v2/match-script/match-script-governed-parameters.ts`)

| scriptId | Activation | λ modifiers (home/away/drawBias) | Downstream |
|----------|------------|-----------------------------------|------------|
| `home_control` | control + attack dimensions | 1.08 / 0.92 / 0 | per-script Poisson matrix |
| `away_control` | control + attack (away) | 0.92 / 1.08 / 0 | same |
| `counter_attack` | transition + risk tags | catalog entry | same |
| `open_match` | high attack + open tags | catalog entry | same |
| `low_event` | low attack / low control | catalog entry | same |
| `balanced` | fallback if too few scripts | 1 / 1 / 0 | same |

Merged via `mergeProbabilityMatrices` → optional Dixon–Coles **only on calibration candidate artifact**, not production default.

**Not merely metadata:** Scripts change λ and matrix weights on V2 path (validated in P2K-G3 audit).

**Production API:** **NOT IMPLEMENTED** (V1 pin).

---

## 7. Projection V2 (production runtime truth)

| Check | Production API | V2 code (replay/tests) |
|-------|----------------|------------------------|
| Active parameter artifact | N/A (V1 path) | `projection.v3.replay` (`MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT`) |
| Candidate isolation | N/A | `projection.v3.calibration.candidate1` NON-DEFAULT |
| Football State → Script → λ → matrix | **No** | **Yes** |
| Unified matrix → 1X2 / scorelines / goal range | V1 Poisson + rule adjust | Matrix-derived |
| Calibration | `population_demo_v1` (API config) | Same pin available |
| Confidence | `computeIntelligenceConfidence` | Same |

**Critical file:** `apps/api/src/evidence.module.ts` lines 186–198 — no fifth constructor arg for `projectionPolicyPin`.

---

## 8. Explainability

| Explanation | Real today? | Source |
|-------------|-------------|--------|
| Why Home/Away favored | **Partial** | V1: rule-softmax + narrative cites PASS rules; not Football State |
| Why Draw high/low | **Partial** | Poisson mass only; no Dixon–Coles on production path |
| Most likely scoreline | **Yes** | `scenarios.mostLikely` + `deterministic.topScorelines` |
| Goal range | **Yes** | `deterministic.goalRange` (in full report JSON) |
| Domain contribution | **Partial** | Features + rules listed; O1 contribution is **population** overlay |
| Evidence provenance | **Yes** | Workspace Evidence sections; sealed evidence refs |
| Football State provenance | **No on API** | Requires V2 pin |
| Match Script provenance | **No on API** | Requires V2 pin |
| Projection parameter provenance | **Partial** | `GET /api/projection-parameters` catalog; per-match framework only on V2 |
| Confidence provenance | **Yes** | `intelligenceConfidence` components A/C/S/X |

**Narrative:** `packages/report/src/narrative/mvp/build-mvp-narrative.ts` — deterministic sections; `LocalDeterministicNarrativeAdapter` **not called** (`ReportBuilder` voids injected adapter).

---

## 9. API / user entry point

| Endpoint | Method | Input | Full pipeline? | Provider mode |
|----------|--------|-------|----------------|---------------|
| `/api/analyze/match/:matchId` | POST | path `matchId` | Import → Feature → Rule → **V1** Projection → Report | recorded default |
| `/api/v1/match-analysis` | POST | body `{ matchId }` | Same | same |
| `/api/import/match/:matchId` | POST | path `matchId` | Import only | same |
| `/api/matches/upcoming` | GET | optional date query | Discovery only | recorded + fixture seeds |
| `/api/evidence/match/:matchId` | GET | path | Query stored evidence | — |

**Workspace:** Uses same API client (`apps/web/src/services/api.ts` → `analyzeMatch(matchId)`); does not recompute projection.

**Do not add a duplicate endpoint** — existing analyze endpoints suffice once V2 pin + fixture discovery gaps are closed.

---

## E. Minimum input contract

```text
Required:
  matchId  — provider-scoped string (e.g. football:100001)

Recommended operational sequence:
  1. GET /api/matches/upcoming  → pick row.matchId
  2. POST /api/analyze/match/{matchId}

Optional environment (live):
  FOOTBALL_DATA_PROVIDER_MODE=live
  API_FOOTBALL_KEY=...
  FOOTBALL_DATA_LEAGUE_IDS=103,...   # Eliteserien included in defaults
  ODDS_PROVIDER_MODE=live
  THE_ODDS_API_KEY=...
```

---

## F. Exact blocking gap(s)

1. **API Projection V1 pin** — Full P2A–P2G stack exists but is not selected in `evidence.module.ts`. Web UI explicitly documents Football State / Match Script as unavailable without V2 pin (`apps/web/src/copy/zh.ts`).

2. **No team-name fixture resolver** — Cannot start from "Rosenborg vs Fredrikstad" without manual upcoming-board lookup.

3. **BTTS / O-U not in match report contract** — Unified matrix derives them (`deriveMatrixPredictions`); `DeterministicMatchProjection` and `AnalysisReportDto` do not expose them to clients.

4. **Rosenborg / Eliteserien not in recorded cassettes** — Default `recorded` mode cannot analyze that fixture without live fetch + known id.

5. **Odds not attached to `football:*` ids** — Market layer only overlays fixture/odds-catalog ids (`match-example*`), not football-data ids.

---

## G. Smallest implementation to complete the vertical slice

**Preserve:** Architecture Freeze v0.3, existing Feature/Rule contracts, Projection V2 implementation, evaluation/calibration boundaries, Candidate 1 NON-DEFAULT, no P2K-CAL-3 tuning.

| Step | Scope | Files (indicative) | Acceptance |
|------|-------|-------------------|------------|
| **G1** | Wire **production API** to `projectionPolicyPin: "v2"` | `apps/api/src/evidence.module.ts`, optional `@fas/config` env pin | `football:100001` analyze returns `footballState` + `projectionFramework` in report; production artifact unchanged (`projection.v3.replay`) |
| **G2** | Thin **fixture resolver**: `(homeTeam, awayTeam, kickoff?)` → `matchId` from upcoming catalog | New application use-case + `GET` or query on existing upcoming endpoint | Mariehamn vs Lahti resolves to `football:244001` |
| **G3** | Expose **goal range + top scorelines + BTTS/O-U** from V2 matrix in report DTO | `DeterministicMatchProjection` or extension + DTO | Workspace shows matrix-derived BTTS/O-U without recomputation |
| **G4** (optional) | Map **odds overlay** to football ids for market Evidence | `match-provider.factory.ts` / odds catalog | `football:100001` can carry ODDS when cassette mapped |

**Explicitly out of scope for this slice:** P2K-CAL-3, Candidate 1 promotion, new Provider, new Engine, ML/LLM prediction.

---

## H. Example recorded fixture path (validated)

**Test evidence:** `apps/api/test/import-evidence-workflow.spec.ts`

| matchId | Teams | Evidence richness | Analyze test |
|---------|-------|-------------------|--------------|
| `football:100001` | FC Seoul vs Ulsan Hyundai | Full intelligence (14+ types); no ODDS | `"analyzes a recorded football-data match with shots-based statistics"` |
| `football:244001` | IFK Mariehamn vs FC Lahti | Veikkausliiga cassette | Listed in `RecordedFootballCatalog` tests |
| `match-example` | Liverpool vs Chelsea (demo) | Core + H2H + ODDS overlay | Full demo battery |

**Commands (local):**

```bash
pnpm --filter @fas/api test -- apps/api/test/import-evidence-workflow.spec.ts
# POST /api/analyze/match/football:100001 → 200 + report.matchId
```

**Trace:** Import → 30+ Evidence records → 80+ Features → 87 Rules → V1 Projection today → Report with narrative.

---

## I. Can a real match be analyzed today?

**Answer: PARTIAL**

| Scenario | Verdict |
|----------|---------|
| Known cassette `matchId` in recorded mode | **YES** — complete analyze/report |
| Live Eliteserien fixture with API key + discovered `matchId` | **PARTIAL** — fetch/import likely; lineup/injury/xG may be honestly absent pre-match |
| Home + Away team names only (Rosenborg vs Fredrikstad) | **NO** — no resolver |
| Full Projection V2 UX (State, Scripts, unified matrix explainability) | **NO** on API — code exists under V2 pin only |

---

## J. Recommended next coding sprint

**Sprint: PVS-1 — Production Projection V2 API Pin & Fixture Discovery**

(not P2K-CAL-3; not another architecture review)

1. Pass `projectionPolicyPin: "v2"` from API composition root (config-governed, default `v2` for analyze).
2. Add fixture discovery helper: resolve upcoming row by normalized home/away names (+ optional kickoff date).
3. Extend report contract with unified-matrix BTTS/O-U fields (read-only pass-through).
4. Acceptance: `POST /api/analyze/match/football:100001` returns Football State + Match Script metadata; `football:244001` end-to-end; API tests updated; **no** parameter artifact or calibration changes.

---

## References (code)

| Area | Path |
|------|------|
| Analyze use-case | `packages/analysis/src/use-case/analyze-match-use-case.ts` |
| Projection pin | `packages/analysis/src/projection-v2/resolve-projection-policy.ts` |
| API wiring | `apps/api/src/evidence.module.ts` |
| Import | `packages/application/src/import-match-use-case.ts` |
| Features | `packages/feature/src/extraction/feature-extractor.ts` |
| Rules | `packages/rule/src/evaluation/rule-evaluator.ts` |
| Football State | `packages/analysis/src/projection-v2/football-state/compute-football-state.ts` |
| Match Script | `packages/analysis/src/projection-v2/match-script/match-script-generator.ts` |
| Projection V2 | `packages/analysis/src/projection-v2/compute-projection-v2.ts` |
| Report | `packages/report/src/builder/report-builder.ts` |
| Recorded catalog | `packages/provider-football/src/recorded/recorded-football-catalog.ts` |
