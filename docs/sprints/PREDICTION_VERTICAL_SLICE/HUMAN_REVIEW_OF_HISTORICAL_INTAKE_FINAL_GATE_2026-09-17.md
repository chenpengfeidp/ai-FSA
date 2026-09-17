# Human Review — Historical Evaluation Intake Final Gate §8

| Field | Value |
|---|---|
| Document type | Human decision presentation only (no approval recorded) |
| Date | 2026-09-17 |
| Authority | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` §8, §10 |
| Upstream reviews | Readiness 2026-09-17 **PASS**; Implementation authorization 2026-09-17 **B. BLOCKED** |
| Agent outcome | **A. READY FOR HUMAN §8 DECISION** |
| Human decision (2026-09-17) | **APPROVE §8.1–§8.10** with §8.9 / §8.10 clarifications |
| Authorization record | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION.md` |

Human approval was recorded **after** this presentation. Implementation remains
bounded library-only. Production intake and real-match ingest remain unauthorized.

---

## Implementation vs production authorization

Human approval of Final Gate **§8 Decisions 1–10** authorizes **only**:

- A **bounded** `@fas/statistics` **library-only** implementation sprint per Final Gate §3–§5 (roadmap **A1**).

It does **not** authorize:

- `production_historical_intake_authorized = true`
- `historical_evaluation_intake` leaving **C_BLOCKED**
- Production Historical Evaluation Intake execution
- Ingestion of the Ipswich–Arsenal (`周二012`) pair or any other real match (§8.9)
- Calibration, Validation, or Contribution **use** of intake rows (default ineligible per §8.6; §4.4)
- Model training, tuning, or changes to Projection / Feature / Rule engines (§10)

```yaml
production_historical_intake_authorized: false   # must remain until separate explicit instruction
historical_evaluation_intake: C_BLOCKED          # must remain until separate production gate
```

§10 additionally forbids starting the sprint **without** human §8 authorization.

---

## Cross-check: §8 vs authorization-review topics

| Topic | In §8 as its own decision? | Where governed if not §8 |
|---|---|---|
| Bounded `@fas/statistics` / A1 scope | **Yes — §8.1** | §3, §10 |
| `evaluation-history.mvp.historical-intake.v1` | **Yes — §8.2** | §4.4 (`intakeIntegrity` fields) |
| `intakeIntegrity` envelope | **No separate decision** | §4.4; implied by §8.2 |
| Verified Actual validation (`quality` + `realWorldVerification`) | **Yes — §8.5** | §4.8, §4.9, T12 |
| Authentic Class A seal validation | **No separate decision** | §3, §4.9, §3.1 ADD validators |
| Exact Seal ↔ Actual fixture binding | **No separate decision** | §4.9, T05–T06, T13 |
| Append-only History / no overwrite | **No separate decision** | §4.6, T19, §10 |
| Stable intake identity / idempotency | **Yes — §8.4** | §4.6 (`historyId` formula) |
| Prisma version-aware fail-closed decoder | **Yes — §8.3** | §4.5, T22 |
| `originalSealId` / checksum linkage | **Partially §8.4** | §4.4 `intakeIntegrity`, §4.6 |
| Actual Evidence id linkage | **No separate decision** | §4.4 `resultEvidenceId`, etc. |
| Evaluation version / `evaluatedAt` pin | **Partially §8.4** | §4.6 (`evaluatedAt = predictionGeneratedAt`) |
| `calibrationEligible=false` (and peers) | **Yes — §8.6** | §4.4 defaults, T26 |
| Population firewall | **Yes — §8.6** | §4.10, T26 |
| No PRE_MATCH / Actual mutation | **No separate decision** | §10 |
| No Projection / Feature / Rule changes | **No separate §8 item** | §8.1 scope + §10 |
| No real pair ingest during implementation | **Yes — §8.9** | §4.8, §10 |

Do **not** treat approval of §8 as approval of every row in the right column unless Final Gate §3–§5 applies by reference.

---

## Ambiguity review (per §8 decision)

