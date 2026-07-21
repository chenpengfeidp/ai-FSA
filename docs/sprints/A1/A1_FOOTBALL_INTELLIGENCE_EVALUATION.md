# A1 — Football Intelligence Evaluation Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A1** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 / 10 / 11 |
| Precondition | Sealed Football Intelligence Match Report exists (A0 / A0.5 path) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; DTO/Entity/Repository schemas; Provider work; Architecture / Bible edits; Calibration Engine design; other doc edits |

---

## 0. Goal

Design how FAS evaluates every sealed football-intelligence prediction **after the match finishes**, so the system can know whether its lean, scenarios, confidence, and narrative claims were right — and can feed later Calibration (A2) with evidence, not intuition.

```text
Sealed Prediction (pre-match)
  → Actual Match Result (verified post-match)
  → Comparison
  → Evaluation
  → Metrics
  → Calibration Input
```

**Hard constraints:**

- Design only. No implementation.
- No new Bible Engine. No Architecture Freeze change.
- Post-match only: no outcome evidence may enter pre-match Feature / Rule / Scenario / Confidence / Narrative (doc 17).
- Evaluation quality policy and Statistics metric computation remain separate (docs 10 / 11 / 18).
- Learning never auto-activates.

### Non-goals

- Designing or implementing the Calibration Engine (A2).
- Full Review Engine productization (R1) or human review UX.
- Knowledge / Case / Prompt Engine work.
- Replacing Bible Evaluation Engine contracts in [`10_EVALUATION_ENGINE.md`](../../10_EVALUATION_ENGINE.md).
- DTO, Prisma, API, or package creation in this sprint.
- Betting, wagering advice, or market-as-truth scoring.

---

## 1. Problem statement

After A0 / A0.5, FAS can already seal:

| Artifact | Role |
|---|---|
| FeatureBundle | Derived football measurements |
| Rule Findings | Deterministic PASS / FAIL / INAPPLICABLE |
| Scenario trio | Most Likely / Second Likely / Upset |
| Confidence block | Prediction Confidence, Upset Risk, Completeness, Agreement |
| Narrative | Structured WHY sections |
| Match Report | Sealed consumer-facing package |

**Gap:** there is no governed, reproducible way to pair that sealed package with a verified final score and ask:

> Under this exact Feature / Rule / Scenario / Confidence / Narrative / Report version identity, how did the prediction perform?

Without that loop, confidence bands stay heuristic, rules cannot be ranked by contribution, and Calibration has nothing immutable to consume.

---

## 2. Naming and authority alignment

### 2.1 Product language vs Bible Engines

| A1 product term | Meaning | Bible / Freeze home |
|---|---|---|
| **Football Intelligence Outcome Evaluation** | Per-match and corpus scoring of sealed intelligence vs verified results | Specialization of post-match Evaluation + Statistics flow (doc 17 §4.9–4.11) |
| **Comparison Record** | Immutable Prediction ↔ Actual pairing for one MatchId + sealed report identity | Immutable subject input to Evaluation / Statistics |
| **Evaluation Report (intelligence)** | Policy-applied quality assessment over comparison subjects | **Evaluation Engine** (Bible) |
| **Metrics / Projections** | Population accuracy, calibration reliability tables, contribution aggregates | **Statistics Engine** (Bible) |
| **Per-match human judgment** | Optional qualitative assessment of narrative usefulness | **Review Engine** (Bible) — out of A1 coding scope |

A1 does **not** invent an eighth Engine. It designs the football-intelligence **assessment subjects, comparison strategy, metric catalog, history store shape, dashboard intent, and Calibration handoff** that the existing Evaluation / Statistics / Review ownership will later implement.

### 2.2 Temporal boundary (binding)

```text
PRE-MATCH (immutable once sealed)
  Match Report + Feature/Rule/Scenario/Confidence identities

POST-MATCH (only after verified result)
  Actual Result Evidence
  → Comparison Record
  → Evaluation criteria / gates (policy)
  → Statistics projections (metrics)
  → Calibration Input (immutable facts for A2)
```

