# R1A — Replay-Driven Match Script Calibration Audit

| Field | Value |
|---|---|
| Sprint | **R1A** Replay-Driven Match Script Calibration |
| Type | **DESIGN / AUDIT ONLY** — no production code, tests, or state-index updates |
| Date | 2026-08-11 |
| Authority | Architecture Freeze **v0.3** · `AGENTS.md` Project Governance Rule · task-authorized audit (explicit human request) · P2H Replay · P2I Diagnostics · M1B Manager integration · P2D–P2G Match Script / Unified Matrix path |
| Roadmap cite | Task-authorized. **Naming collision note:** `docs/40_PRODUCT_ROADMAP.md` Sprint **R1** is **AI Review**, not this audit. R1A must not be confused with roadmap R1. Add R1A to doc 40 only when product sequencing is formally updated. |
| Explicit exclusions | Production code · tests · Projection mathematics rewrite · new Engine · new Provider · new Football State dimension · new Features/Rules · LLM/ML · Architecture Freeze changes · PROJECT_STATE / PROJECT_INDEX updates |

---

## 1. Executive Summary

The V2 pipeline can already **measure** Match Script / score-distribution failure modes via Evaluation History → P2H Replay → P2I Diagnostics. It does **not** yet have a governed calibration loop that changes script affinities from those measurements.

**Primary architectural finding:** Match Script activation is **Football-State-only**. Rules, Market Intelligence, and most Feature asymmetry do **not** select scripts. Script fields `activatingRules` / `strengtheningFeatures` are always empty by design (`match-script-set.ts` deprecation notes). Football State `driverRuleNames` is always `[]`.

**Primary calibration finding:** Bidirectional Feature averaging inside each Football State dimension collapses home/away attack and defense into **one shared level**, while favorite-vs-underdog discrimination is deferred to (a) λ construction and (b) asymmetric script bonuses with **`minimumRatingGap: 0`**. That combination tends to **over-activate Control scripts** whenever any attack-rating edge exists, while **Open Match / high-score tails** remain weakly activated and structurally under-powered under independent Poisson (`G_MAX = 6`).

**Market finding:** Market Rules are `channel: "none"`. They affect **confidence** and **recommendation cautiousness**, never Match Script weights or λ. Handicap confirmation vs 1X2 lean is only partially distinguishable in confidence; it does not reshape scripts.

**Repeat-fixture finding:** Capability gap. Knockout `leg` exists only as a pressure/knockout Feature scalar. There is **no** Evidence/Feature/Rule for “same teams met recently,” previous scoreline, extreme prior result, or tactical correction.

**Verdict for future coding:** Calibration should start as **governed Match Script parameter / affinity adjustments** (and optional side-aware scoring inside existing dimensions), measured by P2H/P2I before/after — **not** Projection math rewrite, not new engines, not hard-coded historical outcomes.

This audit **does not authorize** production implementation.

---

## 2. Current Match Script Architecture

### 2.1 Catalog (`matchScript.v1`)

Governed in `packages/analysis/src/projection-v2/match-script/match-script-governed-parameters.ts`:

| Script ID | Label | λ modifiers (home / away / drawBias) | Main activation drivers |
|---|---|---|---|
| `home_control` | Home Control | 1.08 / 0.92 / 0 | control≥medium, attack≥medium, **home attack rating > away (gap>0)** |
| `away_control` | Away Control | 0.92 / 1.08 / 0 | control≥medium, attack≥medium, **away attack rating > home (gap>0)** |
| `counter_attack` | Counter Attack | 0.90 / 1.05 / 0 | transition≥medium, attack≥medium, `TRANSITION_CHANNEL`, home gap>2 |
| `open_match` | Open Match | 1.12 / 1.12 / 0 | attack≥medium, defense **≤ medium** |
| `low_event` | Low Event | 0.85 / 0.85 / 0.06 | defense≥medium, `LOW_EVENT_SHAPE`, control≤low |
| `balanced` | Balanced | 1.00 / 1.00 / 0 | **baselineAffinity = 1** (always strong prior) |

Softmax: temperature `0.85`, `minScriptWeight = 0.1`, `minActiveScripts = 2`, then weight re-normalization.

### 2.2 Scoring function

`scoreMatchScriptFromFootballState`:

1. Start from `baselineAffinity`
2. Add dimension level bonuses
3. Add composite-tag bonuses
4. Add asymmetric bonuses from `projectionInputs.homeAttackRating − awayAttackRating`
5. Optional max-level caps (open_match / low_event)

**No Rule names, no Market Features, no direct Feature list** enter script scoring.

### 2.3 Downstream effect

```text
generateMatchScriptSet(FootballState)
  → per-script λ = baseΛ × modifiers
  → independent Poisson matrix per script (G_MAX=6)
  → optional drawBias (low_event only)
  → convex cell merge (convex_cell_merge_v1)
  → 1X2 marginals + calibration only (no Rule softmax on V2)
```

V2 limitation text (implementation): scorelines/BTTS/O-U come from the unified matrix; **1X2 receives calibration only** — unlike V1, which still applies football-channel `softmaxAdjust`.

---

## 3. Current Information Flow

```text
Evidence (facts / market / manager / …)
  → Features (omit if missing; never estimate)
  → Rules (football channel home+/away+; market channel none)
  → Football State (6 dimensions + composite tags + projectionInputs)
  → Match Script set (FS-only affinities + softmax)
  → LambdaBuilderV2 (projectionInputs + Feature group factors)
  → Multi-script Poisson matrices → merge
  → Sealed DeterministicMatchProjection
  → Evaluation History (+ replay sidecar features/rules checksums)
  → P2H Replay Comparison / Report
  → P2I Diagnostics
  → Workspace overlays
```

### Where information is preserved vs lost

| Stage | Preserves | Loses / compresses |
|---|---|---|
| Feature | Side-specific attack/defense/xG/chance/club/player/manager metrics when Evidence exists | Nothing invented; absent = omit |
| Rule | Explainable PASS/FAIL edges; market supporting findings | Market never enters football softmax / scripts |
| Football State | Six levels + tags; side ratings in `projectionInputs` | **Per-dimension score averages home+away Features** into one level |
| Match Script | Mixture of narrative λ shapes | Rules unused; weak open/high-tail; gap>0 Control trigger |
| Probability Matrix | Full score grid to 6–6 | Independent Poisson (no score correlation); truncation beyond 6 |
| Sealed Projection | 1X2 + top scorelines + goal ranges | Exact-score mass diluted; Rule channel not re-applied on V2 1X2 |
| Replay/Diagnostics | Winner/draw/score/range/BTTS/OU + script/state stats | Sidecar memory-local; BTTS/OU still partly proxy-based |

---

## 4. Existing Capabilities

### 4.1 Football State (P2D)

Dimensions (fixed; M1B did not add any):

- `attackState`, `defenseState`, `controlState`, `transitionState`, `pressureState`, `riskState`

Composite tags:

- `LOW_EVENT_SHAPE`, `TRANSITION_CHANNEL`, `ELEVATED_PRESSURE`, `ELEVATED_RISK`

Manager (M1B) feeds **pressureState** (tenure/continuity/experience/career) and **riskState** (change risk) only.

Club / Player / xG / Match Context Features are already listed in dimension Feature maps and/or λ Feature groups.

### 4.2 Underdog / attack Feature inventory (already present when Evidence exists)

| Concept | Existing Features (examples) | Used in λ? | Used in FS dimension? | Used in Match Script scoring? |
|---|---|---|---|---|
| Attacking efficiency | `attackEfficiency*` | Yes (attack group) | Yes (`attackState`) | Indirect via FS level only |
| Shots / chance creation | `chanceCreation*` | Yes | Yes (`controlState`) | Indirect |
| xG | `xgAttackQuality*`, `xgDominance` | Yes (xg group) | Yes (`attackState` / `transitionState`) | Indirect |
| Transition threat | `finishingEfficiency*`, momentum, xG dominance | Partial | `transitionState` | `counter_attack` / tag |
| Opponent defensive weakness | `defenseRating*`, `goalsConcededRate*`, `xgDefenseQuality*`, `clubDefensiveStrength*` | Yes (defence group vs opponent) | Averaged in `defenseState` | `open_match` max defense level only |
| Club / form strength | `clubStrength*`, `formStrength*`, `pointsPerMatch*` | Yes | Partial (`controlState` / attack via ratings) | Indirect via ratings gap |

**Conclusion for hypothesis B:** Features are often **sufficient**. Match Script under-uses side-specific underdog attack because FS levels are bilateral averages and Control scripts fire on any rating gap.

### 4.3 Replay & diagnostics (measurement ready)

