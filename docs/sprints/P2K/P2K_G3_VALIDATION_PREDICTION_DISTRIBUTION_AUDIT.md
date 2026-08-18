# P2K-G3 — Validation Evidence / Prediction Distribution Audit

**Status:** COMPLETED (AUDIT / DIAGNOSIS ONLY)  
**Sprint id:** P2K-G3 (Validation Evidence / Prediction Distribution Audit)  
**Date:** 2026-08-17  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Continues P2K Validation Governance after P2K-G Expansion V2 (`docs/sprints/P2K/P2K_G_VALIDATION_EXPANSION_V2_POPULATION_EVALUATION_COMPLETION_REPORT.md`).  
**Stop boundary:** Audit / diagnosis only. **No calibration. No production parameter change. P2K-H NOT AUTHORIZED.**

---

## A. Executive Summary

On Expansion V2 (`n=30`), **Candidate C does reach Match Script → Projection → continuous prediction**. All 30 members show A/C differences in active script weights, merged λ, probability mass, projection checksum, and prediction profile.

Those continuous differences are **small** (mean |ΔpHome| ≈ 0.0015; max ≈ 0.0049; mean |Δ expected goals| ≈ 0.077). **Discrete argmax outputs never flip**: predicted winner and predicted goal-range bucket are identical for A and C on **30/30** members. That is why P2K-G discrete metrics (Winner / Exact / Goal Range / BTTS / O-U hit rates) are identical even though Brier/ECE differ slightly.

`range4Plus = 27/30` and `predicted Draw = 0/30` are **Projection / λ / argmax classification properties**, not cohort sealing bugs, not aggregation bugs, and not evidence that Candidate C failed to enter the offline prediction path.

Production remains Baseline A. Candidate C remains `productionPromoted=false`. No artifacts were mutated.

---

## B. 30-member audit coverage

### Inputs (immutable; read-only)

| Artifact | Id |
| --- | --- |
| SEALED cohort | `p2k.e.validation.expansion.v2.analyzematch.v1` |
| membershipDigestSha256 | `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997` |
| Baseline A Replay Run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.a` |
| Candidate C Replay Run | `run.p2k.f.validation.expansion.v2.analyzematch.v1.c` |
| P2K-G evaluation (reference only) | `eval.p2k.g.validation.expansion.v2.analyzematch.v1` |

### Coverage gates

| Check | Result |
| --- | --- |
| History loaded | 30/30 |
| Sidecar record loaded | 30/30 |
| Baseline A success results | 30/30 |
| Candidate C success results | 30/30 |
| Offline A recomputation checksum vs durable run | 30/30 match |
| Offline C recomputation checksum vs durable run | 30/30 match |
| Match id namespace `match-p2kg-expansion-v2-*` | 30/30 |
| Durable artifacts mutated | **No** |

### Trace performed per member

```text
History
  → Sidecar (sealed Features / Rules / parameter pins)
  → Football State (shared A/C; rebuilt from sidecar)
  → Match Script (A = r1b.candidate.a.baseline | C = r1b.candidate.c.sideAwareOpen)
  → Projection (merged λ + Poisson matrix)
  → Final sealed prediction (pHome/pDraw/pAway, goalRange, scenarios)
