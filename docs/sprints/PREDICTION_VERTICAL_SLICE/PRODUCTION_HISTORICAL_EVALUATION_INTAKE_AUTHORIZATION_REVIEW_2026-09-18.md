# Production Historical Evaluation Intake Authorization Review

| Field | Value |
|---|---|
| Review type | Production authorization review only (no ingest; no flag flip) |
| Date | 2026-09-18 |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** |
| Named gate | `PRODUCTION_HISTORICAL_EVALUATION_INTAKE_AUTHORIZATION_REVIEW` |
| Candidate `matchId` | `lottery:csl:20260915:周二012` |
| Fixture | Ipswich Town vs Arsenal（伊普斯维奇 vs 阿森纳） |
| Artifact admission | **A. PASS** — `ADMITTED_FOR_FUTURE_HISTORICAL_EVALUATION_INTAKE` (2026-09-18) |
| **Decision** | **B. BLOCKED — PRODUCTION HISTORICAL EVALUATION INTAKE AUTHORIZATION NOT SAFE YET** |
| Human production authorization recommended | **No** |
| Real ingest executed | **No** |
| Production TypeScript changed | **No** |

This review does **not** set `production_historical_intake_authorized = true`, does **not** leave `historical_evaluation_intake` other than `C_BLOCKED`, and does **not** write Evaluation History.

---

## 1. Sources inspected

Governance (read, not summarized from prior agent chat):

- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/PROJECT_INDEX.md`
- `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` (§2 Class A, §3 library boundary, §4.8–§4.10, §8.9, §10)
- `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION.md` (human §8)
- `HUMAN_REVIEW_OF_HISTORICAL_INTAKE_FINAL_GATE_2026-09-17.md`
- `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_REVIEW_2026-09-17.md`
- `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18.md`

Production authorization checks in source (not tests as authority):

- `packages/statistics/src/evaluation/ingest-historical-evaluation.ts`
- `packages/statistics/src/evaluation/validate-historical-prediction-seal.ts`
- `packages/statistics/src/evaluation/validate-verified-real-world-actual.ts`
- `packages/statistics/src/evaluation/assert-historical-intake-temporal-integrity.ts`
- `packages/statistics/src/evaluation/build-historical-intake-history-record.ts`
- `packages/statistics/src/domain/historical-evaluation-intake.ts`
- `packages/statistics/src/domain/evaluation-history.ts`
- `packages/statistics/src/seal/create-prematch-prediction-seal.ts`
- `packages/database/src/prisma-prematch-prediction-seal-repository.ts`
- `apps/api/src/evaluation-history.controller.ts`
- `@fas/config` (no production-intake flag)

Read-only Postgres (`fas_local`): Evaluation History count for the admitted pair (this review).

Grep of `packages/**/*.ts` and `apps/**/*.ts` for `production_historical_intake_authorized`: **zero matches**.

---

## 2. Production flag exact semantics

Highest-priority question: what `production_historical_intake_authorized = true` means.

### 2.1 Repository evidence

| Location | What it says |
|---|---|
| `docs/PROJECT_STATE.md` YAML | Machine-readable flag; currently `false`. No TypeScript consumer. |
| Final Gate §10 | “Advance `production_historical_intake_authorized` without explicit human instruction” is forbidden. The flag is the human-gated production-authorization switch. |
| Final Gate §9 proposed YAML | Same flag sits beside `historical_evaluation_intake: C_BLOCKED` as global project state, not as an artifact id. |
| Artifact admission 2026-09-18 §1 letter **B** | Equates production authorization with `production_historical_intake_authorized = true` — not with a named `originalSealId`. |
| Human §8 / implementation authorization | Keep the flag `false` until a **separate explicit instruction**. Bounded implementation is not production intake. |
| `packages/config` | No `production_historical_intake` / `historicalIntakeAuthorized` setting. |
| `ingestHistoricalEvaluation` | Does **not** read the flag. Command type has no authorization field. Failure codes have no `PRODUCTION_INTAKE_NOT_AUTHORIZED` / `ARTIFACT_NOT_ADMITTED` variant. |
| HTTP | `GET /api/evaluation-history` only. **No** POST ingest. Transport absence is not a flag check. |

### 2.2 Classification

`production_historical_intake_authorized = true` means:

**A (intended governance meaning) + D (runtime).**

- **A — global permission for any real Historical Evaluation Intake** is how the YAML flag is *written*: it is project-level, not keyed to `originalSealId`, not keyed to an admitted-artifact population, and Final Gate / artifact-admission letter B treat it as the production-intake switch.
- **D — documentation-only state with runtime enforcement elsewhere** is how it *exists today*: the only occurrences are Markdown/YAML. Runtime enforcement of this flag **does not exist**. `ingestHistoricalEvaluation` can be called by any library consumer that holds a repository adapter.

It is **not**:

- **B** — permission only for an individually admitted artifact (no allowlist, no review-id binding).
- **C** — permission for a bounded production class/population beyond Class A/Actual validators (Class A is a data class; every production Class A seal is already stamped `allowedUsage=historical_evaluation_intake`).
- **E** — undefined. Governance defines the flag as the human production-intake switch; runtime simply does not implement it.

**Do not treat this flag as artifact-scoped.** Setting it `true` would be a global documentation claim. It would not, by itself, confine intake to Ipswich–Arsenal.

---

## 3. Artifact-level admission enforcement

Named gate: `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW`.

Final Gate §2 Class A: authentic seals may enter production Historical Evaluation **only after this intake gate and a later admission of a specific artifact**.

Final Gate §8.9: do not ingest any real match until a separate Artifact Admission review finds Class A + verified real-world Actual.

Runtime chain in `ingestHistoricalEvaluation`:

```text
validateHistoricalPredictionSeal
  → validateVerifiedRealWorldActual
  → assertHistoricalIntakeTemporalIntegrity
  → evaluatePrediction
  → buildHistoricalIntakeHistoryRecord
  → historyRepository.save
