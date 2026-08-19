# P2K-CAL-2 — Projection λ & Goal Distribution Calibration — Completion Report

**Sprint id:** P2K-CAL-2  
**Roadmap citation:** `docs/40_PRODUCT_ROADMAP.md` (post-v0.2 product development; calibration under Projection V2 governance)  
**Prior diagnosis:** `docs/sprints/P2K/P2K_CAL_1_PROJECTION_MATCH_SCRIPT_CALIBRATION_DIAGNOSIS_PLAN.md`  
**Distribution audit:** `docs/sprints/P2K/P2K_G3_VALIDATION_PREDICTION_DISTRIBUTION_AUDIT.md`  
**Completed:** 2026-08-18  
**Promotion decision:** **NON-DEFAULT / NOT PROMOTED**

---

## 1. Diagnosis preserved (from P2K-CAL-1 / P2K-G3)

Production `projection.v3.replay` on sealed Expansion V2 (`p2k.e.validation.expansion.v2.analyzematch.v1`, n=30) exhibited:

| Finding | Baseline evidence |
|--------|-------------------|
| Attack group factor saturation | 53/60 side-observations at clamp 2.5 (88%) |
| Elevated base expected goals | mean total λ ≈ 5.745 |
| Goal Range bias | predicted `range4Plus` 27/30 vs actual 5/30 |
| Draw under-allocation | predicted Draw winner 0/30 vs actual Draw 9/30 |
| Match Script-only tuning insufficient | Candidate C changes scripts/λ continuously but discrete A/C metrics identical 30/30 |

Root cause: `unitCentered` normalization applied to Features on ~[0,100] scale → attack multiplier saturation → high λ before Match Script merge.

---

## 2. Implementation

### 2.1 Governed calibration artifact (NON-DEFAULT)

| Field | Value |
|-------|-------|
| Version label | `projection.v3.calibration.candidate1` |
| Artifact id | `projectionParams:v3.2:calibrationCandidate1` |
| Status | `computed_candidate` |
| `productionPromoted` | **false** |
| Production default | unchanged (`projection.v3.replay`) |

Registry: `packages/analysis/src/projection-v2/projection-parameter-registry.ts`  
Artifact: `packages/analysis/src/projection-v2/projection-calibration-candidate1.ts`  
Governance: `packages/analysis/src/projection-v2/projection-calibration-governance.ts`

### 2.2 Feature normalization (projection interpretation only)

Policy: `projectionNormalization.v1.calibrationCandidate1`  
File: `packages/analysis/src/projection-v2/lambda/calibration-candidate1-lambda-weights.ts`

- Remaps percent-scale Intelligence Features from `unitCentered` → `percentCentered`
- Does **not** mutate stored Feature values or Feature extraction semantics
- Preserves `availabilityPenalty`, `signedDays`, and true unit-scale entries

### 2.3 λ calibration (feature-group governance)

Candidate `LambdaParameterSet` changes (vs production):

| Group / parameter | Production | Candidate 1 |
|-------------------|------------|-------------|
| `baseRate` | 1.3 | 1.08 |
| `homeAttackShare` | 0.6 | 0.58 |
| `awaySuppressShare` | 0.4 | 0.38 |
| `groupFactorMax` | 2.5 (implicit) | 2.0 |
| `groupScalars.attack` | 1 | 0.96 |
| `groupScalars.xg` | 1 | 0.98 |
| `groupScalars.clubStrength` | 1 | 0.99 |
| Feature scales | mostly `unitCentered` | percent-scale → `percentCentered` |

Infrastructure: optional `groupFactorMax`, `groupFactorMin`, `groupScalars` on `LambdaParameterSet`; applied in `build-football-state-projection-inputs.ts`.

### 2.4 Goal distribution & Draw calibration

- **Dixon–Coles** low-score dependence (governed, optional): `matrixMerge.lowScoreDependence = { enabled: true, rho: -0.10 }`
- Implementation: `packages/analysis/src/projection-v2/probability-matrix/apply-dixon-coles.ts`
- Applied after multi-script matrix merge in `compute-multi-script-projection.ts`
- Production baseline omits `lowScoreDependence` → independent Poisson unchanged
- Unified Probability Matrix remains single source for 1X2, scorelines, goal range, BTTS, O/U

### 2.5 Offline replay

- `runOfflineProjectionCalibrationReplay` — `packages/analysis/src/replay/offline-projection-calibration-replay.ts`
- Validation script: `docs/sprints/P2K/scripts/p2k-cal-2-projection-calibration-validation.mjs`
- Same sealed Expansion V2 cohort; sidecar Features/Rules immutable; only Projection parameter artifact differs

### 2.6 Tests

- `packages/analysis/test/p2k-cal-2-projection-calibration.spec.ts` (normalization, λ, Dixon–Coles coherence, artifact resolution, baseline preservation, replay determinism)
- Updated `packages/analysis/test/projection-parameter-artifact.spec.ts` (catalog now 4 artifacts)

---

## 3. Candidate results (Expansion V2 sealed cohort, n=30)

Offline replay comparison — **Production baseline** vs **Calibration candidate 1**:

| Metric | Baseline (production) | Candidate 1 | Δ (C − A) |
|--------|----------------------:|------------:|----------:|
| Winner accuracy | 0.667 | 0.700 | +0.033 |
| Goal Range accuracy | 0.267 | 0.467 | +0.200 |
| Exact Score accuracy | 0.100 | 0.133 | +0.033 |
| BTTS accuracy | 0.533 | 0.533 | 0 |
| O/U accuracy | 0.400 | 0.533 | +0.133 |
| Brier Score (1X2 avg) | 0.150 | 0.164 | +0.014 |
| ECE (1X2 avg) | 0.211 | 0.193 | −0.018 |
| mean λ_home | 3.215 | 1.096 | −2.119 |
| mean λ_away | 2.530 | 0.801 | −1.729 |
| mean total λ | 5.745 | 1.898 | −3.847 |
| mean pDraw | 0.157 | 0.335 | +0.178 |
| mean pHome | 0.496 | 0.399 | −0.097 |
| mean pAway | 0.348 | 0.266 | −0.082 |

### Prediction distribution (primary sprint target)

| Bucket | Baseline predicted | Candidate predicted | Actual |
|--------|-------------------:|--------------------:|-------:|
| Winner Home | 19 | 14 | 10 |
| Winner Draw | **0** | **10** | 9 |
| Winner Away | 11 | 6 | 11 |
| Goal Range 0–1 | 1 | 14 | 7 |
| Goal Range 2–3 | 2 | 16 | 18 |
| Goal Range 4+ | **27** | **0** | 5 |

**Structural bias addressed:**

- `range4Plus` saturation: 27/30 → 0/30 (eliminated)
- Draw winner predictions: 0/30 → 10/30 (closer to actual 9/30)
- Total λ moved from unrealistic ~5.7 to ~1.9 regime

---

## 4. Limitations

1. **Over-correction risk:** mean total λ ≈ 1.9 may be low relative to cohort scoring (actual range4Plus = 5/30 implies some high-scoring matches). Candidate likely needs a second tuning pass on `baseRate` / group scalars before promotion consideration.
2. **Brier score:** slightly worse (+0.014) despite better distribution shape — promotion must not optimize a single metric.
3. **Small sample:** n=30 descriptive only; not population-qualified for release claims.
4. **No ML / no outcome leakage:** parameters are pinned constants; no training on sealed cohort during prediction.
5. **Candidate C unchanged:** Match Script calibration labels untouched; production Match Script remains Baseline A.
6. **Sealed artifacts immutable:** cohort, History, Sidecar, existing Evaluation runs not mutated.

---

## 5. Promotion decision

**NON-DEFAULT / NOT PROMOTED**

Candidate 1 demonstrates that governed normalization + λ compression + optional Dixon–Coles can fix the diagnosed structural distribution bias without changing Feature/Evidence/Rule semantics or evaluation contracts. Distribution improvements are material, but λ may be over-compressed and Brier mixed.

Promotion requires separate human governance instruction, broader cohort validation, and explicit pin change — not automatic activation from this sprint.

---

## 6. Validation evidence

```bash
export DATABASE_URL="postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation"
pnpm --filter @fas/analysis build
pnpm --filter @fas/analysis test
node docs/sprints/P2K/scripts/p2k-cal-2-projection-calibration-validation.mjs
```

Cohort digest (unchanged): `03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997`

---

## 7. Safety boundaries respected

- [x] Production baseline unchanged when candidate not selected
- [x] No sealed cohort / History / Sidecar mutation
- [x] No evaluation definition changes
- [x] No goal-range bucket definition changes
- [x] No Candidate C modification
- [x] No P2K-H work
- [x] No ML / LLM prediction
- [x] Candidate `productionPromoted = false`
