# P2K — Durable Evaluation History / Replay Cohort Foundation

**Status:** PLANNING ONLY (no production code, no schema migrations, no engine changes)  
**Sprint id:** P2K  
**Roadmap citation:** `docs/40_PRODUCT_ROADMAP.md` (product sequencing authority); P2K continues the P2* Projection / Evaluation durability line after P2H / P2I / P2J. Doc 40 may not yet list P2K by name — this sprint remains task-authorized planning.  
**Architecture Freeze:** v0.3  
**Immediate downstream use case:** Baseline A vs Candidate C replay on the **same sealed historical prediction cohort** (population calibration prerequisite for R1B Candidate C; does **not** promote Candidate C).  
**Date:** 2026-08-11  

**Inputs read for this plan:**

- `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/PROJECT_INDEX.md`
- Architecture Freeze v0.3 (via PROJECT_STATE / AGENTS pipeline boundaries)
- `docs/sprints/P2H/P2H_PROJECTION_REPLAY_VALIDATION_ENGINE_COMPLETION_REPORT.md`
- `docs/sprints/P2I/P2I_PROJECTION_DIAGNOSTICS_ENGINE_COMPLETION_REPORT.md`
- `docs/sprints/P2J/P2J_PROJECTION_PARAMETER_ARTIFACT_COMPLETION_REPORT.md`
- `docs/sprints/R1A/R1A_MATCH_SCRIPT_CALIBRATION_AUDIT.md`
- `docs/sprints/R1B/R1B_MATCH_SCRIPT_CALIBRATION_COMPLETION_REPORT.md`
- Live code: `@fas/statistics` Evaluation History + sidecar ports; `@fas/database` Prisma `EvaluationHistoryItem` + `PrismaEvaluationHistoryRepository`; `apps/api` `runtime-database.ts`; `@fas/analysis` `AnalysisProjectionReplayPort`; `@fas/report` history/sidecar persist path

---

## 1. Current State Audit

### 1.1 Where Evaluation History exists

| Layer | Location | Role |
| --- | --- | --- |
| Domain record | `packages/statistics/src/domain/evaluation-history.ts` | `EvaluationHistoryRecord` (`evaluation-history.mvp.a15`) embeds sealed `predictionSnapshot`, `actualResult`, scored `evaluation`, confidence, version pins, checksum |
| Repository port | `packages/statistics/src/repository/evaluation-history-repository.ts` | `save` / `findByMatch` / `query` |
| In-memory adapter | `InMemoryEvaluationHistoryRepository` | Process-local (default API path) |
| Prisma model | `packages/database/prisma/schema.prisma` → `EvaluationHistoryItem` | Append-only JSONB `recordJson` + indexed metadata; unique `historyId` |
| Prisma adapter | `packages/database/src/prisma-evaluation-history-repository.ts` | Maps domain ↔ Prisma |
| Composition | `apps/api/src/runtime-database.ts` → `createApiEvaluationHistoryRepository()` | Uses Postgres **only when** `EVIDENCE_REPOSITORY_MODE=postgres`; otherwise shared process memory |
| Write path | `packages/report/.../generate-match-report-use-case.ts` → `persistAndLoadHistory` | Builds History + optional sidecar on report generation |
| Consumers | A2 Calibration, V1A Validation, O1 Contribution, P2H Replay, P2I Diagnostics | All query History population; V2 replay also needs sidecar |

### 1.2 Process-local parts

1. **Default Evaluation History store** — API defaults to `InMemoryEvaluationHistoryRepository` (survives only for the Nest process lifetime; cleared on restart).
2. **Projection Replay Sidecar** — **always** `InMemoryProjectionReplaySidecarRepository` in API composition. There is **no** Prisma model and **no** Postgres adapter for sidecars today.
3. **P2H / P2I report artifacts** — computed on demand into report overlays; not persisted as durable run results.
4. **R1B synthetic cohort** — code constants (`r1b.synthetic.script_shapes.v1`), not a durable Replay Cohort entity.

### 1.3 Replay sidecars (process-local)

`SealedProjectionReplayContext` (`packages/statistics/src/replay/projection-replay-context.ts`) stores:

- matchId, feature model version, feature bundle checksum/status
- **evidenceRefs** (ids only — not full Evidence payloads)
- compact feature name/value pairs
- compact rule results (id, name, status, channel, weight, score)
- requiredEvidencePresentCount, generatedAt
- optional P2J pins: `parameterArtifactId` / `parameterVersionLabel` / `parameterArtifactChecksum`