```

That chain authenticates Class A, checksum, fixture bind, verified Actual, temporal integrity, and MATCH_RESULT leakage. It does **not**:

- read `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_*` documents;
- consult an admitted-`originalSealId` registry;
- distinguish Ipswich `23fdf75e…` from any other Class A seal that also has `allowedUsage` including `historical_evaluation_intake`.

`createPrematchPredictionSeal` **requires** every Class A seal to include `historical_evaluation_intake`. Prisma revive hardcodes the same `allowedUsage`. Therefore a future authentic capture that never received a named Artifact Admission Review would still satisfy `validateHistoricalPredictionSeal`.

**Answer: NO — current runtime validates Class A/Actual but cannot prove artifact-review admission.**

---

## 4. Conceptual second-pair test (no ingest)

Hypothesis (not executed): `production_historical_intake_authorized` were `true`, and a second real Class A seal + verified Actual existed that had **never** passed `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW`.

Would `ingestHistoricalEvaluation` ACCEPT or REJECT?

**ACCEPT** — if the command passed Class A / Actual / temporal validators.

Evidence:

- No production-flag guard.
- No admitted-artifact allowlist.
- Command type is `{ seal, actual, intakeRecordedAt, replaySidecar? }` only.
- Implementation-review constructed doubles (`sourceAuthority=unit_test_constructed`) already demonstrate that the command accepts Class A-shaped pairs without any named Artifact Admission document. Those doubles are not Class A admission; they prove the absence of an admission check.

HTTP GET-only does **not** change this: the library is exported from `@fas/statistics` and the implementation review already persisted constructed rows to `fas_local` via the same command.

Repository governance **does** require named artifact admission before real ingest (Final Gate §2 / §8.9). Repository **runtime** does not enforce that requirement.

---

## 5. Single-artifact authorization

Preferred first-production scope (this review; not implemented):

| Field | Value |
|---|---|
| `originalSealId` | `prematch-seal:lottery:csl:20260915:周二012:23fdf75ec3d3ba8f1b105b5098c7207382b80ac0cb6a3a866f36ec024a08e3e9` |
| Paired Actual Evidence | `evidence-itfc.co.uk-lottery:csl:20260915:周二012-match-result` |

Existing runtime/governance enforcement of that pair as the **only** ingestable command:

**NOT_SUPPORTED**

There is no allowlist, no composition-root wrapper that pins these ids, and no command field for an admission-review id. Governance *prefers* a specific artifact (Final Gate §2) but that preference is documentary. This review does not invent a mechanism.

Classification vs **NOT_DEFINED**: the absence is defined by inspection — the check is missing — not by an open human decision that the check might already exist.

---

## 6. Ipswich–Arsenal production prerequisites

Eligibility of the admitted artifact is **not** the same as safe production authorization. The pair is complete; the authorization boundary is not.

| Prerequisite | Result | Evidence |
|---|---|---|
| Class A authenticated seal | **PASS** | Artifact admission 2026-09-18 §3; `authenticatePrematchPredictionSeal`; `contentSha256` `ecd427e5…410e`; `provenanceClass=A`; `synthetic=false`; `historicalAuthenticity=true` |
| Verified real-world Actual | **PASS** | Artifact admission §4; Evidence `quality=verified`; `realWorldVerification=true`; 2–4 FINISHED away |
| Exact fixture binding | **PASS** | Same `matchId` `lottery:csl:20260915:周二012`; home/away Ipswich–Arsenal |
| Temporal integrity | **PASS** | `sealedAt` / analysisTime `2026-09-15T14:22:18.Z` before kickoff `2026-09-16T03:00:00+08:00`; Actual post-match |
| Post-match MATCH_RESULT only | **PASS** | Evidence type `MATCH_RESULT`; intake validator rejects MATCH_RESULT on PRE_MATCH observations |
| Artifact admission PASS | **PASS** | `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW_IPSWICH_ARSENAL_2026-09-18.md` **A. PASS** (eligibility only) |
| Historical-intake implementation review PASS | **PASS** | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_REVIEW_2026-09-17.md` **A. PASS** |
| Postgres round-trip PASS | **PASS** | Implementation review: constructed `fas_local` historical-intake.v1 reload after dist rebuild (not Ipswich ingest) |
| Idempotency PASS | **PASS** | Implementation review §7 T17; `historyId = eval-history-hi:{originalSealId}:{originalSealChecksum}` |
| Conflict rejection PASS | **PASS** | Implementation review §7 T19 `CONFLICTING_ACTUAL`; existing row not overwritten |
| Append-only PASS | **PASS** | Prisma `save` create-only / same-checksum retry; intake does not mutate seal or Actual |
| Schema decoder fail-closed PASS | **PASS** | Implementation review §8; unknown schema throw; T22 |
| Population firewalls PASS | **PASS** | Builder hardcodes eligibility flags `false`; production Calibration/Validation/Contribution/replay filters (`isCalibrationPopulationEligible` et al.) |
| No existing History row | **PASS** | This review: `fas_local` query count **0** for match / seal / lottery intake prefix |
| Season semantics | **PASS** (`AGGREGATION_BLOCKER_ONLY`) | Artifact admission §11; does not block single-artifact eligibility; must not be treated as population-ready |
| Multi-market provenance limitation recorded | **PASS** | Artifact admission §10; lottery 1X2 features only; unused AH/O-U markets are provenance, not a prediction defect |

