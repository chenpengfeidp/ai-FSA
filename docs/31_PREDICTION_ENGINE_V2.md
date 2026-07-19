# Prediction Engine V2 — Deterministic Projection Design

## Document Status

| Field | Value |
|---|---|
| Status | Design only — not implemented |
| Kind | Future engine design / planning artifact |
| Authority | Non-authoritative relative to `docs/00_PROJECT_BIBLE.md`, ADRs, and owning numbered contracts (`02`, `04`, `07`, `17`, etc.) |
| Companion design | Complements [30_RULE_ENGINE_V2](./30_RULE_ENGINE_V2.md); does not supersede it |
| Implementation | Forbidden by this task; no code, API, schema, UI, or runtime changes are implied |
| Governance / architecture | This file does not amend governance or architecture documents |

This document designs **Prediction Engine V2**: the deterministic stage that turns versioned features (and optional rule-channel adjustments) into reviewable football projections — 1X2 probabilities, scoreline distribution, goal ranges, and a closed-form recommendation — then hands a typed bundle to Analysis Report composition.

Epistemic note: “prediction” is used here as a **product label for deterministic projections**. Outputs are not facts, not market truth, not AI inference, and not wagering advice.

### Relationship to Rule Engine V2

| Concern | Rule Engine V2 (design) | Prediction Engine V2 (this design) |
|---|---|---|
| Features | Derives typed features from evidence | Consumes pinned feature values |
| Rules | Evaluates weighted deterministic findings | May apply declared channel deltas; does not re-author rules |
| Confidence components | Defines agreement / completeness / strength / contradiction | Consumes projection confidence (or recomputes under the same pinned policy version) |
| xG → probabilities → scorelines | Sketch in §5 of doc 30 | Owns the full projection math and calibration hooks |
| Explainability | Evidence → Feature → Rule → Projection | Extends Projection-internal chain: xG → Probability → Scoreline → Recommendation |

Both remain pure, versioned, and free of LLM calls. Exact package boundaries at implementation time require a separate authorization; this document only defines the intended computational contract.

### Design principles

- Deterministic: same sealed inputs + same model versions → identical outputs.
- xG is the foundation; probabilities are derived, not guessed.
- Fail explicitly when required inputs are missing or evaluations error.
- Market data may calibrate or blend; it never becomes ground truth.
- Every emitted field carries a trace into upstream quantities.
- Analysis Report consumes the bundle; it does not recompute the model.

---

## 1. Prediction Pipeline

### 1.1 End-to-end flow

```text
Feature values (pinned versions + checksums)
  → Expected Goals Model          → (λ_home, λ_away) + modifiers
  → Probability Model             → P(Home), P(Draw), P(Away)
  → Scoreline Distribution        → P(H=i, A=j) matrix
  → Goal Range Model              → P(0–1), P(2–3), P(4+)
  → Recommendation Engine         → closed recommendation code
  → Analysis Report composition   → reviewable report sections (consumer)
```

Optional parallel inputs (not shown above, but allowed by design):

- Rule-channel deltas from Rule Engine V2 (logit adjustments, totals reweights).
- Projection confidence breakdown (`A`, `C`, `S`, `X`).
- Odds consensus for calibration / governed blend weight `α`.
- Competition–season baselines and calibration maps.

### 1.2 Stage contracts (design)

| Stage | Inputs | Outputs | Failure mode |
|---|---|---|---|
| Expected Goals | Attack/Defense ratings, home/rest/travel/weather/availability, baselines | `λh`, `λa`, modifier log | `blocked` if core ratings missing |
| Probability | `λh`, `λa`, correlation policy, optional rule/market adjustments | `pHome`, `pDraw`, `pAway` | `error` if probs invalid / non-finite |
| Scoreline | Same generative params as probability | Full matrix + top 3 | Cap truncation recorded, not hidden |
| Goal Range | Scoreline matrix (or equivalent total distribution) | Bucket probs + argmax | Buckets must sum to 1 (±ε) |
| Recommendation | Probabilities, confidence, rule agreement, margins | Enum code + limitations | Prefer `insufficient_evidence` / `cautious` over forced lean |
| Analysis Report | Projection bundle + explainability graph | Report DTO / revision payload | Report builder must not invent missing projections |

