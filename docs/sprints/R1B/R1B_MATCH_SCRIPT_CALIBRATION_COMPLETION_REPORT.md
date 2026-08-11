# R1B — Match Script Calibration Completion Report

| Field | Value |
|---|---|
| Sprint | **R1B** Match Script Calibration |
| Type | Production coding sprint (structural calibration experiment — not Feature expansion) |
| Date | 2026-08-11 |
| Governance correction | 2026-08-11 — production default restored to Baseline A |
| Authority | Architecture Freeze **v0.3** · R1A audit · P2H/P2I measurement path · P2J parameter artifacts · task-authorized coding |
| Roadmap cite | Task-authorized. **Naming note:** doc 40 Sprint **R1** is AI Review ≠ R1B. Cite pending doc 40 inventory update. |
| Production default | **`MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET`** (`r1b.candidate.a.baseline`) |
| Candidate (non-default) | **`r1b.candidate.c.sideAwareOpen`** — STRUCTURALLY VALIDATED / NOT population validated / NOT production promoted |
| Policy version | `matchScript.v1` |

---

## Governance correction (required reading)

R1B completed a **structural calibration experiment**.

| Gate | Result |
|---|---|
| Synthetic script-shape structural gate (`r1b.synthetic.script_shapes.v1`) | Candidate C **passed** |
| Population Validation (durable Evaluation History + P2H/P2I) | **NOT AVAILABLE** → **not passed** |
| Production default pin | Remains **Baseline A** |

**Structural Validation ≠ Population Validation.**

Candidate C is therefore:

- structurally validated  
- synthetic-cohort validated  
- **not** population validated  
- **not** the production default  
- eligible for future A/B replay  

Durable Evaluation History is required before Candidate C can be promoted to production.

---

## 1. Objective

Reduce systematic Match Script errors identified by R1A via **deterministic parameter candidates**, measured first on a synthetic script-shape cohort:

1. Favorite / Control over-activation on weak asymmetry  
2. Open Match under-activation  
3. Loss of side-aware asymmetry during script selection  
4. Excessive Control / Balanced concentration  
5. Insufficient scoring uncertainty under strong-favorite Control modifiers  

**Not in scope:** new Features, Rules, Engines, Providers, Football State dimensions, Market→probability, Repeat Fixture, Projection/Poisson math redesign, LLM/ML, hard-coded historical outcomes, Durable Evaluation History / P2K.

---

## 2. Baseline behavior

### 2.1 Durable Evaluation History cohort

**NOT AVAILABLE in repository.** Evaluation History + P2H sidecars are process-local memory. No sealed population ships in git for Match Result / Draw / Exact Score / Goal Range / BTTS / Over-Under / confidence calibration before/after.

Therefore R1B **must not** claim Prediction Performance improvements.

### 2.2 Synthetic script-shape cohort (used)

| Field | Value |
|---|---|
| Cohort id | `r1b.synthetic.script_shapes.v1` |
| Sample size | 12 |
| Classes | weak_home_edge ×2, strong_home_favorite ×2, open_bilateral_attack ×2, parity_balanced ×2, away_favorite ×2, low_event_shape ×2 |
| Exclusions | No named R1A showcase fixtures |

### 2.3 Baseline (Candidate A) — SCRIPT-LAYER STRUCTURAL METRICS

| Metric | Baseline A |
|---|---|
| Control activation rate | 1.0000 |
| Weak-edge Control mean weight | 0.3518 |
| Open Match activation rate | 0.9167 |
| Open-class Open Match mean weight | 0.1561 |
| Control mean weight | 0.3148 |
| Open Match mean weight | 0.1404 |
| Balanced mean weight | 0.2779 |
| Mean concentration | 0.2779 |
| Favorite-class underdog λ ratio | 0.5581 |
| Open-class range4Plus mass | 0.4514 |

These are **SCRIPT-LAYER STRUCTURAL METRICS**, not **PREDICTION PERFORMANCE METRICS**.

---

## 3. Calibration candidates

| Id | Label | Role after R1B |
|---|---|---|
| A | `r1b.candidate.a.baseline` | **Production default** (`GOVERNED_MATCH_SCRIPT_PARAMETER_SET`) |
| B | `r1b.candidate.b.controlOpen` | Intermediate experiment (retained) |
| C | `r1b.candidate.c.sideAwareOpen` | **NON-DEFAULT candidate** — structurally validated; pending population validation |

---

## 4. Parameter deltas (Candidate C vs Baseline A) — experimental only

Candidate C parameter values are unchanged by the governance correction. They remain available for explicit A/B resolution via `resolveMatchScriptParameterSet({ calibrationLabel: "r1b.candidate.c.sideAwareOpen" })`.

| Parameter | Baseline A (production) | Candidate C (non-default) |
|---|---|---|
| Control asymmetric `minimumRatingGap` | 0 | 10 |
| `minimumAttackVsOpponentDefenseGap` | absent | 5 |
| Control `controlState` minimumLevel | medium | high |
| Control λ underdog multiplier | 0.92 | 0.97 |
| Control favorite multiplier | 1.08 | 1.06 |
| `open_match` baselineAffinity | 0.05 | 0.22 |
| `open_match` attack dimension weight | 0.30 | 0.38 |
| `open_match` bilateralAttackBonuses | absent | both ≥55 → +0.28 |
| `balanced` baselineAffinity | 1.00 | 0.50 |
| Softmax temperature | 0.85 | 0.90 |

Scoring extensions (already shipped; unchanged by governance correction):

- Optional `minimumAttackVsOpponentDefenseGap`  
- Optional `bilateralAttackBonuses`  
- Optional `calibrationLabel`  
- `R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE` status record  

---

## 5. Replay cohort

- **Population History replay:** NOT AVAILABLE.  
- **Synthetic cohort:** `r1b.synthetic.script_shapes.v1` for SCRIPT-LAYER STRUCTURAL METRICS only.  

---

## 6. Before/after comparison

### 6.1 Prediction Performance Metrics — NOT AVAILABLE

| Metric | Baseline | Candidate C | Delta | Pass/Fail |
|---|---|---|---|---|
| Match Result accuracy | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Draw accuracy | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Exact Score accuracy | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Goal Range accuracy | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| BTTS accuracy | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Over/Under accuracy | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |
| Confidence calibration | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE |

**No Winner / Score / Goal Range / BTTS / O/U / Confidence improvement is claimed.**

### 6.2 SCRIPT-LAYER STRUCTURAL METRICS (synthetic cohort only)

| Metric | Baseline A | Candidate C | Delta | Structural gate |
|---|---|---|---|---|
| Control activation rate | 1.0000 | 1.0000 | 0.0000 | Pass (stable) |
| Weak-edge Control mean weight | 0.3518 | 0.2341 | −0.1177 | Pass |
| Open Match activation rate | 0.9167 | 1.0000 | +0.0833 | Pass |
| Open-class Open Match mean weight | 0.1561 | 0.3429 | +0.1868 | Pass |
| Control mean weight | 0.3148 | 0.2591 | −0.0557 | Pass |
| Open Match mean weight | 0.1404 | 0.2567 | +0.1163 | Pass |
| Balanced mean weight | 0.2779 | 0.1703 | −0.1076 | Pass |
| Mean script concentration | 0.2779 | 0.2801 | +0.0022 | Pass (tolerance) |
| Favorite-class underdog λ ratio | 0.5581 | 0.5613 | +0.0032 | Pass |
| Open-class range4Plus mass | 0.4514 | 0.4682 | +0.0168 | Pass |

---

## 7. Promotion decision (corrected)

| Decision | Status |
|---|---|
| Structural eligibility (`evaluateR1BPromotionGate`.structurallyEligible) | **Yes** for Candidate C |
| Production promotion | **No** |
| Active `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` | **Baseline A** |
| Candidate C status | NON-DEFAULT / CANDIDATE / STRUCTURALLY VALIDATED / PENDING POPULATION VALIDATION |

`evaluateR1BPromotionGate` always returns `productionPromoted: false`. Structural eligibility alone cannot flip the production pin.

---

## 8. Regression analysis

- Projection V2 / unified matrix / Poisson unchanged.  
- Market remains findings-only.  
- Freeze v0.3 boundaries held.  
- Governance correction restores Baseline A as default without deleting Candidate C.  

---

## 9. Tests

| File | Coverage |
|---|---|
| `packages/analysis/test/match-script-calibration-r1b.spec.ts` | Baseline A is default; Candidate C accessible/non-default; deterministic resolve; synthetic structural tests; governance flags |

---

## 10. Known limitations

1. Durable Evaluation History unavailable → no Population Validation.  
2. Synthetic shapes ≠ live Provider Evidence.  
3. SCRIPT-LAYER STRUCTURAL METRICS ≠ Prediction Performance.  
4. Independent Poisson / G_MAX=6 tail limits remain (R1A).  
5. Replay sidecar still process-local.  

---

## 11. Deferred / next prerequisite

Deferred (unchanged):

- Repeat Fixture Intelligence  
- New Underdog / High-Score Tail Features  
- Market → Probability  
- Projection / Poisson redesign  
- ML / LLM  
- New Football State dimensions  

**Next prerequisite for real calibration promotion:** Durable Evaluation History (+ sidecar) enabling P2H/P2I population before/after on Candidate C. Do **not** treat P2K / History work as already authorized by this report alone — require explicit coding authorization.

---

## Quality gates (governance correction)

| Gate | Result |
|------|--------|
| `pnpm quality` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` (scoped) | Pass — analysis 60, statistics 63, report 14, api 28, web 42 |
| `pnpm build` (`@fas/analysis`) | Pass |
| Full `pnpm test` | Not re-run here; historically **BLOCKED** by `@fas/database` live PostgreSQL — env/infra |

---

## Files touched (governance correction)

| Area | Path |
|---|---|
| Production pin | `match-script-governed-parameters.ts` → Baseline A |
| Governance record | `match-script-calibration-governance.ts` (**new**) |
| Structural gate semantics | `match-script-calibration-cohort.ts` (`structurallyEligible` / `productionPromoted: false`) |
| Artifact limitations | `projection-parameter-artifact.ts` |
| Exports | `packages/analysis/src/index.ts` |
| Tests | `match-script-calibration-r1b.spec.ts` |
| Docs | this report; `PROJECT_STATE.md`; `PROJECT_INDEX.md` |

**Candidate C parameter values were not modified.** Match Script scoring behavior was not modified in this correction (beyond gate return-field semantics).

**End of R1B (governance-corrected).** Architecture Freeze v0.3 unchanged.
