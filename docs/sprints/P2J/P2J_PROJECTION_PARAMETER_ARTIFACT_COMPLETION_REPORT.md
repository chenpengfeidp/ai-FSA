# P2J Projection Parameter Artifact — Completion Report

**Sprint:** P2J  
**Type:** Production coding sprint  
**Catalog model:** `projectionParameterCatalog.v1.p2j`  
**Date:** 2026-07-31  
**Roadmap cite:** Task-authorized P2 sequence after Architecture Freeze v0.3 (P2A–P2I prior); not yet listed in `docs/40_PRODUCT_ROADMAP.md`.

## Goal

Externalize and govern Projection constants as versioned `ProjectionParameterArtifact`s. Runtime loads parameters through the artifact. Replay records the parameter version used. No Football State / Match Script / Projection algorithm redesign. No Evidence / Feature / Rule / Evaluation / Calibration changes. No ML, no automatic optimization, no parameter tuning.

## Parameter groups

| Group | Contents (preserved numeric defaults) |
|-------|----------------------------------------|
| `lambda` | baseRate/min/max, attack/defence shares, home advantage via feature weights, rating scale |
| `matchScript` | temperature, minScriptWeight, catalog λ modifiers, drawBias, dimension bonuses |
| `footballState` | level thresholds `lowThreshold=0.34`, `mediumThreshold=0.67` |
| `confidence` | A/C/S weights `0.35/0.3/0.35`, conflict penalty, maxConfidence, evidence weight |
| `recommendation` | lean margins `0.08/0.08/0.05`, insufficient/cautious gates |
| `matrixMerge` | algorithm `convex_cell_merge_v1`, normalizeWeights |

Dixon–Coles ρ: **not present** (independent Poisson only) — recorded as an artifact limitation.

## Version labels

| Label | Artifact | Role |
|-------|----------|------|
| `projection.v3.baseline` | `projectionParams:v3.0:baseline` | Foundation λ only |
| `projection.v3.experimental` | `projectionParams:v3.0:featureLambda` | Feature-enriched λ |
| `projection.v3.replay` | `projectionParams:v3.1:matchScript` | **Active** V2 / replay (unified matrix) |

## Runtime integration

- V2 pin resolves active artifact via `getActiveProjectionParameterArtifact()` → `projection.v3.replay`.
- `computeFootballState` reads `footballState` thresholds from the artifact.
- `computeDeterministicProjectionV2` reads `confidence` + `recommendation` from the artifact (same numbers as prior hard-codes).
- `ProjectionFrameworkMetadata` includes `parameterVersionLabel`.
- Replay sidecar (`SealedProjectionReplayContext`) records `parameterArtifactId` / `parameterVersionLabel` / `parameterArtifactChecksum`.
- V2 replay resolves the recorded `parameterVersionLabel` when present; otherwise falls back to active artifact.

## Workspace / API

- Workspace section **投影参数** — active version, parameter groups, artifact provenance (checksum/status/flags).
- `GET /api/projection-parameters` — deterministic catalog (`projectionParameterCatalog.v1.p2j`).
- Analyze report attaches `projectionParameters` catalog with `usedInAnalysis` when V2 framework is present.

## Files changed

| Area | File | Change |
|------|------|--------|
| Groups | `packages/analysis/src/projection-v2/projection-parameter-groups.ts` | **New** |
| Artifact | `packages/analysis/src/projection-v2/projection-parameter-artifact.ts` | versionLabel + groups + checksum payload |
| Registry | `packages/analysis/src/projection-v2/projection-parameter-registry.ts` | **New** catalog / resolve |
| Runtime | `compute-deterministic-projection-v2.ts`, `compute-football-state.ts`, `football-state-scoring.ts`, `compute-projection-v2.ts`, `compute-match-projection.ts`, `resolve-projection-policy.ts`, `projection-result.ts` | Load params from artifact |
| Replay | `projection-replay-context.ts`, `projection-replay-metadata.ts`, `analysis-projection-replay-port.ts` | Record + resolve version |
| Report | `analysis-report.ts`, `generate-match-report-use-case.ts` | Optional `projectionParameters` |
| API | `projection-parameters.controller.ts`, `evidence.module.ts`, `http-response.dto.ts` | `GET /api/projection-parameters` |
| Web | `projection-parameters-section.tsx`, types, copy, report layout | Workspace section |
| Tests | `projection-parameter-artifact.spec.ts` + API/web/replay updates | P2J acceptance |
| Docs | `PROJECT_STATE.md`, this completion report | Sprint status |

## Tests

- `packages/analysis/test/projection-parameter-artifact.spec.ts` (new)
- `packages/analysis/test/projection-replay-port.spec.ts` — records `projection.v3.replay`
- `apps/api/test/import-evidence-workflow.spec.ts` — `GET /api/projection-parameters`
- `apps/web/test/explainable-report.spec.tsx` — section unavailable state

## Quality gates

| Gate | Result |
|------|--------|
| `pnpm quality` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` (P2J packages) | Pass — analysis 51, statistics 63, report 14, api 28, web 42 |
| `pnpm build` | Pass |
| `pnpm validate` | Toolchain/workspace/prisma/quality/typecheck pass; full `pnpm test` blocked by `@fas/database` prisma-evidence-repository needing live PostgreSQL (`DATABASE_URL`) — env/infra, not P2J |

## Remaining limitations

1. Catalog versions are pinned constants — no Evaluation-qualified promotion path yet.
2. Dixon–Coles ρ still absent; independent Poisson scorelines only.
3. Legacy V1 sidecars lack parameter version fields; V2 replay falls back to active artifact.
4. Sidecar storage remains process-local memory (P2H limitation).
5. P2J not yet listed in `docs/40_PRODUCT_ROADMAP.md`.
6. No automatic parameter selection or tuning by design.

## Recommended next sprint

**P2K — Durable replay sidecar persistence** (PostgreSQL alongside Evaluation History) so parameter-version provenance survives restart; or parallel **M1B** Manager Intelligence Features → Rules → Confidence → Projection.