```

Audit runner (read-only): `docs/sprints/P2K/scripts/p2k-g3-validation-prediction-distribution-audit.mjs`.

---

## C. A/C downstream differentiation

| Differentiation signal | Count (of 30) |
| --- | --- |
| Match Script weight signature differs | **30** |
| λ (lambdaHome and/or lambdaAway) differs | **30** |
| Probability mass differs | **30** |
| Goal-range probability mass differs | **30** |
| Projection checksum differs | **30** |
| Prediction profile (pHome\|pDraw\|pAway @1e-6) differs | **30** |
| Discrete predicted winner differs | **0** |
| Discrete predicted goal-range bucket differs | **0** |
| Football State shared across A/C | **30/30** |
| Confidence copied from History (identical A/C) | **30/30** |

### Continuous delta magnitude

| Metric | Value |
| --- | --- |
| mean \|ΔpHome\| (C−A) | 0.001468 |
| max \|ΔpHome\| | 0.004927 |
| mean \|Δ expected goals\| | 0.077036 |
| max \|Δ expected goals\| | 0.130261 |
| max \|ΔlambdaHome\| | 0.071596 |

### Dominant script shift (evidence C is active)

| Dominant script (highest weight) | Baseline A | Candidate C |
| --- | --- | --- |
| `balanced` | **23** | 0 |
| `open_match` | 0 | **22** |
| `counter_attack` | 7 | 8 |

Offline parameter artifacts differ:

- A: `offline.p2k.d:projectionParams:v3.1:matchScript:r1b.candidate.a.baseline` checksum `d7b2f4fd`
- C: `offline.p2k.d:projectionParams:v3.1:matchScript:r1b.candidate.c.sideAwareOpen` checksum `47eef144`

**Interpretation:** Candidate C is **not** bypassed. It changes script mixture and continuous projection outputs. It does **not** change discrete argmax winner / goal-range labels on this cohort.

---

## D. Prediction profile distribution

| Side | Distinct profiles | Notes |
| --- | --- | --- |
| Baseline A | **28** | Matches P2K-G reported profile count |
| Candidate C | **28** | Same count; continuous values differ |
| Shared exact A∩C profiles | **0** | Every member’s rounded triple differs A vs C |
| Duplicate profiles within A | 2 profiles appear twice | Same feature templates can collide |

Profiles are keyed as `pHome|pDraw|pAway` rounded to 1e-6 (same convention as P2K-G / G2-A).

Because continuous A/C triples always differ, A and C do **not** share exact profile keys even when discrete labels match. Profile inventory therefore overstates “behavioral uniqueness” relative to discrete decision identity.

Representative pairing pattern (all 30 members):

- same discrete winner
- same discrete goal-range bucket
- different profile key
- different top-script ordering (typically A:`balanced` / C:`open_match`)

---

## E. Goal Range distribution diagnosis

### Observed

| Bucket | Predicted A | Predicted C | Actual |
| --- | --- | --- | --- |
| range01 | 1 | 1 | 7 |
| range23 | 2 | 2 | 18 |
| range4Plus | **27** | **27** | 5 |

### Why predicted range4Plus dominates

1. **Merged expected goals are high.** Mean EG(A)=**5.7449**, EG(C)=**5.8219**. 26/30 members have EG(A) ≥ 4; 28/30 ≥ 3.
2. **Bucket rule is argmax over goalRange masses** (`predictedGoalRangeBucket`). With mean range4Plus mass ≈ 0.76, argmax is almost always `range4Plus`.
3. **λ saturation / high attack factors.** Multiple members show per-script `lambdaHome = 5` (parameter max clamp) on top scripts — consistent with prior G2-A finding that attack-group `unitCentered` factors saturate unless form is near-zero.
4. **Candidate C’s `open_match` bias increases EG slightly** (mean +0.077), so C does **not** correct range4Plus dominance; if anything it mildly reinforces high-scoring mass.
5. **Not a cohort actuals defect.** Actual goal ranges are diverse (7 / 18 / 5). The mismatch is model-side prediction bias vs actuals, already flagged in G2-A.

### Non-range4Plus members (A)

| matchId | Predicted | EG(A) | range01 / range23 / range4Plus |
| --- | --- | --- | --- |
| `match-p2kg-expansion-v2-17` | range01 | 1.539 | 0.546 / 0.383 / 0.071 |
| `match-p2kg-expansion-v2-29` | range23 | 2.980 | 0.206 / 0.451 / 0.343 |
| `match-p2kg-expansion-v2-30` | range23 | 3.249 | 0.170 / 0.431 / 0.399 |

These are the only rows where λ mixture escapes the high-EG regime enough for another bucket to win argmax. A and C keep the same discrete bucket on all three.

---

## F. Draw prediction diagnosis

| Signal | Value |
| --- | --- |
| Predicted Draw A | **0 / 30** |
| Predicted Draw C | **0 / 30** |
| Actual Draw | **9 / 30** |
| max pDraw(A) | 0.364810 |
| max pDraw(C) | 0.363140 |
| mean pDraw(A) | 0.156790 |
| mean pHome(A) | 0.495518 |
| mean pAway(A) | 0.347692 |

### Classification rule (not a bug by itself)

`predictedWinnerFromProbs` returns Draw only when `pDraw ≥ pHome` and `pDraw ≥ pAway` (argmax with Home tie-break precedence over Draw when equal with Home).

Closest Draw candidate:

| matchId | pHome | pDraw | pAway | Margin (max side − draw) |
| --- | --- | --- | --- | --- |
| `match-p2kg-expansion-v2-17` | 0.388405 | 0.364810 | 0.246785 | **0.0236** (still Home) |

No member reaches Draw argmax under either A or C. Candidate C’s continuous ΔpDraw is ~1e-3 and never closes the gap.

### Structural contributors

- Script catalog `drawBias` is mostly `0`; only `low_event` carries a small drawBias and rarely dominates mixture weight on this cohort.
- Independent-Poisson / high EG mixtures allocate substantial mass to asymmetric scorelines, keeping pDraw below side probabilities for high-λ matches.
- This is **not** an aggregation wiring failure: pDraw is present and evaluated; it simply never wins argmax.

---

## G. Match Script → Projection → Output trace

### Shared upstream (A = C)

- Same History identity / actualResult / confidence
- Same Sidecar Features / Rules / evidence refs / parameter pin (`projection.v3.replay`)
- Same Football State rebuild (30/30 identical dimension levels)

### Divergent midstream (A ≠ C)

1. Offline Match Script parameter set resolved by calibration label.
2. Script scoring / softmax weights change (Baseline temperature 0.85 vs C 0.9; Control gates; bilateral Open bonus on C).
3. Per-script λ multipliers change (`open_match` 1.12/1.12 on C vs baseline catalog).
4. Merged matrix λ and 1X2 / goal-range masses change.
5. Projection checksum and sealed prediction probabilities change.

### Convergent discrete downstream (A = C)

- `predictedWinnerFromProbs` identical 30/30
- `predictedGoalRangeBucket` identical 30/30
- Confidence band / predictionConfidence identical 30/30 because offline sealing **copies History confidence** (by design in `buildSealedPrediction`), not recomputed Match Script confidence.

### Example member (`match-p2kg-expansion-v2-1`)

| Field | A | C |
| --- | --- | --- |
| Top scripts | counter_attack / balanced / home_control | counter_attack / open_match / … |
| EG | 6.286 | 6.317 |
| pHome/pDraw/pAway | 0.831 / 0.093 / 0.076 | 0.829 / 0.094 / 0.077 |
| Predicted winner | home | home |
| Predicted goal range | range4Plus | range4Plus |
| Actual | home 2-0 (`range23`) | same |

---

## H. Root-cause findings

| # | Finding | Evidence | Class |
| --- | --- | --- | --- |
| H1 | Candidate C **does** enter Match Script and Projection | scriptsDiff 30/30; dominant script balanced→open_match; distinct offline artifact checksums | Confirmed effective path |
| H2 | A/C discrete metric identity is caused by **tiny continuous deltas that never flip argmax** | discreteWinnerDiff=0; discreteGoalRangeDiff=0; max \|ΔpHome\|≈0.0049 | Match Script → Projection mapping magnitude |
| H3 | `range4Plus=27/30` is high merged EG / λ saturation + bucket argmax, not sealing error | mean EG≈5.74; 26/30 EG≥4; actual ranges diverse | Projection / λ model property |
| H4 | `Draw=0/30` is argmax + chronically sub-dominant pDraw, not missing Draw channel | max pDraw=0.365; closest still Home by 0.024 | Winner classification + model mass |
| H5 | Confidence bands do not discriminate A/C | confidence copied from History in offline prediction builder | Replay contract design (not a C bypass) |
| H6 | Validation fixture actuals are not the primary defect for H3/H4 | actual Home/Draw/Away = 10/9/11; goal ranges 7/18/5 | Fixture OK for outcome diversity |
| H7 | Prediction aggregation / bucket helpers behave as specified | `predictedWinnerFromProbs` / `predictedGoalRangeBucket` match code contracts | No aggregation bug found |
| H8 | P2K-G identical discrete metrics are **explained**, not anomalous | continuousDiff∧discreteSame = 30/30 | Evaluation interpretation |

**Not found:** Candidate C failing to reach downstream prediction; corrupted cohort membership; Replay Run persistence dropping C parameters; goal-range bucket coding error; Draw label omitted from evaluator.

---

## I. Evidence-backed conclusions

1. **P2K-G’s identical Winner / Exact / Goal Range / BTTS / O-U hit counts are expected** given discrete identity on all 30 members.
2. **Slight Brier/ECE differences are the only population signal of C** on this cohort; they are small because probability moves are small.
3. **Expanding n alone will not fix Draw=0 or range4Plus≈27** while λ / Match Script mixture remains in the current high-EG regime.
4. **Candidate C’s sideAwareOpen / open_match emphasis changes script identity but not decision identity** under current Projection merge + argmax policy.
5. **Promotion / P2K-H remain unsupported** by this audit; the audit explains *why* A≈C on discrete metrics, it does not create a promotion claim.

---

## J. Governance / non-claims

- Architecture Freeze **v0.3** unchanged.
- Production Match Script remains **Baseline A** (`r1b.candidate.a.baseline`).
- Candidate C remains **NON-DEFAULT** / `productionPromoted=false`.
- **P2K-H NOT AUTHORIZED.**
- No History / Sidecar / Replay Run / Evaluation / cohort membership mutations.
- No production Match Script / Projection / λ parameter edits.
- No P2K-C/D/E/F/G contract changes.
- No claim that Candidate C is better, worse, or promotion-ready.
- No claim that Expansion V2 fixture design is invalid; actual outcome diversity remains adequate for descriptive evaluation.
- This document is diagnosis evidence only — **not** a calibration plan and **not** an implementation authorization.

---

## K. Recommended next action

**STOP here.** Do not start P2K-H. Do not auto-enter calibration coding.

Human governance should choose explicitly among:

1. **Accept current evidence** and keep Candidate C non-default (status quo).
2. **Authorize a separate calibration / model-diagnosis sprint** (new explicit gate) targeting root causes H2–H4 — e.g. λ saturation, Match Script→Projection delta magnitude, Draw mass / low-event activation — without treating Expansion V2 discrete parity as a sealing failure.
3. **Authorize additional validation-data work** only if the goal is subgroup coverage beyond current actual diversity; do **not** expect data expansion alone to create predicted Draws or escape range4Plus under the present Projection regime.

Until a separate authorization exists: **no production parameter changes, no Candidate C promotion, no P2K-H.**

---

## Appendix — Audit tooling

- Script: `docs/sprints/P2K/scripts/p2k-g3-validation-prediction-distribution-audit.mjs`
- Mode: read-only against `fas_validation`
- Offline recomputation used only in-memory for Match Script / λ / Football State traces; durable checksums verified equal to P2K-F runs