### 1.3 Ordering invariants

1. Scorelines are generated from the same generative parameters that produce 1X2 (or 1X2 is exactly the margin aggregate of the matrix). No separate ad-hoc 1X2 heuristic that disagrees with the matrix.
2. Goal ranges are aggregates of the scoreline (or total-goals) distribution.
3. Recommendation runs only after probabilities, confidence, and ranges exist (or after an explicit insufficient-evidence short-circuit).
4. Analysis Report is downstream: it cites the bundle identity and checksum; it does not alter `λ` or probabilities.

### 1.4 Version pinning

A projection run records:

- `predictionModelVersion`
- `xgModelVersion`
- `probabilityModelVersion` (e.g. `bivariate_poisson@1`)
- `calibrationMapVersion` (or `none`)
- feature checksum / rule-evaluation checksum / input snapshot checksum
- output bundle checksum

Historical replay uses stored versions; it does not silently upgrade to “latest.”

---

## 2. Expected Goals Model

Expected Goals (xG) here means **pre-match team goal expectancy** for the fixture — the Poisson (or bivariate Poisson) rate parameters `(λ_home, λ_away)`. It is not live shot-level xG from an in-play event stream.

### 2.1 Why xG is the foundation of football prediction

Football outcomes are discrete and low-scoring. Win/draw/away results are **margins of a goal-count process**, not independent labels. Modeling “home win %” without a goal-generation story tends to:

- invent draw rates that disagree with totals;
- produce scorelines that cannot imply the stated 1X2;
- hide whether a lean comes from attack strength, defensive weakness, or schedule effects.

A transparent xG foundation:

1. Separates **how many goals each side is expected to score** from **how those goals translate into match results**.
2. Makes scorelines and goal ranges consequences of the same rates.
3. Gives explainability a natural root: “we lean home because `λh` materially exceeds `λa` for these feature reasons.”
4. Aligns with established football analytics practice while remaining fully deterministic when formulas and inputs are pinned.

### 2.2 Inputs

| Input | Role |
|---|---|
| Attack Rating (home / away) | Offensive strength vs competition baseline |
| Defense Rating (home / away) | Resistance to conceded threat (higher = stronger defense) |
| Home Advantage | Uplift applied to home attacking / suppressing away (policy-pinned split) |
| Rest Advantage | Signed schedule freshness differential (positive favors home) |
| Travel Fatigue | Penalty typically applied to away expectancy (and rarely home on unusual travel) |
| Weather | Multiplicative totals / openness factor (wind, precipitation) |
| Availability | Role-weighted absence impact reducing a team’s attack and/or defense contribution |

Supporting constants (versioned, not match-specific inventiveness):

- competition season baseline rates `(λ0_home, λ0_away)` or a single `λ0` with home split;
- shrinkage / sample-size floors when ratings are thin;
- clamp bounds (design sketch: `λ ∈ [0.05, 5.0]`).

### 2.3 Outputs

| Output | Meaning |
|---|---|
| Home xG (`λh`) | Expected goals scored by the home team in 90′ (policy-defined horizon) |
| Away xG (`λa`) | Expected goals scored by the away team |
| Modifier audit | Ordered list of applied adjustments with magnitudes and source feature IDs |

Optional diagnostic outputs (not required for downstream if absent):

- `λ_total = λh + λa`
- `λ_diff = λh - λa`
- contribution breakdown (attack vs defense vs schedule vs weather vs availability)

### 2.4 Calculation sketch (non-normative)

Illustrative structure only — exact coefficients belong to a pinned `xgModelVersion`:

```text
attackTerm_h = f(AttackRating_home, DefenseRating_away)
attackTerm_a = f(AttackRating_away, DefenseRating_home)

λh_raw = λ0_home * attackTerm_h * homeFactor * restFactor_h * availFactor_h
λa_raw = λ0_away * attackTerm_a * awayTravelFactor * restFactor_a * availFactor_a

λh, λa = weatherAdjust(λh_raw, λa_raw, WeatherImpact)
λh, λa = clamp(λh, λa)
```

