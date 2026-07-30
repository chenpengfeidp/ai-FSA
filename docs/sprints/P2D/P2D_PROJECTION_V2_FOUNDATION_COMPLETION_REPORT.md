# P2D — Projection V2 Foundation Completion Report

| Field | Value |
|---|---|
| Sprint | **P2D** Projection V2 Foundation |
| Date | 2026-07-30 |
| Authority | Architecture Freeze v0.3 · P2A · P2B · P2C · `docs/40_PRODUCT_ROADMAP.md` (citation gap — see §0) |
| Scope | Production coding — Projection V2 framework in `@fas/analysis` with **identical prediction outputs to Projection V1** |
| Explicit exclusions | Evidence / Feature / Rule redesign · Confidence / Evaluation / Calibration / Validation / Contribution changes · ML · UI changes · planning documents |

---

## 0. Governance note (roadmap citation gap)

**P2D** was authorized by an explicit task request. **P2A**, **P2B**, **P2C**, and **P2D**–**P2M** are not yet listed in `docs/40_PRODUCT_ROADMAP.md`. Add them before further coding sprints in this track.

---

## 1. Completion summary

P2D introduces the **Projection V2 foundation pipeline** inside `@fas/analysis` while preserving **byte-for-byte identical** sealed prediction outputs to Projection V1.

**Pipeline implemented (foundation pin):**

```text
ProjectionParameterArtifact
  ↓
FootballState (identity)
  ↓
MatchScript (baseline only, weight 1)
  ↓
ProbabilityMatrix (wraps V1 Independent Poisson)
  ↓
ProjectionResult → delegates final projection to computeDeterministicMatchProjection (V1)
```

**Version compatibility:**

| Pin | Default | Behaviour |
|---|---|---|
| `"v1"` | **Yes** | Existing `computeDeterministicMatchProjection` path; no framework metadata |
| `"v2"` | No | Runs V2 pipeline; **same** `DeterministicMatchProjection`; exposes `projectionFramework` metadata |

Composition root (`AnalyzeMatchUseCase`) accepts optional `projectionPolicyPin` (default `"v1"`). API composition unchanged — default remains V1.

---

## 2. Deliverables produced

| # | Deliverable | Status |
|---|---|---|
| 1 | Completion Report | This document |
| 2 | Files changed | §3 |
| 3 | Projection V2 framework | §4 |
| 4 | Version compatibility | §5 |
| 5 | Quality gates | §6 |
| 6 | Remaining limitations | §7 |
| 7 | Recommended next sprint | §8 |

---

## 3. Files changed

### Added — `@fas/analysis` Projection V2 module

| File | Purpose |
|---|---|
| `packages/analysis/src/projection-v2/projection-parameter-artifact.ts` | `ProjectionParameterArtifact`, `BASELINE_PROJECTION_PARAMETER_ARTIFACT` |
| `packages/analysis/src/projection-v2/resolve-projection-policy.ts` | `ProjectionPolicyPin` (`"v1"` \| `"v2"`), default `"v1"` |
| `packages/analysis/src/projection-v2/football-state/football-state-envelope.ts` | `FootballStateEnvelope` model + checksum |
| `packages/analysis/src/projection-v2/football-state/compute-identity-football-state.ts` | Identity-only Football State |
| `packages/analysis/src/projection-v2/match-script/match-script-set.ts` | `MatchScriptSet` / `MatchScript` types |
| `packages/analysis/src/projection-v2/match-script/compute-baseline-match-script-set.ts` | Single baseline script `baseline_v1_compat`, weight 1 |
| `packages/analysis/src/projection-v2/probability-matrix/probability-matrix.ts` | `ProbabilityMatrix` abstraction |
| `packages/analysis/src/projection-v2/probability-matrix/build-foundation-probability-matrix.ts` | Wraps V1 `computeLambdas` + `buildIndependentPoissonMatrix` |
| `packages/analysis/src/projection-v2/projection-result.ts` | `ProjectionResult`, `ProjectionFrameworkMetadata` |
| `packages/analysis/src/projection-v2/compute-projection-v2.ts` | V2 orchestrator; delegates probability to V1 |
| `packages/analysis/src/projection/compute-match-projection.ts` | Version router (V1 default, V2 selectable) |
| `packages/analysis/test/projection-v2-foundation.spec.ts` | Foundation acceptance tests (4 cases) |

### Modified

