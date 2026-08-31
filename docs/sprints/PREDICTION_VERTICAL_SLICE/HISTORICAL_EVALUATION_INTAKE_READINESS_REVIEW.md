# Historical Evaluation Intake Integrity — Pre-Implementation Readiness Review

## 0. Review status

| Field | Result |
|---|---|
| Review type | Repository-grounded pre-implementation readiness review |
| Date | 2026-08-31 |
| Scope | Inspection, dependency tracing, fixture inspection and planning consistency only |
| Planning reviewed | `HISTORICAL_EVALUATION_INTAKE_INTEGRITY_PLANNING.md` |
| Source audit | `HISTORICAL_MATCH_EVALUATION_CASE_CAPABILITY_AUDIT.md` |
| Final Gate | **C. BLOCKED** |
| Production code changed | No |
| Data, History or Sidecars created | No |

The proposed boundary is architecturally placeable and its existing Evaluation
primitives are reusable. It is not yet executable safely because the repository
contains neither an authentic original PRE_MATCH seal nor the controlled
repository-backed seal fixture required by the planning gate. No currently
available result artifact satisfies the proposed verified-Actual gate.

The physical database can carry a new History JSON variant without a Prisma
migration, but current domain and Prisma decoding code cannot round-trip that
variant. Those are implementation changes, not migration changes.

## 1. Planning assumptions versus actual repository

| Capability | Planning assumption | Actual repository | Compatible? | Gap |
|---|---|---|---|---|
| `SealedPredictionInput` | Existing immutable prediction input can be reused unchanged | Implemented in `packages/statistics/src/domain/prediction-evaluation.ts`; includes projection output, checksum and model versions, but no generation/cutoff/fixture tuple | **Yes, as a nested prediction snapshot only** | Historical wrapper must supply original-seal identity, fixture identity and time fields |
| `evaluatePrediction` | Existing FT evaluator can score a valid historical seal against a valid Actual | Implemented as a pure function in `packages/statistics/src/evaluation/evaluate-prediction.ts`; validates exact `matchId`, excludes non-completed projection and returns deterministic metrics/checksum for fixed input | **Yes** | `evaluatedAt` participates in its checksum and therefore must be stable for retry semantics |
| `buildEvaluationHistoryRecord` | Existing builder can be reused or versioned | Implemented in `packages/statistics/src/evaluation/build-evaluation-history-record.ts` | **Partial** | Existing builder always creates legacy a15 History and its id/checksum do not include original-seal identity or intake manifest |
| `EvaluationHistoryRepository` | Existing append-only port can persist the new record | Implemented in `packages/statistics/src/repository/evaluation-history-repository.ts` with memory and Prisma adapters | **Partial** | Port is sufficient; Prisma decoder is not version-aware |
| `EvaluationHistoryRecord` | Existing domain can gain a versioned intake variant | Implemented as the single literal version `evaluation-history.mvp.a15` in `packages/statistics/src/domain/evaluation-history.ts` | **Partial** | Requires a discriminated domain extension; legacy a15 must remain unchanged in meaning |
| History persistence | Full History record is stored durably in JSON | Prisma `EvaluationHistoryItem.recordJson` is JSONB; memory repository stores the object | **Partial** | Writes can carry additive JSON, but current Prisma revival drops unknown fields and stored schema version |
| Evaluation checksum | Deterministic evaluation checksum can be reused | Implemented with a 32-bit FNV-style checksum over prediction checksum, Actual score/winner, derived metrics and `evaluatedAt` | **Yes, for fixed inputs** | It is not an original-seal checksum and changes when `evaluatedAt` changes |
| Deterministic History id | Repeated intake is idempotent and seal-specific | Current id is `eval-history:{matchId}:{projectionChecksum}:{evaluation.checksum}` | **No for the proposed contract** | It is not independently based on original-seal id/checksum and inherits `evaluatedAt` sensitivity |

### 1.1 Existing reusable sequence

The safe reuse point is:

```text
already-authenticated historical prediction seal
  → SealedPredictionInput
  → evaluatePrediction
  → historical-intake-specific History builder
  → EvaluationHistoryRepository.save
```