Corrected official results create **superseding lineage**, never mutation of a prior Comparison or Evaluation run (doc 17 Review/result discipline).

---

## 3. Evaluation Pipeline

### 3.1 Stage flow

```text
Prediction
  ↓
Actual Match Result
  ↓
Comparison
  ↓
Evaluation
  ↓
Metrics
  ↓
Calibration Input
```

| Stage | Purpose | Produces | Owner (conceptual) |
|---|---|---|---|
| **Prediction** | Freeze the pre-match intelligence package already sealed by Analysis / Report | Exact report id, checksums, Feature / Rule / Scenario / Confidence / Narrative / projection policy versions | Analysis + Report (already sealed; A1 only references) |
| **Actual Match Result** | Attach verified final outcome for the same MatchId | Result version, scoreline, winner, goals, outcome Evidence refs, verification status | Match + Evidence (post-match outcome Evidence) |
| **Comparison** | Deterministic field-by-field compare of sealed claims vs actual | Comparison Record (per dimension hit/miss/error + residuals) | Application post-match service; machine-checkable criteria later executed under Evaluation |
| **Evaluation** | Apply versioned assessment policy to comparison subjects / corpora | Criterion results, qualification, gate decision, Evaluation Report | **Evaluation Engine** |
| **Metrics** | Aggregate comparisons into rebuildable population projections | Accuracy / calibration / contribution projections + watermarks | **Statistics Engine** |
| **Calibration Input** | Publish immutable evaluation+metric facts that A2 may pin | Calibration-eligible envelopes (not maps; not auto-applied) | Evaluation policy + Statistics projections → consumed later by Analysis Confidence Module |

### 3.2 Orchestration (conceptual)

- Analysis Orchestrator remains **pre-match** coordinator; it does not run outcome scoring.
- Post-match application services / durable jobs coordinate: verified result → comparison eligibility → Evaluation run eligibility → Statistics refresh (doc 17 post-match sequence).
- Stages communicate through sealed identities and published reader contracts — not cross-table reads.

### 3.3 Failure and honesty

| Condition | Behavior |
|---|---|
| No sealed Match Report for the MatchId | Comparison blocked — explicit `not_eligible` |
| Result not verified / incomplete | Comparison blocked — never invent FT score |
| Sealed prediction missing a claim (e.g. no Scenario) | That dimension `unassessable`, not silent pass |
| Result later corrected | New Comparison + Evaluation lineage; prior records remain immutable |
| Empty population for a metric | Unqualified projection per Statistics policy — never fabricate accuracy |

---

## 4. Comparison Strategy

Comparison is **deterministic** and operates only on sealed Prediction fields vs verified Actual fields. It does not re-run Feature / Rule / Projection.

### 4.1 Required comparison dimensions

| Dimension | Prediction source | Actual source | Comparison outcome (conceptual) |
|---|---|---|---|
| **Winner** | Most Likely.winner **or** sealed recommendation lean (Home / Draw / Away), policy-pinned | FT winner from verified result | `hit` / `miss` / `unassessable` |
| **Score** | Most Likely scoreline (homeGoals–awayGoals) | FT scoreline | Exact match `hit` / `miss`; optional goal-diff residual |
| **Goal Count** | Predicted total goals (sum of Most Likely goals) and/or home/away goals separately | FT goals for / against / total | Exact and within-tolerance hits; absolute error |
| **Scenario Hit** | Most Likely / Second Likely / Upset worlds | Actual winner+score (and optionally 1X2 world) | Which scenario slot (if any) matched; Upset-was-actual flag |
| **Confidence** | Prediction Confidence value + band; Upset Risk | Outcome + whether Most Likely hit | Pair (band, hit/miss) for reliability; surprise vs Upset Risk |
| **Narrative Consistency** | Sealed narrative claims that assert lean/score/risk | Same outcome + Rule/Feature citations | Machine checks for lean/score consistency; usefulness may remain Review-owned |

### 4.2 Winner comparison policy (product)

1. Primary winner claim = **Most Likely.winner** from ScenarioSet (A0.5 product object).  
2. If ScenarioSet absent (legacy report), fall back to sealed `recommendation` mapped to Home / Draw / Away / Cautious.  
3. `cautious` / `insufficient_evidence` recommendations are **not** scored as Winner hits; they contribute to a separate “abstention” slice.  
4. Draw is a first-class winner class (not “neither side”).

### 4.3 Score and goal comparison policy

| Check | Pass condition (illustrative policy) |
|---|---|
| Exact score | Predicted Most Likely scoreline equals FT |
| Goal total exact | Predicted total goals equals FT total |
| Goal total ±1 | Absolute error ≤ 1 (secondary metric, not a Winner substitute) |
| Side goals | Home goals / Away goals exact or signed error |

Exact Score Accuracy and softer Goal Accuracy must remain **separate metrics** so a near-miss does not inflate Winner Accuracy.

### 4.4 Scenario Hit policy

| Result | Meaning |
|---|---|
| `most_likely_hit` | Actual winner+score matches Most Likely world (or policy-defined winner-only hit) |
| `second_likely_hit` | Actual matches Second Likely, not Most Likely |
| `upset_hit` | Actual matches Upset world |
| `none` | Actual outside the sealed trio (disclose residual mass importance) |

Product rule: Scenario Hit is not a substitute for Winner Accuracy. A Winner hit with wrong scoreline is still a Winner hit and a Score miss.

### 4.5 Confidence comparison policy

For each sealed report:

- Record `(confidenceBand, predictionConfidence, mostLikelyHit)`.
- Record whether Upset Risk was “live” when Upset world occurred.
- Do **not** rewrite confidence post-hoc. Comparison only labels outcomes for later reliability tables.

### 4.6 Narrative Consistency policy

Split into two layers:

| Layer | Kind | A1 design stance |
|---|---|---|
| **Structural consistency** | Machine-checkable | Narrative Predicted Winner / Recommended Score must match sealed Scenario Most Likely; contradictions → `narrative_inconsistent` |
| **Explanatory usefulness** | Human judgment | Optional Review assessment (“did Key Factors explain the miss?”) — not required for A1 metric core |

LLM rewrite (if present later) is scored only against the sealed spine; invented facts are validation failures, not football outcomes.

### 4.7 Comparison Record (conceptual envelope)

A Comparison Record binds:

- MatchId;
- sealed Match Report id + checksum;
- Prediction snapshot refs (FeatureBundle, Rule envelope, ScenarioSet, Confidence, Narrative, projection checksums);
- Actual result version + checksum;
- per-dimension outcomes;
- comparison-policy version;
- comparedAt;
- status (`completed` | `blocked` | `superseded`).

No probabilities are recomputed during comparison.

---

## 5. Evaluation Metrics

Metrics are **Statistics Engine metric definitions** in product language. Evaluation Engine references exact metric versions inside assessment definitions and gates; it does not recompute aggregates (docs 10 / 11).

### 5.1 Core accuracy metrics

| Metric | Definition (conceptual) | Denominator notes |
|---|---|---|
| **Winner Accuracy** | Share of eligible reports where Winner comparison = `hit` | Exclude abstentions (`cautious` / insufficient) into separate slice; report both “among calls” and “among all reports” |
| **Draw Accuracy** | Among reports whose Most Likely (or called) winner is Draw, share that finished Draw; optionally also recall of actual draws | Thin slices must remain unqualified until sample policy met |
| **Score Accuracy** | Share with exact Most Likely scoreline hit | Separate from Winner |
| **Goal Accuracy** | Family: total-goals exact; total-goals ±1; MAE of total goals; optional side-goal MAE | Publish each as its own metric key |

