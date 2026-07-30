# P2F — Match Script Engine V1 Completion Report

| Field | Value |
|---|---|
| Sprint | **P2F** Match Script Engine V1 |
| Date | 2026-07-30 |
| Authority | Architecture Freeze v0.3 · P2B · P2C · P2D · P2E · P2E.5 · `docs/40_PRODUCT_ROADMAP.md` (citation gap — see §0) |
| Scope | Production coding — deterministic Match Script generation and matrix merge in Projection V2 |
| Explicit exclusions | Evidence / Feature extraction / Rule evaluation redesign · Confidence / Evaluation / Calibration / Validation / Replay changes · ML · LLM · planning documents |

---

## 0. Governance note (roadmap citation gap)

**P2F** was authorized by an explicit task request. **P2A**–**P2F** and proposed downstream ids are not yet listed in `docs/40_PRODUCT_ROADMAP.md`. Add them before further coding sprints in this track.

---

## 1. Completion summary

P2F introduces **deterministic Match Script generation** into Projection V2. Multiple pre-match scripts are activated from existing Features and Rules, each produces its own λ via **LambdaBuilderV2** with governed modifiers, builds an independent Poisson matrix, and merges into one final distribution for all downstream outputs.

```text
FeatureBundle + RuleResults
  → generateMatchScriptSet (matchScript.v1)
  → per-script buildLambdasV2 + lambdaModifiers
  → buildScriptProbabilityMatrix (+ drawBias)
  → mergeProbabilityMatrices (governed weights)
  → calibration on merged 1X2
  → sealed DeterministicMatchProjection (match_script_merged_v2)
```

| Pin | Default | Behaviour |
|---|---|---|
| `"v1"` | **Yes** | Unchanged V1 projection |
| `"v2"` | No | Match Script merge path via `MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT` |

Initial script catalog: **Home Control**, **Away Counter**, **Balanced**, **Low Event**.

---

## 2. Deliverables produced

| # | Deliverable | Status |
|---|---|---|
| 1 | Completion Report | This document |
| 2 | Files changed | §3 |
| 3 | MatchScriptGenerator implementation | §4 |
| 4 | Matrix merge implementation | §5 |
| 5 | Projection compatibility | §6 |
| 6 | Quality gates | §7 |
| 7 | Remaining limitations | §8 |
| 8 | Recommended next sprint | §9 |

---

## 3. Files changed

### Added — `@fas/analysis`

| File | Purpose |
|---|---|
| `packages/analysis/src/projection-v2/match-script/match-script-ids.ts` | Script id constants |
| `packages/analysis/src/projection-v2/match-script/match-script-parameter-set.ts` | Governed parameter types |
| `packages/analysis/src/projection-v2/match-script/match-script-governed-parameters.ts` | Pinned `matchScript.v1` activation tables |
| `packages/analysis/src/projection-v2/match-script/match-script-generator.ts` | **`generateMatchScriptSet`** |
| `packages/analysis/src/projection-v2/probability-matrix/apply-draw-bias.ts` | Draw-bias adjustment on Poisson slice |
| `packages/analysis/src/projection-v2/probability-matrix/build-script-probability-matrix.ts` | Per-script matrix builder |
| `packages/analysis/src/projection-v2/probability-matrix/merge-probability-matrices.ts` | **`mergeProbabilityMatrices`** |
| `packages/analysis/test/projection-v2-match-script.spec.ts` | P2F acceptance tests |

### Modified — `@fas/analysis`

| File | Change |
|---|---|
| `packages/analysis/src/projection-v2/match-script/match-script-set.ts` | Multi-script set; lambda modifiers; policy `matchScript.v1` |
| `packages/analysis/src/projection-v2/match-script/compute-baseline-match-script-set.ts` | Baseline compat script shape |
| `packages/analysis/src/projection-v2/projection-parameter-artifact.ts` | `MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT`; optional `matchScript` section |
| `packages/analysis/src/projection-v2/projection-result.ts` | `activeMatchScripts` in framework metadata |
| `packages/analysis/src/projection-v2/compute-projection-v2.ts` | Generator + per-script matrices + merge path |
| `packages/analysis/src/projection-v2/resolve-projection-policy.ts` | V2 pin resolves match-script artifact |
| `packages/analysis/src/projection/compute-deterministic-projection-v2.ts` | Accept merged matrix; `match_script_merged_v2` basis |
| `packages/analysis/src/projection/deterministic-match-projection.ts` | Extended `scorelinesBasis` union |
| `packages/analysis/src/index.ts` | Public exports |
| `packages/analysis/test/projection-v2-foundation.spec.ts` | Updated for P2F V2 behaviour |

