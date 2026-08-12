# P2K-G — Population Evaluation Validation / Evidence Extraction

**Status:** COMPLETED (validation) — **population metrics NOT AVAILABLE on live validation PostgreSQL**  
**Sprint id:** P2K-G (validation / evidence extraction only)  
**Architecture Freeze:** v0.3 (unchanged)  
**Date:** 2026-08-12  
**Scope:** Evidence extraction only. No production prediction changes. No Candidate C promotion. No P2K-H.

---

## 1. Validation status

| Item | Result |
| --- | --- |
| Live PostgreSQL reachable | **PASS** (`fas_validation` @ `127.0.0.1:5432`) |
| SEALED cohorts present | **YES** (6 cohorts, each `member_count = 1`) |
| Baseline A Replay Runs bound to a SEALED cohort | **NO** (5 stub runs; cohort_id not in `replay_cohort_items`) |
| Candidate C Replay Runs present | **NO** (`0` rows) |
| Executable P2K-F A/C pair on existing SEALED cohort | **FAIL** (`RuleResultValidationError: ruleId is invalid`) |
| Executable P2K-G paired population metrics | **NOT EXECUTED** — valid A/C inputs absent |
| Governance classification | **A. NO EVIDENCE** |
| Candidate C promoted | **NO** |
| Production Match Script changed | **NO** (still Baseline A) |

**Verdict:** P2K-G implementation exists and persistence round-trips work, but the current validation database does **not** contain a runnable sealed A/C offline Replay Run pair. Aggregate Baseline A vs Candidate C metrics are therefore **NOT_AVAILABLE**. No metric values were fabricated.

---

## 2. Environment

| Field | Value |
| --- | --- |
| Database | `postgresql://…@127.0.0.1:5432/fas_validation` |
| History rows | **67** |
| Sidecar rows | **47** |
| SEALED cohorts | **6** |
| Replay Run rows | **5** (all Baseline A stubs, `member_count = 0`) |
| Population Evaluation rows | **2** (persistence stubs, sample size 0) |
| P2K-G entry point | Library API only: `computeSealedCohortPopulationEvaluation` (`@fas/statistics`) |
| P2K-F entry point | Library API only: `executeSealedCohortOfflineReplayPair` (`@fas/analysis`) |
| Dedicated CLI / HTTP API for P2K-G | **None** |

Validation extractor (read-only inventory + attempted execute):  
`docs/sprints/P2K/scripts/p2k-g-validation-extract.mjs`

---

## 3. How the pipeline is invoked (inspection)

1. **Cohort (P2K-E):** `createAndSealReplayCohort` / `resolveSealedReplayCohort` → Prisma `ReplayCohortItem` + members.  
2. **Replay Runs (P2K-F):** `executeSealedCohortOfflineReplayRun` / `executeSealedCohortOfflineReplayPair` → reuses P2K-D `runOfflineMatchScriptReplay` → Prisma `ReplayRunItem`.  
3. **Population evaluation (P2K-G):** `computeSealedCohortPopulationEvaluation` consumes SEALED cohort + Baseline/Candidate runs + Evaluation History outcomes → optional Prisma `PopulationEvaluationItem`.  
4. **No Provider / Evidence / Feature / Rule regeneration** on the evaluation path by design.

There is no production command that seals a real match population and runs A/C offline evaluation end-to-end against PostgreSQL beyond package tests.

---

## 4. Cohort identity (currently available SEALED cohorts)

All six cohorts are persistence-test artifacts (`Home FC` vs `Away FC`), schema `replay-cohort.p2k.e`, status **SEALED**, `member_count = 1`.

| cohortId | membershipDigestSha256 | members |
| --- | --- | --- |
| `cohort.p2k.e.pg.pg-1786522581769` | `3addf6ff285790d7c2318f1d22fe17b05ddb55b98be08467800d63c9ae1c8da8` | 1 |
| `cohort.p2k.e.pg.pg-1786522818518` | `33a89f0c2a219405dffed804b2255fa6b1163efce1488ebce2199f949accee54` | 1 |
| `cohort.p2k.e.pg.pg-1786526968788` | `d8d58c0ce4e364ed566bed1507a8b0a82073ac95df48678c5372fccd373781f0` | 1 |
| `cohort.p2k.e.pg.pg-1786529357060` | `3f2f9d8cef74a990aa4a8cf8828fe8c3482bd510960aa27f1eba1fa72989b5d0` | 1 |
| `cohort.p2k.e.pg.pg-1786529364772` | `75302217d4ddbda17f6916c23c2ec0884c79aa669ecb6318ad08c173efd9e6f2` | 1 |
| `cohort.p2k.e.pg.pg-1786529431379` | `da6ffee379a99a4e55edbd617ef8bd8ad9c44d41fb3dd0b070d170529cc400a8` | 1 |

Attempted execution target (newest with History+Sidecar):  
`cohort.p2k.e.pg.pg-1786529431379` / digest `da6ffee379a99a4e55edbd617ef8bd8ad9c44d41fb3dd0b070d170529cc400a8`.

---

## 5. Replay coverage (executable A/C pair)

| Metric | Value |
| --- | --- |
| Eligible sealed members (selected cohort) | 1 |
| Baseline A successful | **NOT_AVAILABLE** (run not produced) |
| Candidate C successful | **NOT_AVAILABLE** (no Candidate C run exists; run not produced) |
| Baseline A failures | **NOT_AVAILABLE** |
| Candidate C failures | **NOT_AVAILABLE** |
| Paired successful members | **0** |
| Excluded members | **0** |
| Final paired evaluation sample size | **0** |

### Why offline Replay failed

Executing existing P2K-F against `cohort.p2k.e.pg.pg-1786529431379` threw:

```text
RuleResultValidationError: ruleId is invalid
```

Root cause (observed, not repaired): every SEALED cohort Sidecar stores synthetic rule metadata:

- `ruleId: "rule-1"`
- `ruleName: "HOME_ATTACK_EDGE"`

P2K-D offline replay rebuilds RuleResults via `createRuleResult`, which rejects non-catalog `ruleId` values.  
Per this validation task, Sidecars were **not** fabricated or rewritten.

### Pre-existing Replay Runs in DB

| Label | Count | Bound to SEALED cohort? | Notes |
| --- | --- | --- | --- |
| `r1b.candidate.a.baseline` | 5 | **No** (`cohort_status = null`) | Persistence stubs, `member_count = 0` |
| `r1b.candidate.c.sideAwareOpen` | **0** | n/a | Absent |

---

## 6. Baseline A metrics

All metrics: **NOT_AVAILABLE** (no paired evaluation sample).

| Metric | Availability | Value | Hit count | Sample size | Reason |
| --- | --- | --- | --- | --- | --- |
| Match Result accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Home win accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Draw accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Away win accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Exact Score accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Goal Range accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| BTTS accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Over/Under 2.5 accuracy | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Brier Score (lower better) | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| ECE (lower better) | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |
| Confidence–winner correlation | NOT_AVAILABLE | — | — | 0 | No valid A/C Replay Run pair |

---

## 7. Candidate C metrics

Identical to Baseline A: **all NOT_AVAILABLE**, sample size **0**, same reason.

---

## 8. C − A deltas

| Metric | Delta (C − A) | Interpretation note |
| --- | --- | --- |
| All metrics above | **NOT_AVAILABLE** | No numeric delta; higher/lower desirability not applicable |

No “better / worse” claim is made.

Statistical significance: **not supported** by existing infrastructure; none claimed.

---

## 9. Per-match paired diagnostics

**None.** No paired successful A/C replay members were produced on the live database.

### R1A showcase matches

Queried Evaluation History for:

- Yokohama Marinos vs Kashima Antlers  
- Sirius vs Brommapojkarna  
- Västerås / Vasteras vs Djurgarden  

**Result:** **0 rows**. Not present in the sealed cohorts. Not forced into membership.

---

## 10. Availability / limitations

1. Live DB content is dominated by **P2K-E/F/G Prisma persistence tests**, not a real sealed match population.  
2. Existing Population Evaluation rows are empty stubs (`finalEvaluationSampleSize = 0`, metrics `not_available`, synthetic checksum `bbb…`).  
3. In-memory package tests prove P2K-G algorithm behavior, but that is **not** substituted here for PostgreSQL population evidence.  
4. Even if offline replay had succeeded on these SEALED cohorts, `n = 1` would be **descriptive only** and governance class **B. INSUFFICIENT EVIDENCE**.  
5. No Provider data was fetched; no Sidecar was fabricated during this validation.

---

## 11. Anti-bias checks

| Check | Result |
| --- | --- |
| 1. A and C same sealed membership | **N/A — evaluation stopped** (no A/C pair) |
| 2. A and C same historical replay context | **N/A — evaluation stopped** |
| 3. Outcomes never used for cohort membership | **PASS** (cohorts pre-existed from P2K-E tests; no reselection) |
| 4. Outcomes only used during evaluation | **PASS** (evaluation not reached for metrics) |
| 5. Candidate C did not influence cohort selection | **PASS** |
| 6. Failed A/C members do not create asymmetric populations | **N/A — no scored population** |
| 7. No current Provider data fetched | **PASS** |
| 8. No historical Sidecar fabricated | **PASS** |

**STOP condition honored:** offline Replay failed closed; no partial mismatched cohort metrics were published.

---

## 12. PostgreSQL persistence verification

Existing stub evaluation round-trip (fresh repository handle):

| Field | Value |
| --- | --- |
| `evaluationRunId` | `eval.p2k.g.pg.1786529431128` |
| `cohortId` | `cohort.for.eval.p2k.g.pg.1786529431128` (not a SEALED cohort row) |
| `membershipDigestSha256` | `aaaaaaaa…aaaa` (synthetic) |
| `baselineReplayRunId` | `eval.p2k.g.pg.1786529431128.a` |
| `candidateReplayRunId` | `eval.p2k.g.pg.1786529431128.c` |
| labels (in JSON) | Baseline A / Candidate C |
| `checksum` | `bbbbbbbb…bbbb` |
| coverage.finalEvaluationSampleSize | **0** |
| winnerAccuracy | **not_available** / reason `empty sample` |
| Reloaded identical across handles | **YES** |
| `candidateCProductionPromoted` | **false** |

Persistence plumbing works. These rows are **not** evidence of a real A/C population comparison.

---

## 13. Governance classification

**A. NO EVIDENCE** — evaluation unavailable for a valid sealed A/C offline pair on the live validation database.

Analytical only. Does **not** change:

- `GOVERNED_MATCH_SCRIPT_PARAMETER_SET` (= Baseline A)
- Candidate C remains **NON-DEFAULT** / **NOT PRODUCTION PROMOTED** (`productionPromoted = false`, status `structurally_validated_candidate`)

Verified at end of validation:

| Check | Result |
| --- | --- |
| Production Match Script = Baseline A | **PASS** |
| Candidate C ≠ governed set | **PASS** |
| `productionPromoted` | **false** |
| Feature / Rule / Projection / Poisson / Market probability changes in this task | **None** |

---

## 14. Explicit non-promotion statement

**Candidate C is NOT promoted.**  
No automatic or manual promotion was performed.  
Production prediction semantics are unchanged.

---

## 15. Recommendation for HUMAN REVIEW only

1. Treat current `fas_validation` sealed cohorts / replay runs / population evaluations as **persistence-test residue**, not governance evidence.  
2. Before any Candidate C promotion discussion, authorize a **data preparation** step that:  
   - seals a replay-eligible cohort from real analysis Sidecars (catalog-valid `ruleId`s),  
   - executes P2K-F A/C offline runs,  
   - then runs P2K-G and records numeric metrics with adequate paired `n`.  
3. Do **not** start P2K-H from this report.  
4. Do **not** fabricate Sidecars or rewrite historical rule ids to force a metric table.

---

## 16. Quality gates

Executed after evidence extraction (live `DATABASE_URL` set):

| Command | Result |
| --- | --- |
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** |
| `pnpm build` | **PASS** |

PostgreSQL validation for this evidence task was **not skipped**: inventory, persistence re-read, and failed offline Replay attempt were executed against live `fas_validation`.

---

## 17. Concise numeric summary

| Item | Number |
| --- | --- |
| SEALED cohorts | 6 |
| Max sealed cohort size | 1 |
| Candidate C Replay Runs | **0** |
| Baseline runs bound to SEALED cohorts | **0** |
| Paired evaluation sample size | **0** |
| Match Result / Exact Score / Goal Range / BTTS / O-U / Brier / ECE | **NOT_AVAILABLE** |
| C − A deltas | **NOT_AVAILABLE** |
| R1A showcase matches in cohort | **0** |
| Governance class | **A. NO EVIDENCE** |
| Candidate C promoted | **false** |
