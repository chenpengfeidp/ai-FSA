# P2K-D — Offline Replay Parameter / Match Script Override

**Status:** COMPLETED  
**Sprint id:** P2K-D  
**Roadmap citation:** Continues P2K after P2K-C (`docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md` § P2K-D). Doc 40 may not yet list P2K by name.  
**Architecture Freeze:** v0.3 (unchanged)  
**Date:** 2026-08-12  

---

## 1. Goal

Enable deterministic **offline-only** Projection V2 replay of the **same** sealed historical Sidecar context under two governed Match Script parameter sets:

| Label | Role |
| --- | --- |
| `r1b.candidate.a.baseline` | Baseline A (production default pin; explicit offline selection) |
| `r1b.candidate.c.sideAwareOpen` | Candidate C (NON-DEFAULT; structural only) |

Prepare a correct A/B replay path. **Does not** promote Candidate C. **Does not** change production prediction semantics. **Does not** claim population metrics.

## 2. Offline-only nature

- Entry point: `runOfflineMatchScriptReplay` in `@fas/analysis`
- Inputs: Evaluation History record + Projection Replay Sidecar record + **explicit** `matchScriptCalibrationLabel`
- No live Provider refresh
- No Evidence / Feature / Rule regeneration from current external data
- Sealed Sidecar Features + Rules are the only projection inputs rebuilt (`buildFeatureBundleFromSealedReplayContext` / `buildRuleResultsFromSealedReplayContext`)
- Production `AnalysisProjectionReplayPort.replayV2` is unchanged (no implicit Candidate C path)

## 3. Parameter override mechanism

| Path | Resolver | Empty / unknown label |
| --- | --- | --- |
| Production analysis | `resolveMatchScriptParameterSet` | Falls back to Baseline A / governed set (unchanged) |
| Offline P2K-D | `resolveOfflineMatchScriptParameterSet` | **Rejects** (`PRODUCTION_IMPLICIT_OVERRIDE` / `INVALID_PARAMETER_LABEL`) |

Offline path builds a run-scoped Projection parameter artifact from the Sidecar-pinned base artifact (P2J registry) with **only** `matchScript` replaced by the resolved A or C set. Artifact id / checksum provenance includes the offline calibration label.

## 4. Production safety

| Invariant | Status |
| --- | --- |
| `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` = `MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET` | Unchanged |
| Production default = Baseline A | Unchanged |
| Candidate C NON-DEFAULT / not population validated / not production promoted | Unchanged |
| Offline requires explicit label | Enforced |
| No implicit Candidate C fallback | Enforced |

## 5. Same-context invariant

For one History + Sidecar pair, Replay A and Replay C share identical `historicalReplayContext`:

- `matchId`
- feature names / `featureBundleChecksum` / feature model version
- rule ids / names
- evidence refs, `generatedAt`, required evidence count
- Sidecar `contentSha256` / `schemaVersion`
- pinned parameter version labels from the sealed Sidecar

**Only** `matchScriptCalibrationLabel` (and derived offline parameter artifact checksum / Match Script selection / resulting projection) intentionally differs.

## 6. Parameter provenance

Every successful offline result exposes:

- `matchScriptCalibrationLabel` (`r1b.candidate.a.baseline` | `r1b.candidate.c.sideAwareOpen`)
- `isProductionDefault` (true only for explicit Baseline A)
- `productionPromoted: false` always
- `offlineParameterArtifactId` / `offlineParameterArtifactChecksum`
- `limitations` stating offline-only / no population claims / C not promoted

Replay A vs Replay C is distinguishable without inspecting internals.

## 7. Failure conditions

| Code | When |
| --- | --- |
| `MISSING_SIDECAR` | No Sidecar record |
| `INVALID_SIDECAR_HASH` | `contentSha256` mismatch |
| `UNSUPPORTED_SIDECAR_SCHEMA` | Schema not supported |
| `INCOMPLETE_REPLAY_CONTEXT` | Missing features/rules/context fields |
| `MATCH_ID_MISMATCH` | History vs Sidecar matchId |
| `INVALID_PARAMETER_LABEL` | Unknown / non-A/C label (incl. Candidate B) |
| `PRODUCTION_IMPLICIT_OVERRIDE` | Empty / whitespace label |
| `MISSING_REQUIRED_REPLAY_ARTIFACT` | Unpinned / unknown parameterVersionLabel |

No silent fallback to Baseline A when Candidate C (or any invalid label) is requested.

Eligibility uses P2K-C `assessProjectionReplayEligibility` (`replayComplete` required). Outcome scoring is **not** required for offline parameter override (population metrics remain later sprints).

## 8. Determinism

Identical History + Sidecar + calibration label → identical:

- parameter label
- historical context identity
- Match Script selection provenance
- prediction / projection checksum
- metadata (active scripts, framework pins)

## 9. Architecture Freeze v0.3

Unchanged. No new Engine, Provider, Feature, Rule, Football State dimension, Projection/Poisson math change, Market→Probability, or production Match Script behavior change.

## 10. Explicit non-claims (no population validation)

P2K-D does **not** report:

- Winner / Draw / Exact Score / Goal Range / BTTS / Over-Under improvement
- Confidence calibration improvement
- Population Validation or Candidate C promotion readiness beyond structural offline path readiness

## 11. Tests

Focused: `packages/analysis/test/offline-match-script-replay-p2k-d.spec.ts`

Covers Baseline A / Candidate C PASS, production default unchanged, same-context A/C, provenance, missing/invalid hash/schema/label rejects, sealed-only inputs, determinism.

Regression: P2H replay port, R1B governance, P2K-C eligibility, P2J artifact tests (scoped).

## 12. Quality gates

| Gate | Status |
| --- | --- |
| `pnpm quality` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS |
| `pnpm build` | PASS |
| Scoped P2K-D / P2H / R1B / P2K-C / P2J tests | PASS |
| PostgreSQL (P2K-D-specific) | SKIPPED — no new persistence in P2K-D; existing `@fas/database` History/Sidecar tests PASS in suite |

## 13. Next step

**P2K-E — Sealed Replay Cohort**

---

## Files touched

- `packages/analysis/src/projection-v2/match-script/match-script-calibration-governance.ts` — `resolveOfflineMatchScriptParameterSet`
- `packages/analysis/src/replay/offline-match-script-replay.ts` — offline replay API
- `packages/analysis/src/replay/sealed-replay-context-builders.ts` — shared sealed rebuilders
- `packages/analysis/src/replay/analysis-projection-replay-port.ts` — reuse builders (no behavior change)
- `packages/analysis/src/index.ts` — exports
- `packages/analysis/test/offline-match-script-replay-p2k-d.spec.ts`
- `docs/sprints/P2K/P2K_D_OFFLINE_REPLAY_PARAMETER_OVERRIDE_COMPLETION_REPORT.md`
- `docs/PROJECT_STATE.md`
- `docs/PROJECT_INDEX.md`