P2H metrics: Winner / Draw / Exact Score / Goal Range / BTTS / Over-Under hit rates; confidence correlation; script contribution; Football State contribution.

P2I diagnostics: failure distribution; script accuracy / score error / goal error; FS false-positive/negative operational defs; rule saturation / conflict pairs; confidence buckets.

Evaluation History: sealed prediction + actual; A1.5 append-only.

These are adequate to **detect** favorite overconfidence, draw misses, score/tail misses, and script-specific error — once a qualified population exists.

### 4.4 Market intelligence (supporting only)

Rules: `MARKET_LEAN_*`, `MARKET_AH_LEAN_*`, `MARKET_CONSENSUS`, `STEAM_MOVE`, `REVERSE_LINE_MOVEMENT`, `MARKET_VOLATILITY`, `SHARP_SUPPORT` — all `channel: "none"`.

Effects today:

- Confidence alignment bonus / disagreement penalty (`intelligence-confidence.ts`)
- Projection **recommendation** forced to `cautious` when 1X2 market lean conflicts with football directional lean (`marketConflictsWithFootball` uses **only** `MARKET_LEAN_HOME` / `MARKET_LEAN_AWAY`, not AH)

Does **not** affect Match Script selection or λ.

### 4.5 Confidence

Policy `confidence.mvp.a05` reused across intelligence domains (including Manager completeness/agreement). Separate projection confidence components `A/C/S/X` on V2. Neither redesigns Match Script.

---

## 5. Existing Gaps

1. **No side-aware Football State levels** — attack/defense/control compress both teams.
2. **Control asymmetric bonus threshold is zero** — any attack-rating edge boosts a Control script.
3. **Rules do not drive scripts** — Rule agreement cannot rescue or veto a script mixture.
4. **Open Match activation is weak relative to Balanced prior** (`baselineAffinity` 1.0 vs open ~0.05–0.60).
5. **No high-score / early-goal / correlated-scoring script** — open_match only scales both λ by 1.12 under independence.
6. **No repeat-fixture / prior-result / correction path** (Evidence → Feature → Rule → Script).
7. **Market conflict does not reshape scripts**; AH confirmation weakness is not a first-class conflict type for projection recommendation.
8. **V2 drops Rule softmax on 1X2** — football Rule edges influence sealed 1X2 only indirectly via Features→λ→matrix (and confidence/recommendation).
9. **Replay sidecar not durable** (P2H/P2I limitation) — calibration loops need stable history+sidecar for fair before/after.
10. **BTTS / O-U replay metrics** still partly use proxies — score-calibration claims must prefer exact score / goal-range / matrix-native metrics where available.

---

## 6. Failure Mode Matrix

| Failure mode | Mechanism in current code | Likely symptom in Replay/Diagnostics |
|---|---|---|
| Favorite overconfidence | Control scripts + λ attack/club factors amplify favorite; away λ suppressed (0.92) under home_control | High-confidence winner misses when underdog wins or draws; Control scripts among worst by winner accuracy |
| Underdog scoring threat | Underdog attack Features exist but averaged away in FS; Control suppresses underdog λ | Exact-score / BTTS misses when underdog scores; away goals systematically low vs actual |
| Open-game underestimation | `open_match` needs attack≥medium and defense≤medium; Balanced prior dominates; no bilateral “both can score” asymmetry | Goal-range / O-U misses on open fixtures; open_match low activation frequency |
| High-score tail underestimation | Independent Poisson + modest 1.12 open multipliers; G_MAX=6 but mass on 3–4+ tiny at typical λ | Exact-score misses on 3–4 / 4–3 / 3–2; high average score error on open_match-absent mixtures |
| Repeat-fixture adjustment | Absent end-to-end | Systematic errors after extreme prior H2H meetings; not attributable to a script today |
| Market conflict | Confidence ↓ / recommendation cautious only | Cautious recommendations with still-skewed sealed probabilities; script mixture unchanged |
| Draw underestimation | Only `low_event` has drawBias 0.06; Control/Open have 0; V2 no Rule draw channel | Draw miss rate elevated vs winner hit; low_event under-activated when control is medium+ |
| Score-vs-result calibration gap | 1X2 marginals easier than exact cells under independence | Winner hit ≫ exact-score hit; diagnostics show score_miss dominant even when winner_hit OK |

---

## 7. Evidence Matrix

