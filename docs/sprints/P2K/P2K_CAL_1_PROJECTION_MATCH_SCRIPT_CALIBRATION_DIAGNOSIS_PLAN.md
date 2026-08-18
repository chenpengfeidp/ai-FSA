# P2K-CAL-1 — Projection / Match Script Calibration Diagnosis Plan

**Status:** COMPLETED (PLANNING / DIAGNOSIS ONLY)  
**Sprint id:** P2K-CAL-1  
**Date:** 2026-08-18  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues Football Intelligence / P2K Validation Governance after P2K-G3 (`docs/sprints/P2K/P2K_G3_VALIDATION_PREDICTION_DISTRIBUTION_AUDIT.md`).  
**Stop boundary:** Code + data + math-chain audit and calibration **plan** only. **No production code change. No Candidate C edit. No P2K-H. No cohort expansion.**

---

## Authority distinctions (mandatory)

| Term | Meaning in this sprint | Not implied |
| --- | --- | --- |
| **Diagnosis** | Explain λ / Goal Range / Draw / Match Script behavior with evidence | Implementation |
| **Calibration plan** | Candidate directions + validation protocol for a **future authorized** sprint | Production change |
| **Validation qualification** | Cohort / metrics gates for measuring a candidate | Promotion of Candidate C |
| **Promotion** | Explicit human gate to change production default | Anything in this document |

**Diagnosis ≠ Calibration implementation**  
**Calibration plan ≠ Production change**  
**Validation qualification ≠ Promotion**

---

## Inputs (immutable)

| Artifact | Id |
| --- | --- |
| SEALED Expansion V2 cohort | `p2k.e.validation.expansion.v2.analyzematch.v1` |
| membershipDigestSha256 | `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997` |
| Baseline A Replay Run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.a` |
| Candidate C Replay Run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.c` |
| P2K-G evaluation | `eval.p2k.g.validation.expansion.v2.analyzematch.v1` |
| P2K-G3 audit | `docs/sprints/P2K/P2K_G3_VALIDATION_PREDICTION_DISTRIBUTION_AUDIT.md` |

Prior Recovery V2 / V1 cohorts remain SEALED and out of scope for mutation.

---

## A. λ calibration audit

### A.1 Complete generation formula (Projection V2)

**Stage 1 — Feature → group factors** (`buildFootballStateProjectionInputs`):

For each `(side, group)` with mode `multiplier` (attack / xg / clubStrength / matchContext / defence) or `suppressor` (playerAvailability):

\[
\delta = \sum_i w_i \cdot \mathrm{centered}(x_i, \mathrm{scale}_i)
\]

\[
\mathrm{factor}_{\mathrm{group}} = \mathrm{clamp}(1 + \delta,\ 0.05,\ 2.5)
\quad\text{(suppressor upper bound = 1.0)}
\]

`unitCentered` scale: \((x - 0.5) \times 2\).  
**Diagnosis note:** many attack Features (e.g. `recentForm*`, `momentum*`) are stored on a ~0–100 domain. Under `unitCentered`, a typical value \(x \approx 50\) yields contribution \(\approx 99 \cdot w_i\), so **attack group factor saturates at 2.5** unless values are near 0. This is a primary structural driver of high λ (see A.4).

**Stage 2 — Base λ** (`buildLambdasV2` / `sideLambdaFromProjectionInputs`):

\[
\lambda_{\mathrm{side}} = \mathrm{clamp}\!\left(
\frac{\mathrm{baseRate} \cdot \mathrm{attackFactor} \cdot \mathrm{contextFactor} \cdot \mathrm{availabilityFactor}}{\mathrm{defenseFactor}}
\cdot \mathrm{homeFieldFactor},\ 
\min,\ \max\right)
\]

where:

| Symbol | Source | Governed value |
| --- | --- | --- |
| `baseRate` | `FEATURE_ENRICHED_LAMBDA_PARAMETER_SET` | **1.3** |
| `min` / `max` | same | **0.05 / 5** |
| `ratingScale` | same | **50** |
| `defenseFloor` | same | **0.05** |
| `homeAttackShare` / `awaySuppressShare` | same | **0.6 / 0.4** |
| `attackFactor` | `attackBase × ∏(attack,xg,clubStrength factors)` | — |
| `attackBase` | `attackRating / ratingScale` | — |
| `defenseFactor` | `defenseBase × ∏(opponent defence factors)` | — |
| `homeFieldFactor` (home) | `1 + homeAttackShare × homeAdvantage` | — |
| `homeFieldFactor` (away) | `1 − awaySuppressShare × homeAdvantage` | — |