| # | Classification | Notes |
|---|---|---|
| 1 | **CLEAR** | Library-only, A1, no new Engine — matches AGENTS.md product phase. |
| 2 | **CLEAR** | Schema id fixed; `intakeIntegrity` required per §4.4. |
| 3 | **CLEAR** (behavior change acknowledged) | Fail-closed for unknown `schemaVersion` changes live GET/query vs today’s silent omit for unknown versions (§6 risk table). Human must accept §4.5 policy explicitly. |
| 4 | **CLEAR** | Idempotency and `evaluatedAt` pin are specified in §4.6. |
| 5 | **CLEAR** | Distinguishes controlled fixture vs real-world verified Actual. |
| 6 | **CLEAR** | Defaults ineligible; implementation must enforce T26 in first boundary. |
| 7 | **CLEAR** | Transport/UI/seed/Class B persistence excluded. |
| 8 | **CLEAR** | Test doubles ≠ artifact admission. |
| 9 | **AMBIGUOUS** | Wording: “separate Artifact Admission review” — repository has pair artifact reviews for `周二012` but `HISTORICAL_EVALUATION_ARTIFACT_ADMISSION_REVIEW.md` may still be the named gate. **Clarify before production ingest** whether existing pair reviews satisfy “Artifact Admission” for that fixture; §8.9 still blocks real ingest until human accepts that clarification. **Does not block library implementation** if human approves §8.9 as “no real ingest in sprint.” |
| 10 | **CONFLICTS_WITH_CURRENT_REPO** | §9 proposed YAML still shows `authentic_prematch_seal: NOT_FOUND` and related stale fields. Current `PROJECT_STATE.md` differs. **REQUIRES_REVISION** of §9 wording before applying sync; approving §8.10 should mean “apply **revised** handoff consistent with 2026-09-17 state,” not blind copy of §9 block. |

No decision warrants blanket “approve all” without human reading §8.9 and §8.10.

---

## Prisma fail-closed decoder (§8.3 / §4.5)

**§8 decision 3** (repository text): “Prisma: **no migration**; version-aware decoder; unknown versions fail closed as specified in §4.5.”

**Accepted `schemaVersion` values (decoder):**

| `schemaVersion` | Behavior |
|---|---|
| `evaluation-history.mvp.a15` | Existing `createEvaluationHistoryRecord` revival. Corrupt a15: **query omit**; `findByHistoryId` → `undefined`. |
| `evaluation-history.mvp.historical-intake.v1` | Intake creator; missing `intakeIntegrity` → **fail**. |
| Any other value | **Fail closed:** throw `UNSUPPORTED_HISTORY_SCHEMA_VERSION` on `findByHistoryId` and on `query` (do not omit). |

**Why fail-closed:** Silent coercion of unknown versions to a15 would drop `intakeIntegrity`, falsely implying non-intake or corrupt data as legacy a15, and could let unvetted History shapes enter consumers. Unknown versions must not enter populations or UI as valid a15.

**Not authorized by §8.3 alone:** Prisma schema migration, new tables, or changing a15 constant semantics (§4.10).

---

## The ten §8 human decisions (detail)

### §8 Decision 1 — Bounded statistics / A1 sprint

**Repository wording (§8.1):** “Start a bounded `@fas/statistics` library-only implementation sprint citing roadmap **A1** (not C1, not a new Engine).”

**Source:** Final Gate §8.1; scope §3; prohibitions §10.

| | |
|---|---|
| **Authorizes** | Library implementation in `@fas/statistics` per §3.1 ADD/MODIFY list and §5 tests. |
| **Does not authorize** | New package/Engine, C1 Case Engine work, HTTP/API/UI, Analysis pipeline changes. |
| **Implementation consequence** | Sprint may add validators, intake command, intake History builder, decoder, tests. |
| **Production-safety consequence** | Keeps intake off transport layer; reduces accidental public intake surface. |
| **Agent recommendation** | **Human must choose** — technical fit is **APPROVE** if human wants bounded A1 intake library. |

---

### §8 Decision 2 — Historical-intake History schema id

**Repository wording (§8.2):** “Schema id `evaluation-history.mvp.historical-intake.v1`.”

**Source:** Final Gate §8.2; contract §4.4.

| | |
|---|---|
| **Authorizes** | New History variant with `schemaVersion` above and required `intakeIntegrity` block. |
| **Does not authorize** | Changing frozen `evaluation-history.mvp.a15` creator semantics or reusing a15 builder for intake. |
| **Implementation consequence** | Discriminated union in `evaluation-history.ts`; separate builder from `buildEvaluationHistoryRecord`. |
| **Production-safety consequence** | Absence of `intakeIntegrity` cannot imply verified historical intake. |
| **Agent recommendation** | **Human must choose** — **APPROVE** if accepting §4.4 fields and defaults. |