Legend: **Y** = present and material · **P** = partial / indirect · **N** = absent

| Failure mode | Feature | Rule | Football State | Match Script | Projection | Replay/Diag | Missing capability |
|---|---|---|---|---|---|---|---|
| Favorite overconfidence | Y (ratings, club, form) | Y (strength/form edges) | P (shared levels + side ratings) | Y (Control + gap>0) | Y (λ + modifiers) | Y (winner/confidence) | Side-aware state; stricter Control gates |
| Underdog scoring threat | Y (efficiency, xG, chance, opp defense) | Y (attack/defense edges) | P (averaged) | P (counter_attack weak; Control suppresses) | P (λ can keep underdog goals if not suppressed) | Y (score/BTTS) | Script floors for underdog λ; side attack tags |
| Open-game underestimation | Y | P | P (`attack` high + `defense` not high) | P (`open_match`) | P (1.12/1.12) | Y | Stronger open activation; bilateral threat tag |
| High-score tail | P (rates/xG) | P | P | P | P (Poisson tail) | Y (score/goal error) | Tail-oriented script or governed open multipliers — **without** rewriting Poisson core math in-place without gate |
| Repeat-fixture | N | N | N (knockout leg ≠ prior result) | N | N | N (cannot attribute) | Evidence of prior meeting + Feature/Rule — future sprint |
| Market conflict | Y (odds Features) | Y (market rules) | N | N | P (recommendation only) | P (confidence diags) | Optional script dampening on conflict — governance sensitive |
| Draw underestimation | P | P (`FORM_NEAR_PARITY` channel none) | P (`LOW_EVENT_SHAPE`) | P (`low_event`) | P (drawBias only on low_event) | Y (draw_miss) | Draw-capable mixture when parity Features present |
| Score vs result | Y | Y | Y | Y | Y (matrix) | Y | Calibration targets for score/range separate from 1X2 |

---

## 8. Historical Case Analysis

**Method note:** These six matches are **qualitative error archetypes** supplied for failure-mode classification. This audit did **not** re-ingest live Evidence for each fixture, did **not** seal predictions for them, and must **not** be used as hard-coded regression oracles. Assignments below are **architecture-conditioned likelihoods** of how the current pipeline behaves given typical favorite/underdog/open/draw patterns — not measured replay outputs.

| # | Match (actual) | Behavior current architecture would likely favor | Likely failure mode(s) | Primary gap class |
|---|---|---|---|---|
| 1 | Yokohama F. Marinos **3–4** Kashima Antlers | If home club/form edge → `home_control` + Balanced; away λ suppressed; open_match weak → low mass on 3–4 | Open-game underestimation · High-score tail · Underdog scoring threat | Match Script gap + Projection calibration gap (independent Poisson tail) · possible Feature gap if xG/chance thin |
| 2 | Sirius **2–2** Brommapojkarna | Near-parity → Balanced dominates; low_event only if defense medium and control low; drawBias rarely applied | Draw underestimation · Score-vs-result gap | Match Script gap (draw path) · Football State aggregation gap |
| 3 | Västerås **1–0** Djurgårdens IF | Away favorite (club/strength) → `away_control` / elevated away λ; home underdog low-score win underrepresented | Favorite overconfidence · possible underdog threat (home) | Match Script gap · Rule/Feature may correctly mark favorite but script over-converts |
| 4 | AIK **0–3** Örgryte | Home favorite Control → home λ↑ away λ↓; 0–3 requires strong away scoring under suppression | Favorite overconfidence · Underdog scoring threat · Score tail | Match Script gap · λ suppression from Control |
| 5 | KFUM Oslo **2–1** Kristiansund | Narrow home win often compatible with home_control/balanced | May be **in-distribution**; residual exact-score noise | Replay/measurement gap until population metrics separate luck vs bias · mild score-vs-result gap |
| 6 | Internacional **2–0** Corinthians | Home favorite Control / club edge → directionally plausible; clean sheet depends on defense Features | If over-confident 1X2 OK but wrong score/range → score-vs-result; if market AH disagreed → market conflict (recommendation only) | Projection calibration / measurement · Market conflict not script-linked |

**Do not optimize parameters to flip these six rows.** Use them only to ensure candidate calibrations have a hypothesized mechanism that would move the **failure mode class**, then validate on a held-out replay population.

---

## 9. Overfitting Risk Analysis