**Stage 3 — Per-script λ** (`buildScriptProbabilityMatrix`):

\[
\lambda^{\mathrm{script}}_{\mathrm{home}} = \mathrm{clamp}(\lambda^{\mathrm{base}}_{\mathrm{home}} \times m_{\mathrm{home}},\ \min,\ \max)
\]

(same for away). Script multipliers come from Match Script catalog entries.

**Stage 4 — Mixture:** weight-merge per-script Poisson matrices → merged λ / 1X2 / goalRange (multi-script merge). Base λ is **shared** across A/C; only Stage 3–4 differ under offline Match Script override.

### A.2 Clamp / max inventory

| Clamp site | Bounds | Effect |
| --- | --- | --- |
| Group factor (multiplier) | [0.05, **2.5**] | Caps Feature enrichment |
| Group factor (availability suppressor) | [0.05, 1.0] | Caps availability penalty |
| Base λ | [0.05, **5**] | Hard EG ceiling per side |
| Script-modified λ | [0.05, **5**] again | Second saturation gate |

### A.3 Expansion V2 saturation statistics (read-only recomputation)

On sealed Expansion V2 (`n=30`), Baseline A pin, in-memory only:

| Metric | Value |
| --- | --- |
| Base `lambdaHome` at max (=5) | **7 / 30** |
| Base `lambdaAway` at max | **0 / 30** |
| Mean base EG (\(\lambda_H+\lambda_A\)) | **5.833** |
| Base EG ≥ 4 | **26 / 30** |
| Any active script with `lambdaHome` = 5 (A) | **7 / 30** |
| Any active script with `lambdaHome` = 5 (C) | **7 / 30** |
| Merged (post-mixture) `lambdaHome` = 5 | **0 / 30** (mixture softens absolute max) |

**Group factor saturation (60 side-observations for attack/xg/…):**

| Group | Observations | Factor at 2.5 | Mean factor |
| --- | --- | --- | --- |
| **attack** | 60 | **53 (88%)** | 2.305 |
| xg | 60 | 16 (27%) | 1.400 |
| defence | 120 | 32 (27%) | 1.400 |
| clubStrength | 60 | 0 | 1.000 |
| matchContext | 120 | 0 | 1.000 |
| playerAvailability | 60 | 0 | 1.000 |

### A.4 Features / scales driving attack over-elevation

Primary suspect (code + saturation evidence):

1. **`unitCentered` applied to 0–100-ish Features** in attack group (`recentForm*`, `momentum*`, `formAtHome*`, `goalsScoredRate*`, …) → near-constant attack factor = 2.5.
2. Attack rating base (`attackRating / 50`) compounds with saturated factors.
3. Home field factor further lifts home λ.
4. Script multipliers (esp. C `open_match` 1.12/1.12) apply **after** already-high base λ; when base is near 5, multipliers often hit the second clamp and **cannot express differentiation**.

Rules do **not** enter λ builder directly; Rules affect Football State dimensions / Match Script activation, then script multipliers. λ Feature path is FeatureBundle → projection inputs → `buildLambdasV2`.

### A.5 Baseline A vs Candidate C λ contribution

| Layer | A vs C |
| --- | --- |
| Base λ (Feature → Football State → λ) | **Identical** (shared sidecar Features) |
| Script weights | Differ 30/30 (G3) |
| Script λ multipliers | Differ via catalog (Control milder on C; Open stronger activation) |
| Merged EG | A mean **5.745** vs C mean **5.822** (G3) |
| Discrete EG regime | Both remain high-EG → same goal-range / winner argmax |

**Conclusion for λ:** Candidate C only modulates Stage 3–4. With Stage 1–2 already saturated, Match Script calibration **cannot** create large continuous deltas on this population.

---

## B. Goal Range calibration audit

### B.1 Probability mass definition

Per scoreline \((h,a)\), total goals \(g=h+a\):

- `range01`: \(g \le 1\)
- `range23`: \(2 \le g \le 3\)
- `range4Plus`: \(g \ge 4\)

Masses are summed from the (draw-bias-adjusted) Poisson matrix, then mixture-weighted across scripts. **Bucket boundaries are part of the evaluation contract** and are **not** proposed for change in this plan.

### B.2 Predicted bucket contract

`predictedGoalRangeBucket` = argmax(`range01`, `range23`, `range4Plus`) with ties preferring lower buckets in the coded order (01 over 23 over 4Plus when equal).

### B.3 Expansion V2 evidence