| File | Change |
|---|---|
| `packages/analysis/src/index.ts` | Export V2 types, functions, constants |
| `packages/analysis/src/domain/analysis-result.ts` | Optional `projectionFramework` metadata |
| `packages/analysis/src/use-case/analyze-match-use-case.ts` | Route via `computeMatchProjection`; optional `projectionPolicyPin` |
| `packages/report/src/domain/analysis-report.ts` | Optional `projectionFramework` on report contract |
| `packages/report/src/builder/report-builder.ts` | Pass through `projectionFramework` |
| `packages/report/src/use-case/generate-match-report-use-case.ts` | Preserve `projectionFramework` in overlay rebuild |
| `apps/api/src/http-response.dto.ts` | Optional `projectionFramework` on `AnalysisReportDto` (metadata only) |
| `docs/PROJECT_STATE.md` | P2D delivery snapshot |

**Not modified:** `@fas/evidence`, `@fas/feature`, `@fas/rule`, `@fas/statistics` (Confidence / Evaluation / Calibration / Validation / Contribution), web UI.

---

## 4. Projection V2 framework introduced

| Component | Foundation behaviour |
|---|---|
| `ProjectionParameterArtifact` | Pinned baseline `projectionParams:v3.0:baseline`; identity coefficients only |
| `FootballState` | Single `identity` dimension at `absent` / score 0 |
| `MatchScript` | One script `baseline_v1_compat`, weight 1.0 |
| `ProbabilityMatrix` | V1 Poisson matrix wrapper with checksum + marginals |
| Final projection | **`computeDeterministicMatchProjection`** — no λ, softmax, scenario, or calibration changes |

Framework metadata (`projectionFramework`) records artifact id/checksum, state/script policy versions, and matrix checksum when pin is `"v2"`.

---

## 5. Version compatibility

| Requirement | Evidence |
|---|---|
| V1 remains available | `computeDeterministicMatchProjection` unchanged; default pin `"v1"` |
| V2 selectable by pin | `AnalyzeMatchUseCase(..., projectionPolicyPin: "v2")` or `computeMatchProjection({ projectionPolicyPin: "v2" })` |
| Default remains V1 | API composition root unchanged; test `defaults computeMatchProjection to V1` |
| Identical prediction outputs | Test `matches Projection V1 outputs byte-for-byte on probabilities` |
| No UI changes | Metadata only on report/API DTO; no web package changes |

---

## 6. Quality gates

| Check | Result |
|---|---|
| `pnpm quality` (biome + depcruise + boundary fixture) | **Pass** |
| `pnpm exec turbo run typecheck test --filter=@fas/analysis --filter=@fas/report` | **Pass** — 20 analysis tests (4 new), 14 report tests |
| Architecture boundaries | **Pass** — no new dependency violations |
| Full `pnpm validate` | **Blocked** — requires `DATABASE_URL` for Prisma generate (pre-existing env requirement; not introduced by P2D) |

---

## 7. Remaining limitations

- Football State is **identity-only** — no P2B situational dimensions activated.
- Match Script set contains **one baseline script** — no multi-script mixture or Rule-driven activation.
- `ProbabilityMatrix` is observational in foundation pin — final sealed outputs still come from V1 projection path (dual observation until P2G unified matrix).
- `ProjectionParameterArtifact` lives in `@fas/analysis` (foundation); migration to `@fas/statistics` governance store deferred per P2C §10.
- doc 40 does not yet list P2A–P2D or P2E–P2M.
- API does not expose a runtime pin selector — V2 requires composition-root wiring.

---

## 8. Recommended next sprint

| Priority | Sprint | Rationale |
|---|---|---|
| 1 | **P2E** — `footballState.v1` module (P2B semantics) | Activate real Football State dimensions; still V1-equivalent outputs until script/projection math changes |
| 2 | **M1B** Manager Intelligence Features → Rules → Confidence → Projection | Parallel Wave 3 authorized work (unchanged by P2D) |
| 3 (governance) | doc 40 update | Add P2A–P2M sprint ids |

Per P2C §10 sequence after P2E: **P2F** Match Script module → **P2G** unified matrix (remove dual basis + orphan softmax).

---

## Sign-off

| Item | Status |
|---|---|
| P2D Projection V2 Foundation | **Complete (production code)** |
| Prediction outputs vs V1 | **Unchanged (tested)** |
| Default projection pin | **V1** |
| Next in Projection V2 track | **P2E** Football State module |

---

*End of P2D Completion Report.*