### 9.1 How overfitting would happen

- Tuning `matchScript.v1` affinities / multipliers until the six named matches improve.
- Adding Features/Rules named after these fixtures’ narratives.
- Using the six matches as acceptance tests for promotion.
- Interpreting single-match Workspace screenshots as population proof.

### 9.2 Required anti-overfit controls (for future coding sprint)

1. **Freeze a baseline replay cohort** (qualified n from Evaluation History) **before** changing parameters.
2. Hold out a **validation cohort** that excludes any qualitative showcase set used during design.
3. Promote only if **population** P2H/P2I metrics improve (or do not regress) on winner **and** at least one score-distribution metric (exact score and/or goal-range), with sample-size qualification thresholds already used by P2H/P2I.
4. Candidate changes ship as **versioned Projection Parameter Artifact / Match Script parameter set** (P2J pattern) — not ad-hoc constants in multiple files.
5. Qualitative six-match review is **illustrative only** in the completion report; never encoded as fixtures that must pass.
6. No LLM/ML fitting of weights to outcomes.

---

## 10. Candidate Calibration Directions

**Do not implement in R1A.** Ranked for a future authorized coding sprint:

| Rank | Direction | Expected impact | Architectural risk | Data availability | Replay measurability | Overfitting risk |
|---|---|---|---|---|---|---|
| 1 | Tighten Control asymmetric gates (`minimumRatingGap` > 0; require defense/control asymmetry) | High vs favorite overconfidence | Low (catalog params only) | Uses existing ratings | High (script activation + winner) | Medium — constrain via population metrics |
| 2 | Strengthen `open_match` / weaken Balanced prior when bilateral attack Features high and defense not high | High vs open/tail | Low–medium | Needs attack/defense Features present | High (goal-range, score error, open activation) | Medium |
| 3 | Side-aware scoring **inside existing dimensions** (e.g. homeAttackLevel/awayAttackLevel as internal refs feeding tags — **no new published dimension IDs** without separate gate) | High | Medium (FS scoring contract) | Existing Features | High | Medium |
| 4 | Underdog λ floor / anti-suppression when underdog attack Features exceed threshold (script modifier policy) | Medium–high | Medium (must stay Match-Script-mediated) | Existing Features | High (BTTS, away goals error) | Medium |
| 5 | Draw-capable mixture when parity Features/Rules present (still FS/script params; avoid resurrecting Rule softmax unless gated) | Medium | Medium | Partial (`FORM_NEAR_PARITY` is channel none) | High (draw_miss) | Medium |
| 6 | Market-conflict dampener on Control concentration (script weights only; keep market off football softmax) | Medium | Medium–high (epistemic boundary) | ODDS present | Medium (confidence + winner under conflict slice) | High if slice is tiny |
| 7 | Repeat-fixture Evidence → Feature → Rule → FS/tag | High for that subclass | High (new Evidence semantics; Provider coverage) | Often unavailable | High once Evidence exists | Low if Evidence-first |
| 8 | Rewrite Projection mathematics / correlated score models / new Engine | Potentially high | **Unacceptable under Freeze v0.3 without defect gate** | N/A | N/A | High |

---

## 11. Recommended R1A Implementation Scope

R1A itself is audit-only. The following scopes apply to the **next explicitly authorized coding sprint** (suggested id: **R1B** — name TBD; must not collide with roadmap **R1 AI Review** without doc 40 update).

### MUST

- Treat this audit as input only; require a separate coding authorization citing Freeze v0.3 + this document.
- Establish baseline P2H/P2I metrics on a qualified Evaluation History cohort.
- Limit first coding pass to **governed Match Script parameter calibration** (and optionally documented FS scoring clarifications) via versioned artifacts.
- Preserve: no new Engine, no new Provider, no new Football State **dimension IDs**, no LLM/ML, no hard-coded historical outcomes.
- Keep Market Rules off football probability softmax unless a new ADR + Freeze update explicitly overturns v0.3.
- Deliver before/after replay comparison + regression tests on pipeline invariants (not on the six showcase scores).

### SHOULD

- Add diagnostic slices: Control-dominant matches, open_match activation band, draw outcomes, high total-goals outcomes.
- Prefer matrix-native score/goal-range metrics over BTTS/OU proxies when claiming score calibration gains.
- Durable replay sidecar (former P2I follow-on / P2K-class) if before/after cohorts cannot survive process restart.