| Bucket | Predicted A/C | Actual |
| --- | --- | --- |
| range01 | 1 | 7 |
| range23 | 2 | 18 |
| range4Plus | **27** | 5 |

Mean range4Plus mass ≈ **0.76** (A). Mean EG ≈ **5.7–5.8**.

### B.4 Diagnosis: λ distribution vs bucket definition

| Hypothesis | Verdict |
| --- | --- |
| Bucket thresholds wrong / evaluator bug | **Rejected** (G3; contract matches code) |
| Argmax mis-wired | **Rejected** |
| High λ → Poisson mass on \(g\ge4\) | **Accepted** — primary cause |
| Match Script alone causes range4Plus | **Secondary** — C’s open_match slightly **increases** EG; does not create the bias |

**Plan implication:** Goal Range calibration work should target **λ / script EG regime**, not bucket renumbering.

---

## C. Draw calibration audit

### C.1 pDraw generation path

1. Independent Poisson matrix from \((\lambda_H, \lambda_A)\).
2. Optional `applyDrawBiasToPoisson(drawBias)`:
   - diagonal cells × `(1 + 3·drawBias)`
   - off-diagonal × `(1 − drawBias/2)`
   - renormalize
3. Script matrices weight-merged → final `pDraw`.
4. Discrete Draw prediction requires `pDraw ≥ pHome` and `pDraw ≥ pAway` (`predictedWinnerFromProbs`).

### C.2 Match Script drawBias inventory

| Script | Baseline A drawBias | Candidate C drawBias | λ multipliers (A → notes on C) |
| --- | --- | --- | --- |
| home_control | 0 | 0 | A 1.08/0.92; C 1.06/0.97 |
| away_control | 0 | 0 | A 0.92/1.08; C 0.97/1.06 |
| counter_attack | 0 | 0 | 0.9/1.05 |
| open_match | 0 | 0 | 1.12/1.12 |
| **low_event** | **0.06** | **0.06** | 0.85/0.85 |
| balanced | 0 | 0 | 1/1 |

Only `low_event` injects draw mass via drawBias.

### C.3 low_event activation (Expansion V2, Baseline A)

| Metric | Value |
| --- | --- |
| Members with `low_event` in active set | **30 / 30** |
| Mean `low_event` weight | **≈ 0.111** |
| Mean `balanced` weight (A) | **≈ 0.244** |
| Mean `open_match` weight (A → C) | **0.112 → 0.215** |

`low_event` is present but **weak** in the mixture; Open rises under C, which is **anti-draw** (higher EG, drawBias 0).

### C.4 High-λ independent Poisson effect

For large \(\lambda_H+\lambda_A\) and asymmetric sides, independent Poisson allocates most mass off the diagonal. Even with mild drawBias on a ~11% script weight, merged `pDraw` stays sub-dominant.

G3 evidence: max `pDraw` = **0.365**; closest Draw still loses to Home by **0.024**; predicted Draw **0/30** vs actual Draw **9/30**.

### C.5 Structural under-allocation of draw mass?

**Yes — structural, not wiring.** Channels exist and are evaluated. Under-allocation comes from:

1. Only one script carries drawBias, and its weight is low.
2. High base EG shrinks natural Poisson draw probability.
3. Candidate C increases Open weight → further EG ↑ / draw ↓.
4. Argmax Draw bar is high when sides are unbalanced.

---

## D. Match Script calibration audit

### D.1 Weight regime (Expansion V2)

| Dominant script | A count | C count |
| --- | --- | --- |
| balanced | **23** | 0 |
| open_match | 0 | **22** |
| counter_attack | 7 | 8 |

Mean weights: balanced A **0.244** vs C **0.147**; open_match A **0.112** vs C **0.215**.

### D.2 Candidate C `sideAwareOpen` changes (summary)

Relative to Baseline A catalog:

- Temperature **0.85 → 0.9** (softer softmax → flatter mixture, but Open affinity still wins).
- Control scripts: stricter gates (`controlState` **high**), milder λ multipliers, larger asymmetric rating gaps.
- **open_match:** `baselineAffinity` **0.05 → 0.22**; stronger attack bonus; **bilateralAttackBonuses**; defense max-level gate.
- **balanced:** `baselineAffinity` **1 → 0.5** (less fallback mass).

These successfully change **script identity** (G3) but not **decision identity**.

### D.3 Sensitivity: script weight → λ multiplier → output

Order-of-magnitude:

- Script multipliers typically ∈ **[0.85, 1.12]** (~±15%).
- Base EG already ≈ **5.8**; many sides near clamp **5**.
- After mixture, mean |ΔpHome| ≈ **0.0015** (G3).

**Why C’s continuous delta is small:**

1. Shared saturated base λ dominates variance.
2. Multiplier span is narrow vs base magnitude.
3. Double clamp at 5 truncates Open’s intended EG lift on already-maxed sides.
4. Softmax mixture keeps several scripts active → changes average out.
5. Discrete metrics use argmax → small Δp never flips labels.

---

## E. Calibration options (analysis only — do not implement)

All options below are **candidate directions** for a future authorized implementation sprint. None are approved here. None change production in this sprint.

### Option 1 — λ compression / saturation control (highest leverage)

**Intent:** Restore dynamic range in Stage 1–2 so Match Script and Features can move EG into realistic bands (~2–3.5 mean for football).

**Levers (examples, not prescriptions):**

- Correct Feature scale mapping (`unitCentered` vs `percentCentered` for 0–100 Features).
- Lower group factor cap and/or `baseRate` / `max`.
- Compress attack-group weights.

**Expected effect on Expansion-like data:** reduce range4Plus argmax rate; raise pDraw naturally; enlarge A/C continuous deltas if scripts differ.

**Risks:** requires careful regression on sealed replay; may shift Winner accuracy; needs new offline candidate label — **not** silent production edit.

### Option 2 — Match Script multiplier / affinity recalibration

**Intent:** Increase script→λ sensitivity and/or rebalance Open vs low_event vs balanced.

**Levers:** wider multiplier bands; higher `low_event` affinity / drawBias; reduce Open bilateral bonus; Candidate D/E offline labels.

**Expected effect:** larger continuous A/C deltas **only if** base λ not saturated. Alone, on current Expansion V2, likely **insufficient** (G3 already shows script identity change without decision change).

**Risks:** tuning Open without λ fix can worsen EG bias (as C already does slightly).

### Option 3 — Draw-aware low-event / balanced calibration

**Intent:** Structural re-allocation of draw mass.

**Levers:** strengthen `low_event` activation under HIGH defense / LOW attack Football State; non-zero mild drawBias on `balanced`; optional draw-preserving merge policy (future ADR if needed).

**Expected effect:** more predicted Draws **if** EG is also moderated; drawBias alone on ~11% weight will not produce Draw argmax under EG≈5.7.

**Risks:** over-drawing balanced matches; must remain deterministic and offline-candidate scoped.

### Option ranking (diagnostic)

| Priority | Option | Rationale |
| --- | --- | --- |
| 1 | λ compression / scale fix | Attacks root cause of EG≈5.7 and range4Plus=27/30 |
| 2 | Draw-aware script calibration | Needed for Draw=0/30, but depends on (1) |
| 3 | Match Script multiplier recalibration | Amplifies deltas after (1); insufficient alone |

**Explicit non-options now:** changing Goal Range bucket definitions; changing Draw argmax contract; promoting Candidate C; editing production governed parameters in-place.

---

## F. Validation strategy (next authorized measurement round)

Do **not** regenerate Expansion V2. Future calibration candidates should use a **new** offline label + **new** replay/evaluation ids, preserving all existing SEALED artifacts.

### F.1 Cohort size

| Purpose | Minimum | Preferred |
| --- | --- | --- |
| Descriptive A/C comparison | 30 (current Expansion V2 reusable for **offline** candidate replay if Features unchanged) | 40–60 |
| Subgroup tables (Home/Draw/Away × goal range) | ≥ 20 scored | ≥ 40 |
| Claim “better on Goal Range / Draw” | meet existing P2K-G qualification thresholds | + holdout cohort |

Replaying a new λ/script candidate on **existing** Expansion V2 Sidecars is valid **if and only if** the candidate only changes Projection/Match Script parameters (same sealed Features/Rules). Scale-mapping fixes that reinterpret Feature domains still use the same Sidecar values — allowed offline.

### F.2 Diversity gates (prediction space — not only actuals)

| Gate | Target |
| --- | --- |
| Distinct prediction profiles | ≥ 15 (prefer ≥ 20) |
| Predicted winners spanning Home/Draw/Away | **all three** with Draw ≥ 2 (stretch: ≥ 4) |
| Predicted goal-range spanning 3 buckets | each bucket ≥ 2 |
| Confidence bands | ≥ 2 populated (prefer 3) |
| Base EG distribution | median EG ∈ [2.0, 3.5]; share EG≥5 **&lt; 20%** |
| λ saturation | base `lambdaHome=max` rate **&lt; 10%**; attack factor=2.5 rate **&lt; 30%** |