---

### §8 Decision 3 — Prisma decoder, no migration, fail-closed

**Repository wording (§8.3):** “Prisma: **no migration**; version-aware decoder; unknown versions fail closed as specified in §4.5.”

**Source:** Final Gate §8.3, §4.5, §6 (High risk on GET behavior).

| | |
|---|---|
| **Authorizes** | JSONB-only persistence; `prisma-evaluation-history-repository.ts` version-aware revival. |
| **Does not authorize** | Prisma migration unless new evidence (§10). |
| **Implementation consequence** | T21–T23, T22; stricter query behavior for unknown versions. |
| **Production-safety consequence** | Prevents silent downgrade of intake records to a15. |
| **Agent recommendation** | **Human must choose** — **APPROVE** only if accepting live API/query fail-closed change; else **REJECT / REVISE** decoder policy. |

---

### §8 Decision 4 — Idempotency and evaluatedAt pin

**Repository wording (§8.4):** “Idempotency: intake `historyId` from `originalSealId` + `originalSealChecksum`; pin `evaluatedAt = predictionGeneratedAt`; do not change A1 checksum formula.”

**Source:** Final Gate §8.4, §4.6.

| | |
|---|---|
| **Authorizes** | `historyId = "eval-history-hi:" + originalSealId + ":" + originalSealChecksum`; retry/idempotency table in §4.6. |
| **Does not authorize** | Changing `evaluatePrediction` checksum rules or a15 `historyId` formula. |
| **Implementation consequence** | T17–T19; stable A1 evaluation identity on retry. |
| **Production-safety consequence** | Prevents duplicate or conflicting Actual overwrites. |
| **Agent recommendation** | **Human must choose** — **APPROVE**. |

---

### §8 Decision 5 — Real-world Actual gate

**Repository wording (§8.5):** “Actual gate: controlled fixture verification is never real-world verification; Evidence `quality=verified` **and** `realWorldVerification=true`.”

**Source:** Final Gate §8.5, §4.8, T12.

| | |
|---|---|
| **Authorizes** | Production `validate-verified-real-world-actual` rejecting controlled/unverified paths. |
| **Does not authorize** | Treating Class B fixture normalizer output as production Actual gate pass. |
| **Implementation consequence** | Fail-closed Actual validation before `evaluatePrediction`. |
| **Production-safety consequence** | Prevents synthetic or unverified outcomes entering intake History. |
| **Agent recommendation** | **Human must choose** — **APPROVE**. |

---

### §8 Decision 6 — Population ineligibility defaults

**Repository wording (§8.6):** “Default: historical-intake rows are **ineligible** for Calibration, Validation, Contribution, and replay cohorts until a later population gate.”

**Source:** Final Gate §8.6, §4.4 (`calibrationEligible`, `validationEligible`, `contributionEligible`, `replayCohortEligible`).

| | |
|---|---|
| **Authorizes** | Default `false` flags on intake variant; T26 population isolation in first implementation boundary. |
| **Does not authorize** | Auto-enrolling intake rows in A2/V1A populations or replay cohorts. |
| **Implementation consequence** | Fields on `intakeIntegrity` or intake record; tests T26. |
| **Production-safety consequence** | Mandatory calibration/validation/contribution firewall at data shape level. |
| **Agent recommendation** | **Human must choose** — **APPROVE** (required for safe intake library). |

---

### §8 Decision 7 — No HTTP, UI, seed, Class B persistence

**Repository wording (§8.7):** “No HTTP, no web UI, no Prisma seed, no Class B persistence.”

**Source:** Final Gate §8.7, §4.8.6, §10.

| | |
|---|---|
| **Authorizes** | Library-only command surface; in-memory/tests for Class B rejection. |
| **Does not authorize** | POST intake API, web changes, seeds, persisting Class B as production History. |
| **Implementation consequence** | No `apps/api` intake endpoint in this sprint. |
| **Production-safety consequence** | No public or seeded contamination path. |
| **Agent recommendation** | **Human must choose** — **APPROVE**. |

---

### §8 Decision 8 — Test doubles are not admission