### WON'T (this calibration track)

- Projection mathematics redesign (new score correlation model, non-Poisson core) without a separate architecture defect gate.
- New Engine or Provider.
- New Football State dimension.
- Automatic promotion of parameters from six qualitative matches.
- LLM/ML weight learning.
- Bypassing Match Script to inject Features/Rules directly into sealed score grids.

---

## 12. Acceptance Criteria for the Future Coding Sprint

A future coding sprint is **complete** only if all hold:

1. **Baseline replay metrics** recorded (P2H summary + P2I failure/script/state sections) with sample size and qualification flags.
2. **Candidate calibration comparison** against baseline on the same sealed History cohort (sidecar-complete V2 rows).
3. **No architecture boundary changes** (dependency-cruiser + Freeze v0.3 pipeline direction unchanged).
4. **No direct Projection math rewrite** — Poisson independence, merge algorithm identity, and G_MAX remain unless separately authorized.
5. **No LLM / ML**.
6. **No hard-coded historical outcomes** for the six qualitative matches (or any named showcase set).
7. **Regression tests** for script generation determinism, parameter artifact pin, and existing package tests green.
8. **Before/after replay comparison** published in the completion report (winner + at least one score-distribution metric; script activation shifts explained).
9. **Promotion gate**: candidate artifact remains non-default until human review; default pin changes only after explicit acceptance (mirrors Evaluation-qualified calibration discipline).

---

## 13. Governance

- **This audit does not authorize production code changes.**
- **No new Engine.**
- **No new Provider.**
- **No new Football State dimension.**
- **Architecture Freeze v0.3 remains unchanged.**
- **Future implementation requires explicit coding authorization** (and should cite this document + resolve the doc 40 naming collision with roadmap R1 AI Review).
- Production coding must still prefer correcting owning documents over parallel design papers; this file is a **sprint audit artifact**, not a new numbered architecture chapter.
- Evidence First remains binding: missing Evidence → omit Feature → INAPPLICABLE Rule → no estimation.

---

## Appendix A — Implementation anchors audited

| Area | Primary paths |
|---|---|
| FS compute / maps | `packages/analysis/src/projection-v2/football-state/compute-football-state.ts` |
| FS scoring / levels | `.../football-state-scoring.ts` |
| Script catalog | `.../match-script/match-script-governed-parameters.ts` |
| Script scoring / softmax | `.../match-script-football-state-scoring.ts`, `match-script-generator.ts` |
| Multi-script + merge | `.../multi-script/compute-multi-script-projection.ts`, `probability-matrix/merge-probability-matrices.ts` |
| V2 projection | `.../compute-projection-v2.ts`, `projection/compute-deterministic-projection-v2.ts` |
| λ Feature groups | `.../lambda/lambda-feature-groups.ts`, `feature-enriched-lambda-weights.ts` |
| Poisson grid | `projection/projection-math.ts` (`G_MAX = 6`) |
| Confidence / market | `confidence/intelligence-confidence.ts`; market conflict in V2 projection |
| Replay / diagnostics | `packages/statistics/src/replay/*`, `diagnostics/*` |
| Prior sprint reports | P2H, P2I, M1B completion reports |

## Appendix B — Hypotheses A–F (compact answers)

| ID | Question | Audit answer |
|---|---|---|
| A | Favorite overconfidence / attack vs defense distinction? | **Likely yes on overconfidence.** Attack vs defense Features exist and enter λ separately, but Control scripts over-trigger on any attack-rating gap and FS levels do not keep side-specific attack/defense. |
| B | Underdog scoring threat preserved? | **Features often yes; scripts no.** Suppression via Control modifiers is the main loss point. |
| C | Open / high-score tail (e.g. 3–4)? | **Systematically underrepresented** by weak open activation + independent Poisson + favorite Control suppression. |
| D | Repeat fixture / second-leg correction? | **Absent** as prior-result correction. Knockout leg is pressure-only. |
| E | Market conflict nuances? | **Partially** in confidence; **1X2 lean conflict** → cautious recommendation; **AH confirmation weakness** not a first-class projection conflict; **no script effect**. |
| F | Score vs result strength? | **Stronger at 1X2 than exact score / tails** by construction; information loss accumulates FS → Script → independent matrix. |

---

**End of R1A audit. No source code, tests, PROJECT_STATE.md, or PROJECT_INDEX.md were modified.**