Actual outcome diversity (Expansion V2 already: Home 10 / Draw 9 / Away 11; ranges 7/18/5) remains required but is **not sufficient** alone.

### F.3 A/C (or A/new-candidate) comparison protocol

1. Freeze production Baseline A.
2. New candidate gets offline calibration label; `productionPromoted=false`.
3. P2K-F-style sealed offline pair on chosen cohort (no History/Sidecar mutation).
4. P2K-G-style population evaluation (descriptive).
5. **Mandatory continuous report** (not only discrete hits):
   - mean/max |ΔpHome|, |ΔpDraw|, |ΔEG|
   - discrete flip counts (winner / goal-range)
   - saturation rates (group factor / λ max)
   - dominant script histograms
6. Promotion remains a **separate human gate** after qualification — never automatic.

### F.4 Success criteria for a future calibration implementation sprint (preview)

A candidate may be **considered** for human promotion review only if **all** hold:

- Discrete Goal Range predicted distribution moves materially toward actuals (e.g. range4Plus predicted share ≤ 50% on Expansion-like set) **or** documented tradeoff accepted.
- Predicted Draw count &gt; 0 and not worse Brier on 1X2 than Baseline A by an agreed margin.
- Continuous deltas vs A are large enough that discrete flips occur on ≥ 1 metric family **or** continuous metrics improve with pre-registered thresholds.
- No Architecture Freeze violation; offline-only until promotion.

These are **planning thresholds**, not authorization.

---

## G. Governance

| Rule | Status |
| --- | --- |
| Architecture Freeze v0.3 | **Unchanged** |
| Production Match Script = Baseline A | **Unchanged** |
| Candidate C `productionPromoted` | **false** |
| P2K-H | **NOT AUTHORIZED** |
| Existing SEALED cohorts (V1 / Recovery V2 / Expansion V2) | **Immutable** |
| History / Sidecar / Replay / Evaluation artifacts | **Not modified** |
| P2K-C/D/E/F/G contracts | **Not modified** |
| Projection / Match Script production behavior | **Not modified** |
| Goal Range / Draw evaluators | **Not modified** |
| This sprint implements calibration code? | **No** |
| This sprint changes parameters? | **No** |

### Out of scope / STOP

- No production parameter edits  
- No Candidate C catalog edits  
- No new Engine / Architecture document  
- No P2K-H  
- No automatic calibration implementation sprint  

### Recommended human next step

Choose **one** explicit authorization:

1. **Hold** — keep Baseline A; accept Expansion V2 / G3 evidence as descriptive.
2. **Authorize P2K-CAL-2 (implementation spike)** — offline-only λ scale/compression candidate + replay on Expansion V2 Sidecars + population eval (still no promotion).
3. **Authorize broader research** — Options 1+3 design spike with ADR only if freeze boundaries are touched.

Until then: **STOP.**

---

## Appendix — Code map (read-only references)

| Concern | Location |
| --- | --- |
| Group factors / scales | `packages/analysis/src/projection-v2/football-state/build-football-state-projection-inputs.ts` |
| Feature weights | `packages/analysis/src/projection-v2/lambda/feature-enriched-lambda-weights.ts` |
| Base λ formula | `packages/analysis/src/projection-v2/lambda/lambda-builder-v2.ts` |
| Script λ + drawBias apply | `packages/analysis/src/projection-v2/probability-matrix/build-script-probability-matrix.ts`, `apply-draw-bias.ts` |
| Baseline A / Candidate C catalogs | `packages/analysis/src/projection-v2/match-script/match-script-calibration-candidates.ts` |
| Predicted winner / goal-range buckets | `packages/statistics/src/evaluation/evaluate-prediction.ts` |
| Prior distribution audit | `docs/sprints/P2K/P2K_G3_VALIDATION_PREDICTION_DISTRIBUTION_AUDIT.md` |

---

## Completion checklist

- [x] λ formula, factors, clamps documented  
- [x] Expansion V2 saturation quantified  
- [x] Goal Range mass vs bucket diagnosis  
- [x] Draw path / drawBias / low_event / high-λ Poisson diagnosis  
- [x] Match Script A/C sensitivity diagnosis  
- [x] ≥ 3 calibration directions (analysis only)  
- [x] Next validation strategy specified  
- [x] Governance / non-claims explicit  
- [x] No production code or durable artifact changes  

**P2K-CAL-1 COMPLETE. STOP.**
