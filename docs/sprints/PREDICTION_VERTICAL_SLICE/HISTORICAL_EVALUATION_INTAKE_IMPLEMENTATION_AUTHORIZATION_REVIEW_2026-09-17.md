# Historical Evaluation Intake — Implementation Authorization Review

| Field | Value |
|---|---|
| Review type | Implementation authorization (no code; no intake execution) |
| Date | 2026-09-17 |
| Primary artifact context | Admitted Class A seal + verified Actual — `lottery:csl:20260915:周二012` |
| Upstream | `HISTORICAL_EVALUATION_INTAKE_READINESS_REVIEW_2026-09-17.md` — **A. PASS** (readiness only) |
| Binding planning authority | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` |
| **Decision** | **B. BLOCKED — HISTORICAL EVALUATION INTAKE IMPLEMENTATION NOT AUTHORIZED** |

---

## 1. Governance source of truth

| Source | Role |
|---|---|
| `AGENTS.md` | Product development phase; no new Engine; bounded changes |
| `docs/PROJECT_STATE.md` | `next_action: HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION_REVIEW` |
| `HISTORICAL_EVALUATION_INTAKE_READINESS_REVIEW_2026-09-17.md` | Readiness **PASS**; intake **not** authorized; pointed here |
| `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` | Frozen implementation boundary; **§8** human decisions; **§10** coding forbidden without §8 |
| Pair reviews (Ipswich–Arsenal 2026-09-15–17) | Descriptive admission; not production intake |

**`HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION_REVIEW`** is established only as the
`PROJECT_STATE` / readiness-review handoff name. It is **not** listed in Final Gate §9 as a
substitute for **§8 explicit human approval**. Final Gate §9 proposed
`next_action: HUMAN_REVIEW_OF_HISTORICAL_INTAKE_FINAL_GATE` pending human acceptance of §8.

**§8 requirement (repository text):** “Even after this document, **coding must not start until
the human explicitly approves**” the ten decisions in Final Gate §8 (library sprint citing
roadmap A1, `historical-intake.v1` schema, Prisma decoder fail-closed, idempotency pins, Actual
gate, population ineligibility defaults, no HTTP/UI/seed, test-double limits, no real ingest
until artifact admission, PROJECT_STATE sync rules).

No separate signed authorization record (cf. `SPRINT9_IMPLEMENTATION_AUTHORIZATION.md`) exists
for Historical Evaluation Intake.

---

## 2. Readiness blockers — verification

| # | Blocker (readiness order) | Classification | Repository evidence |
|---|---|---|---|
| 1 | Implementation authorization | **IMPLEMENTATION_BLOCKER** | Final Gate §8, §10; no human §8 record |
| 2 | Missing Historical Intake implementation | **IMPLEMENTATION_BLOCKER** | Final Gate §3.1 ADD/MODIFY files **NOT_FOUND** in `packages/statistics` |
| 3 | Calibration / Validation / Contribution firewall | **PRODUCTION_INTAKE_BLOCKER** | Final Gate §4.4 defaults + §4.10 T26; must ship with first sprint; not reason to deny §8 if human approves |
| 4 | Season aggregation policy | **AGGREGATION_BLOCKER** | Readiness §7; Final Gate does not require season mutation for single-pair intake |
| 5 | Optional metric extensions (top-K, per-goal MAE, Brier on A1) | **OPTIONAL_ENHANCEMENT** | A1 `EvaluationMetrics` only for intake slice |

Final Gate §7 blocking items **1–2** (no Class A seal / no verified pair) are **resolved** in
current `PROJECT_STATE`. Items **3–6** in §7 remain partially relevant (human §8, Prisma policy
approval, production intake flag).

---

## 3. Bounded implementation scope (if §8 human approval is recorded)

When authorized, scope is **only** what Final Gate §3 freezes — owner **`@fas/statistics`**, roadmap **A1**, no new package/Engine:

**ADD:** `historical-prediction-seal.ts`, `historical-evaluation-intake.ts`, `canonical-json.ts`,
`validate-historical-prediction-seal.ts`, `validate-verified-real-world-actual.ts`,
`assert-historical-intake-temporal-integrity.ts`, `build-historical-intake-history-record.ts`,
`ingest-historical-evaluation.ts`, `decode-evaluation-history-record.ts`, tests per §5 matrix.

**MODIFY:** `evaluation-history.ts` (discriminated union + `intakeIntegrity`),
`prisma-evaluation-history-repository.ts` (version-aware decoder), `index.ts` exports.

**Pipeline:** authenticated Class A seal + verified Actual → validate chain → `evaluatePrediction`
(unchanged) → historical-intake History builder → `EvaluationHistoryRepository.save` → optional
replay sidecar (never fabricated).

**Acceptance gates:** Final Gate §5 matrix T01–T26; library-only; Class B files rejected in
production path; no `buildEvaluationHistoryRecord` from intake command.

---

## 4. Explicit prohibitions (implementation slice)

Must **not** change: Projection, Feature computation, Rule engine, market feature utilization,
PRE_MATCH sealing, Actual capture semantics, Calibration/Validation/Contribution **algorithms**,
model training/tuning, Report semantics, or `season` on existing Ipswich–Arsenal artifacts.

Must **not** call `EvaluatePredictionUseCase` / regenerate prediction. Must evaluate immutable
sealed `predictionSnapshot` only.

---

## 5. Admission contract (future intake — fail closed)

Required before accept (Final Gate §4 + trust boundary §4.9):

- Authentic admitted Class A PRE_MATCH seal; seal authentication success
- Verified real-world Actual: `quality=verified`, `realWorldVerification=true`
- Exact fixture binding (matchId, orientation, competition/season/teams)
- `analysisTime < kickoff`, `sealedAt` / `predictionGeneratedAt` PRE_MATCH ordering
- Actual `observedAt` post-kickoff; FINISHED FT
- No `MATCH_RESULT` in PRE_MATCH evidence set at seal time
- Supported checksum/canonicalization (`sha256`, `fas-json-canonical.v1`)
- Supported History `schemaVersion` only via intake builder
- No mutation of seal or Actual
- Class B / synthetic / retrospective reconstruction rejected

Missing any required condition → reject; no History write.

---

## 6. Evaluation semantics (A1 only)

Use unchanged `evaluatePrediction` / `EvaluationMetrics`:

- `winnerHit` — 1X2 argmax
- `scoreHit` — **`topScorelines[0]` exact score only**
- `goalHit`, `goalRangeHit`, `scenarioHit`, `confidenceCorrectness`, etc. per existing definitions

Do **not** redefine `scoreHit`. Do **not** treat top-K presence as `scoreHit`. Do **not** add
Brier/log-loss/top-K/per-goal MAE in this slice unless separately authorized.

---

## 7. Scenario semantics

Preserve **EXPECTED_BUT_AMBIGUOUS_NAMING**: aggregate `pAway` argmax vs `mostLikely` scenario
3–3. No Report/scenario renaming in this slice. Intake must copy sealed values exactly.

---

## 8. Multi-market provenance

Four PRE_MATCH ODDS rows may exist; sealed projection used **lottery 1X2 only** for
`marketImplied` / `marketLean`. Intake `intakeIntegrity` / provenance must record actual model
evidence consumption; must **not** imply AH, O/U, or lottery handicap-result influenced
projection. **Not an intake blocker** (readiness + pair review).

---

## 9. Calibration / Validation / Contribution firewall (mandatory in implementation)

Final Gate §4.4 defines enforceable defaults on `evaluation-history.mvp.historical-intake.v1`:

```text
calibrationEligible = false
validationEligible = false
contributionEligible = false
replayCohortEligible = false   // unless replayComplete && replayEligible after authentic sidecar
```

**Enforceability:** Specified in Final Gate; **not yet in production code**. First authorized
sprint **must** implement intake variant + **T26 population isolation** (§4.10) so A2/V1A paths
do not ingest default-ineligible intake rows. Current Calibration uses demo populations, not
Prisma History scan — risk is **future** History-backed populations; mitigation is bounded
implementation requirement, not a reason to skip §8.

**This review:** firewall is **designable and mandatory** in scope; absence of code today does
**not** block authorization **once human §8 is recorded** — but **human §8 is not recorded**, so
implementation remains **BLOCKED**.

---

## 10. Immutability / idempotency / reproducibility (required design)

Per Final Gate §4.5–4.6:

- Append-only History via intake command; no seal/Actual mutation
- `historyId` / idempotency from `originalSealId` + `originalSealChecksum` (T17–T19)
- `evaluatedAt = predictionGeneratedAt` (pin; do not change A1 checksum formula)
- `intakeIntegrity` with `originalSealId`, `resultEvidenceId`, version pins, checksum scope
- `predictionSnapshot` preserved in History
- Version-aware Prisma decode; unknown `schemaVersion` fail-closed (§4.5 — **requires §8.3 human approval**)

---

## 11. Season policy

**AGGREGATION_BLOCKER_ONLY.** Do not change `season = 2025/26` on existing seal or Actual.
Cross-season / multi-fixture aggregation requires a later season-normalization policy gate.

---

## 12. Production authorization (unchanged)

```yaml
production_historical_intake_authorized: false
historical_evaluation_intake: C_BLOCKED
```

Implementation authorization ≠ production intake. **No ingest** of Ipswich–Arsenal in this task.

---

## 13. Authorization decision

**B. BLOCKED — HISTORICAL EVALUATION INTAKE IMPLEMENTATION NOT AUTHORIZED**

**Precise missing authorization:** Explicit **human acceptance of Final Gate §8** (all ten
items), including Prisma unknown-version **fail-closed** decoder policy (§4.5 / §8.3). No
agent-only review may start coding per Final Gate §10.

Technical readiness (authentic pair, frozen contracts, firewall spec, A1 metrics) is
**sufficient to support §8** but does **not** constitute §8 approval.

---

## 14. Next action

```text
HUMAN_REVIEW_OF_HISTORICAL_INTAKE_FINAL_GATE
```

Human records §8 approval (and optional `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_AUTHORIZATION.md`
or sprint authorization document). **Do not** set `production_historical_intake_authorized: true`.
After §8, `next_action` may advance to a bounded **A1 library implementation** task citing Final
Gate §3 — not production intake of the Ipswich pair until separate artifact admission for ingest.

---

## 15. Review outcome

| Review | Result |
|---|---|
| Implementation authorization **review** (this document) | **PASS** (review complete) |
| Historical Evaluation Intake **implementation** | **NOT AUTHORIZED** (decision **B**) |