Keyed in memory by `historyId` (and lookup may fall back to `matchId`). Restart drops all V2 replay contexts → V2 replay skips with “Missing SealedProjectionReplayContext”.

### 1.4 Existing database models (Prisma) related to domains

| Concern | Prisma today? | Notes |
| --- | --- | --- |
| Prediction | **Partial** | Sealed prediction lives **inside** `EvaluationHistoryItem.recordJson.predictionSnapshot`, not a separate table |
| Analysis | No dedicated Analysis table | Analysis is ephemeral / report-time; not a first-class durable row |
| Match | Yes (`Match` + catalog) | P.2 Match catalog; History `matchId` is a **domain string**, not an FK to Match UUID |
| Evaluation | **Yes (partial)** | `EvaluationHistoryItem` = full Evaluation History record as JSONB |
| Evidence | Yes (`EvidenceItem`, `SourceRecord`, …) | Separate Evidence repository; History/sidecar keep **refs**, not blobs |
| Projection | No dedicated Projection table | Projection fields sealed into History prediction snapshot; V2 recompute needs sidecar + engine |
| Probability matrix | No | Not stored as first-class durable artifact; top scorelines / goal range sealed in snapshot |
| Football State | No | Appears in P2H replay **metadata** at compute time; not a durable entity |
| Match Script | No | Active scripts appear in replay metadata; parameter tables live in code/P2J artifacts; **Match Script calibration label is not recorded on sidecar today** |

### 1.5 Persistence boundaries

- Prisma owned only by `@fas/database`.
- Domain Evaluation History contract owned by `@fas/statistics`.
- API composition root chooses memory vs Postgres for Evidence **and** (coupled) Evaluation History.
- Sidecar port owned by `@fas/statistics`; only memory adapter exists.
- Worker: not the current owner of History/sidecar writes (report path is API/report use-case).

### 1.6 Repository patterns

- Port in statistics/domain package → adapter in database (or in-memory in statistics).
- Append-oriented History: Prisma unique on `historyId`; content hash (`contentSha256`) recorded.
- Evidence follows the same memory/postgres mode switch.

### 1.7 API / worker responsibilities (today)

| Concern | Today |
| --- | --- |
| Analyze + report | API / `@fas/report` use-case |
| History save | Same report path (if repository injected) |
| Sidecar save | Same report path (memory only) |
| P2H / P2I compute | On-demand during report overlays / dedicated controllers using History + sidecar |
| Worker | Background composition root; **not** the durable History/cohort owner yet |

### 1.8 Prisma / PostgreSQL architecture

- Modular monolith; PostgreSQL = V1 system of record when live mode enabled.
- Migrations exist for Evidence (P.2) and Evaluation History (A1.5: `20260723120000_a15_evaluation_history`).
- Default local/dev API still often memory for Evidence → History also memory.
- JSONB document for History preserves schema evolution of nested domain records without column churn for every nested field.

---

## 2. Existing P2H / P2I Persistence Limitations

1. **Sidecar is process-local** — V2 replay, script attribution, and parameter-version provenance do not survive restart (P2H / P2J / R1A / R1B all call this out).
2. **History durability is optional and coupled** — Postgres History only when `EVIDENCE_REPOSITORY_MODE=postgres`; not a first-class independent durability switch.
3. **No sealed Replay Cohort** — population identity for A vs C is undefined in persistence; R1B used synthetic in-code cohort only.
4. **No Replay Run record** — cannot compare two runs (Baseline A vs Candidate C) as auditable artifacts with shared membership.
5. **P2H/P2I outputs are ephemeral** — metrics/diagnostics are report overlays, not durable run results.
6. **Match Script calibration pin missing on sidecar** — V2 replay resolves Match Script via active/governed `ProjectionParameterArtifact` / production default (Baseline A). Fair Candidate C replay needs an **explicit run-time override** (or registered artifact versions), without mutating History or promoting C.
7. **Outcome embedded in History** — workable for MVP evaluation, but prediction and outcome are not separate durable entities (risk of conceptual overwrite if future writers mutate `recordJson`).
8. **No population before/after store for R1B** — cannot honestly claim Candidate C population improvement until History+sidecar+cohort+runs exist.

---

## 3. Proposed Durable Entities

Minimum set (prefer reuse over invention):

