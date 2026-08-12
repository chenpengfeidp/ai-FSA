# P2K-G Validation Recovery Report

**Status:** COMPLETED (recovery diagnosis) — **Case C: zero offline-rebuildable rows**  
**Date:** 2026-08-12  
**Architecture Freeze:** v0.3 (unchanged)  
**Scope:** Validation recovery only. No P2K-H. No Candidate C promotion. No production Match Script change. No historical data mutation.

---

## 1. Root cause of `RuleResultValidationError: ruleId is invalid`

### Trace

```text
ProjectionReplaySidecar.context.rules[].ruleId
  → buildRuleResultsFromSealedReplayContext
  → createRuleResult({ ruleId, ruleName, status, score, weight, channel, ... })
  → requireAllowedValue(ruleId, catalog ruleIds, "ruleId")
  → RuleResultValidationError: "ruleId is invalid."
```

### Classification

**A. Persisted validation fixtures are invalid** (test-fixture contamination).

Not:

- B (general Sidecar contract incompatible with RuleResult) — real AnalyzeMatch Sidecars store catalog ids via `buildProjectionReplayContext`.
- C (P2K-D incorrectly rejecting valid historical RuleResults) — `rule-1` / `rule-p2k` are not catalog `RuleId` values.
- D (serialization alone) — values round-trip correctly; they are simply non-catalog strings.

### Stored vs expected

| Field | Stored in `fas_validation` Sidecars | Expected by `createRuleResult` |
| --- | --- | --- |
| `ruleId` | `rule-p2k` (40) or `rule-1` (7) | Catalog id, e.g. `rule:home-attack-edge:v1` |
| `ruleName` | `HOME_ATTACK_EDGE` | `HOME_ATTACK_EDGE` (valid) |
| `status` | `PASS` | `PASS` / `FAIL` / `INAPPLICABLE` |
| `score` / `weight` | `0.3` / `1` | For `PASS`, `score` must equal `weight` |
| `featureModelVersion` | `feature.v2.test` (all 47) | Production feature model versions from AnalyzeMatch |

Failing field/value observed first: **`ruleId = "rule-1"` or `"rule-p2k"`**.

Latent second failure (not reached while `ruleId` fails): **`score = 0.3` with `weight = 1` and `status = PASS`** would also fail score validation.

### Production impact

| Question | Answer |
| --- | --- |
| Would real AnalyzeMatch Sidecars be affected? | **No** — they persist `rule.ruleId` from live `RuleResult` (catalog-valid). |
| Is this fixture-only in current DB? | **Yes** — 100% of Sidecar rows are `feature.v2.test` with fake rule ids. |
| Implementation gap? | P2K-C `replayEligible` does **not** check RuleResult catalog rebuildability. Offline P2K-D does. Fixtures can pass P2K-C and fail P2K-F. |

Focused tests: `packages/analysis/test/sealed-replay-rule-rebuild-p2k-g-recovery.spec.ts`  
Diagnostic (non-mutating): `assessSealedReplayRuleRebuild` in `@fas/analysis`.

### Phase 2 — no historical mutation

Invalid rows were **not** rewritten. Classified as:

`REPLAY_INELIGIBLE_INVALID_RULE_CONTRACT`

with explicit `INVALID_RULE_ID` reason. No fabricated replacement `ruleId`.

---

## 2. Population inventory (live `fas_validation`)

| Metric | Count |
| --- | --- |
| History rows inspected | **67** |
| Sidecar rows inspected | **47** |
| `replayComplete` (P2K-C) | **47** |
| `outcomeEvaluable` (P2K-C) | **67** |
| `replayEligible` (P2K-C) | **47** |
| Offline RuleResult-rebuildable | **0** |
| Offline-replay-eligible (P2K-C ∧ rebuildable) | **0** |
| Missing Sidecar | **20** |
| Invalid Sidecar hash | **0** |
| Invalid ruleId issues | **47** (all Sidecars) |
| Invalid score issues reached | **0** (blocked by ruleId first) |

### P2K-C reason counts

| Reason | Count |
| --- | --- |
| `MISSING_SIDECAR` | 20 |

(No other P2K-C blockers; the 47 with Sidecars are P2K-C-complete.)

### Inventory classes