No prerequisite **FAIL**. The **authorization-scope** gap in §3–§5 is independent of this matrix.

---

## 7. First real intake would remain evaluation-only

If a later, separately executed ingest created a History row for this pair, the production builder would emit:

| Flag | Value |
|---|---|
| `intakeIntegrity.calibrationEligible` | `false` (hardcoded in `buildHistoricalIntakeHistoryRecord`) |
| `intakeIntegrity.validationEligible` | `false` |
| `intakeIntegrity.contributionEligible` | `false` |
| `intakeIntegrity.replayCohortEligible` | `false` |
| `replayEligible` without sidecar | `false` (`MISSING_SIDECAR` path) |

Production downstream:

- `compute-prediction-calibration-report` filters with `isCalibrationPopulationEligible` (intake rows require the flag `true`).
- `compute-validation-report` / `compute-contribution-report` same pattern.
- Replay cohort selection requires `replayCohortEligible === true`.

Creator rejects intake rows whose eligibility flags are not `false` (implementation review §5).

**No later use may be inferred from production intake authorization.** STEP 6 population admission remains FUTURE / CONDITIONAL. This review does not authorize Calibration, Validation, Contribution, replay cohorts, model training/tuning, or Projection / Feature / Rule changes.

---

## 8. Authorization granularity

Options considered:

| Scope | Repository-supported? |
|---|---|
| `ONE_ARTIFACT_ONLY` | Preferred first production scope. **Not enforceable** today (no allowlist). |
| `ADMITTED_ARTIFACTS_ONLY` | Required by Final Gate §2 / §8.9 in governance. **Not enforceable** at runtime. |
| `GLOBAL_PRODUCTION_INTAKE` | YAML flag meaning if set `true`. **Broader than admitted scope.** Runtime would not even require the flag. |
| `NOT_CURRENTLY_ENFORCEABLE` | **This is the safest existing classification.** |

Do not broaden authorization merely because a global boolean exists.

**Safest enforceable authorization scope: `NOT_CURRENTLY_ENFORCEABLE`.**

