# D0 — Football Intelligence Expansion Roadmap

| Field | Value |
|---|---|
| Sprint id | **D0** |
| Document type | Implementation planning backlog (not coding) |
| Purpose class | Expand **Football Intelligence depth** inside the frozen architecture |
| Governing (read-only) | Project Bible; Architecture Freeze **v0.2**; docs 17 / 18; Coding Law **B2**; Product Roadmap **doc 40** |
| Design inputs | A0–A4, B0–B2, F1.1 slice reports, live provider + durable Evidence (C1/C2) |
| Status | Planning complete — authorizes **no** production code by itself |
| Explicitly excluded | Architecture redesign; new Engines; new packages; Bible / Freeze edits; platform infra (Redis, auth, public deploy, Compose automation) |

---

## 0. Authority and constraints

```text
Architecture Freeze v0.2  (complete)
  → Design A0–A4 / Mapping B0 / Blueprint B1 / Coding Law B2  (complete)
    → Live provider + PostgreSQL Evidence + E2E Intelligence pipeline  (complete)
      → D0 Expansion Roadmap  ← this document = coding backlog for Intelligence depth
        → Coding sprints F1.1E → F1.2* → F1.3* → I* → A1/A2 …
```

**Hard rules for every recommended sprint**

1. Expand existing `Evidence → Feature → Rule → Projection → Scenario → Confidence → Report`.
2. Prefer existing packages: `@fas/evidence`, `@fas/evidence-normalizer`, `@fas/provider-football`, `@fas/provider-odds`, `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report`, `@fas/statistics`, `@fas/database`, `apps/api`, `apps/web`.
3. **MUST NOT** invent Engines, packages, or parallel pipelines.
4. **MUST NOT** treat market signals as football facts; keep epistemic split.
5. **MUST** fail closed / absent-safe; never invent lineup, xG, or availability.
6. Split roadmap parents with suffixes (`F1.2a`, `F1.2b`) per doc 40.

---

## 1. Current Intelligence Capability Assessment

### 1.1 Pipeline (implemented)

```text
Evidence
  → FeatureBundle (feature.v2.a05.slice1)
  → RuleResult[] (rule.mvp.a05)
  → DeterministicMatchProjection (projection.v2.slice1 / independent_poisson.v1)
  → ScenarioSet (scenario.mvp.a05)
  → IntelligenceConfidence (confidence.mvp.a05)
  → AnalysisReport + local MVP narrative
```

Orchestration: `packages/analysis` (`AnalyzeMatchUseCase`) + `packages/report` (`GenerateMatchReportUseCase`).

### 1.2 Evidence (production-normalized)

| Type | Status | Typical payload / notes |
|---|---|---|
| `MATCH_INFO` | Done | `{ home, away, kickoff }` |
| `TEAM_FORM` | Done | W/D/L + goals windows |
| `STATISTICS` | Thin | shots ± goals-proxy / zeroed “xG” fields — **not** true xG |
| `HEAD_TO_HEAD` | Done | meetings sample |
| `VENUE` | Done | name / city / venueId |
| `PLAYER` | Done | identity only (no player stats Features) |
| `INJURY` / `SUSPENSION` | Done | availability absences → count Features |
| `ODDS` | Done | 1X2 + optional Asian handicap overlay |
| `LINEUP` | Typed only | no production ingest |
| `WEATHER` | Typed only | unused |
| `NEWS` / `RANKING` | Typed only | unused |
| Referee / Coach | Registry only | `ingestImplemented=false` |

Durable persistence: `EVIDENCE_REPOSITORY_MODE=memory|postgres` via `@fas/database`.

### 1.3 Feature catalogue (exact names)

`homeTeam`, `awayTeam`, `kickoff`, `homeAdvantage`, `venueAdvantage`,  
`attackRatingHome/Away`, `defenseRatingHome/Away`,  
`momentum`, `momentumHome/Away`, `recentFormHome/Away`,  
`availabilityPenaltyHome/Away`,  
`h2hLean`, `h2hSampleSize`,  
`marketImpliedHome/Draw/Away`, `marketLean`,  
`asianHandicapLine`, `asianHandicapLean`.

Pin: `feature.v2.a05.slice1`.

Gaps vs football knowledge: no rest/congestion/travel, no home/away split form, no lineup/referee features, no true shot-quality / xG features, no possession/PPDA/set-piece features, no odds-movement / O-U / Kelly features.