### 5.2 Confidence Calibration metrics (inputs to A2, not A2 itself)

| Metric | Intent |
|---|---|
| **Reliability by band** | For each confidence band (Low / Medium / High / Very High), observed Winner hit rate |
| **Confidence–outcome correlation** | Whether higher Prediction Confidence associates with higher hit rate (descriptive only) |
| **Upset Risk resolution** | When Upset world occurs, distribution of prior Upset Risk; when Most Likely hits, distribution of Upset Risk |
| **Brier / log score on 1X2** (optional later) | If sealed pHome/pDraw/pAway are treated as probabilistic claims under an explicit metric version | Never blend market odds as truth |

A1 designs these as **metric identities and populations**. Computing ECE, fitting maps, or promoting artifacts is **A2 / Calibration** — out of scope here.

### 5.3 Rule Contribution metrics

Purpose: learn which Rule findings co-occur with correct vs incorrect Winner calls — **association for governance**, not causal proof.

| Metric family | Intent |
|---|---|
| **Rule Hit Lift** | For each `ruleId`+version with PASS, Winner Accuracy among those reports vs baseline |
| **Rule Miss Concentration** | Rules that PASS disproportionately when Winner misses |
| **Channel Balance Error** | When home+ and away+ P1 PASSes conflict, observed Winner Accuracy / Cautious rate |
| **Honesty Rule Coverage** | Rate of AVAILABILITY_*_UNKNOWN / VENUE_UNAVAILABLE PASS and their accuracy impact (honesty must not be punished as “bad football”) |

Contribution metrics must slice by **rule-set version**. They never auto-disable a rule.

### 5.4 Feature Contribution metrics

| Metric family | Intent |
|---|---|
| **Feature Presence Value** | Accuracy when Feature `F` present vs honestly absent (e.g. venueAdvantage available) |
| **Feature Edge Direction** | When RecentFormHome ≫ Away (threshold policy), Winner Accuracy toward home |
| **Degradation Impact** | FeatureBundle `degraded` vs `completed_nonempty` accuracy delta |
| **Model Version Cohort** | Accuracy by `featureModelVersion` |

Same anti-causality rule: descriptive contribution only; Feature policy changes require human governance.

### 5.5 Supporting operational metrics

| Metric | Intent |
|---|---|
| Scenario Coverage Rate | Share of matches where actual falls in top-3 scenarios |
| Abstention Rate | Share of cautious / insufficient recommendations |
| Narrative Structural Consistency Rate | Share without `narrative_inconsistent` |
| Result Latency | Time from FT to verified result usable for comparison |

### 5.6 Qualification (binding)

Every metric projection carries:

- metric-definition version;
- population / slice;
- sample size;
- completeness;
- source watermarks;
- `qualified` flag per Statistics rules.

Unqualified projections may be shown as exploratory on a dashboard but **must not** satisfy Evaluation release gates.

---

## 6. Historical Dataset

### 6.1 Purpose

Persist an immutable **prediction history** so any past Match Report can be re-compared and re-aggregated when comparison-policy or metric-definition versions change — without mutating the original sealed prediction.

### 6.2 Logical record families

```text
PredictionHistoryEntry
  ├── PredictionSnapshot      # sealed pre-match package identity
  ├── ActualResultSnapshot    # verified post-match outcome identity
  ├── ComparisonRecord        # dimension outcomes under comparison-policy version
  ├── EvaluationSubjectLink   # optional link into Evaluation Run / Report
  └── MetricMembership        # which Statistics populations/watermarks included this entry
```

### 6.3 Required fields (conceptual — not a schema)