The existing `packages/analysis/src/use-case/evaluate-prediction-use-case.ts`
must not be used for historical intake because it accepts a current
`AnalysisResult` and creates a new seal through
`buildSealedPredictionInput`. That would reconstruct rather than authenticate
the original prediction.

## 2. Historical intake boundary and ownership

### 2.1 Placement verdict

| Question | Finding |
|---|---|
| Owning package | `@fas/statistics` |
| Is `@fas/statistics` appropriate? | Yes. It already owns `SealedPredictionInput`, `ActualMatchResult`, Evaluation, History and replay-sidecar repository contracts |
| New package required? | No |
| `@fas/analysis` change required? | No |
| New Engine introduced? | No |
| Architecture Freeze violation? | No, provided the capability only validates supplied artifacts and never runs upstream analysis stages |
| Evaluation ownership conflict? | No; it reuses the existing deterministic A1 scoring boundary |
| Replay ownership conflict? | No if sidecar handling remains optional and fail-closed |
| Evidence ownership conflict? | No if intake consumes a supplied Evidence contract/reference and does not acquire or normalize Evidence |

The current repository uses pure functions plus injected repository ports in
`@fas/statistics`. A future command/use case may follow that pattern under
`packages/statistics/src/evaluation/`. It must not be placed in Report
orchestration, because `GenerateMatchReportUseCase` starts from a current
analysis and can create current History/Sidecars.

### 2.2 Architecture conflict check

`ARCHITECTURE_CONFLICT = NOT FOUND`

This finding is narrow. It does not authorize implementation. Creating a new
package, a new Evaluation Engine package, or a historical reconstruction path
would cross the Architecture Freeze and governance boundaries.

## 3. `EvaluationHistoryRecord.intakeIntegrity` review

### History Extension Verdict

**DOMAIN_EXTENSION_REQUIRED**

`NO_CHANGE_REQUIRED` is false because:

1. `EvaluationHistoryRecord.schemaVersion` is currently fixed to
   `evaluation-history.mvp.a15`.
2. `EvaluationHistoryRecord` and `createEvaluationHistoryRecord` have no
   `intakeIntegrity`.
3. `buildEvaluationHistoryRecord` cannot include the original seal and manifest
   in the id/checksum.
4. `PrismaEvaluationHistoryRepository.reviveHistoryRecord` discards the stored
   `schemaVersion`, passes the remainder through the a15 creator, and therefore
   drops unknown future fields.

`PERSISTENCE_SCHEMA_REQUIRED` is false for the planned manifest. The full
record already lives in `record_json`.

`PRISMA_MIGRATION_REQUIRED` is false. The existing JSONB column has no JSON
shape constraint, and the existing indexes/unique constraint can continue to
index the same top-level fields.

### 3.1 Required minimum domain/persistence behavior

- Introduce a new discriminated History schema variant for historical intake.
- Preserve `evaluation-history.mvp.a15` as a legacy variant.
- Make absence of `intakeIntegrity` mean **not intake-verified**, never verified
  by default.
- Add a historical-intake builder whose deterministic identity/checksum includes
  the approved original-seal identity and canonical manifest.
- Dispatch the Prisma JSON decoder by stored `schemaVersion`.
- Reject unsupported or invalid History JSON explicitly rather than silently
  omitting rows.
- Round-trip both schema variants through memory and Prisma repositories.

### 3.2 Serialization, API and UI compatibility

| Surface | Actual behavior | Readiness |
|---|---|---|
| Memory save/read | Stores and returns the typed object in a `Map` | Structurally ready after domain extension |
| Prisma save | Writes the full object to `recordJson`; computes a SHA-256 content column | Physically ready |
| Prisma read | Reconstructs only a15 and silently filters failed rows | Must change |
| Evaluation History API | Existing GET controller returns domain records directly | Additive JSON is technically serializable; public shape changes passively |
| Report DTO | History is represented loosely in report HTTP output | No first-boundary change required |
| Web DTO/UI | Uses a subset and ignores schema/checksum/manifest | Existing UI should continue rendering, but will not display intake integrity |
| Calibration/Validation/Contribution | Consume common History fields and report schema versions | New variant should be compatible after typed union review |