### 1.4 Rule catalogue (policy `rule.mvp.a05`)

Presence: `HOME/AWAY_TEAM_PRESENT`, `KICKOFF_PRESENT`.  
Attack / form / defense / momentum / alignment: home+/away+ channels.  
Venue + availability (+ honest `*_UNKNOWN` / `VENUE_UNAVAILABLE`).  
H2H supports home/away.  
Market / AH lean rules are **findings-only** (`channel: none`) — never enter football softmax.

### 1.5 Projection inputs / outputs

**Consumes (required):** attack/defense ratings, momentum sides, `homeAdvantage`; channelled football rules; pinned calibration artifact.  
**Produces:** `lambdaHome/Away`, 1X2 probs, `topScorelines`, `goalRange`, recommendation, limitations, checksums.  
**Label caution:** pin `xg.v2.slice1` exists; **true provider xG is not implemented**. Football provider currently supplies zeroed xG; odds path may use goals-proxy STATISTICS.

### 1.6 Confidence signals

Completeness of `MATCH_INFO`, form×2, stats×2, any `VENUE`, any availability; rule agreement; scenario concentration; caps for unknown availability / venue / conflict / residual mass.  
Bands + `upsetRisk` + limitations. No reliability score from Evidence quality taxonomy yet (A1.9 design exists; thin runtime).

### 1.7 Explainability

Report seals features (with `sourceEvidenceId`), rules (`sourceFeatureIds`), projection, scenarios, confidence, local narrative sections (Overview / Key Factors / Strength / Risk / Prediction / Recommended Score).  
No LLM required for MVP narrative. Compatibility Profile runtime **not** implemented (design-only in A1.11).

### 1.8 F1.1 roadmap status (honest)

| Theme | Code reality |
|---|---|
| Venue / Player identity / Injury+Suspension | Delivered (Availability also wired into Feature/Rule/Confidence) |
| Confirmed Lineup | Missing |
| Referee | Missing |
| Richer form decomposition | Missing (single window form only) |
| Expected Lineup | **Blocked** — no honest provider endpoint; do not invent |

---

## 2. Missing Capability Matrix

Legend: **P0** = highest football-intelligence leverage next · **P1** = high · **P2** = valuable later · **P3** = defer / out of V1 private scope · **Block** = provider honesty block.

| Capability | Layer to expand | Priority | Fit notes |
|---|---|---|---|
| Confirmed lineup (+ absence states) | Evidence → Report (± Feature/Rule later) | P0 | Completes F1.1; no Expected Lineup invention |
| Referee identity + basic tendencies | Evidence → Report → optional Feature/Rule | P0 | F1.1 remainder |
| Recent form decomposition (H/A, scoring/conceding, window quality) | Feature → Rule → Confidence → Narrative | P0 | Uses existing `TEAM_FORM` / richer windows |
| Advanced team stats (SoT, possession, corners, cards, dangerous attacks) | Evidence `STATISTICS` → Feature → Rule | P0 | Roadmap **F1.2** |
| True xG / xGA (provenance-labelled) | Evidence → Feature → Projection optional consume | P0 | Roadmap **F1.3**; kill goals-proxy happy path |
| Shot quality / finishing vs chance | Evidence events or derived Features | P1 | After true xG |
| Shot locations / shot map (private review) | Evidence structure → Report/UI | P1 | F1.3 product surface |
| Rest days / fixture congestion | Feature from `MATCH_INFO`+schedule facts | P1 | Deterministic; no new Engine |
| Home/Away specialization | Feature from form windows | P1 | |
| Travel distance | Feature if venue+geo facts exist | P2 | Absent-safe |
| Squad rotation / minutes load | Needs player match minutes Evidence | P2 | After lineup/player stats depth |
| Set pieces / PPDA / pressing / transitions / defensive line / keeper | Evidence metrics → Feature/Rule | P2 | Only with provider measurements |
| Coach tactical style | Evidence facts only | P2 | Registry partial; no invent |
| League strength normalization | Feature/Projection scaling | P2 | Needs competition strength Evidence |
| Weather / pitch | `WEATHER` Evidence | P2 | Typed; low provider priority |
| Injury severity (not count-only) | Evidence payload → Feature | P1 | Extends Availability honesty |
| Suspension impact (position-weighted) | Feature | P1 | |
| Odds movement / O-U / consensus | `ODDS` Evidence → market Features/Rules | P1 | Findings-only; never football softmax |
| Asian handicap (already thin) | deepen Features/Rules/limitations | P1 | Already present as overlay |
| Kelly / sharp vs public / betting heat | Market Findings only | P3 | High misuse risk; defer unless gated as research signals |
| News / social confidence | `NEWS` Evidence + reliability | P3 | Untrusted text; A1.9 first |
| Evidence reliability scoring | Evidence metadata → Confidence | P1 | A1.9 → runtime |
| Projection improvements (xG-aware λ, better draw model) | `@fas/analysis` | P1 | After F1.3a |
| Confidence improvements (metric completeness, reliability) | `@fas/analysis` | P1 | Parallel with F1.2b |
| Explainability depth (factor cards, counterfactuals lite) | `@fas/report` (+ web) | P1 | A3-aligned; local, not LLM-required |
| Evaluation / Calibration productization | `@fas/statistics` + analysis pins | P1 | Roadmap **A1 / A2** after signal quality |
| Case / Knowledge Engines | — | — | **Out of this expansion phase** (doc 40 later; would be Engine work) |

---

## 3. Recommended implementation priority

```text
P0  Complete F1.1 remainder (Lineup, Referee, form decomposition)
P0  F1.2 advanced STATISTICS (facts before math)
P0  F1.3 true xG/xGA (replace proxy happy path)
P1  Wire new facts into Feature → Rule → Confidence → Narrative
P1  Context Features (rest / congestion / H-A split)
P1  Market depth as findings-only (movement / O-U)
P1  Reliability + explainability + evaluation/calibration
P2  Style/pressing/set-piece/keeper only when measured
P3  Kelly / social / sharp-public heat
```

Business value ordering: **honest football context → real attacking metrics → better λ/1X2 → calibrated trust → richer explanation**.  
Infrastructure (Compose migrate automation, more durable seals) is **explicitly out of D0** unless a coding sprint is blocked.

---

## 4. Coding Sprint roadmap

### Sprint F1.1E — Lineup, Referee, Form Decomposition

| Field | Value |
|---|---|
| **Goal** | Close remaining F1.1 football-context gaps without inventing Expected Lineup |
| **Expected production files** | `provider-football` lineup/referee mappers + recorded cassettes; `evidence-normalizer` `LINEUP` (+ referee as `PLAYER` subject or dedicated payload under existing types — **no new EvidenceType unless already typed**); `feature-extractor` form-split Features; optional thin Rules; Workspace/Report sections; catalog updates |
| **Affected packages** | `@fas/provider-football`, `@fas/evidence-normalizer`, `@fas/evidence` (registry only if needed), `@fas/feature`, `@fas/rule` (optional), `@fas/report`, `apps/web`, `apps/api` (DTO/surface only) |
| **Dependencies** | Live/recorded football provider; F1.1D Availability done |
| **Acceptance criteria** | (1) Confirmed lineup Evidence when provider has it; honest absence otherwise. (2) Referee identity (+ basic tendency facts if available) reviewable. (3) Home/Away or scoring/conceding form Features extracted from existing form windows. (4) Projection still runs on minimum Evidence. (5) No Expected Lineup invention. |
| **Estimated complexity** | **M** |
| **Business value** | Analysts see *who plays / who refs / how form is shaped* — largest remaining pre-stats gap |

---

### Sprint F1.2a — Advanced STATISTICS Evidence

| Field | Value |
|---|---|
| **Goal** | Ingest real advanced team statistics as Evidence (measurements, not goals-proxy) |
| **Expected production files** | Provider stats mapping; normalizer STATISTICS schema extension; recorded fixtures; catalog; Workspace/Report stats panels |
| **Affected packages** | `@fas/provider-football`, `@fas/evidence-normalizer`, `@fas/evidence` (catalog/docs), `apps/web`, tests/cassettes |
| **Dependencies** | F1.1E preferred (not hard-blocked for team-only stats) |
| **Acceptance criteria** | SoT / possession / corners / cards / dangerous attacks (as available) with non-proxy provenance on recorded demos; each metric absent-safe; goals-proxy clearly labelled fallback only |
| **Estimated complexity** | **M** |
| **Business value** | Replaces thin attacking picture; prerequisite for honest Features and xG |

---

### Sprint F1.2b — Advanced Features, Rules, Confidence