**Repository wording (§8.8):** “Happy-path tests may use constructed doubles but those doubles are **not** artifact admission.”

**Source:** Final Gate §8.8, §4.8.8, T01.

| | |
|---|---|
| **Authorizes** | T01-style unit tests with `sourceAuthority=unit_test_constructed`. |
| **Does not authorize** | Claiming test doubles as Class A admission or persisting doubles to live Prisma as production evidence. |
| **Implementation consequence** | Tests before/during sprint without real ingest. |
| **Production-safety consequence** | Prevents conflating conformance tests with authentic history. |
| **Agent recommendation** | **Human must choose** — **APPROVE**. |

---

### §8 Decision 9 — No real match ingest until artifact admission

**Repository wording (§8.9):** “Do not ingest any real match until a separate Artifact Admission review finds a Class A seal + verified real-world Actual.”

**Source:** Final Gate §8.9; pair reviews exist for `周二012` but named artifact admission doc may differ.

| | |
|---|---|
| **Authorizes** | Implementation and tests **without** writing History for real admitted pairs in the sprint. |
| **Does not authorize** | Production ingest of Ipswich–Arsenal or any real fixture as part of implementation sprint. |
| **Implementation consequence** | Sprint stops at library + tests; real pair remains out of scope until admission gate satisfied. |
| **Production-safety consequence** | Separates “code exists” from “first real row written.” |
| **Agent recommendation** | **Human must choose** — **APPROVE** for implementation-only; **REJECT / REVISE** if human intended sprint to include real pair ingest (that would violate §8.9). |

---

### §8 Decision 10 — PROJECT_STATE §9 sync (optional wording)

**Repository wording (§8.10):** “Proposed `PROJECT_STATE` synchronization in §9 — apply only if the human accepts it. Do not set production authorized.”

**Source:** Final Gate §8.10, §9.

| | |
|---|---|
| **Authorizes** | Optional `PROJECT_STATE.md` handoff updates **if** human accepts **revised** wording. |
| **Does not authorize** | `production_historical_intake_authorized: true` or opening production intake. |
| **Implementation consequence** | May update stage/gate/evidence index after §8 sign-off; must reconcile stale §9 YAML with current seal/Actual state. |
| **Production-safety consequence** | State doc accuracy only. |
| **Agent recommendation** | **Human must choose** — **REJECT / REVISE** blind §9 copy; **APPROVE** only with updated sync text reflecting 2026-09-17 `PROJECT_STATE`. |

---

## Human sign-off block

Record approval only in this section (or a separate signed authorization file) after reviewing **all ten** decisions. **Do not pre-check options below.**

---

**§8 Decision 1:** Bounded `@fas/statistics` library-only sprint (roadmap A1)

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 2:** Schema `evaluation-history.mvp.historical-intake.v1`

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 3:** Prisma no migration; version-aware fail-closed decoder (§4.5)

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 4:** Idempotency + `evaluatedAt = predictionGeneratedAt`; unchanged A1 checksum

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 5:** Actual gate — `quality=verified` and `realWorldVerification=true`

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 6:** Default ineligible for Calibration, Validation, Contribution, replay cohorts

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 7:** No HTTP, web UI, Prisma seed, Class B persistence

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 8:** Constructed test doubles are not artifact admission

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 9:** No real match ingest until separate Artifact Admission review

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

**§8 Decision 10:** Optional PROJECT_STATE §9 sync (revised wording only; not production authorized)

Human decision:  
[ ] APPROVE  
[ ] REJECT / REVISE  

Human note: ____________________

---

## Statement template (human use only after reviewing all ten)

Copy and sign only if Decisions 1–10 are explicitly approved (or revised per notes):

> I have reviewed all ten Final Gate §8 decisions and explicitly approve Decisions 1–10 for the bounded Historical Evaluation Intake implementation scope described in the Final Gate. This approval authorizes implementation only. It does not authorize production historical intake or ingestion of the Ipswich-Arsenal pair.

**This template is not approval until the human supplies it.**

---

## After human §8 approval (out of scope for this document)

Expected follow-on (not executed here):

- Record approval (e.g. `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION.md` or sprint authorization).
- Advance `next_action` to bounded A1 implementation task per Final Gate §3.
- Keep `historical_evaluation_intake: C_BLOCKED` and `production_historical_intake_authorized: false` until separate gates.