The initial intake does not require a new HTTP endpoint or UI. If an intake
manifest is later exposed as a supported public contract, that is a separate
DTO/UI scope decision.

## 4. Timestamp model

### 4.1 Actual fields and sources

| Timestamp concept | Actual location | Meaning / limitation |
|---|---|---|
| `generatedAt` | `AnalysisResult`, `AnalysisReport`, `SealedProjectionReplayContext` | Analysis/report/replay-context completion time; absent from `SealedPredictionInput` |
| `matchDate` | `EvaluationHistoryRecord` | Used as kickoff/match instant by History; name is less explicit than `kickoff` |
| `kickoff` / `kickoffTime` | `Match.kickoffTime`, fixture/provider contracts; planning wrapper proposes `kickoff` | Not embedded in `SealedPredictionInput` or `AnalysisReport` |
| `analysisTime` | FIP protocol and planning only | No production domain field |
| `analysisCutoff` | FIP protocol and planning only | No production domain field or runtime enforcement |
| `observationTime` | Protocol vocabulary; no same-named production field | Evidence has `eventTime`, `collectedAt`, `timestamp`; Actual has `observedAt` |
| `observedAt` | `ActualMatchResult` and MATCH_RESULT payload | Required valid timestamp, but no current comparison with kickoff |
| `recordedAt` | `EvaluationHistoryRecord` and Prisma row | History recording time; not proof of original prediction creation |

### 4.2 Current type capabilities

| Type | Time fields |
|---|---|
| `AnalysisReport` | `generatedAt` |
| `AnalysisResult` | `generatedAt` |
| `SealedPredictionInput` | None |
| `EvaluationHistoryRecord` | `matchDate`, `recordedAt`; nested evaluation has `evaluatedAt`; nested Actual has `observedAt` |

### Temporal Integrity Readiness

**PARTIAL**

The proposed wrapper/command and manifest can express:

```text
analysisCutoff = analysisTime
analysisTime < kickoff
analysisCutoff <= generatedAt < kickoff
```

without changing `SealedPredictionInput`, `AnalysisResult` or
`AnalysisReport`. The current models alone cannot prove those rules because no
single current durable artifact carries all four instants. The implementation
must require explicit timezone-aware values from the approved original artifact
and must never substitute `recordedAt`, file modification time, Git author time
or current runtime time.

Minimum gap: a validated historical-seal wrapper with explicit
`analysisTime`, `analysisCutoff`, `generatedAt`, `kickoff`, source contract
version and timestamp provenance.

## 5. Original seal availability

### 5.1 Candidate classification

| Candidate | Location | Class | Reason |
|---|---|---|---|
| Genuine pre-kickoff seal | Repository-wide search | **A — none found** | No committed artifact proves the full seven-part authenticity test |
| Inline History/Sidecar test records | `packages/analysis/test/**`, `packages/statistics/test/**`, `packages/database/test/**` | **B — Repository test fixture** | Constructed during tests with synthetic values; not an original historical artifact |
| A1 demo population | `packages/statistics/src/evaluation/evaluation-population.ts` | **C — Synthetic/demo** | Declared demo records with synthetic ids/checksums and no cutoff proof |
| P2K validation bootstrap/expansion population | `packages/report/src/validation/**` | **C — Synthetic/demo** | Analysis and Actual overlays are generated for validation; no independently preserved pre-kickoff seal |
| Recorded scheduled provider bundles | `packages/provider-football/fixtures/**` | **C — Synthetic/recorded input** | Evidence inputs only; contain neither a prediction seal nor FT Actual |
| Four confirmed replay results | `packages/statistics/src/evaluation/confirmed-match-replay-results.ts` | **D — Outcome-only** | Explicitly contain no PRE_MATCH prediction |
| Current-runtime rerun of an old fixture | No stored artifact; prohibited reconstruction path | **E — Retrospective/reconstructed** | Would use current Feature/Rule/Projection code after outcome |
| Yokohama and other narrative examples | Sprint/audit documents | **F — Unknown/insufficient provenance** | Document references do not provide an immutable seal payload and proof chain |
| PVS-3.2 live report | PVS-3.2 report | **F — Not available** | Live validation was blocked; no successful live report was sealed |

### 5.2 Seven-part authenticity test

No artifact found proves all of:

1. existence before kickoff;
2. exact fixture and orientation;
3. original prediction payload;
4. artifact/checksum identity and scope;
5. generation time;
6. non-regeneration during a test;
7. non-retrospective origin.

The presence of a JSON object, `projectionChecksum`, History checksum, Git path
or replay sidecar is not sufficient by itself.

## 6. Recommended source artifact class

### Recommended Source Artifact Class

| Source class | Decision | Conditions / rationale |
|---|---|---|
| A. Durable repository-backed sealed `AnalysisReport` | **ACCEPT WITH CONDITIONS** | Must preserve canonical full content, artifact checksum plus algorithm/scope, explicit `generatedAt`, approved `analysisTime`/cutoff, exact fixture tuple, policy/model pins, immutable storage identity and independently reviewable pre-kickoff existence. Current `AnalysisReport` alone lacks kickoff, full fixture identity and a report checksum |
| B. Durable repository-backed sealed Projection | **ACCEPT WITH CONDITIONS** | Must wrap the complete original `SealedPredictionInput` with original-seal identity, checksum scope/algorithm, explicit timestamps, fixture tuple and policy/model/parameter provenance. Projection checksum alone is insufficient |
| C. Exported immutable JSON with checksum and creation metadata | **ACCEPT WITH CONDITIONS** | Canonical bytes/schema, cryptographic checksum, immutable/versioned storage, trusted creation metadata and pre-kickoff proof are mandatory; filesystem timestamps alone do not qualify |
| D. Browser `localStorage` | **REJECT** | Mutable presentation cache; current entry stores metadata but not the sealed prediction/checksum |
| E. Conversation transcript | **REJECT** | Not a governed prediction artifact, not a canonical serialization and not sufficient proof of fixture/checksum/cutoff integrity |
| F. Replay sidecar | **REJECT AS ORIGINAL SEAL** | It stores upstream replay inputs, not the final original prediction. It may be accepted only as supplementary replay context after binding to an accepted original seal |
| G. `EvaluationHistoryRecord` | **REJECT AS ORIGINAL SEAL** | It is a post-Actual derivative record. Legacy a15 History has no cutoff/original-seal proof. A future intake-created History remains evidence that intake occurred, not the source seal itself |
| H. WORM/object-versioned or signed external artifact | **ACCEPT WITH CONDITIONS** | Must satisfy the same canonical payload, trusted timestamp, fixture, checksum scope and provenance requirements and remain operator-reviewable |

Human approval should select one primary accepted class and define its canonical
serialization, checksum algorithm/scope and timestamp attestation. The safest
minimum is a versioned immutable JSON export of either a sealed report or
sealed projection wrapper in repository/WORM storage, created before kickoff.

## 7. Controlled fixture feasibility

`CONTROLLED_PREMATCH_SEAL_FIXTURE = NOT AVAILABLE`

There is no exact file, fixture id, match id, `generatedAt`, kickoff, checksum
and provenance tuple that qualifies. Existing test fixtures are generated
during tests; validation populations are synthetic; the four real outcomes
contain no prediction.

**Implementation must remain blocked until a qualifying controlled fixture is
identified and approved.** Creating a synthetic fixture after the fact may test
validators, but it cannot be mislabeled as a genuine historical seal. A
controlled test fixture may be accepted only if its provenance truthfully says
what it is and its pre-kickoff existence can be demonstrated independently.

## 8. Actual result verification

### 8.1 Contract compatibility

The requirement `quality === "verified"` is compatible with
`packages/evidence/src/domain/evidence.ts`, where `EvidenceQuality` explicitly
includes `verified`, and `MATCH_RESULT` is a valid Evidence type.

The current Evaluation mapping is not sufficient for the new gate:

- `mapActualMatchResultFromEvidence` does not accept or inspect `quality`.
- `ActualMatchResult` preserves provider/source/method and `observedAt`, but not
  the Evidence id, quality or Evidence checksum.
- The fixture normalizer creates ordinary MATCH_RESULT Evidence as
  `quality: "unverified"`.
- `ActualMatchResult` validates score arithmetic, winner, `FINISHED` status and
  timestamp syntax, but does not validate `observedAt >= kickoff`.

Therefore the future intake must validate the original Evidence or governed
verification reference before mapping, and preserve its id/source reference in
`intakeIntegrity`.

### 8.2 Existing outcome-only fixtures

**BLOCKED**

The four curated outcome-only records contain provider/method descriptions, but
they are not durable `MATCH_RESULT` Evidence objects with
`quality: "verified"`. A method string such as authoritative verification is not
equivalent to the typed quality gate. They cannot be promoted to verified
Actuals by inference.

## 9. Replay boundary

### 9.1 Feasibility verdict

The statement **“FT Evaluation can succeed while Replay remains blocked” is
achievable**:

- `assessProjectionReplayEligibility` explicitly separates
  `outcomeEvaluable`, `replayComplete` and `replayEligible`.
- Missing/invalid/incomplete sidecar states can block replay without invalidating
  a scored History outcome.
- Sidecar storage is separate from immutable Evaluation History.
- `SealedProjectionReplayContext` carries compact Features, Rules, evidence
  references, generation time and optional parameter provenance.

### 9.2 Mandatory boundary

- Never create a historical sidecar by running old data through current
  Feature/Rule code.
- Never run current Projection against a known historical result to manufacture
  a historical prediction.
- Accept a sidecar only when it demonstrably belongs to the accepted original
  seal and existed in the same pre-kickoff trust context.
- Missing or incomplete context must produce recorded Evaluation with blocked
  replay, not reconstructed replay.

### 9.3 Existing eligibility defect

`assessProjectionReplayEligibility` adds
`PARAMETER_ARTIFACT_UNPINNED` to its reasons, but that reason is absent from the
`completenessBlockers` set. Consequently, a sidecar can currently be reported
`replayComplete: true` and potentially `replayEligible: true` while also
reporting an unpinned parameter artifact.

Historical intake must not rely on that result without a stricter parameter
provenance gate. This is a readiness condition; it was not changed by this
review.

## 10. No-Prisma-migration claim

**PASS — no Prisma migration is required for the planned JSON manifest.**

Actual model facts:

- `evaluation_history_items.record_json` is required JSONB.
- `history_id` remains the unique domain id.
- Existing match, competition, season, match-date and recorded-time indexes do
  not depend on `intakeIntegrity`.
- No database JSON-shape constraint prevents a new nested manifest.

This PASS does not mean no database-package code changes are required. The
version-aware decoder in
`packages/database/src/prisma-evaluation-history-repository.ts` is a mandatory
code change for durable read compatibility. The Prisma schema and migrations
must remain unchanged.

## 11. No-HTTP-endpoint claim

**PASS**

The current Evaluation History controller exposes reads only. Existing History
writes already occur through internal orchestration and repository ports; the
architecture does not require every write capability to have a public HTTP
endpoint.

The first boundary may remain a library-only capability invoked by a private,
explicit operator harness/composition root. This review does not authorize or
choose that harness. Existing Calibration, Validation and Replay HTTP reads do
not create an intake-write requirement.

## 12. Minimal implementation file boundary

This section describes a future approved implementation only.

### MUST CHANGE

| Path | Reason | Owner | Risk |
|---|---|---|---|
| `packages/statistics/src/domain/evaluation-history.ts` | Add discriminated historical-intake History variant and immutable manifest while preserving a15 | `@fas/statistics` | High: legacy compatibility and false verification |
| `packages/statistics/src/evaluation/build-evaluation-history-record.ts` or a new adjacent historical builder | Make historical identity/checksum seal-aware without changing the live a15 builder semantics | `@fas/statistics` | High: idempotency/collision |
| New files under `packages/statistics/src/domain/` and `packages/statistics/src/evaluation/` | Command/result contracts, fail-closed validation and orchestration | `@fas/statistics` | High: trust-boundary correctness |
| `packages/statistics/src/index.ts` | Export approved public contracts/functions | `@fas/statistics` | Medium: package API |
| `packages/database/src/prisma-evaluation-history-repository.ts` | Decode by stored schema version and preserve the manifest | `@fas/database` | High: silent row loss |
| Focused tests under `packages/statistics/test/` | Integrity, identity, Actual, idempotency, replay and legacy tests | `@fas/statistics` | High if omitted |
| Focused repository tests under `packages/database/test/` | New-variant round trip plus legacy a15 read | `@fas/database` | High if omitted |