| Field | Value |
|---|---|
| **Goal** | Turn F1.2a facts into deterministic intelligence (not presentation-only) |
| **Expected production files** | New Feature names + math; Rule additions; Confidence completeness keys; narrative Key Factors; feature-model pin bump |
| **Affected packages** | `@fas/feature`, `@fas/rule`, `@fas/analysis` (confidence), `@fas/report` |
| **Dependencies** | **F1.2a** |
| **Acceptance criteria** | Features cite STATISTICS Evidence ids; Rules PASS/FAIL/INAPPLICABLE honestly; Confidence reflects advanced-stat completeness; market rules remain findings-only |
| **Estimated complexity** | **M** |
| **Business value** | Stats start changing findings/confidence — Intelligence becomes “smarter”, not just richer UI |

---

### Sprint F1.3a — True xG / xGA Evidence

| Field | Value |
|---|---|
| **Goal** | Replace zeroed/proxy xG fields with provenance-true xG/xGA Evidence |
| **Expected production files** | Provider xG mapping; normalizer contracts; recorded demos; hard separation in copy/limitations (“modelled metric ≠ goals”) |
| **Affected packages** | `@fas/provider-football`, `@fas/evidence-normalizer`, `@fas/report` / web copy, tests |
| **Dependencies** | **F1.2a** (shots/attack basis) |
| **Acceptance criteria** | Supported recorded matches show xG/xGA with provenance; projection still runs without xG; product never claims xG is observed goals |
| **Estimated complexity** | **M–L** |
| **Business value** | Core attacking-quality signal for Projection |

---

### Sprint F1.3b — Chance Quality, Finishing, Projection Consume

| Field | Value |
|---|---|
| **Goal** | Consume true xG in Feature/Projection; add chance/finishing (+ optional shot-map structure for private review) |
| **Expected production files** | Feature math using xG; projection λ path optional consume; limitations; report shot-quality section; pin bumps (`feature.*`, `projection.*`) |
| **Affected packages** | `@fas/feature`, `@fas/analysis`, `@fas/report`, `apps/web` |
| **Dependencies** | **F1.3a** |
| **Acceptance criteria** | When xG present, Features/Projection improve with checksum/pin changes; without xG, explicit limitation; shot map or structured shot events for ≥1 demo competition if data exists |
| **Estimated complexity** | **L** |
| **Business value** | Highest single uplift to deterministic prediction quality inside Freeze |

---

### Sprint I1 — Match Context Features (Rest, Congestion, H/A)

| Field | Value |
|---|---|
| **Goal** | Encode schedule/context football knowledge as Features/Rules |
| **Expected production files** | Features: e.g. rest days, matches-in-N-days, home/away form split (if not finished in F1.1E); Rules; Confidence penalties; narrative |
| **Affected packages** | `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report` (+ provider only if schedule facts missing) |
| **Dependencies** | F1.1E (form split); schedule/kickoff facts already in MATCH_INFO / catalog |
| **Acceptance criteria** | Features absent-safe; Rules channelled; no invented travel when geo missing |
| **Estimated complexity** | **S–M** |
| **Business value** | Classic match-prediction edge without new data products |

---

### Sprint I2 — Market Intelligence Depth (Findings-only)

| Field | Value |
|---|---|
| **Goal** | Deepen odds layer: movement, O/U, consensus — never into football softmax |
| **Expected production files** | ODDS payload extensions; market Features; findings Rules; conflict/limitation text; AH refinements |
| **Affected packages** | `@fas/provider-odds`, `@fas/evidence-normalizer`, `@fas/feature`, `@fas/rule`, `@fas/analysis` (limitations only), `@fas/report` |
| **Dependencies** | Existing ODDS/AH path; preferably after F1.2b so football vs market conflict is meaningful |
| **Acceptance criteria** | Market Features/Rules remain `channel: none` / findings; no Kelly/sharp-public unless separately gated later; honest absence |
| **Estimated complexity** | **M** |
| **Business value** | Better “market vs football” explainability; not a substitute for xG |

---

### Sprint I3 — Evidence Reliability + Explainability Depth

| Field | Value |
|---|---|
| **Goal** | Runtime subset of A1.9 reliability + A3 explainability without new Engines |
| **Expected production files** | Reliability inputs into Confidence; richer Key Factors / limitation taxonomy; feature/rule citation cards in web/report |
| **Affected packages** | `@fas/evidence` (metadata only as needed), `@fas/analysis`, `@fas/report`, `apps/web` |
| **Dependencies** | F1.2b minimum (enough signal variety); A1.9/A3 design docs as read-only |
| **Acceptance criteria** | Confidence cites reliability/completeness components; narrative/report shows reviewable causal chain Evidence→Feature→Rule→Projection; no auto-learning |
| **Estimated complexity** | **M** |
| **Business value** | Trust and reviewability — core FAS differentiator |