### Modified — Workspace / Report

| File | Change |
|---|---|
| `apps/web/src/types/analysis.ts` | `ProjectionFrameworkDto`, `MatchScriptSummaryDto` |
| `apps/web/src/components/explainable-report/match-script-section.tsx` | **New** read-only Match Script workspace section |
| `apps/web/src/components/explainable-report/explainable-match-report.tsx` | Renders Match Script section under prediction workspace |
| `apps/web/src/copy/zh.ts` | Match Script UI copy |

**Not modified:** `@fas/evidence`, `@fas/feature`, `@fas/rule`, `@fas/statistics` (Evaluation / Calibration / Validation / Replay), Confidence computation policy.

---

## 4. MatchScriptGenerator implementation

| Component | Detail |
|---|---|
| Entry point | `generateMatchScriptSet({ featureBundle, ruleResults, footballState, parameters? })` |
| Activation | Rule PASS bonuses + Feature presence/strength bonuses + baseline affinity per catalog entry |
| Normalization | Softmax with governed temperature τ; filter `minScriptWeight`; ensure ≥ `minActiveScripts` via Balanced fallback |
| Provenance | Each script records `activatingRules`, `strengtheningFeatures`, `activationReason` |
| Lambda modifiers | Governed in `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` (P2B-aligned multipliers + drawBias for Low Event) |
| Constraints | No ML/LLM; pre-match only; Rules activate scripts but do not softmax-adjust 1X2 |

---

## 5. Matrix merge implementation

| Step | Function |
|---|---|
| Base λ | `buildLambdasV2` once per match |
| Per script | `buildScriptProbabilityMatrix` — applies script λ multipliers + drawBias |
| Merge | `mergeProbabilityMatrices` — convex combination of scoreline cells; marginals recomputed from merged matrix |
| Outputs | Merged 1X2, top scorelines, goal range feed sealed projection; BTTS/O/U derivable from merged marginals in downstream replay overlays |

Framework metadata exposes per-script λ and weight via `activeMatchScripts`.

---

## 6. Projection compatibility

- **V1:** unchanged (`computeDeterministicMatchProjection`).
- **V2 pin:** `computeProjectionV2` → match-script artifact → merged matrix → `scorelinesBasis: "match_script_merged_v2"`.
- **Calibration:** applied to merged 1X2 only (unchanged A2 governance).
- **Confidence:** unchanged Intelligence Confidence path; Rules remain explainability-only for probabilities.
- **Report/API:** `projectionFramework.activeMatchScripts` passed through `@fas/report` to web workspace (read-only display).

---

## 7. Quality gates

| Command | Result |
|---|---|
| `pnpm exec turbo run typecheck test --filter=@fas/analysis --filter=@fas/report` | **Pass** — analysis 30 tests, report 14 tests |
| `pnpm exec turbo run typecheck test --filter=@fas/web` | **Pass** — web 42 tests |
| `pnpm quality` | **Pass** — Biome, dependency-cruiser, boundary fixtures |

**Not run:** full `pnpm validate` (pre-existing `DATABASE_URL` requirement).

---

## 8. Remaining limitations

1. **Football State remains identity envelope** — script activation reads Features/Rules directly; full Football State dimension scoring is a later sprint.
2. **Four-script catalog only** — `open_match`, `late_chaos`, etc. from P2B design not yet activated.
3. **Balanced fallback** — ensures minimum script count; may dilute sharp activations on sparse evidence.
4. **Draw bias heuristic** — Low Event drawBias applied via deterministic matrix scaling, not a separate draw mass channel.
5. **V2 pin required for UI** — Match Script workspace section appears only when `projectionFramework` is present (V2 analyze path).
6. **Roadmap citation gap** — P2F not yet listed in doc 40.

---

## 9. Recommended next sprint

**P2G — Football State Engine V1** (or next P2B-aligned coding id): replace identity Football State with governed dimension scoring to drive script affinities, while keeping Match Script merge mechanics unchanged.

Parallel authorized work remains **M1B** Manager Intelligence Features → Rules → Confidence → Projection.

---

## Acceptance checklist

- [x] Completion Report
- [x] Files changed
- [x] MatchScriptGenerator implementation
- [x] Matrix merge implementation
- [x] Projection compatibility (V1 unchanged, V2 version-pinned)
- [x] Quality gates evidence
- [x] Remaining limitations
- [x] Recommended next sprint
- [x] Production code only
- [x] Workspace/Report exposes active scripts, weights, provenance