`evaluatePrediction.ts` is a required reuse dependency, but its metric logic
does not need to change. If deterministic retry semantics cannot be achieved
outside it, any proposed modification requires separate review because
Evaluation semantics are frozen for this task.

### MAY CHANGE

| Path | Reason | Owner | Risk |
|---|---|---|---|
| `packages/statistics/package.json` | Only if typed Evidence is imported instead of using an explicit boundary shape | `@fas/statistics` | Medium: new package dependency |
| `packages/statistics/src/evaluation/map-actual-match-result.ts` | Only if the approved design centralizes verified-Evidence validation here; a separate intake validator is safer | `@fas/statistics` | High: existing callers |
| `packages/statistics/src/replay/assess-projection-replay-eligibility.ts` | Correct unpinned-parameter blocker if replay eligibility is in approved scope | `@fas/statistics` | High: existing cohort behavior |
| A private existing composition root under `apps/worker/` or `scripts/` | Inject repositories for explicit operator invocation | Application composition | High: accidental public/automatic intake |
| `docs/PROJECT_STATE.md` and an implementation completion report | Record completed evidence only after implementation validation | Governance | Low |

### MUST NOT CHANGE

| Path / area | Reason | Owner | Risk if changed |
|---|---|---|---|
| `packages/analysis/**` | Historical intake must not recreate Analysis, Features, Rules, Football State, Match Script or Projection | `@fas/analysis` | Retrospective prediction fabrication |
| `packages/feature/**`, `packages/rule/**` | Frozen upstream semantics | Feature / Rule | Model drift |
| `packages/provider-*/**` | Intake accepts artifacts; it does not acquire provider data | Providers | Provider coupling |
| `packages/evidence-normalizer/**` | No production Evidence semantics change is required for the bounded intake | Evidence normalization | Scope expansion |
| `packages/report/**` | Current Report path creates seals from current analysis and is the wrong historical boundary | `@fas/report` | Reconstruction |
| `apps/api/**` | No HTTP endpoint/DTO change in the first boundary | API | Public write surface |
| `apps/web/**` | No UI requirement in the first boundary | Web | Unsupported verification claims |
| `packages/database/prisma/schema.prisma`, migrations | JSONB is sufficient | `@fas/database` | Unnecessary schema change |
| New `packages/replay` package | Replay already belongs to existing Analysis/Statistics capabilities | N/A | New package/ownership conflict |
| New Engine or Case Engine | Not needed and not authorized | Architecture | Governance violation |
| Projection, Unified Matrix, Match Script, Calibration, Validation | Explicitly outside intake | Existing owners | Prediction/evaluation drift |
| `docs/40_PRODUCT_ROADMAP.md` and FIP protocol | Explicit stop boundary | Governance | Source-of-truth mutation |

## 13. Future test boundary

No tests were created by this review. A future authorized implementation must
cover at least the following.

### Temporal

- missing `analysisTime`;
- missing cutoff;
- missing `generatedAt`;
- timezone missing on any mandatory instant;
- `generatedAt == kickoff`;
- `generatedAt > kickoff`;
- `analysisTime >= kickoff`;
- FIP artifact with `analysisCutoff != analysisTime`;
- pre-FIP exception without an owning contract/version;
- semantically equal instants expressed with different offsets;
- Actual observation before kickoff.

### Identity

- `matchId` mismatch across seal, snapshot, Actual and sidecar;
- home/away reversed;
- competition id/name mismatch;
- kickoff mismatch;
- ambiguous fixture;
- whitespace-only normalization versus non-equivalent provider ids;
- same team names on distinct fixture ids.

### Seal

- missing original seal;
- original artifact checksum mismatch;
- projection checksum mismatch;
- checksum scope/algorithm missing;
- policy pin missing;
- projection model version missing;
- parameter artifact id/version/checksum inconsistency;
- retrospective/reconstructed artifact;
- report source that supplies no report checksum;
- mutation of content not covered by the claimed checksum.