| Field group | Contents |
|---|---|
| **Identity** | MatchId; PredictionHistoryEntry id; lineage / supersession pointer |
| **Prediction** | Match Report id + checksum; ScenarioSet checksum; Confidence checksum; projection checksum; recommendation; Most Likely winner/score/probability; narrative manifest id |
| **Actual** | Result version + checksum; FT homeGoals; awayGoals; winner; verifiedAt; outcome Evidence ids |
| **Evaluation** | Comparison-policy version; per-dimension outcomes; optional Evaluation Report id / gate decision |
| **Timestamp** | predictedAt (report generatedAt); kickoffAt; verifiedAt; comparedAt; evaluatedAt |
| **Version** | Analysis profile / pipeline policy version; report schema version |
| **Rule Set Version** | Rule-set / evaluator policy id (e.g. `rule.mvp.a05`) + envelope checksum |
| **Feature Version** | `featureModelVersion` + FeatureBundle checksum |
| **Confidence / Scenario policy** | `confidence.mvp.a05` / `scenario.mvp.a05` (or successors) |
| **Projection policy** | projection / probability / recommendation policy versions |

### 6.4 Immutability and rebuild

- Prediction snapshots are write-once after seal.  
- Actual snapshots append; corrections supersede.  
- Comparison Records are immutable per `(prediction, actualVersion, comparisonPolicyVersion)`.  
- Changing a metric formula creates a **new metric-definition version** and rebuilds projections; it does not rewrite history rows.  
- Re-comparison under a new comparison-policy version creates a new Comparison Record; prior policy results remain queryable.

### 6.5 Eligibility for history inclusion

Minimum for a history entry:

1. Sealed Match Report with completed (non-blocked) deterministic projection;  
2. Verified FT result for the same MatchId;  
3. Successful Comparison under a pinned comparison-policy version.

Reports that abstained remain in history with Winner dimension `unassessable` / abstention — they are essential for calibration honesty.

### 6.6 Storage ownership (design intent)

| Concern | Owner |
|---|---|
| Physical persistence | `@fas/database` (future implementation; not designed as tables here) |
| Prediction snapshot reads | Analysis / Report published readers |
| Actual result reads | Match + Evidence outcome readers |
| Comparison write/read | Post-match application service ports |
| Evaluation reports | Evaluation Engine package (target `@fas/evaluation-engine`) |
| Metric projections | Statistics Engine package (target `@fas/statistics-engine` / interim `@fas/statistics`) |

No Provider package stores evaluation history. No LLM stores scores.

---

## 7. Calibration Input

### 7.1 What A1 prepares for A2

A1 stops at **Calibration Input**: immutable, versioned facts that a future Calibration Engine / Statistics calibration projection may consume. A1 does **not** design:

- mapping functions from raw confidence → displayed confidence;
- acceptance thresholds for promoting a calibration artifact;
- auto-application into live Analysis runs.

That remains A2, consistent with A0 §4.4:

```text
A0/A0.5: Confidence Module emits raw confidence under policy vN (sealed)
A1:      Pair sealed bands with outcomes → reliability / contribution facts
A2:      Build + govern calibration artifacts; Analysis pins approved artifact id
```

### 7.2 Calibration Input envelope (conceptual)

| Input | Source |
|---|---|
| Sealed Prediction Confidence + band | Match Report / IntelligenceConfidence |
| Sealed 1X2 probabilities (optional) | Deterministic projection |
| Winner / Score / Scenario outcomes | Comparison Record |
| Feature + Rule set versions | PredictionHistoryEntry |
| Population slice keys | league, season, home/away, evidence-completeness bucket, abstention flag |
| Exact Statistics projection ids | Reliability-by-band and related metrics when qualified |
| Evaluation gate outcomes (optional) | Whether a confidence policy corpus passed a quality gate |

### 7.3 Consumption rules (for future A2 implementers)

1. Calibration may read only **immutable** Comparison / Evaluation / Statistics identities.  
2. Analysis Confidence Module may consume only **approved** calibration artifact ids pinned by policy — never “latest mutable table.”  
3. Unqualified reliability projections cannot justify raising confidence bands.  
4. Availability UNKNOWN / VENUE unavailable slices must remain separable so calibration cannot launder missing Facts into certainty.  
5. No AI provider computes authoritative calibration numbers.