---

### Sprint A1 — Prediction Evaluation (doc 40)

| Field | Value |
|---|---|
| **Goal** | Frozen-population evaluation of sealed projections (not architecture redesign) |
| **Expected production files** | Evaluation ops in `@fas/statistics` / analysis hooks; recorded populations; reports |
| **Affected packages** | `@fas/statistics`, `@fas/analysis`, tooling/tests as needed |
| **Dependencies** | Prefer **F1.2+** signal quality; may spike earlier if population labelled pre-xG |
| **Acceptance criteria** | Per doc 40 A1; sealed history not rewritten |
| **Estimated complexity** | **M–L** |
| **Business value** | Measures whether Intelligence upgrades actually help |

---

### Sprint A2 — Calibration Productization (doc 40)

| Field | Value |
|---|---|
| **Goal** | Move beyond identity / demo calibration artifacts to governed calibrated pins |
| **Expected production files** | Calibration artifacts; pin selection; no auto-activation |
| **Affected packages** | `@fas/statistics`, `@fas/analysis`, `@fas/config` (mode selectors only) |
| **Dependencies** | **A1** |
| **Acceptance criteria** | Per doc 40 A2; human/governed promotion only |
| **Estimated complexity** | **L** |
| **Business value** | Makes probabilities trustworthy over time |

---

### Explicitly deferred (not scheduled in this phase)

| Item | Why |
|---|---|
| Knowledge Engine (K1) / Case Engine (C1) | New Engine scope; after F1.3 + A2 per doc 40 |
| Kelly / sharp vs public / social heat | Misuse + weak honesty under V1 private product |
| Expected Lineup | Provider block |
| Redis / BullMQ / microservices / auth / public deploy | Platform, not Intelligence |
| Durable Analysis/Report seals | Useful platform follow-up; **not** Intelligence-smarter |

---

## 5. Risk analysis

| Risk | Impact | Mitigation |
|---|---|---|
| Provider coverage variance (lineup timing, xG leagues) | Incomplete “smart” claims | Absent-safe Evidence; recorded demos for CI; limitations text |
| Goals-proxy / zeroed xG mistaken for true xG | False Intelligence | Provenance labels; F1.3a acceptance forbids happy-path proxy |
| Market features leaking into football softmax | Epistemic corruption | Keep market Rules `channel: none`; B2 port rules |
| Feature/Rule pin thrash without evaluation | Unmeasured “improvements” | Pin bumps + A1 populations before wide claim |
| Scope creep into Engines / new packages | Architecture reopen | D0 hard rules; stop and escalate |
| Injury severity / rotation without minutes data | Invention risk | Stay count/position-weighted only when facts exist |
| Overbuilding explainability UX | Distracts from F1.2/F1.3 | Cap I3 after stats/xG path lands |
| Uncommitted local work vs archive zips | Wrong baseline for next coding sprint | Commit/tag before coding sprint starts |

---

## 6. Recommended implementation order

```text
1. F1.1E   Lineup + Referee + form decomposition
2. F1.2a   Advanced STATISTICS Evidence
3. F1.2b   Advanced Feature / Rule / Confidence
4. F1.3a   True xG / xGA Evidence
5. F1.3b   Chance quality + Projection consume
6. I1      Rest / congestion / H-A context Features
7. I2      Market depth (findings-only)
8. I3      Reliability + explainability depth
9. A1      Prediction evaluation
10. A2     Calibration productization
```

**Parallelism (optional, after F1.2a):** I1 can overlap F1.2b if staffing allows; I2 should wait until football Features exist so conflicts are meaningful; A1 early spike only on frozen pre-xG populations.

**Definition of “significantly smarter” for this phase**

After **F1.3b + I1**, Intelligence can cite lineup/referee/context, real advanced stats, and true xG-aware Features/Projection with honest limitations — still inside Freeze, still without new Engines.

---

## 7. Next action

Authorize **F1.1E** as the next coding sprint (small implementation task under B2), or request a thin F1.1E Planning/Spec gate if provider lineup/referee contracts need a human decision.