| Class | Count |
| --- | --- |
| `OFFLINE_REPLAY_ELIGIBLE` | **0** |
| `REPLAY_INELIGIBLE_INVALID_RULE_CONTRACT` | **47** |
| `REPLAY_INELIGIBLE` (no Sidecar) | **20** |

### Distinct stored rules

| ruleId | ruleName | n |
| --- | --- | --- |
| `rule-p2k` | `HOME_ATTACK_EDGE` | 40 |
| `rule-1` | `HOME_ATTACK_EDGE` | 7 |

---

## 3. Phase 4 decision — Case C

**Zero** rows are both P2K-C `replayEligible` and offline RuleResult-rebuildable.

**STOP.** No sealed cohort created. No A/C Replay Runs executed. No P2K-G metric fabrication.

Required next validation-data bootstrap (human-authorized, separate from this recovery coding):

1. Persist History + Sidecar from **real** AnalyzeMatch / production analysis path (catalog-valid `ruleId`, PASS score=weight).  
2. Or seed a dedicated validation DB with real recorded matches — never rewrite existing fixture Sidecars.  
3. Then re-run recovery inventory → seal → P2K-F A/C → P2K-G.

---

## 4. Cohort / Replay / Metrics

| Item | Result |
| --- | --- |
| Real sealed validation cohort created | **NO** |
| Baseline A Replay Run executed | **NO** |
| Candidate C Replay Run executed | **NO** |
| P2K-G metrics calculated | **NO** — all **NOT_AVAILABLE** |

### Metric table

| Metric | A | C | Delta C−A | Sample |
| --- | --- | --- | --- | ---: |
| Match Result accuracy | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| Home / Draw / Away | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| Exact Score | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| Goal Range | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| BTTS | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| Over/Under 2.5 | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| Brier Score (lower better) | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| ECE (lower better) | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |
| Confidence–winner correlation | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | 0 |

Reason: Case C — no offline-rebuildable sealed population.

---

## 5. Governance

**A. NO EVIDENCE** — no valid paired population.

- Candidate C remains **NON-DEFAULT** / **NOT PRODUCTION PROMOTED** (`productionPromoted = false`)
- Production Match Script remains **Baseline A** (`GOVERNED_MATCH_SCRIPT_PARAMETER_SET`)
- **P2K-H is NOT authorized**

---

## 6. Files changed

| File | Role |
| --- | --- |
| `packages/analysis/src/replay/assess-sealed-replay-rule-rebuild.ts` | Non-mutating offline RuleResult rebuild diagnostic |
| `packages/analysis/src/index.ts` | Export diagnostic |
| `packages/analysis/test/sealed-replay-rule-rebuild-p2k-g-recovery.spec.ts` | Root-cause tests |
| `docs/sprints/P2K/scripts/p2k-g-validation-recovery-inventory.mjs` | Live DB inventory + Case C stop |
| `docs/sprints/P2K/P2K_G_VALIDATION_RECOVERY_REPORT.md` | This report |

---

## 7. Tests and live DB validation

| Layer | Status |
| --- | --- |
| Code tests (root-cause + package suites) | See quality gates |
| Persistence tests | Exist separately — **not** population validation |
| Live population evidence | **Executed** against `fas_validation` — Case C, NO EVIDENCE |

Extractor command:

```bash
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-g-validation-recovery-inventory.mjs
```

---

## 8. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |

---

## 9. Concise answers

1. **Root cause:** Fixture Sidecars store non-catalog `ruleId` (`rule-1` / `rule-p2k`); P2K-D rebuild via `createRuleResult` rejects them.  
2. **Real offline-replay-eligible rows in DB?** **No** (0).  
3. **Valid offline-rebuildable:** **0**; P2K-C eligible: **47**.  
4. **Invalid:** 47 invalid rule contract; 20 missing Sidecar.  
5. **Real sealed cohort created?** **No**.  
6. **A/C Replay executed?** **No**.  
7. **P2K-G metrics calculated?** **No**.  
8. **Metric table:** all NOT_AVAILABLE.  
9. **Governance:** **A. NO EVIDENCE**.  
10. **Candidate C NON-DEFAULT:** confirmed.  
11. **Production Baseline A:** confirmed.  
12. **P2K-H authorized?** **No**.