| Entity | New? | Purpose |
| --- | --- | --- |
| **Evaluation History Record** | Exists (domain + Prisma) | Sealed prediction + outcome + scored evaluation for one analyze event |
| **Projection Replay Sidecar** | **New durable adapter/model** | Compact inputs required to recompute V2 projection for a History row |
| **Actual Match Outcome** | Logical (may stay nested initially) | Final score / completion; never mutates prediction snapshot |
| **Replay Cohort** | **New** | Sealed immutable membership of `historyId`s for comparable population runs |
| **Replay Run** | **New** | One execution of P2H/P2I (or candidate override) against a sealed cohort |
| **Replay Result / Diagnostics** | **New (nested or child)** | Per-run summary + optional per-row outcomes / P2I diagnostics payload |

Optional later (not required for P2K minimum):

- Separate `PredictionSnapshot` table (normalize out of History JSON) — defer; History already seals snapshot.
- Full Evidence / Feature / Matrix tables for evaluation — **avoid**; use refs + fingerprints.

### Entity detail cards

#### 3.1 Evaluation History Record (existing — harden, do not redesign semantics)

- **Purpose:** Append-only evaluation population unit.
- **Ownership:** `@fas/statistics` domain; `@fas/database` persistence.
- **Immutable fields:** `historyId`, `matchId`, version pins, `predictionSnapshot`, `actualResult` (once FINISHED sealed), evaluation scores, `recordedAt`, content checksum.
- **Mutable fields:** None in happy path (append-only). Corrections = new row or explicit void policy later.
- **Identifiers:** `historyId` (unique), internal UUID `id`.
- **Relationships:** 0..1 Sidecar by `historyId`; N:M Cohort membership; referenced by Replay Run results.
- **Lifecycle:** Created at report/history persist time → never rewritten.
- **Provenance:** feature/rule/projection/evaluation model versions + checksum.
- **Version/policy:** schema version `evaluation-history.mvp.a15` (+ future bumps).

#### 3.2 Projection Replay Sidecar (new durable)

- **Purpose:** Enable V2 recompute without live request reconstruction or full Evidence blobs.
- **Ownership:** `@fas/statistics` port; `@fas/database` Prisma adapter.
- **Immutable fields:** `historyId`, sealed `SealedProjectionReplayContext` JSON, content hash, `savedAt`.
- **Mutable fields:** None once written for a historyId (replace only under explicit repair tooling, not normal path).
- **Identifiers:** `historyId` (PK/unique FK-like to History).
- **Relationships:** 1:1 with History row (required for V2; History may exist without sidecar for legacy V1-only).
- **Lifecycle:** Written with History on analyze/report; read by Replay Runner.
- **Provenance:** parameter artifact pins; evidenceRefs; feature/rule checksums.
- **Version/policy:** sidecar schema version field (add if missing) + P2J version labels.

#### 3.3 Actual Match Outcome (logical entity)

- **Purpose:** Ground-truth result for scoring; separate from prediction.
- **Ownership:** Nested in History for P2K-min; optional later `MatchOutcome` table if Evidence MATCH_RESULT ingestion becomes primary.
- **Immutable once sealed FINISHED:** homeGoals, awayGoals, status, outcomeTimestamp, source provenance.
- **Mutable:** Only via void/abandon/postponed transitions under explicit policy (new status; do not rewrite FINISHED score).
- **Must never overwrite** `predictionSnapshot`.

#### 3.4 Replay Cohort (new)

- **Purpose:** Freeze the evaluation population (History membership + implied outcomes) for multi-run comparison.
- **Ownership:** statistics domain + database persistence; created by explicit admin/worker command (not every analyze).
- **Immutable after seal:** membership list, inclusion rules snapshot, seal timestamp, cohort version.
- **Mutable before seal:** draft membership edits.
- **Identifiers:** `cohortId`, `cohortVersion`.
- **Relationships:** members → `historyId[]`; runs → cohortId.

#### 3.5 Replay Run (new)

- **Purpose:** Auditable execution of replay/diagnostics against one sealed cohort with pinned candidate/policy.
- **Ownership:** statistics + database; executed via API or worker job.
- **Immutable after completion:** pins, membership hash, result summary, status, timestamps.
- **Mutable during run:** status (`pending` → `running` → `completed` | `failed`).
- **Identifiers:** `runId`.
- **Relationships:** `cohortId`; optional parent baseline `runId` for paired A/B.

