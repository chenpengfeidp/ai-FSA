# P2D Football State Engine — Completion Report

**Sprint:** P2D — Football State Engine  
**Roadmap reference:** `docs/40_PRODUCT_ROADMAP.md` (Football Intelligence v2 Wave 3; governed Projection V2 layering)  
**Architecture freeze:** v0.3  
**Date:** 2026-07-30  
**Status:** Complete (production code + tests + quality gates)

---

## 1. Goal

Implement the first executable **Football State** aggregation layer between Features and Projection:

```text
Feature → Football State → Projection
```

Projection V2 now reads **Football State projection inputs** instead of scattered Features directly. The sealed Projection output contract (Winner, Scoreline, Goal Range, Confidence) is unchanged.

---

## 2. Files changed

### New (`@fas/analysis`)

| File | Purpose |
|---|---|
| `packages/analysis/src/projection-v2/football-state/football-state-types.ts` | Shared types: dimensions, projection inputs, foundation feature list |
| `packages/analysis/src/projection-v2/football-state/football-state-dimensions.ts` | Six dimension ids + labels |
| `packages/analysis/src/projection-v2/football-state/football-state-scoring.ts` | Deterministic feature normalization + dimension scoring |
| `packages/analysis/src/projection-v2/football-state/build-football-state-projection-inputs.ts` | Foundation ratings + lambda group factors from Features |
| `packages/analysis/src/projection-v2/football-state/compute-football-state.ts` | Main engine: six dimensions + projection inputs + envelope |
| `packages/analysis/src/projection-v2/football-state/football-state-report-metadata.ts` | Serializable report DTO from envelope |
| `packages/analysis/test/football-state.spec.ts` | P2D acceptance tests |

### Modified (`@fas/analysis`)

| File | Change |
|---|---|
| `football-state-envelope.ts` | Policy `footballState.v1`; envelope carries `projectionInputs` |
| `compute-identity-football-state.ts` | Legacy identity stub retained for tests |
| `lambda/lambda-builder-v2.ts` | Reads `FootballStateEnvelope.projectionInputs` only |
| `compute-projection-v2.ts` | Uses `computeFootballState` before Match Script + λ |
| `compute-deterministic-projection-v2.ts` | Requires `footballState`; strength/confidence from projection inputs |
| `compute-match-projection.ts` | Returns optional `footballState` report metadata on V2 pin |
| `probability-matrix/build-foundation-probability-matrix.ts` | Computes Football State before λ |
| `domain/analysis-result.ts` | Optional additive `footballState` field |
| `use-case/analyze-match-use-case.ts` | Passes `footballState` into AnalysisResult |
| `src/index.ts` | Public exports for Football State API |
| `test/projection-v2-*.spec.ts` | Updated to new `buildLambdasV2({ footballState })` contract |

### Modified (`@fas/report`)

| File | Change |
|---|---|
| `domain/analysis-report.ts` | Optional `footballState` on report |
| `builder/report-builder.ts` | Forwards from AnalysisResult |
| `use-case/generate-match-report-use-case.ts` | Preserves on enriched report rebuild |

### Modified (Web + API)

| File | Change |
|---|---|
| `apps/web/src/components/explainable-report/football-state-section.tsx` | **New** workspace section |
| `apps/web/src/components/explainable-report/explainable-match-report.tsx` | Pipeline section in prediction workspace |
| `apps/web/src/types/analysis.ts` | `FootballStateReportDto` types |
| `apps/web/src/copy/zh.ts` | Chinese copy + pipeline label |
| `apps/api/src/http-response.dto.ts` | Optional `footballState` on analyze response |

---

## 3. Football State model

Policy: **`footballState.v1`**

Six deterministic dimensions (no AI / ML / probability):

| Dimension | Typical signal Features |
|---|---|
| `attackState` | attack ratings, momentum, goals scored, xG attack, form, player attack |
| `defenseState` | defense ratings, goals conceded, xG defense, discipline, GK reliability |
| `controlState` | possession, chance creation, venue/home advantage, club strength |
| `transitionState` | finishing efficiency, form at home/on road, momentum, xG dominance |
| `pressureState` | knockout, schedule, fatigue, rotation, home stability |
| `riskState` | availability penalties, key player availability, squad availability, discipline |

Each dimension exposes:

- `level`: `absent | low | medium | high`
- `score`: `[0, 1]` normalized aggregate
- `basis`: `feature | derived`
- `sourceRefs`: contributing Feature names (provenance)

Envelope also carries:

- `projectionInputs` — foundation ratings + precomputed lambda group contributions
- `compositeTags` — deterministic cross-dimension tags (e.g. `LOW_EVENT_SHAPE`)
- `checksum` — stable identity over dimensions + projection inputs