Narrowest *desired* scope remains the admitted Ipswich pair. Desire is not enforcement.

---

## 9. Production-authorization blocker (global flag + no admission check)

Because:

1. `production_historical_intake_authorized` is a **global** documentation flag; and
2. runtime does **not** enforce named Artifact Admission Review;

this review **must not** recommend setting the flag `true`.

### Minimum gap (identify only; do not implement in this task)

Preserve “artifact admission before real ingest” with **both** of:

1. **Production call-site reads the flag (or an equivalent existing config/port) and fail-closes when false.** Today the YAML flag is unread. Library export + Prisma repository is a real ingest path (implementation review already used it for constructed rows).
2. **Production ingest fail-closes unless the command’s `originalSealId` (and paired `resultEvidenceId`) is on an admitted-artifact allowlist populated only after a named `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW` PASS.** Without this, any future Class A capture plus verified Actual would pass validators.

Either check alone is insufficient:

- Flag only → global over-authorization of unreviewed Class A pairs.
- Allowlist only with flag still unread → documentation and runtime diverge; a script can still ingest.

HTTP GET-only is a transport mitigation, not this gap.

This is **not** a new Engine, not a new numbered Architecture document, and not this review’s implementation. Closing it is a bounded statistics/composition-root authorization check under an existing A1 slot, after a later authorized sprint.

---

## 10. Human production authorization — not granted

Existing runtime/governance does **not** safely limit real production intake to the admitted artifact or admitted-artifact population.

Human production authorization **may not** be granted on this review.

Authorization and execution remain separate. Even after a future scoped enforcement lands, ingest would still be a later governed action.

---

## 11. What production authorization would mean (when later possible)

If a future review recommended human authorization **after** the §9 gap is closed, that authorization would permit **only**:

- the next **separately executed** governed Historical Evaluation Intake action;
- for the **approved scope only** (then: the admitted Ipswich `originalSealId` + paired MATCH_RESULT Evidence).

It would **not** permit:

- Calibration
- Validation
- Contribution
- replay cohort eligibility
- model training
- model tuning
- Projection / Feature / Rule changes
- automatic intake of future real fixtures without required named artifact admission
- treating YAML `true` as an HTTP ingest API

This paragraph is **not** a grant. The grant is blocked.

---

## 12. Existing History check (this review)

Read-only `fas_local` query:

| Filter | Rows |
|---|---|
| `matchId = lottery:csl:20260915:周二012` | **0** |
| `historyId` contains `周二012` | **0** |
| `historyId` contains admitted `originalSealId` | **0** |
| `historyId` starts with `eval-history-hi:prematch-seal:lottery:` | **0** |

No historical-intake History row exists for the match or the admitted seal. **No ingest in this review.**

---

## 13. Authorization decision

**B. BLOCKED — PRODUCTION HISTORICAL EVALUATION INTAKE AUTHORIZATION NOT SAFE YET**

Reasons (all required):

- The only available production flag is **global** and **unread by runtime**.
- Named artifact admission is **documentary**, not runtime-enforced.
- A second unreviewed Class A + verified Actual pair would currently **ACCEPT** if `ingestHistoricalEvaluation` were called.
- Single-artifact scope is **NOT_SUPPORTED**.
- Safest existing scope is **NOT_CURRENTLY_ENFORCEABLE**.

Not **A. READY FOR HUMAN PRODUCTION INTAKE AUTHORIZATION**.

---

## 14. PROJECT_STATE (this task)

Unchanged production switches:

```yaml
production_historical_intake_authorized: false
historical_evaluation_intake: C_BLOCKED
authentic_prematch_seal: FOUND_ADMITTED
authentic_seal_plus_verified_real_world_actual: FOUND_VERIFIED
```

`next_action` is **not** ingest. It is the gap named in §9.

---

## 15. Exact next governance action

**`CLOSE_ARTIFACT_SCOPED_PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_GAP`**

That action (if later opened) must specify, then implement under a cited A1 sprint, the minimum §9 checks. It is **not**:

- human grant of `production_historical_intake_authorized = true` on the current runtime;
- `ingestHistoricalEvaluation` of Ipswich–Arsenal;
- Calibration / Validation / Contribution / replay authorization.

Until that gap is closed and re-reviewed, a human must not set the production flag true.

---

## 16. Review outcome

**B. BLOCKED — PRODUCTION HISTORICAL EVALUATION INTAKE AUTHORIZATION NOT SAFE YET**
