# PVS-3.2 — Live Production Prediction Vertical Slice Validation Completion Report

**Sprint id:** PVS-3.2  
**Roadmap:** `docs/40_PRODUCT_ROADMAP.md` (v0.2 baseline vertical-slice product phase; PVS-3.2 is an explicitly authorized validation follow-up, not a separately named doc-40 sprint)  
**Architecture Freeze:** v0.3  
**Validation date:** 2026-08-27  
**Result:** **LIVE_VALIDATION_BLOCKED_MISSING_CREDENTIAL**  
**Production changes:** None  
**Model promotion:** None

---

## 1. Executive verdict

PVS-3.2 does **not** claim successful live provider validation.

`API_FOOTBALL_KEY` was absent from the process environment and no repository `.env` was
available. Starting the production API with `FOOTBALL_DATA_PROVIDER_MODE=live` therefore failed
closed during configuration validation:

```text
ConfigurationValidationError: Invalid environment configuration: API_FOOTBALL_KEY.
variable: API_FOOTBALL_KEY
code: MISSING_API_FOOTBALL_KEY
message: API_FOOTBALL_KEY is required when FOOTBALL_DATA_PROVIDER_MODE is live.
```

Consequently, no live catalog request reached API-Football, no current live fixture was selected,
and no live Evidence or report was generated. The acceptance criterion requires all of those
conditions, so the only accurate verdict is:

**LIVE_VALIDATION_BLOCKED_MISSING_CREDENTIAL**

The maximum available recorded HTTP, Evidence, Projection V2, report, Workspace, and regression
validation passed. Recorded evidence is reported separately and is not presented as live proof.

---

## 2. Goal, inputs, outputs, and acceptance

### Goal

Validate one dynamically discovered, currently upcoming fixture through:

```text
Live Match Center catalog
  → POST /api/analyze
  → live Evidence
  → Features
  → Rules
  → Football State
  → Match Scripts
  → Unified Probability Matrix
  → Projection V2
  → Explainable Report
  → Workspace
```

### Inputs

- Production runtime fixed by PVS-3.1
- `FOOTBALL_DATA_PROVIDER_MODE=live`
- `PROJECTION_POLICY_PIN=v2`
- `ODDS_PROVIDER_MODE=recorded`
- Required credential: `API_FOOTBALL_KEY`

### Outputs produced

- Current missing-credential fail-closed evidence
- Maximum recorded production HTTP smoke
- Recorded provider/Evidence provenance inventory
- Recorded V2 output snapshot
- Workspace and regression validation evidence
- This completion report

### Acceptance result

**FAIL / BLOCKED.** No real upcoming fixture completed live discovery → live Evidence → V2 report.

---

## 3. Credential and startup evidence

Credential presence was checked without printing or persisting a secret:

```text
.env not found. Continuing without it.
API_FOOTBALL_KEY_MISSING
```

Live startup attempt:

```bash
PORT=3003 \
FOOTBALL_DATA_PROVIDER_MODE=live \
PROJECTION_POLICY_PIN=v2 \
ODDS_PROVIDER_MODE=recorded \
DATABASE_CLIENT_MODE=stub \
EVIDENCE_REPOSITORY_MODE=memory \
pnpm dev:api
```

Build and watch compilation succeeded. Application composition then rejected
`MISSING_API_FOOTBALL_KEY`. No HTTP listener became available on port 3003.

The PVS-3.1 Nest dependency-metadata blocker did not recur; this run stopped earlier at the
required live-provider configuration gate.

---

## 4. Live fixture and pipeline status

| Requirement | Classification | Result |
|---|---|---|
| Current live fixture catalog | **MISSING** | Not queried; credential gate rejected startup |
| Dynamic upcoming fixture selection | **MISSING** | No live rows available |
| Live fixture resolution | **MISSING** | `POST /api/analyze` not reachable in live mode |
| Live provider Evidence retrieval | **MISSING** | No API-Football request executed |
| Live Evidence provenance | **MISSING** | No live Evidence exists |
| Features from live Evidence | **MISSING** | Not executed |
| Rules from live Features | **MISSING** | Not executed |
| Football State | **MISSING** | Not executed live |
| Match Scripts | **MISSING** | Not executed live |
| Unified Probability Matrix | **MISSING** | Not executed live |
| Projection V2 | **MISSING** | Not executed live |
| Explainable Report | **MISSING** | Not generated live |
| Workspace rendering | **MISSING** | No live report to render |
| Recorded substitution | **FALLBACK: NO** | Startup failed; no cassette silently substituted |

No Rosenborg/Fredrikstad or other fixture was hard-coded. No past recorded fixture was relabeled
as a current live fixture.

---

## 5. Live provider provenance report

Because the live provider was not reached, every requested live evidence domain has the same
honest status:

| Field | Live result |
|---|---|
| Provider | Intended: API-Football / API-Sports |
| Provider mode | `live` requested |
| Retrieval status | **MISSING — not attempted after configuration rejection** |
| Fixture/match id | **MISSING** |
| Timestamp | **MISSING** |
| Evidence type | **MISSING** |
| Source/provenance | **MISSING** |
| Recorded fallback | **No** |

This means the sprint cannot assess live plan coverage for form, statistics, xG, players,
lineups, injuries, managers, standings, H2H, context, or venue. Absence here is a credential/runtime
precondition failure, not provider evidence-level honest degradation.

---

## 6. Maximum recorded validation

The already running, recorded production Nest application was used only as a fallback validation
baseline:

```text
footballDataProviderMode = recorded
oddsProviderMode = recorded
scheduleSource = football-data
usedRecordedFallback = false
fixtureCount = 10
```

Recorded target:

| Field | Recorded value |
|---|---|
| matchId | `football:100001` |
| Home | FC Seoul |
| Away | Ulsan Hyundai FC |
| Competition | K League 1 |
| Kickoff | `2026-07-19T10:30:00+00:00` |
| Provider source | `api-football` |
| Provider method | `recorded-snapshot` |

This cassette kickoff is in the past relative to PVS-3.2 and therefore does **not** satisfy the
current-upcoming-live acceptance criterion.

Recorded `POST /api/analyze` succeeded through the production HTTP endpoint and resolved the
expected home/away orientation with `homeAwaySwapped=false`.

---

## 7. Recorded Evidence provenance

`GET /api/evidence/match/football:100001` returned 35 Evidence records across 13 types.

All records consistently reported:

- classification: **RECORDED**
- `providerId`: `football:api-sports`
- `source`: `api-football`
- provider method: `recorded-snapshot`
- matchId: `football:100001`
- timestamp: `2026-07-17T10:00:00Z`
- recorded fallback: **No** (`usedRecordedFallback=false`)

| Evidence type | Count | Status |
|---|---:|---|
| `MATCH_INFO` | 1 | **RECORDED** |
| `TEAM_FORM` | 2 | **RECORDED** |
| `STATISTICS` | 2 | **RECORDED** |
| `EXPECTED_GOALS` | 14 | **RECORDED** |
| `HEAD_TO_HEAD` | 1 | **RECORDED** |
| `VENUE` | 1 | **RECORDED** |
| `PLAYER` | 4 | **RECORDED** |
| `LINEUP` | 2 | **RECORDED** |
| `INJURY` | 1 | **RECORDED** |
| `SUSPENSION` | 1 | **RECORDED** |
| `CLUB_INTELLIGENCE` | 2 | **RECORDED** |
| `MANAGER_INTELLIGENCE` | 2 | **RECORDED** |
| `MATCH_CONTEXT` | 2 | **RECORDED** |
| `ODDS` | 0 | **MISSING** for `football:*` id; no silent odds substitution |

The recorded configuration is explicit in endpoint metadata and every Evidence provenance method.
It cannot be mistaken for live retrieval.

---

## 8. Recorded end-to-end V2 output snapshot

### Provenance and framework

- `matchId`: `football:100001`
- `analysisProvenance.projectionPolicyPin`: **`v2`**
- fixture schedule source: `football-data`
- fixture provider source: `api-football`
- framework: `projectionFramework.v2.unifiedMatrix`
- parameter version: **`projection.v3.replay`**
- `deterministic.scorelinesBasis`: **`match_script_merged_v2`**
- Football State: 6 dimensions, checksum `d59ef38a`
- Unified Matrix checksum: `a0682a06`

### Active Match Scripts

| Script | Weight |
|---|---:|
| `home_control` | 0.149673560762 |
| `away_control` | 0.200853203034 |
| `counter_attack` | 0.189379090998 |
| `open_match` | 0.111535063683 |
| `low_event` | 0.108941343264 |
| `balanced` | 0.239617738260 |

### Unified Matrix-derived outputs

- raw matrix 1X2: home `0.967682897181`, draw `0.026482038696`, away `0.005835064123`
- most likely scoreline: 4–0 (`0.16632895339898174`)
- goal range: 0–1 `0.049231308484`, 2–3 `0.273759686979`, 4+
  `0.677009004537`
- BTTS: yes `0.270619246924`, no `0.729380753076`
- O/U 2.5: over `0.848261460367`, under `0.151738539633`

### Sealed deterministic report output

- post-calibration 1X2: home `0.960526468953`, draw `0.031235294685`, away
  `0.008238236362`
- top scorelines: 4–0 `0.166328953399`; 5–0 `0.157817664233`; 3–0
  `0.140724109744`
- confidence: `0.672735042007`
- recommendation: `cautious`

The report uses the V2 unified-matrix path. No V1 fallback was observed. This remains recorded
evidence only.

---

## 9. Failure and degradation analysis

1. **Credential gate:** Correctly fails closed before provider construction can produce an
   unauthenticated or misleading live result.
2. **No silent recorded schedule fallback:** No live server started, so no recorded fixture could
   appear under a live runtime claim.
3. **No fabricated fixture:** No fixture was selected when the live catalog was unavailable.
4. **No fabricated Evidence:** No live Evidence record was created.
5. **Evidence-domain degradation:** Not assessable live because fixture retrieval was never
   reached. Missing optional provider domains must be assessed only after credentialed execution.
6. **Recorded ODDS absence:** The football id carries no ODDS Evidence; the analysis does not
   invent or silently attach market data.

---

## 10. Workspace validation

**Live Workspace:** **UNVALIDATED** — no live report exists.

**Recorded/component capability:** **PASS** — the Web suite passed 10 files / 49 tests, covering:

- analyze-by-teams submission and navigation;
- report cache seeding;
- fixture resolution provenance;
- Football State and Match Script rendering;
- Unified Matrix scoreline, goal range, BTTS, and O/U rendering;
- explicit not-found, ambiguity, and policy failure states.

This proves Workspace can render the existing V2 DTO contract; it does not replace browser
rendering of a credentialed live report.

---

## 11. Required tests and gates

| Requirement | Result |
|---|---|
| Live fixture discovery smoke | **BLOCKED — MISSING credential** |
| Live analyze HTTP smoke | **BLOCKED — no live HTTP listener** |
| V2 provenance assertion | **PASS recorded/API regression** |
| No V1 fallback assertion | **PASS recorded/API regression** |
| Provider provenance assertion | **PASS recorded HTTP audit; live MISSING** |
| No silent recorded fallback assertion | **PASS for failed live startup; no fallback executed** |
| Report generation assertion | **PASS recorded/API regression; live MISSING** |
| `@fas/api` | **PASS** — 5 files passed, 1 skipped; 33 tests passed, 2 skipped |
| `@fas/application` | **PASS** — 3 files / 23 tests |
| `@fas/analysis` | **PASS** — 25 files / 100 tests |
| `@fas/web` | **PASS** — 10 files / 49 tests |
| `pnpm quality` | **PASS** — 611 files; no dependency violations |
| `pnpm typecheck` with local non-secret `DATABASE_URL` | **PASS** — 41 tasks |
| `pnpm build` | **PASS** — 22 tasks |

No new smoke harness was necessary: the production endpoints and existing HTTP/component tests
were sufficient to prove the maximum recorded behavior and the configuration gate stopped live
execution before a harness could access the provider.

---

## 12. Files changed

PVS-3.2 changes documentation only:

1. `docs/sprints/PREDICTION_VERTICAL_SLICE/PVS-3.2_LIVE_PRODUCTION_PREDICTION_VALIDATION_COMPLETION_REPORT.md`
2. `docs/PROJECT_STATE.md`
3. `docs/PROJECT_INDEX.md`

No production, test, provider, Feature, Rule, Projection, Evaluation, Calibration, or replay files
were changed by PVS-3.2.

---

## 13. Governance confirmation

- **NO MODEL PROMOTION.**
- Production `projectionPolicyPin` remains **`v2`**.
- Production parameter artifact remains **`projection.v3.replay`**.
- `projection.v3.calibration.candidate1` remains **NON-DEFAULT / NOT PROMOTED**.
- No P2K-CAL-3 work was performed.
- No Projection parameters, λ, `baseRate`, `groupFactorMax`, Dixon–Coles ρ, Evaluation History,
  sealed replay cohort, Calibration definition, Goal Range definition, Unified Matrix contract,
  Feature definition, Rule definition, Football State definition, or Match Script definition was
  changed.
- No Provider, Engine, ML, LLM, or new projection logic was added.

---

## 14. Exact prerequisite and stop boundary

To rerun the same sprint successfully, provide the credential without committing it:

```bash
export API_FOOTBALL_KEY="<valid-api-sports-key>"
export FOOTBALL_DATA_PROVIDER_MODE=live
export PROJECTION_POLICY_PIN=v2
export ODDS_PROVIDER_MODE=recorded
```

Then start the API, query `GET /api/matches/upcoming`, select a fixture from that live response,
and submit its exact teams/date to `POST /api/analyze`.

Stop after PVS-3.2. Do not automatically start another sprint, calibration work, tuning, or
candidate promotion.
