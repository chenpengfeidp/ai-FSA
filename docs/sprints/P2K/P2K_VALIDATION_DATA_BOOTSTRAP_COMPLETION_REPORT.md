# P2K Validation Data Bootstrap — Completion Report

**Status:** COMPLETED (Option B)  
**Date:** 2026-08-12  
**Architecture Freeze:** v0.3 (unchanged)  
**Roadmap citation:** Validation-data prerequisite for P2K-E/F/G live population path (post–P2K-G Validation Recovery Case C). Not P2K-H.  
**Scope:** New AnalyzeMatch-generated History + Sidecar for validation DB only. No Candidate C promotion. No Match Script / Projection / Poisson change. No mutation of existing fixture Sidecars.

---

## 1. Audit summary (do not guess)

| Item | Finding |
| --- | --- |
| A. AnalyzeMatch entry | `AnalyzeMatchUseCase` (`@fas/analysis`); API composition `apps/api` → `GenerateMatchReportUseCase` |
| B. Call chain | ImportMatch → Evidence → FeatureExtractor → RuleEvaluator → Projection → ReportBuilder → History/Sidecar persist |
| C. History write | `GenerateMatchReportUseCase` → `persistAndLoadHistory` → `EvaluationHistoryRepository.save` |
| D. Sidecar write | Same path → `ProjectionReplaySidecarRepository.save(buildProjectionReplayContext(analysis))` |
| E. Legal RuleId | Production Rule catalog via `createRuleResult` / RuleEvaluator outputs (`rule:*:v1`) |
| F. Fixture History/Sidecar | Persistence tests (`match-p2k-*`, `rule-1` / `rule-p2k`, `feature.v2.test`) — **not** AnalyzeMatch |
| G. Existing AnalyzeMatch validation entry | No dedicated validation bootstrap before this slice; API analyze path exists for runtime |
| H. Usable fixtures | `FixtureProvider` `match-example-1`…`6` (SCHEDULED); FT via attached `matchResult` for MATCH_RESULT Evidence only |
| I. createRuleResult contract | Catalog `ruleId`; PASS ⇒ `score === weight` |
| J. P2K-C / P2K-D boundary | P2K-C = presence/hash/context completeness; P2K-D offline rebuild requires catalog-valid RuleResult |

**Option selected: B** — deterministic recorded fixture matches through **real** AnalyzeMatch production composition, with FT outcomes attached only as MATCH_RESULT Evidence (not fabricated RuleResults / Sidecar ruleIds).

`REAL_ANALYZEMATCH_BOOTSTRAP_AVAILABLE = true`

---

## 2. Implementation

| Artifact | Role |
| --- | --- |
| `packages/report/src/validation/bootstrap-validation-history-sidecar.ts` | Validation-only bootstrap: FixtureProvider + FT overlay → Import → AnalyzeMatch → Report → History/Sidecar |
| `packages/report/test/bootstrap-validation-history-sidecar.spec.ts` | Path / catalog / eligibility / governance tests |
| `docs/sprints/P2K/scripts/p2k-validation-data-bootstrap.mjs` | Live `fas_validation` runner + inventory of new rows |

Hard boundaries respected:

- No UPDATE/DELETE of existing Sidecars  
- No fabricated replacement `ruleId`  
- No Provider→Feature→Rule re-analysis of old fixture Sidecars as “backfill”  
- No Candidate C promotion; production Match Script = Baseline A  
- No P2K-H; no E/F/G auto-run after bootstrap  

Note: `GenerateMatchReportUseCase` persists History+Sidecar **before** population Projection Replay overlay. On contaminated DBs the overlay may return `PROJECTION_REPLAY_REPORT_FAILED`; bootstrap treats persisted seals as success when History+Sidecar exist (overlay failure does not roll back seals).

---

## 3. Live validation DB results

**Database:** `postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation`

### New AnalyzeMatch-generated rows

| Metric | Value |
| --- | --- |
| Option | **B** |
| New History (match-example-*) | **6** |
| New Sidecar | **6** |
| All new RuleIds catalog-valid | **YES** |
| PASS score == weight (new rows) | **YES** |
| featureModelVersion | `feature.v2.m1b.manager` (not `feature.v2.test`) |
| P2K-C `replayComplete` (new) | **6** |
| P2K-C `replayEligible` (new) | **6** |
| Offline RuleResult-rebuildable (new) | **6** |
| Existing invalid fixture Sidecars untouched | **YES** (invalid ruleId Sidecars remain **52**; count unchanged by bootstrap) |