#### 3.6 Replay Result / Diagnostics (new)

- **Purpose:** Persist P2H metrics summary (+ optional P2I diagnostics) for the run.
- **Ownership:** child of Replay Run (JSONB summary + optional detail table later).
- **Immutable after run completes.**

---

## 4. Prediction Snapshot Design

### What exists today

`SealedPredictionInput` inside History already stores: matchId, projection checksum/status, pHome/pDraw/pAway, topScorelines, goalRange, confidence, scenario proxies used by evaluation.

Sidecar stores compact Feature/Rule + evidenceRefs + P2J pins for V2 recompute.

### Classification

| Artifact | Required for Evaluation (score sealed prediction vs outcome) | Required for Full V2 Replay (recompute projection) | Optional audit |
| --- | --- | --- | --- |
| match identifier | Yes | Yes | — |
| prediction / recorded timestamp | Yes (population filters) | Yes | — |
| model / policy version pins | Yes | Yes | — |
| parameter set identity (P2J label/id/checksum) | Soft (attribution) | **Yes** (reproducible V2) | — |
| Match Script calibration label | Soft | **Yes for A vs C** | Record on sidecar + Run pin |
| Football State | No (derived) | Derived at replay | Snapshot levels optional |
| Match Script active set | No | Derived at replay | Store in metadata |
| Projection λ | No if sealed probs exist | Derived | Optional compact λ |
| Full probability matrix | No (top scorelines enough for current metrics) | Prefer recompute | Hash of matrix if ever stored |
| Confidence | Yes | Used when resealing | — |
| Feature snapshot (compact) | No | **Yes (sidecar)** | — |
| Evidence references | No | **Yes (refs only)** | — |
| Full Evidence payloads | No | No | Avoid |
| Provenance / input fingerprints | Soft | Soft (integrity) | Yes (hashes) |

### Rule

Do **not** duplicate large Evidence payloads. Store **refs + checksums**. Prefer recompute of Football State / Match Script / Projection from sidecar Features/Rules + pinned parameters over storing full intermediate graphs.

---

## 5. Actual Outcome Design

Minimum representation (align with existing `ActualMatchResult`):

| Field | Required | Notes |
| --- | --- | --- |
| homeGoals / awayGoals | Yes when FINISHED | Integer goals |
| final score encoding | Yes | Consistent with evaluation scorer |
| match completion status | Yes | At least `FINISHED`; plan for `VOID` / `ABANDONED` / `POSTPONED` |
| outcome timestamp | Yes | When result became known / sealed |
| source provenance | Yes | e.g. MATCH_RESULT Evidence id / provider / cassette |
| data version | Soft | Provider/schema version |

**Separation rule:** Outcome is logically independent of Prediction Snapshot. P2K-min may keep outcome nested in History JSON **if** writers never mutate prediction fields and treat FINISHED outcome as append-seal. A later split table is allowed without changing evaluation semantics.

**Void / abandoned / postponed:** Mark status; exclude from sealed cohort membership or include with explicit exclusion flags — never invent scores.

---

## 6. Replay Cohort Design

### Requirements

Same historical predictions replayable against Baseline A and Candidate C **without changing**:

- match set
- outcome set
- evaluation population membership

### Design

| Concern | Proposal |
| --- | --- |
| Cohort identity | `cohortId` (stable) + `cohortVersion` (monotonic per seal attempt; sealed versions immutable) |
| Membership | Ordered unique `historyId[]` (+ optional membership content hash) |
| Creation | Explicit command: query History (+ require sidecar present for V2 cohort type) → draft |
| Inclusion rules | Snapshot of filter: date range, competition/season, require sidecar, require FINISHED outcome, feature/projection version pins, exclude void |
| Sealing | Transition `draft` → `sealed`; copy membership freeze; compute `membershipSha256`; forbid edits |
| Exclusion | Rows failing completeness rules never enter sealed membership (or enter with `excludedReason` only in draft audit log — sealed list is positive membership only) |
| Immutability | Sealed cohort rows are append-only references; no delete/update of members |

**V2 calibration cohort type (R1B path):** membership **requires** sidecar for every `historyId`. V1-only cohorts may exist for sealed-prediction metrics but cannot support Candidate C Match Script recompute.

---

## 7. Replay Run Design

Minimum fields:

| Field | Purpose |
| --- | --- |
| `runId` | Unique run identity |
| `cohortId` + `cohortVersion` | Sealed population pin |
| `candidateKey` / parameter pins | e.g. Match Script `calibrationLabel` Baseline A vs Candidate C; P2J `parameterVersionLabel`; engine/policy pins |
| `policyVersion` / `engineVersion` | Replay port + statistics package versions |
| `createdAt` / `startedAt` / `completedAt` | Audit timeline |
| `status` | pending \| running \| completed \| failed |
| `resultSummary` | Aggregate P2H metrics (+ P2I summary) |
| `error` / diagnostics | Failure reason; optional truncated detail |
| `baselineRunId` (optional) | Paired comparison link |
| `membershipSha256` | Must equal cohort seal hash at start |

**Comparability rule:** Two runs are comparable iff same `cohortId`+`cohortVersion` (+ same membership hash) and differ only in declared candidate/parameter pins.

**Critical capability gap to design (not implement here):** Replay port must accept **run-time Match Script / parameter override** without mutating sidecar or History. Today `AnalysisProjectionReplayPort.replayV2` resolves parameters from sidecar label → registry, else active artifact (Baseline A governed Match Script). Candidate C A/B requires override injection at run scope only.

---

## 8. Evaluation Record Design

Keep existing `EvaluationHistoryRecord` as the Evaluation Record.

Do not invent a parallel “Evaluation” engine or table for P2K.

Ensure:

- Prediction snapshot immutable
- Outcome sealed separately in document structure
- Evaluation scores derived at write time from sealed prediction + outcome
- Re-scoring under new evaluation policy = **new History row or new Run-scoped rescore artifact**, never silent overwrite

Replay Runs evaluate **recomputed** predictions against the **same** sealed outcomes from cohort membership History rows.

---

## 9. Database Impact (proposed only)

### Likely required (future coding sprints)

1. **New Prisma model:** `ProjectionReplaySidecarItem`  
   - `historyId` unique  
   - `matchId`  
   - `contextJson` JSONB  
   - `contentSha256`  
   - `savedAt`  
   - FK-like integrity to `evaluation_history_items.history_id` (DB FK if stable; else application-enforced)
2. **New Prisma models:** `ReplayCohort`, `ReplayCohortMember`, `ReplayRun` (+ optional `ReplayRunResult` JSONB on run)
3. **Indexes:**  
   - sidecar(`history_id`)  
   - cohort members(`cohort_id`, `history_id`) unique  
   - runs(`cohort_id`, `created_at`), runs(`status`)
4. **Unique constraints:** `history_id` (History already); sidecar `history_id`; cohort seal version uniqueness; `run_id`
5. **Migrations:** Yes, in a later coding sprint — **not in this planning sprint**
6. **Retention:** Append-only; soft retention policy later (do not delete sealed cohorts referenced by runs)
7. **Idempotency:** History save by content/`historyId` policy; sidecar upsert-by-historyId only if identical hash else fail; cohort seal once; run create returns existing if identical idempotency key

### Not required for P2K minimum

- New tables for Football State, Match Script catalog, full matrix, full Evidence duplication
- Changing Match / Evidence schemas for evaluation semantics

### Existing asset to leverage

- `evaluation_history_items` + `PrismaEvaluationHistoryRepository` already implement durable History when Postgres mode is on.

---

## 10. API / Worker Responsibility (proposed)

| Responsibility | Proposed owner | Notes |
| --- | --- | --- |
| Prediction snapshot + History persist | API report path (existing) | Keep dual-write History + Sidecar |
| Sidecar persist | Same write path; durable adapter in `@fas/database` | Fix memory-only gap |
| Outcome ingestion | Prefer Evidence MATCH_RESULT → History materialization | Do not overwrite prediction; worker may backfill outcomes later |
| Evaluation materialization | Report/use-case or dedicated command | Existing builder |
| Cohort create/seal | Explicit API admin endpoint **or** worker command | Not on every analyze |
| Replay execution | Worker job preferred for large cohorts; API may trigger | Uses Replay Runner + port overrides |
| Replay result persistence | Worker/API writes `ReplayRun` | P2H/P2I read from run store for audits |

No APIs/workers implemented in this planning sprint.

---

## 11. Provenance Strategy

Store and verify:

- History content SHA
- Sidecar content SHA
- Cohort membership SHA
- P2J parameter artifact id / version label / checksum
- **Match Script calibration label** (predict-time on sidecar; run-time pin on Replay Run)
- Feature bundle checksum + feature/rule model versions
- Engine/replay port version on Replay Run
- Evidence refs only (resolve live Evidence optionally for audit, never required for V2 replay if sidecar complete)

Fail closed on hash mismatch between Run’s expected membership hash and sealed cohort.

---

## 12. Idempotency Strategy

| Write | Strategy |
| --- | --- |
| History | Stable `historyId` derivation from sealed content; duplicate save of identical payload = no-op / accept; conflicting payload for same id = hard fail |
| Sidecar | One context per `historyId`; identical hash = idempotent; different hash = fail (no silent replace) |
| Cohort seal | Seal once per `cohortId`+`cohortVersion`; retries return sealed snapshot |
| Replay Run | Client `idempotencyKey` → same pins+cohort returns same `runId` if completed; do not double-write metrics |

Retries must not create divergent populations.

---

## 13. Architecture Freeze Compliance (v0.3)

| Constraint | Compliance |
| --- | --- |
| No new Football Intelligence engine | Persistence + repository adapters + cohort/run records only |
| No new Provider | Outcome may reference existing Evidence/provider facts |
| No Projection math changes | Replay uses existing `computeMatchProjection` |
| No Match Script redesign | Candidate C remains non-default; Run override only for offline comparison |
| No Market → Probability integration | Out of scope |
| No Feature / Rule expansion | Sidecar stores existing compact Feature/Rule shapes |
| Persistence supports evaluation, not prediction semantics | Analyze path unchanged in meaning; durability does not alter live default Baseline A |

**Explicit:** P2K must **not** promote Candidate C or change Candidate C parameters.

---

## 14. Migration Strategy (future coding — design only)

1. Ship sidecar + cohort/run migrations behind feature flags / repository mode.
2. Dual-write sidecar (memory + postgres) during transition optional; prefer postgres when History is postgres.
3. Backfill: re-analyze or repair tool for History rows lacking sidecar (V2 incomplete until backfilled).
4. Do not rewrite historical `recordJson` prediction snapshots.
5. Decouple History durability env from Evidence mode when safe (`EVALUATION_HISTORY_REPOSITORY_MODE` or shared “platform store” mode) — design note for coding sprint; avoid silent behavior change.

---

## 15. Testing Strategy (future coding)

- Repository contract tests: History + Sidecar round-trip, idempotency, conflict fail
- Cohort seal immutability tests
- Replay Run comparability: same cohort, Baseline A vs Candidate C pins → membership identical, predictions may differ
- Restart durability: process restart preserves sidecar (integration with Postgres)
- Freeze regression: no Match Script production default change; Candidate C still non-default
- P2H/P2I: V2 skip rate → 0 on sidecar-complete sealed cohort
- Size tests: reject accidental full Evidence blob storage

Planning sprint itself: **no test modifications** unless needed to validate this markdown artifact (none required).

---

## 16. Risks

1. Treating memory History as “durable” in demos → false calibration confidence.
2. Coupling History mode to Evidence mode → operators enable Evidence postgres without realizing evaluation durability implications (or vice versa).
3. Sealing cohorts without sidecars → Candidate C replay silently V2-skips.
4. Storing full Evidence/matrix → DB bloat and privacy surface.
5. Mutating History JSON for outcome fixes → accidental prediction overwrite.
6. Replay override bugs flipping production default toward Candidate C.
7. Comparing runs across different cohort versions and calling them A/B.
8. Legacy History without sidecar never eligible for Match Script population gate.

---

## 17. Explicit Non-Goals (this planning sprint and P2K scope intent)

- No production code / schema / migrations in **this** planning deliverable
- No new Engine / Provider / Feature / Rule
- No Football State or Match Script redesign
- No Projection / Poisson mathematics changes
- No Candidate C promotion or parameter edits
- No Market → Probability work
- No automatic learning activation
- No auth / public deployment
- No Redis/BullMQ requirement for MVP (worker sync job acceptable initially)

---

## 18. Recommended Implementation Sequence

Adapted to **this** repository (History Prisma already exists; sidecar/cohort/run do not):

### P2K-A — Platform durability clarification

- Document/implement first-class Evaluation History repository mode (or clearly keep Evidence-coupled mode with operator checklist)
- Verify Postgres History path in API composition; acceptance: History survives restart when mode=postgres
- **Still no prediction semantic changes**