### Actual

- missing result;
- unfinished result;
- invalid score/winner/total;
- unverified MATCH_RESULT Evidence;
- rejected Evidence;
- result identity mismatch;
- observation before kickoff;
- missing Evidence id/source reference;
- verification ref that cannot be resolved.

### Evaluation

- valid seal plus valid verified Actual;
- blocked intake writes neither History nor Sidecar;
- repeated identical command is idempotent;
- repeat with a different `intakeRecordedAt` remains idempotent;
- same deterministic id with different canonical content conflicts;
- evaluator exclusion cannot be stored as scored History;
- repository failure does not report success.

### Replay

- missing context;
- incomplete context;
- authentic complete context;
- sidecar checksum mismatch;
- unsupported sidecar schema;
- unpinned parameter artifact blocks replay;
- sidecar generated after kickoff;
- sidecar not bound to original seal;
- no current-runtime Feature/Rule reconstruction;
- no prediction generation from historical Actual.

### Legacy

- existing `evaluation-history.mvp.a15` remains readable from memory and Prisma;
- a15 History is never marked intake-verified;
- new variant round-trips without losing manifest/schema version;
- unsupported JSON variant fails explicitly rather than disappearing;
- Calibration/Validation/Contribution continue reading common fields.

## 14. Hidden risks

### Hidden Risks

| Severity | Risk and evidence | Impact | Recommended mitigation |
|---|---|---|---|
| **Critical** | No authentic seal or controlled pre-match seal fixture exists | Integrity behavior cannot be proven against its defining input | Identify and approve one qualifying immutable fixture before implementation |
| **Critical** | Prisma revival discards stored schema version and unknown fields, then filters invalid records from queries | New intake rows could be written, read as legacy, lose manifest, or silently disappear | Version-discriminated decoder with explicit errors and round-trip tests |
| **High** | `evaluatePrediction` checksum includes caller-supplied `evaluatedAt`; History id includes that checksum | A retry at a new time can create a different id for the same seal/result | Define a stable evaluation timestamp or make historical idempotency key independent of evaluation execution time |
| **High** | Current History checksum is 32-bit FNV-style and covers selected fields only; Prisma content SHA-256 and sidecar SHA-256 use different scopes | “Checksum” may be incorrectly treated as one interchangeable integrity proof | Record checksum algorithm and canonical scope for every seal; use cryptographic content digest for original artifacts |
| **High** | Prisma stores `contentSha256` but read revival does not recompute/compare it | Database JSON corruption/tampering is not detected by the repository read path | Verify content SHA-256 before domain revival or document a governed alternative |
| **High** | Replay eligibility reports `PARAMETER_ARTIFACT_UNPINNED` but does not count it as a completeness blocker | A sidecar can be eligible while parameter provenance is unpinned | Add an intake-specific hard gate; separately review correction of the shared helper |
| **High** | MATCH_RESULT normalization is `unverified`, mapper ignores quality, and Actual drops Evidence identity/quality | Method strings could be mistaken for governed verification | Validate Evidence/ref before mapping and retain evidence id/source/checksum in manifest |
| **High** | `AnalysisReport` has `generatedAt` but no kickoff, full fixture tuple or report checksum; no durable report repository exists | A report object can be mislabeled as an immutable seal | Require an external canonical sealed wrapper and storage provenance |
| **Medium** | `createMatchId` trims only; provider namespaces and fixture aliases are otherwise opaque strings | Two ids for one fixture or one reused id can defeat simplistic equality assumptions | Require approved canonical source id and exact cross-artifact equality; never name-match |
| **Medium** | Kickoff identity may use exact source strings while temporal rules compare instants | Equivalent offsets can falsely mismatch, or normalization can erase source evidence | Preserve original representation, normalize only for instant comparison, define exact identity policy |
| **Medium** | `seasonFromMatchDate` derives UTC calendar year when season is absent | Cross-year football seasons can be mislabeled | Require explicit season from trusted fixture identity for historical intake |
| **Medium** | In-memory repository stores object references, whereas Prisma serializes/revives JSON | Adapter behavior can diverge for nested freezing, unknown fields and invalid records | Shared repository contract tests for both adapters |
| **Medium** | Existing GET API returns domain records directly | New additive fields may become an undocumented observable API change | Keep first intake private; document/version public exposure separately |
| **Medium** | Parameter artifact creator validates non-empty supplied checksum but does not universally prove an incoming artifact checksum was recomputed | A claimed parameter checksum can be present but unauthenticated | Resolve approved artifact by id/version and recompute canonical payload checksum |
| **Low** | Web DTO ignores `schemaVersion`, checksum and manifest | UI can render a row without showing its verification class | Do not claim UI verification; add display only in a separately approved scope |