Rule Engine findings may supply **bounded** additive adjustments in log-λ space after this step, each recorded in the modifier audit. Unbounded or unpublished adjustments are forbidden by design.

### 2.5 Missing input policy

| Situation | Behavior |
|---|---|
| Missing both attack/defense for a side | Block Expected Goals stage |
| Missing weather | Use neutral factor `1.0`; flag uncertainty |
| Missing travel | Neutral away fatigue; reduce confidence via completeness |
| Missing availability | Neutral; do not assume full strength as a hidden default without stating “availability unknown” |

---

## 3. Probability Model

The probability model converts `(λh, λa)` (plus optional correlation / adjustments) into:

- Home Win % — `P(Home)`
- Draw % — `P(Draw)`
- Away Win % — `P(Away)`

with `P(Home) + P(Draw) + P(Away) = 1` after renormalization.

### 3.1 Candidate approaches

#### 3.1.1 Independent Poisson

Assume home and away goals are independent Poisson random variables:

```text
P(H=i) = e^{-λh} λh^i / i!
P(A=j) = e^{-λa} λa^j / j!
P(H=i, A=j) = P(H=i) P(A=j)
```

Then:

```text
P(Home) = Σ_{i>j} P(i,j)
P(Draw)  = Σ_{i=j} P(i,j)
P(Away)  = Σ_{i<j} P(i,j)
```

| Pros | Cons |
|---|---|
| Simple, fast, fully analytic, easy to explain | Underestimates draw rate / goal dependence in real football |
| Exact matrix for scorelines | Ignores correlation between team scores |

#### 3.1.2 Bivariate Poisson

Extends independence with a correlation structure (common shock or copula-style dependence) so `Cov(H,A) > 0` is representable. Score probabilities remain on a discrete grid; 1X2 is still the margin aggregate.

| Pros | Cons |
|---|---|
| Better empirical draw/totals behavior | One extra parameter (correlation) to pin and calibrate |
| Still deterministic and matrix-native | Slightly heavier explanation |

#### 3.1.3 Skellam

The difference `D = H - A` under independent Poisson is Skellam-distributed. Useful for margin probabilities, but **does not by itself yield a full scoreline matrix** without reintroducing a totals model.

| Pros | Cons |
|---|---|
| Closed form for win/draw/away under independence | Weak as a sole scoreline engine |
| Good diagnostic for margin | Same independence limits as Poisson |

#### 3.1.4 Monte Carlo

Sample many `(H,A)` draws from a generative model and histogram outcomes.

| Pros | Cons |
|---|---|
| Flexible for exotic dependencies | Reproducibility requires pinned RNG seed + draw count |
| Easy to extend | Harder to audit than an analytic matrix; slower; easy to hide instability |

For FAS V2 design goals (reviewability, exact replay, explainability), Monte Carlo is a **fallback research tool**, not the primary production model unless an authorization explicitly accepts seeded simulation contracts.

### 3.2 Recommended model

**Primary recommendation: Bivariate Poisson (or equivalent discrete correlated Poisson) on a capped goal grid**, with Independent Poisson as the documented degraded mode when correlation calibration is unavailable.

Rationale:

1. Preserves a single generative story for 1X2, scorelines, and totals.
2. Improves draw realism versus pure independence without leaving the deterministic matrix world.
3. Remains explainable: publish `λh`, `λa`, correlation `ρ` (or common-shock `λ0`), and the truncation cap.
4. Avoids Monte Carlo replay ambiguity.

**Skellam** may be used as a diagnostic cross-check for margin probabilities under the independence baseline, not as the sole emitter of top scorelines.

### 3.3 Post-matrix adjustments

After base probabilities from the matrix:

1. **Rule logit deltas** (optional): adjust `(pHome, pDraw, pAway)` in logit space from Rule Engine channel findings; renormalize.
2. **Market blend** (optional, governed):

```text
P_final = (1 - α) P_model + α P_oddsConsensus
```

`α ∈ [0, 1]` is policy-selected from evidence completeness and conflict rules (see doc 30). Market contribution must appear in the explainability graph.

### 3.4 Numerical policy

- Goal cap `G_max` (design sketch: 6 or 7); residual tail mass redistributed or tracked as `P(truncated)`.
- Reject / error if any probability is non-finite or sum drifts beyond ε after renormalization.
- Emit probabilities with fixed decimal policy for persistence (e.g. 6 d.p. internally, display rounding separate).

---

## 4. Scoreline Model

### 4.1 Probability matrix

Build a matrix `M[i][j] = P(H=i, A=j)` for `i,j ∈ {0…G_max}` using the recommended probability model.

Examples of cells:

| Scoreline | Cell |
|---|---|
| 0-0 | `M[0][0]` |
| 1-0 | `M[1][0]` |
| 2-1 | `M[2][1]` |
| 1-1 | `M[1][1]` |

Each cell must be reproducible from `(λh, λa, ρ, G_max, modelVersion)` plus any declared post-adjustments that act on the matrix (prefer adjusting `λ` / correlation **before** matrix build; avoid opaque cell surgery).

### 4.2 Ranking

1. Flatten cells to a list of `{homeGoals, awayGoals, probability}`.
2. Sort by probability descending.
3. Stable tie-break (design): lower total goals, then more home goals, then lexicographic — pinned in model version notes.
4. Compute `coverage_k = sum of top k probabilities`.

### 4.3 Top 3 scorelines

Emit exactly three entries (or fewer only if the support has fewer than three positive cells, which should not occur on a normal grid):

| Field | Content |
|---|---|
| Rank | 1..3 |
| Scoreline | `h-a` |
| Probability | Cell probability |
| Cumulative coverage | Sum of probabilities from rank 1..k |

Uncertainty flag when `coverage_3 < τ_cover` (design sketch: 0.35): “scoreline mass is dispersed; top 3 are weak representatives.”

### 4.4 Consistency with 1X2

Identity that must hold (within ε):

```text
P(Home) ≈ Σ_{i>j} M[i][j]
P(Draw)  ≈ Σ_{i=j} M[i][j]
P(Away)  ≈ Σ_{i<j} M[i][j]
```

If post-hoc 1X2 logit adjustments are applied **after** matrix aggregation, the design must either:

- rebuild an adjusted matrix (preferred), or
- mark scorelines as “pre-adjustment” and 1X2 as “post-adjustment” with an explicit inconsistency warning.

Silent disagreement is forbidden.

---

## 5. Goal Range Model

### 5.1 Buckets

| Bucket | Definition |
|---|---|
| `0-1` | Total goals `T = H + A` satisfies `T ≤ 1` |
| `2-3` | `2 ≤ T ≤ 3` |
| `4+` | `T ≥ 4` |

### 5.2 Calculation

From the scoreline matrix (including truncated tail policy):

```text
P(0-1) = Σ_{i,j: i+j ≤ 1} M[i][j]
P(2-3) = Σ_{i,j: 2 ≤ i+j ≤ 3} M[i][j]
P(4+)  = Σ_{i,j: i+j ≥ 4} M[i][j]  (+ truncated tail if assigned to 4+)
```

Normalize if truncation policy requires it so the three buckets sum to 1.

### 5.3 Recommendation input from ranges

- `recommendedBucket = argmax bucket probability`
- `margin = p_best - p_second`
- Environment rules (low/high scoring) may have already shifted `λ_total` upstream; they should not hard-override bucket probs without an audited reweight step.

### 5.4 Display contract

Emit all three probabilities even when one dominates. Never show only the winner without the distribution.

---

## 6. Recommendation Engine

The recommendation engine maps quantitative projections + confidence into a **closed enum**. No free-text generation inside this engine.

### 6.1 Inputs

| Input | Source |
|---|---|
| Probability | `pHome`, `pDraw`, `pAway` |
| Confidence | Projection confidence in `[0, 1]` |
| Rule Agreement | Component `A` (and optionally contradiction `X`) from the confidence model |
| Goal range distribution | `P(0-1)`, `P(2-3)`, `P(4+)`, margins |
| Guards | Insufficient-evidence / market-only flags |