---

## 4. State computation rules

1. **Features only** — all values derived from existing `FeatureBundle`; no Provider, Evidence, or Rule recomputation.
2. **Normalization** — rating-like Features scaled to `[0,1]`; signed/context Features centered; penalties clamped.
3. **Dimension score** — mean of normalized present Features in the dimension’s governed feature set.
4. **Level mapping** — `absent` when no sources; else `<0.34 low`, `<0.67 medium`, else `high`.
5. **Projection inputs** — same foundation + optional group-factor logic previously in `LambdaBuilderV2`, now computed once in Football State.
6. **No probability** — Football State never estimates win/draw/loss or goal probabilities.

---

## 5. Projection integration

```text
computeFootballState(featureBundle, lambdaParameters)
  → FootballStateEnvelope
  → buildLambdasV2({ footballState })        // no direct Feature reads
  → Match Script merge (unchanged, P2F)
  → computeDeterministicProjectionV2({ footballState, ... })
```

- `LambdaBuilderV2` signature is now `{ footballState, parameters }`.
- Confidence component `S` uses projection input foundation ratings (not raw Feature map).
- Output fields `pHome/pDraw/pAway`, `topScorelines`, `goalRange`, `confidence`, `recommendation` unchanged.
- V1 pin unaffected.

---

## 6. Workspace / Report impact

Prediction workspace now shows:

**证据 → 特征 → 足球状态 → 投影**

- New **足球状态** section (`id="football-state"`) with per-dimension level, score, basis, and Feature provenance.
- Composite tags and policy/checksum footer when V2 pin is active.
- Match Script section remains below Football State (P2F unchanged).
- API contract unchanged — additive optional `footballState` field on analyze response.

---

## 7. Tests added

| Test file | Coverage |
|---|---|
| `packages/analysis/test/football-state.spec.ts` | Six dimensions, projection inputs, report metadata, V2 integration |
| Updated `projection-v2-foundation.spec.ts` | Football State policy + lambda via envelope |
| Updated `projection-v2-feature-lambda.spec.ts` | xG lambda path via Football State |
| Updated `projection-v2-match-script.spec.ts` | Match Script + merged matrix with computed Football State |

---

## 8. Quality gates

| Command | Result |
|---|---|
| `pnpm --filter @fas/analysis test` | **34 passed** |
| `pnpm --filter @fas/report test` | **14 passed** |
| `pnpm --filter web test` | **42 passed** |
| `pnpm quality` (biome + depcruise + boundary fixture) | **Pass** |

---

## 9. Remaining limitations

1. **Dimension weights are uniform** — each present Feature in a dimension contributes equally; no governed per-feature weights yet.
2. **Composite tags are minimal** — four cross-dimension tags; not yet consumed by Match Script activation tables.
3. **Identity stub retained** — `computeIdentityFootballState` exists for legacy tests only; production V2 path uses `computeFootballState`.
4. **Pre-match only** — no live in-match state transitions.
5. **Match Script still reads Features/Rules directly** for activation scoring (P2F scope); Football State checksum is linked but affinities do not yet read dimension levels.
6. **Governance note** — P2A–P2F sprint ids remain pending formal doc 40 listing.

---

## 10. Recommended next sprint

**P2G — Football State Engine V1 (Match Script affinity feed)** or continue Wave 3 **M1B Manager Intelligence Features → Rules → Confidence → Projection**:

- Wire Match Script activation to Football State dimension levels / composite tags (reduce duplicate Feature reads in script generator).
- Add governed per-dimension weight tables if measured need appears in replay validation (P2E.5 metrics).
- Optionally expose Football State driver graph in Developer Details for audit.

---

## Acceptance checklist

| # | Item | Status |
|---|---|---|
| 1 | Completion Report | ✅ This document |
| 2 | Files changed | ✅ Section 2 |
| 3 | Football State model implemented | ✅ `footballState.v1` envelope |
| 4 | State computation rules | ✅ Section 4 |
| 5 | Projection integration | ✅ Section 5 |
| 6 | Workspace / Report impact | ✅ Section 6 |
| 7 | Tests added | ✅ Section 7 |
| 8 | Quality Gates | ✅ Section 8 |
| 9 | Remaining limitations | ✅ Section 9 |
| 10 | Recommended next sprint | ✅ Section 10 |

**Must NOT (verified):** Provider, Evidence schema, Rule logic, Evaluation, Calibration, Validation, Contribution, API contract, ScenarioSet — unchanged. No Match Script expansion, ML, or LLM in this sprint.