## 15. Final Gate

### C. BLOCKED

The architecture and most implementation mechanics are viable, but
implementation approval must not proceed while the defining authenticity input
and test oracle are absent.

### 15.1 Blocking Conditions

1. **No approved authentic source artifact class.** The repository has no
   current artifact satisfying all required original-seal properties.
2. **No controlled repository-backed pre-kickoff seal fixture.**
   `CONTROLLED_PREMATCH_SEAL_FIXTURE = NOT AVAILABLE`.
3. **No verified Actual fixture.** Existing outcome-only samples are not typed,
   durable `quality: "verified"` MATCH_RESULT Evidence or governed verification
   references.
4. **History variant round-trip is not currently possible.** Domain and Prisma
   decoder changes are mandatory and must be explicitly included in the
   implementation scope.
5. **Idempotency semantics are unresolved.** The current evaluation checksum/id
   changes with `evaluatedAt`; the historical id key must be defined before
   coding.
6. **Replay parameter gate is weaker than planning assumes.** Unpinned parameter
   provenance is not currently a completeness blocker.

### 15.2 Non-Blocking Conditions

- No Prisma migration is needed.
- No new HTTP endpoint is needed.
- No new package or Engine is needed.
- `@fas/statistics` is the correct owner.
- `SealedPredictionInput`, `evaluatePrediction`, repository ports and FT metrics
  are reusable.
- Existing UI may ignore the additive manifest during the private first
  boundary.
- Replay may legitimately remain blocked after a valid FT Evaluation.

### 15.3 Required Human Decisions

1. Select and approve the qualifying original-seal source class and storage
   authority.
2. Approve a concrete controlled fixture with truthful provenance; decide
   whether it is an authentic category-A artifact or only a controlled
   category-B conformance fixture. It must never be mislabeled.
3. Approve the Actual verification authority and the durable verification
   reference/checksum contract.
4. Approve the canonical checksum algorithms/scopes for full seal, projection,
   History manifest and optional sidecar.
5. Approve deterministic idempotency semantics, especially the role of
   `evaluatedAt` and `intakeRecordedAt`.
6. Decide whether replay eligibility correction is included in the bounded
   implementation or historical intake imposes a stricter independent gate.
7. Confirm the minimum future file boundary, including mandatory
   `@fas/database` decoder work but excluding Prisma schema/API/Analysis.

### 15.4 Smallest Next Step

Conduct one focused, read-only human artifact-admission review:

1. nominate one actual immutable pre-kickoff seal candidate;
2. provide its canonical bytes/schema, fixture tuple, generation/cutoff times,
   checksum algorithm/scope and immutable storage provenance;
3. nominate one verified MATCH_RESULT Evidence/ref for the same fixture;
4. decide the deterministic idempotency key;
5. record approval or rejection.

If no such artifact exists, first create a prospective sealing/export process
for a future fixture under a separately approved task, then wait until that
artifact genuinely predates kickoff. Do not reconstruct an old prediction.

Only after those conditions are evidenced should a production implementation
gate be reconsidered.

## 16. Stop confirmation

This review:

- changed no production code, Prisma schema, migration, API, Provider,
  Projection, Feature, Rule, Match Script, Unified Matrix, Calibration or
  Validation;
- created no prediction, Historical History, Sidecar, Case or fixture;
- imported no historical data and ran no historical analysis/replay;
- changed neither `docs/40_PRODUCT_ROADMAP.md` nor the canonical FIP protocol;
- did not start PVS-3.4 or FIP-2 P1/P2/P3/P4.