### 6.2 Output codes

| Code | Meaning |
|---|---|
| `lean_home` | Material probabilistic lean to home win |
| `lean_away` | Material probabilistic lean to away win |
| `lean_draw` | Material probabilistic lean to draw |
| `high_scoring` | Strong lean to elevated totals (`4+` or high `λ_total` policy) |
| `low_scoring` | Strong lean to suppressed totals (`0-1` / tight `2-3` policy) |
| `cautious` | Thin margins, mid confidence, or mild conflicts |
| `insufficient_evidence` | Completeness/confidence gates fail |

A single primary code is required. Optional secondary tags (e.g. primary `lean_home` + secondary `low_scoring`) may be designed later; V2 baseline emits one primary code plus a limitations list.

### 6.3 Decision policy (design sketch)

Evaluate in order (first match wins):

1. If completeness guard or `confidence < τ_insuff` → `insufficient_evidence`.
2. If `confidence < τ_cautious` or rule agreement `A < τ_agree` or contradiction high → `cautious`.
3. If goal-range margin ≥ `τ_range` and best bucket is `4+` **and** 1X2 margin is weak → `high_scoring`.
4. If goal-range margin ≥ `τ_range` and best bucket is `0-1` (or low `2-3` under policy) **and** 1X2 margin is weak → `low_scoring`.
5. If `pHome` is max and `pHome - second ≥ τ_margin` and `confidence ≥ τ_lean` → `lean_home`.
6. Symmetric for `lean_away` / `lean_draw`.
7. Else → `cautious`.

Thresholds are pinned on `recommendationPolicyVersion`. They are not inferred per match.

### 6.4 Output payload

```text
recommendation = {
  code,
  confidence,
  supporting: { pHome, pDraw, pAway, goalRange, topScorelines },
  ruleAgreement,
  limitations[],   // e.g. "market conflict", "availability unknown"
  policyVersion
}
```

---

## 7. Calibration

Calibration answers: when the engine says `P(Home) = 0.40`, do home wins actually occur about 40% of the time in comparable situations?

### 7.1 Why calibration matters

Uncalibrated models can rank matches correctly (home more likely than away) while systematically overstating confidence — e.g. emitting 55% when the true rate is 45%. That damages:

- recommendation gates (false `lean_*`);
- user trust in explainable percentages;
- post-match review and Statistics learning loops;
- any future comparison against market consensus.

Calibration does not create new evidence; it reshapes probability outputs under a pinned map learned from historical projections vs verified results (and optionally markets).

### 7.2 Market calibration

| Idea | Design |
|---|---|
| Purpose | Align model probabilities with liquid market consensus when markets are eligible signals |
| Mechanism | Estimate blend `α` or isotonic/Platt-style maps from model prob → market-implied prob residuals |
| Constraint | Market remains a **signal**; calibration must record bookmaker set, timing (cutoff), and overround removal method |
| When to down-weight | Illiquid competitions, sparse books, stale odds, strong model–market conflict with rich on-pitch evidence |

### 7.3 Historical calibration

| Idea | Design |
|---|---|
| Purpose | Fit reliability curves from past sealed projections vs verified outcomes |
| Mechanism | Bin predicted probabilities; compare empirical frequencies; fit a monotone calibration map |
| Units | Separate maps for 1X2 outcomes; optional maps for totals buckets |
| Governance | Maps are versioned artifacts; promotion is human-approved (not automatic from this design doc) |

### 7.4 Season calibration

| Idea | Design |
|---|---|
| Purpose | Correct for season-specific scoring environments (rule changes, ball, style shifts) |
| Mechanism | Season-level baseline `(λ0_home, λ0_away)` and/or multiplicative season factors applied before or inside xG |
| Refresh | After sufficient matchdays; never rewrite historical bundles — only affect new runs with new versions |

### 7.5 Application order (design)

```text
Raw matrix probs
  → historical/season calibration map (if present)
  → optional market blend / market calibration
  → recommendation gates on calibrated probs
```