### 7.4 Explicit non-design

Out of scope for this document: artifact file format, bin edges, isotonic/Platt details, promotion workflow UI, and shadow-mode deployment. Those belong to A2 + Evaluation calibration methodology (doc 10) + Statistics calibration projections (doc 11).

---

## 8. Dashboard (future)

Design intent only — no UI implementation in A1.

### 8.1 Purpose

Give operators and methodology owners a **reviewable** view of whether Football Intelligence is improving over time, without exposing wagering advice.

### 8.2 Required views

| View | Shows | Primary data |
|---|---|---|
| **Accuracy Trend** | Winner / Score / Goal Accuracy over time (by week/season) | Statistics time series |
| **Confidence Distribution** | Histogram of bands + reliability curve (expected vs observed hit rate) | Confidence Calibration metrics |
| **Rule Performance** | Per-rule lift, miss concentration, channel conflict rates | Rule Contribution metrics |
| **Feature Performance** | Presence value, edge direction, degradation impact by featureModelVersion | Feature Contribution metrics |
| **Prediction History** | Searchable list of MatchId → Prediction vs Actual → Comparison → links to Report / Evaluation | Historical Dataset |

### 8.3 Cross-cutting dashboard rules

- Every chart must show metric version, sample size, and qualification state.  
- Unqualified slices are visually distinct and non-actionable for release.  
- Drill-through ends at sealed Match Report + Comparison Record — never a re-scored live prediction.  
- Dashboard is read-only over Evaluation / Statistics / history readers; it cannot publish or activate rules.  
- Presentation ownership: `apps/web` (future); query ownership stays with Evaluation / Statistics / history ports.

### 8.4 Non-goals for dashboard

- Live in-play updates.
- Betting tips or odds screens as evaluation truth.
- Auto-toggle of rules/features from chart clicks.

---

## 9. DDD Ownership

### 9.1 Package ownership (no new architecture)

Reuse Freeze v0.2 and doc 18 module map. Prefer existing / already-planned packages; **do not** create `packages/football-evaluation-engine` or similar.

| Concern | Canonical owner | Package home (today → target) |
|---|---|---|
| Sealed Prediction / Match Report | Analysis + Report | `@fas/analysis`, `@fas/report` |
| Feature identity / versions | Feature derivation | `@fas/feature` |
| Rule findings / rule-set versions | Rule Engine | `@fas/rule` → `@fas/rule-engine` |
| Scenario + Confidence emission (pre-match) | Analysis intelligence modules | `@fas/analysis` |
| Verified Actual Result | Match + Evidence | `@fas/match`, `@fas/evidence` |
| Comparison Record application service | Post-match application coordination | `@fas/analysis` application post-match **or** thin `@fas/application` use-case — **not** a new Engine package |
| Assessment definitions, gates, Evaluation Reports | **Evaluation Engine** | target `@fas/evaluation-engine` (interim may live beside thin evaluation ports; no eighth Engine name) |
| Metric definitions, projections, watermarks | **Statistics Engine** | `@fas/statistics` → `@fas/statistics-engine` |
| Optional human narrative usefulness | **Review Engine** | target `@fas/review-engine` |
| Calibration artifacts (consume in A2) | Statistics projections + Evaluation methodology | `@fas/statistics` (+ Evaluation policy) |
| Persistence / jobs | Infrastructure | `@fas/database`, `@fas/jobs` |
| Dashboard presentation | Web | `apps/web` |
| HTTP transport | API | `apps/api` |

### 9.2 Boundary matrix (must hold)

