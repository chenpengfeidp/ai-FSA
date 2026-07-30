# P2E Match Script Generator — Completion Report

**Sprint:** P2E — Match Script Generator  
**Roadmap reference:** `docs/40_PRODUCT_ROADMAP.md` (Football Intelligence v2 Wave 3; Projection V2 layering)  
**Architecture freeze:** v0.3  
**Date:** 2026-07-30  
**Status:** Complete (production code + tests + quality gates)

---

## 1. Goal

Implement deterministic **Match Script** generation from **Football State only**:

```text
Football State → Match Script → Projection
```

Match Scripts are plausible pre-match football narratives — deterministic interpretations of Football State, not direct Feature or Rule reads.

---

## 2. Files changed

### New (`@fas/analysis`)

| File | Purpose |
|---|---|
| `packages/analysis/src/projection-v2/match-script/match-script-football-state-scoring.ts` | Scores each catalog script from Football State dimensions, composite tags, and projection-input asymmetry |

### Modified (`@fas/analysis`)

| File | Change |
|---|---|
| `match-script-ids.ts` | Catalog: `home_control`, `away_control`, `open_match`, `low_event`, `counter_attack`, `balanced` |
| `match-script-parameter-set.ts` | Football State activation criteria (dimension bonuses, tags, asymmetric bonuses) |
| `match-script-governed-parameters.ts` | Governed `matchScript.v1` catalog with λ modifiers per script |
| `match-script-set.ts` | `activationReasons`, `footballStateRefs`; deprecated empty rule/feature fields |
| `match-script-generator.ts` | **`generateMatchScriptSet({ footballState })`** only — no Feature/Rule reads |
| `compute-baseline-match-script-set.ts` | Updated model fields; Football State input only |
| `compute-projection-v2.ts` | Script generation from Football State envelope |
| `projection-result.ts` | Framework summaries expose `activationReasons`, `footballStateRefs` |
| `src/index.ts` | Exports for scoring helper and catalog ids |
| `test/projection-v2-match-script.spec.ts` | P2E acceptance tests |

### Modified (Web)

| File | Change |
|---|---|
| `match-script-section.tsx` | Pipeline label; reasons list; Football State provenance per script |
| `types/analysis.ts` | `MatchScriptSummaryDto` extended |
| `copy/zh.ts` | Chinese copy for pipeline, reasons, Football State refs |

---

## 3. Match Script model

Policy: **`matchScript.v1`** (unchanged)

Each activated script carries:

| Field | Description |
|---|---|
| `scriptId` | Governed catalog id |
| `label` | Human label |
| `weight` | Softmax-normalized affinity (sums to 1 across active scripts) |
| `activationReasons` | Deterministic reason strings |
| `footballStateRefs` | Dimension ids, composite tags, or script id provenance |
| `lambdaModifiers` | Per-script λ multipliers + draw bias |
| `activationReason` | Joined string (API backward compat) |
| `activatingRules` / `strengtheningFeatures` | Deprecated — always empty (P2E) |

`MatchScriptSet` retains `footballStateChecksum`, `concentration`, `singleScriptFallback`, stable `checksum`.

---

## 4. Script activation logic

Scoring entry point: `scoreMatchScriptFromFootballState({ entry, footballState })`.

| Script | Primary Football State signals |
|---|---|
| **Home Control** | `controlState ≥ medium`, `attackState ≥ medium`, home attack rating > away |
| **Away Control** | `controlState ≥ medium`, `attackState ≥ medium`, away attack rating > home |
| **Counter Attack** | `transitionState ≥ medium`, `TRANSITION_CHANNEL` tag, home-favoured asymmetry |
| **Open Match** | `attackState ≥ medium`, `defenseState ≤ medium` |
| **Low Event** | `LOW_EVENT_SHAPE` tag, `defenseState ≥ medium`, `controlState ≤ low` |
| **Balanced** | Baseline affinity + fallback when mixture would collapse |

Weights: governed baseline + bonuses → **softmax** (temperature `0.85`) → filter `≥ 0.10` → renormalize. No ML, LLM, or randomization.

---

## 5. Projection integration

Unchanged merge path:

```text
computeFootballState → generateMatchScriptSet → buildLambdasV2
  → per-script buildScriptProbabilityMatrix(modifiers)
  → mergeProbabilityMatrices → computeDeterministicProjectionV2
```

Sealed outputs (`pHome/pDraw/pAway`, scorelines, goal range, confidence, recommendation) unchanged. `scorelinesBasis: match_script_merged_v2`.

---

## 6. Workspace / Report impact

Match Script workspace section now shows:

**足球状态 → 激活剧本 → 投影**

Per script card:
- Weight
- Activation reasons (list)
- Football State provenance (`footballStateRefs`)
- Per-script λ values

Additive DTO fields only — analyze API contract unchanged.

---

## 7. Tests added / updated

| Test | Coverage |
|---|---|
| `projection-v2-match-script.spec.ts` (P2E) | Football State-only activation, refs, catalog ids, matrix merge, projection contract |
| Existing projection / football-state tests | Unaffected (35 analysis tests pass) |

---

## 8. Quality gates

| Command | Result |
|---|---|
| `pnpm --filter @fas/analysis test` | **35 passed** |
| `pnpm --filter web test` | **42 passed** |
| `pnpm quality` | **Pass** |

---

## 9. Remaining limitations

1. **Side-specific control** — Football State dimensions are match-level aggregates; home/away control scripts use projection-input asymmetry as a proxy, not separate `home_control` / `away_control` state planes (P2B future).
2. **No `late_chaos` script** — not in P2E required catalog; pressureState bonuses can be added in a follow-up pin.
3. **Softmax temperature pinned** — not measured against replay validation yet.
4. **Balanced always eligible** — high baseline affinity ensures mixture stability; may dampen extreme single-script dominance.
5. **Governance note** — P2A–P2F sprint ids remain pending formal doc 40 listing.

---

## 10. Recommended next sprint

**P2E.5 / P2F follow-through — Projection replay validation against Football State + Match Script mixture** (if not already complete on branch), or **M1B** Manager Intelligence Features → Rules → Confidence → Projection.

Near-term Match Script hardening:
- Add governed `pressureState` / `riskState` bonuses for `late_chaos`-class scripts when authorized.
- Feed composite tags back into Football State dimension scoring feedback loop only if replay metrics justify it.

---

## Acceptance checklist

| # | Item | Status |
|---|---|---|
| 1 | Completion Report | ✅ This document |
| 2 | Files changed | ✅ Section 2 |
| 3 | Match Script model | ✅ Section 3 |
| 4 | Script activation logic | ✅ Section 4 |
| 5 | Projection integration | ✅ Section 5 |
| 6 | Workspace / Report impact | ✅ Section 6 |
| 7 | Tests added | ✅ Section 7 |
| 8 | Quality Gates | ✅ Section 8 |
| 9 | Remaining limitations | ✅ Section 9 |
| 10 | Recommended next sprint | ✅ Section 10 |

**Must NOT (verified):** Provider, Evidence, Features, Rule logic, Evaluation, Calibration, Validation, Contribution, API contract — unchanged. No ML or LLM introduced.