All calibration steps emit before/after values in the explainability graph.

### 7.6 Anti-patterns

- Calibrating on the same match being predicted (leakage).
- Silent use of post-kickoff information.
- Overfitting tiny samples without shrinkage.
- Presenting calibrated probs without stating `calibrationMapVersion`.

---

## 8. Explainability

Every projection field must be reconstructible from a stored lineage. Prediction Engine V2 owns the **intra-projection** chain; Rule Engine V2 owns the upstream Evidence → Feature → Rule edges.

### 8.1 Required chain

```text
Expected Goals (λh, λa + modifiers)
  → Probability (pHome, pDraw, pAway)
  → Scoreline (matrix cells / top 3)
  → Recommendation (code + gates)
```

Extended end-to-end (with Rule Engine V2):

```text
Evidence → Feature → Rule findings → Expected Goals → Probability → Scoreline → Goal Range → Recommendation → Analysis Report citation
```

### 8.2 Minimum trace contents

| Node | Must record |
|---|---|
| Expected Goals | Input feature IDs/values, baseline ids, each modifier, output `λh`/`λa` |
| Probability | Model type/version, `ρ`/`G_max`, pre/post calibration, market `α` if used |
| Scoreline | Ranking rule, top 3 cells, coverage_3, link to matrix checksum |
| Goal Range | Bucket sums from matrix checksum |
| Recommendation | Gate thresholds, which gate fired, confidence & agreement inputs |

### 8.3 User-facing explanation pattern

For any headline number, the engine must support answers to:

1. What xG values produced it?  
2. Which probability model mapped xG to 1X2?  
3. Which scoreline cells dominate / support the lean?  
4. Which recommendation gate selected the final code?  
5. What calibration or market blend changed the raw model probs?

### 8.4 Invariants

1. No projection atom without upstream references (except declared baselines with identity).  
2. Re-run with identical pinned inputs/versions reproduces identical traces.  
3. AI narrative layers (future Prompt Engine) may describe the trace but cannot invent edges.  
4. Analysis Report stores the bundle checksum; editing prose cannot alter projections.

### 8.5 Illustrative lineage

```text
Features: AttackRating_h=72, DefenseRating_a=48, HomeAdvantage=0.62, …
  → λh=1.55, λa=1.05 (xgModelVersion=xg.v2.draft)
  → bivariate_poisson ρ=0.12 → pHome=0.47, pDraw=0.26, pAway=0.27
  → Top scorelines: 1-0 (0.11), 2-0 (0.09), 2-1 (0.08); coverage_3=0.28 (dispersed flag)
  → Goal range: 0-1=0.22, 2-3=0.48, 4+=0.30
  → confidence=0.66, ruleAgreement=0.71
  → recommendation=lean_home (margin gate + confidence gate)
```

---

## 9. Handoff to Analysis Report

Prediction Engine V2 emits a sealed **projection bundle** consumed by Analysis / Report composition:

- 1X2 probabilities (calibrated);
- top 3 scorelines;
- goal range distribution;
- recommendation;
- confidence + components;
- explainability graph + checksums;
- model/calibration version identities.

The report may:

- render charts and narratives grounded in the bundle;
- attach rule/feature/evidence panels via shared IDs.

The report must not:

- recompute `λ` or probabilities with a different silent model;
- upgrade calibration maps during render;
- convert market prices into “facts.”

---

## 10. Out of Scope

- Any implementation in packages, apps, APIs, or UI.
- Changes to governance, architecture ADRs, or V1 engine authority documents.
- Live in-play prediction, player prop markets, or betting execution.
- Automatic promotion of calibration maps without human approval.
- LLM-inside-the-engine probability generation.

## 11. Non-binding adoption notes

1. Lock `xgModelVersion` and `probabilityModelVersion` behind golden fixtures.  
2. Prove matrix ↔ 1X2 ↔ goal-range consistency tests before UI exposure.  
3. Introduce historical calibration only with offline evaluation reports.  
4. Wire explainability graph persistence before publishing V2 projections to humans.

This document alone is not an implementation gate.