| Actor | May | Must not |
|---|---|---|
| Comparison | Label sealed Prediction vs Actual | Recompute λ / 1X2; mutate Report |
| Evaluation Engine | Apply policy/gates; emit reports | Compute population accuracy formulas; run pre-match analysis |
| Statistics Engine | Compute metrics/projections | Decide release quality; change Rules |
| Review Engine | Human per-match assessment | Authoritative Winner Accuracy numbers |
| Analysis Confidence Module | Emit pre-match confidence; later pin A2 artifacts | Self-calibrate from live outcomes |
| Feature / Rule packages | Remain pre-match pure | Read FT results during extraction/evaluation |
| LLM / Narrative rewrite | Optional paraphrase of sealed spine | Invent outcomes or scores |

### 9.3 Folder intent (folders only — no file mandate)

```text
packages/analysis/          # post-match comparison use-case (future)
packages/evaluation-engine/ # assessment definitions, runs, reports (target)
packages/statistics/        # metric defs + projections (interim/target)
packages/review-engine/     # optional human assessments (later)
packages/feature/           # version identity only (no outcome reads)
packages/rule/              # rule-set version identity only
packages/report/            # sealed report identity reader
apps/api/                   # future evaluation/history query commands
apps/web/                   # future dashboard
```

Do **not** add:

```text
packages/prediction-evaluation-engine/
packages/calibration-engine/          # A2 concern
packages/scenario-evaluation/
```

### 9.4 Dependency direction

```text
apps/api / apps/web / worker
  → Evaluation / Statistics / Review / Analysis application ports
    → sealed Prediction readers (Report/Analysis)
    → Actual Result readers (Match/Evidence)
    → @fas/database adapters (infra only)
```

Domain packages remain framework-neutral. Prisma stays inside `@fas/database`.

---

## 10. Relationship to existing engines (summary)

```text
Pre-match (A0/A0.5 — already designed/implemented path)
  Evidence → Feature → Rule → Scenario → Confidence → Narrative → Report

Post-match (A1 — this design)
  Verified Result → Comparison → Evaluation (policy) → Metrics (Statistics)
       → Calibration Input (for A2)

Bible Engines involved post-match:
  Review (optional human) · Evaluation (policy/gates) · Statistics (metrics)
```

A1 is the **football-intelligence specialization** of the post-match loop already required by doc 17 — focused on sealed Scenario / Confidence / Rule / Feature versions that A0 introduced.

---

## 11. Acceptance criteria (for a future Coding gate)

When A1 is later implemented (separate authorization), the project must:

1. After a verified FT result, create an immutable Comparison Record for a sealed Match Report.  
2. Score at least Winner, Score, Goal Count, Scenario Hit, Confidence pairing, and Narrative structural consistency.  
3. Persist Prediction History with Prediction, Actual, Evaluation link, timestamps, and Feature / Rule / policy versions.  
4. Expose Statistics metric identities for Winner / Draw / Score / Goal Accuracy, Confidence reliability, Rule Contribution, and Feature Contribution.  
5. Emit Calibration Input envelopes suitable for A2 without applying calibration.  
6. Keep pre-match packages outcome-blind.  
7. Introduce no new Bible Engine and no Architecture/Bible edits from this design alone.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Evaluation Pipeline | **Designed** |
| Comparison Strategy | **Designed** |
| Evaluation Metrics | **Designed** |
| Historical Dataset | **Designed** |
| Calibration Input (not Calibration Engine) | **Designed** |
| Dashboard intent | **Designed** |
| DDD Ownership | **Designed** |
| Production code | **Out of scope** |
| Architecture / Bible edits | **Out of scope** |

---

## 12. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md)
- [`docs/10_EVALUATION_ENGINE.md`](../../10_EVALUATION_ENGINE.md)
- [`docs/11_STATISTICS_ENGINE.md`](../../11_STATISTICS_ENGINE.md)
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md)
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md)
- [`docs/20_IMPLEMENTATION_PLAN.md`](../../20_IMPLEMENTATION_PLAN.md)
- [`docs/21_ARCHITECTURE_SIGNOFF.md`](../../21_ARCHITECTURE_SIGNOFF.md)
- [`docs/sprints/A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/sprints/A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A1 Football Intelligence Evaluation Framework design. Design only — no implementation.*