### P2K-B — Durable Projection Replay Sidecar

- Prisma model + `PrismaProjectionReplaySidecarRepository`
- Wire API composition when platform store is postgres
- Dual-write on existing `persistAndLoadHistory`
- Acceptance: restart → V2 replay still finds context

### P2K-C — Sidecar completeness + backfill policy

- Query helpers: History rows missing sidecar
- Optional re-analyze/backfill command
- Cohort eligibility = sidecar-complete + FINISHED outcome

### P2K-D — Replay parameter / Match Script override (offline only)

- Extend Replay Runner / port input with **run-scoped** pins (`matchScriptCalibrationLabel` and/or parameter artifact label)
- Resolve Candidate C **only** when Run requests it; production default remains Baseline A
- Acceptance: two runs, same cohort, A vs C, membership identical

### P2K-E — Sealed Replay Cohort

- Prisma cohort + members; draft → seal; membership hash
- Acceptance: sealed cohort immutable; A/B runs reference same seal

### P2K-F — Replay Run persistence

- Persist run pins, status, summary, errors
- Link optional baselineRunId for paired comparison

### P2K-G — P2H / P2I integration

- Execute P2H (+ P2I) against cohort via Run; persist summaries
- Population metrics readable for human promotion gate
- **Still no automatic Candidate C promotion**

### Post-P2K (separate authorization)

- Human Review + Promotion Gate using durable before/after metrics
- Only then consider production default change (out of P2K)

---

## Calibration Path Map (Phase 7)

```text
Durable Prediction History          [PARTIAL — Prisma exists; default often memory]
        ↓
Durable Replay Sidecar              [MISSING]
        ↓
Sealed Replay Cohort                [MISSING — R1B synthetic only]
        ↓
Baseline Replay (Run pin = A)       [PARTIAL — live replay exists; no durable Run]
        ↓
Candidate Replay (Run pin = C)      [MISSING — override + non-promotion guard]
        ↓
P2H / P2I                           [EXISTS — ephemeral overlays]
        ↓
Population Metrics (durable)        [MISSING]
        ↓
Promotion Gate                      [PARTIAL — R1B structural gate only]
        ↓
Human Review                        [PROCESS — not automated]
```

---

## Planning Completion Checklist

| Deliverable section | Present |
| --- | --- |
| 1 Current State Audit | Yes |
| 2 P2H/P2I persistence limitations | Yes |
| 3 Proposed Durable Entities | Yes |
| 4 Prediction Snapshot design | Yes |
| 5 Actual Outcome design | Yes |
| 6 Replay Cohort design | Yes |
| 7 Replay Run design | Yes |
| 8 Evaluation Record design | Yes |
| 9 Database impact | Yes |
| 10 API / Worker responsibility | Yes |
| 11 Provenance strategy | Yes |
| 12 Idempotency strategy | Yes |
| 13 Architecture Freeze compliance | Yes |
| 14 Migration strategy | Yes |
| 15 Testing strategy | Yes |
| 16 Risks | Yes |
| 17 Explicit non-goals | Yes |
| 18 Recommended implementation sequence | Yes |

---

## End-of-Planning Report

### Files created

- `docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md` (this document)

### Files modified

- None (planning-only)

### Production code

- **Not changed**
- **No database schema / migrations created**
- **No tests modified**
- **No Engine / Provider / Feature / Rule / Football State / Match Script / Projection / Poisson / Candidate C changes**

### Current persistence limitations (summary)

- Evaluation History **can** be durable via existing Prisma model, but API defaults to process memory and ties Postgres History to Evidence mode.
- Projection Replay Sidecar is **only** process-local — blocking durable V2 / A vs C population calibration.
- No sealed Replay Cohort or Replay Run persistence; P2H/P2I outputs are ephemeral.

### Proposed durable architecture (summary)

Reuse Evaluation History; add durable Sidecar; add sealed Cohort + Run with run-scoped Match Script/parameter overrides for Baseline A vs Candidate C on identical membership; keep outcomes separate from prediction snapshots; store refs/hashes not full Evidence/matrices.

### Recommended next coding sprint

**P2K-A + P2K-B** (smallest safe coding slice): clarify/enable durable History mode and implement **PostgreSQL Projection Replay Sidecar** wired into the existing report dual-write path — prerequisite for any honest Candidate C population gate. Do **not** promote Candidate C in that sprint.