### New History IDs

| matchId | historyId |
| --- | --- |
| match-example-1 | `eval-history:match-example-1:48efeee9:8bd904bf` |
| match-example-2 | `eval-history:match-example-2:ce42db84:1173f903` |
| match-example-3 | `eval-history:match-example-3:162ffbcc:df686fb0` |
| match-example-4 | `eval-history:match-example-4:bb4f4d8a:cb991bfd` |
| match-example-5 | `eval-history:match-example-5:bae4159e:e371e7c8` |
| match-example-6 | `eval-history:match-example-6:6f2d26be:53771f4e` |

### Sample RuleIds (from production RuleEvaluator)

Catalog ids such as:

- `rule:home-team-present:v1` / `HOME_TEAM_PRESENT`
- `rule:home-attack-edge:v1` / `HOME_ATTACK_EDGE`
- `rule:form-home-superior:v1` / `FORM_HOME_SUPERIOR`
- …full sealed rule set per Sidecar (not `rule-1` / `rule-p2k`)

### Post-bootstrap full-DB inventory (recovery script)

| Metric | Count |
| --- | --- |
| History rows | 80 |
| Sidecar rows | 58 |
| P2K-C `replayComplete` | 58 |
| P2K-C `replayEligible` | 58 |
| Offline RuleResult-rebuildable | **6** |
| Offline-replay-eligible (P2K-C ∧ rebuildable) | **6** |
| Invalid ruleId Sidecars (fixtures) | 52 (untouched) |
| Missing Sidecar | 22 |

---

## 4. Acceptance checklist

| Requirement | Result |
| --- | --- |
| 1. Bootstrap ≥1 batch real AnalyzeMatch History+Sidecar | **PASS** (6) |
| 2. Output new row counts | **PASS** |
| 3. Output History/Sidecar IDs | **PASS** |
| 4. Output RuleId / RuleName | **PASS** (script details) |
| 5. RuleId catalog-valid | **PASS** |
| 6. PASS score == weight | **PASS** |
| 7. featureModelVersion real | **PASS** (`feature.v2.m1b.manager`) |
| 8. Sidecar SHA-256 | **PASS** |
| 9. P2K-C eligibility inventory | **PASS** |
| 10. Offline RuleResult rebuild diagnostic | **PASS** (6 rebuildable) |
| 11. At least one complete+eligible+rebuildable | **PASS** |
| Stop before P2K-E/F/G | **PASS** (not executed) |

---

## 5. Required report answers

1. **Real AnalyzeMatch bootstrap path exists?** **Yes** (`bootstrapValidationHistorySidecar` + live script).  
2. **Option:** **B**  
3. **New History:** **6**  
4. **New Sidecar:** **6**  
5. **New data all catalog-valid?** **Yes**  
6. **P2K-C replayComplete (new / DB rebuildable path):** **6** new complete; DB total complete 58 (includes fixtures)  
7. **P2K-C replayEligible (new):** **6**  
8. **Offline RuleResult-rebuildable:** **6**  
9. **Existing invalid fixtures untouched?** **Yes** (52 invalid ruleId Sidecars unchanged)  
10. **Minimum data foundation for P2K-E/F/G?** **Yes** — ≥1 offline-rebuildable + P2K-C eligible sealed-context row exists. Persistence rows are **not** population evidence; E/F/G must be run separately.  
11. **Missing items for E/F/G:** None for *data bootstrap*. Still need authorized separate runs of seal → A/C replay → population evaluation.  
12. **Candidate C:** still **NON-DEFAULT** / `productionPromoted = false`  
13. **Production Baseline A:** unchanged (`GOVERNED_MATCH_SCRIPT_PARAMETER_SET === MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET`)  
14. **P2K-H:** **NOT AUTHORIZED**

---

## 6. Governance

- Architecture Freeze **v0.3** unchanged  
- No Candidate C performance claims  
- No “persistence tests = population evidence”  
- Existing 52 invalid fixture Sidecars remain `REPLAY_INELIGIBLE_INVALID_RULE_CONTRACT` for offline rebuild  

### Re-run commands

```bash
# Unit / package
pnpm --filter @fas/report test -- packages/report/test/bootstrap-validation-history-sidecar.spec.ts

# Live bootstrap (idempotent)
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-validation-data-bootstrap.mjs

# Inventory (does not seal / does not run F/G)
DATABASE_URL=postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation \
  node docs/sprints/P2K/scripts/p2k-g-validation-recovery-inventory.mjs
```

---

## 7. Quality gates

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |
