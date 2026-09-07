# Authentic PRE_MATCH Prediction Seal Capture & Storage Authority — Planning / Gate

## 0. Status and authority

| Field | Value |
|---|---|
| Status | **PLANNING / GATE RECONCILED — IMPLEMENTATION NOT STARTED** |
| Date | 2026-09-06; reconciliation same day |
| Human capture decisions | Frozen in §19 (Prisma table, auto-capture, Class A only after durable write) |
| Delivery type | Governance / planning / gate only; no production code |
| Track | `PREDICTION_VERTICAL_SLICE` |
| Roadmap references | `docs/40_PRODUCT_ROADMAP.md` Sprint **A1** (sealed projection existence). This is **not** Historical Evaluation Intake implementation, not Sprint **C1**, not Match Center **C.1**. |
| Architecture Freeze | v0.3, unchanged |
| Canonical Agent protocol | `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md`, unchanged |
| Prior document | `HISTORICAL_EVALUATION_INTAKE_IMPLEMENTATION_PLANNING_FINAL_GATE.md` (**B. BLOCKED**) |
| Implementation authorization | **None** |

This document answers how FAS can create and durably preserve an original
PRE_MATCH prediction seal **before kickoff**, so a later Historical Evaluation
Intake can authenticate it without reconstruction.

It does **not** implement seal capture, Historical Intake, Calibration
membership, or Class A admission of any existing artifact.

## 1. Why this gate exists

Historical Evaluation Intake remains **C. BLOCKED** because:

```text
AUTHENTIC ORIGINAL PRE_MATCH PREDICTION SEAL = NOT FOUND
AUTHENTIC CLASS A SEAL + VERIFIED REAL-WORLD ACTUAL = NOT FOUND
```

The Class B controlled fixture must never be promoted. Rerunning today's
pipeline for an old match is reconstruction, not authenticity.

Intake authenticates a seal. This gate designs **seal creation**. Intake must
never create the seal.

## 0.1 Gate reconciliation freeze

This subsection is authoritative where later sections restated hashes or
lifecycle. It does not redesign architecture.

### Hash names (do not conflate)

| Name | Algorithm | Canonicalization | Includes `sealedAt`? | Purpose |
|---|---|---|---|---|
| `sealIdentityHash` | SHA-256 (64-char lowercase hex) | `fas-json-canonical.v1` of `sealIdentity` | **No** | Deterministic `originalSealId`; retry identity |
| `contentSha256` | SHA-256 (64-char lowercase hex) | `fas-json-canonical.v1` of the persisted document minus this field | **Yes** | Authenticate the immutable stored seal; detect any mutation including `sealedAt` |

Do **not** use `sealPayloadChecksum` for either scope.

```text
originalSealId = "prematch-seal:" + matchId + ":" + sealIdentityHash
```

### Cutoff lifecycle (compatible with this repository)

```text
injected clock → freeze analysisTime
analysisCutoff = analysisTime
→ AnalyzeMatchUseCase.execute(matchId, { analysisTime, analysisCutoff })
     import (this request's Evidence.collectedAt must be ≤ analysisCutoff)
     query Evidence
     fail closed if any used Evidence.collectedAt > analysisCutoff
     fail closed if MATCH_RESULT / Actual present
     Feature → Rule → Projection → AnalysisResult
→ freeze sealedAt (injected clock; still < kickoff)
→ sealIdentityHash → originalSealId
→ contentSha256
→ durable postgres insert
→ only then Class A
```

`AnalyzeMatchUseCase.execute` today accepts **only** `matchId` and does not
implement cutoff. An additive orchestration contract is required. That is not
a Freeze / Roadmap / FIP rewrite.

## 2. Required distinctions

| Class | When | Owner of truth |
|---|---|---|
| A. Live prediction generation | Any analyze run | `AnalyzeMatchUseCase` → `AnalysisResult` |
| B. Authentic PRE_MATCH seal capture | Before kickoff, after projection is finalized | Future capture command + durable store |
| C. Class B conformance fixture | Tests only | `packages/statistics/test/fixtures/` |
| D. Historical Evaluation Intake | After seal **and** verified Actual exist | Future intake command |
| E. Replay | Optional original context | Sidecar; never an original seal |
| F. Evaluation History | After scored FT evaluation | A1.5 `evaluation-history.mvp.a15` |
| G. Calibration / Validation | Population overlays | Must not receive seals by default |
| H. Retrospective reconstruction | Forbidden | Fail closed |

## 3. Current production prediction flow

Verified runtime path (private API, no public auth):

```text
HTTP POST /api/analyze  (apps/api AnalysisController; team discovery)
  and/or
HTTP POST /api/v1/analyze (MatchAnalysisController; existing matchId)
  → GenerateMatchReportUseCase.execute
       → AnalyzeMatchUseCase.execute
            import Evidence
            FeatureExtractor.extractBundle
            RuleEvaluator.evaluate
            computeMatchProjection          ← final deterministic 1X2 / scorelines
            buildScenarioSet
            computeIntelligenceConfidence
            createAnalysisResult            ← projection + scenarios + confidence frozen
       → ReportBuilder.build
            buildSealedPredictionInput(analysis)   ← compact evaluation snapshot
            optional evaluatePrediction if MATCH_RESULT present
            local MVP narrative (inference; not projection)
            createAnalysisReport
       → optional Evaluation History + Replay Sidecar
            only when scored evaluation AND Actual exist
```

### 3.1 Who owns the final projection

`computeMatchProjection` inside `AnalyzeMatchUseCase`
(`packages/analysis/src/use-case/analyze-match-use-case.ts`).

The frozen in-memory artifact is **`AnalysisResult`**, whose `projection` is
`DeterministicMatchProjection` (includes `checksum`, model versions,
calibration refs, lambdas, 1X2, scorelines, goal range).

`buildSealedPredictionInput` maps that into **`SealedPredictionInput`** — the
minimum contract `evaluatePrediction` needs. It does not include narrative,
report prose, prompt, or full Feature/Rule/Football State snapshots.

### 3.2 Exact seal-capture seam

Two seams, not one:

1. **Information boundary (before analysis):** orchestrator freezes
   `analysisTime` / `analysisCutoff` from an injected clock and passes them
   into `AnalyzeMatchUseCase`. This instant is **not** invented after
   `AnalysisResult` exists.
2. **Cryptographic freeze (after analysis):** `AnalyzeMatchUseCase` returns
   `AnalysisResult`. Projection will not be recomputed for this identity.
   Then freeze `sealedAt`, hash, persist. Report, prompt, and narrative stay
   **after** this write attempt.

Today `AnalyzeMatchUseCase.execute(matchId)` has no cutoff argument.
`GenerateMatchReportUseCase.execute(matchId, options?)` has no clock.
`AnalysisResult` **does** retain `evidenceSet` (full `Evidence` records with
`collectedAt` / `eventTime` / `type`), so post-result capture can *audit*
cutoff, but cannot by itself prove analysis was *governed* under a cutoff
that did not exist at execute time. Therefore auto-capture requires the
additive execute contract in §9.

Do **not** seal:

- `AnalysisReport` as a whole
- MVP / LLM narrative
- Prompt composition
- Evaluation History (post-match)
- Replay sidecar as a substitute original prediction

Preferred sealed prediction payload: **`SealedPredictionInput`** plus
`sealIdentity` wrapper. Full `AnalysisResult` is too wide for Evaluation;
replay context remains a separate optional artifact.

## 4. Timestamp semantics (verified; do not inherit blindly)

| Name | Where it exists today | Actual meaning |
|---|---|---|
| `analysisTime` | FIP protocol only (Agent procedure). **No production domain field.** | FIP: capture from current clock before/at analysis; `analysisTime < kickoff`. |
| `analysisCutoff` | FIP §6 only. Analyze endpoints do **not** accept or validate it. | FIP: `analysisCutoff = analysisTime`. Observations must be available at or before cutoff. |
| `generatedAt` on `AnalysisResult` | `createAnalysisResult`; set to `latestEvaluationTime(ruleResults)` | Max `RuleResult.evaluatedAt`. Rules copy `latestGeneratedAt(features)`. Features from MATCH_INFO use `evidence.collectedAt`. **This is evidence-derived, not analysis-completion wall clock.** |
| `generatedAt` on `AnalysisReport` | Copied from `analysis.generatedAt` | Same evidence-derived instant. |
| History `recordedAt` | `persistAndLoadHistory` uses `analysis.generatedAt` | Same lineage. |
| A1 `evaluatedAt` | Report builder uses `analysis.generatedAt` | Same lineage. |
| Replay context `generatedAt` | Copied from analysis/replay context | Replay/execution time of that context, not a PRE_MATCH proof. |
| Kickoff | `MATCH_INFO.payload.kickoff`; Feature `kickoff`; Prisma `Match.kickoffAt`; optional `fixtureResolution.kickoff` | Fixture instant. Analyze HTTP does **not** currently fail closed on kickoff vs now. |
| FIP clock | Protocol JSON `analysisTime` | Not an API DTO. |

### 4.1 Is `generatedAt >= analysisTime` correct?

**Not if `generatedAt` means `AnalysisResult.generatedAt`.**

Repository evidence: MATCH_INFO features stamp `generatedAt: evidence.collectedAt`.
Rules and `AnalysisResult.generatedAt` propagate that lineage. Evidence is
normally **older** than the moment an Agent/API runs analysis. Then:

```text
AnalysisResult.generatedAt  ≤  FIP analysisTime   (typical)
```

The Historical Intake Final Gate's `generatedAt >= analysisTime` is valid
**only** when `generatedAt` means **seal/analysis-completion time**, not
`AnalysisResult.generatedAt`.

This is **not** a FIP defect. FIP already defines `analysisTime` as the clock
at analysis and states that analyze endpoints do not yet enforce cutoff.
Do not edit FIP to match `AnalysisResult.generatedAt`.

### 4.2 Corrected seal temporal contract

Introduce distinct fields. Do not overload `AnalysisResult.generatedAt`.

```text
analysisCutoff === analysisTime
every Evidence.collectedAt in AnalysisResult.evidenceSet  ≤  analysisCutoff
analysisTime  <  kickoff
sealedAt      >= analysisTime
sealedAt      <  kickoff
```

Capture answers (repository-grounded):

1. **When is `analysisTime` captured?** At orchestration start, from an
   injected clock, **before** `AnalyzeMatchUseCase.execute`. Not after
   `AnalysisResult`.
2. **Must it be captured before `AnalyzeMatchUseCase`?** **Yes**, for a
   governed PRE_MATCH analysis. Inventing it only at seal time would make
   cutoff an after-the-fact label.
3. **How is `analysisCutoff` enforced?** Frozen equal to `analysisTime`.
   Passed into `AnalyzeMatchUseCase`. After Evidence query (which is the set
   actually used: `extractBundle(evidenceSet)`), fail closed
   `EVIDENCE_AFTER_CUTOFF` if any `collectedAt > analysisCutoff`. Capture
   repeats the same audit on `AnalysisResult.evidenceSet`.
4. **Does `AnalyzeMatchUseCase` currently receive cutoff?** **No.**
5. **Does `AnalysisResult` retain which Evidence was used?** **Yes.**
   `evidenceSet` is the queried array passed to Feature/Rule/Projection
   counting. There is no hidden extra Evidence channel in this use case.
6. **If capture is only after `AnalysisResult`, can it prove no newer
   Evidence was used?** It can prove no newer Evidence is **in
   `evidenceSet`**. It cannot prove analysis was *restricted* by cutoff
   unless cutoff was supplied *during* execute (otherwise the run was
   ungoverened and Class A must not be claimed). Audit-after-the-fact is
   insufficient for auto-capture.
7. **Orchestration contract change required?** **Yes**, additive only:
   `execute(matchId, { analysisTime, analysisCutoff })` plus injected clock
   on `GenerateMatchReportUseCase`. Import for that request must stamp
   `Evidence.collectedAt` with an instant `≤ analysisCutoff` (same frozen
   `analysisTime` is the minimum; do not use a later `Date.now()`).
   Today's `ImportMatchUseCase` takes `collectedAt` only in the constructor
   (API default/hardcoded `2026-07-17T10:00:00Z` on the fixture path).
   Per-request `collectedAt` is therefore part of the same bounded change.
8. **Files:** see §14.

FIP vs code gap remains an unimplemented runtime gate, not a protocol rewrite.

## 5. Authentic PRE_MATCH seal contract

Independent schema (not History):

```text
schemaVersion = "prematch-prediction-seal.v1"
```

### 5.1 Identity

| Field | Rule |
|---|---|
| `originalSealId` | Deterministic; see §10. Distinct from `matchId` and History `historyId`. |
| `matchId` | Exact domain MatchId. No fuzzy names. |
| `homeTeam` / `awayTeam` | Exact strings from MATCH_INFO. Reversal is a different identity. |
| `competitionId` / `competitionName` / `season` | Required on the seal. |
| `kickoff` | Exact ISO-8601 from the fixture used at analysis. |
| `schemaVersion` | `prematch-prediction-seal.v1` only for first implementation. |

### 5.2 Authenticity classification (required on every production write)

```text
synthetic = false
historicalAuthenticity = true
provenanceClass = A
allowedUsage includes historical_evaluation_intake
sourceAuthority = prisma.prematch_prediction_seal_items
```

Automatic reject (never Class A):

- test / demo / Class B fixture
- memory-only repository writes (not a later intake source authority)
- replay output
- analysis at or after kickoff
- any MATCH_RESULT / FT Actual in the command
- reconstructed or backdated timestamps

### 5.3 Prediction payload

Seal `predictionSnapshot: SealedPredictionInput` produced by existing
`buildSealedPredictionInput(analysis)` after a successful `AnalyzeMatchUseCase`.

Do not duplicate full Evidence/Feature/Rule/Football State/Match Script/Matrix
into the seal. Those belong to an optional replay sidecar captured separately
and must not be required for seal creation.

Narrative / prompt are excluded.

### 5.4 Model / policy pins

Required on the seal:

- `featureModelVersion` (from `featureBundle`)
- `ruleSetVersion` — **actual evaluator version**, not a second literal
- `projectionModelVersion`
- `projectionPolicyPin` (already on analyze/report provenance; default `v2`)

`buildSealedPredictionInput` currently hardcodes
`ruleSetVersion: "rule.mvp.m1b.manager"`. The Rule evaluator uses the same
string as private `RULE_POLICY` in
`packages/rule/src/evaluation/rule-evaluator.ts` and does **not** export it.
A1 `evaluatePrediction` checksum does **not** include `ruleSetVersion`. A1.5
History checksum *does* include the snapshot's `ruleSetVersion`, but today's
literal already equals `RULE_POLICY`.

**Minimum implementation (no A1 checksum change, no a15 semantic change):**

1. Export `RULE_SET_VERSION` from `@fas/rule` with the current `RULE_POLICY`
   value (do not invent a new version string in this sprint).
2. Change `buildSealedPredictionInput` to assign
   `ruleSetVersion: RULE_SET_VERSION` from that export (delete the duplicate
   literal).
3. The Class A seal records `predictionSnapshot.ruleSetVersion` from that
   mapper. Do not add a second conflicting rule-set field.
4. Do not modify `evaluatePrediction` or `createEvaluationHistoryRecord` /
   `buildEvaluationHistoryRecord`.

If evaluator policy and the export ever diverge later, that is a separate
Rule-package change; capture must not invent a pin.

Parameter artifact:

- Production registry can pin
  (`getProductionProjectionParameterArtifact` / active artifact).
- If the run has a pin: store `artifactId`, `versionLabel`, checksum.
- If unpinned: **allow seal creation**; record absence; future replay
  `replayComplete` / intake replay eligibility stay false.
- **Do not fabricate a pin.**

Current parameter checksums are the same FNV-style `stableChecksum` as
projection. The seal wrapper uses SHA-256 (see §6). Nested FNV ids remain
references; they are not the authenticity digest.

### 5.5 Timestamp evidence on the seal

Required: `analysisTime`, `analysisCutoff`, `sealedAt`, `kickoff`.

Optional documented field: `analysisResultGeneratedAt` =
`AnalysisResult.generatedAt` for forensic correlation only. It is **not**
PRE_MATCH proof.

## 6. Checksum / canonicalization

Do not reuse A1 evaluation checksums. Do not import
`packages/statistics/test/helpers/canonical-json.ts`.

Both hashes use **SHA-256** and **`fas-json-canonical.v1`**. Nested
projection / parameter FNV `stableChecksum` values remain inner references
and are **not** renamed.

### 6.1 `sealIdentity` (input to `sealIdentityHash`)

Canonical object keys (absent properties omitted):

```text
schemaVersion
matchId
homeTeam
awayTeam
competitionId
competitionName
season
kickoff
analysisTime
analysisCutoff
predictionSnapshot          // SealedPredictionInput including nested FNV projectionChecksum
featureModelVersion
ruleSetVersion
projectionModelVersion
projectionPolicyPin
parameterArtifactId?        // omit if unpinned; do not fabricate
parameterVersionLabel?
parameterArtifactChecksum?
synthetic
historicalAuthenticity
provenanceClass
allowedUsage
sourceAuthority
```

Must **not** include `sealedAt`, `contentSha256`, or `originalSealId`.

```text
sealIdentityHash = SHA-256( fas-json-canonical.v1(sealIdentity) )
originalSealId   = "prematch-seal:" + matchId + ":" + sealIdentityHash
```

### 6.2 Persisted document and `contentSha256`

Stored JSON (and `recordJson`):

```text
schemaVersion
originalSealId
sealedAt
sealIdentity
contentSha256          // excluded from the bytes that are hashed
```

```text
contentSha256 = SHA-256( fas-json-canonical.v1({
  schemaVersion, originalSealId, sealedAt, sealIdentity
}) )
```

Any mutation of `sealedAt` or `sealIdentity` changes `contentSha256`.
Retries that only get a later clock must **not** recompute a new identity;
they load the existing row by `originalSealId` (see §10).

Canonicalization rules unchanged: UTF-8, sorted object keys, array order
preserved, finite numbers, `null` emitted, absent omitted, duplicate keys
rejected, timestamps as stored ISO strings, no `undefined` / `NaN` /
`Infinity` / bigint.

Production module: `packages/statistics/src/seal/canonical-json.ts`.

## 7. Storage authority — main gate

### 7.1 Options evaluated

| Option | Write before kickoff? | Exact recover? | Immutable? | Prisma migration? | Verdict |
|---|---|---|---|---|---|
| A1.5 `evaluation_history_items` | No (requires scored Actual) | Would mix post-match History | Unique `historyId` but wrong lifecycle | No | **Reject** |
| Replay sidecar table | No (FK to History) | Replay ≠ original prediction | Linked to History | No | **Reject** |
| `evidence_items` / `source_records` | Would mix prediction into facts | Wrong epistemic class | Overwrite/versioning is Evidence-shaped | No | **Reject** |
| `Match` row columns | Could stamp cutoff | Cannot store prediction payload | `updatedAt` / `rowVersion` are mutable | Maybe | **Reject** |
| Browser `fas.analysis-history` | Yes locally | Metadata only; mutable | No | No | **Reject** (admission already: not Class A) |
| Git / fixture JSON as “production” | N/A | Review-time only | Not runtime | No | **Reject** |
| External object store / Redis | Not in repo | Would add infrastructure | Unknown | Extra | **Reject** (Freeze / AGENTS) |
| **New append-only Prisma table** | Yes, when postgres mode | Full `record_json` | Unique id + checksum conflict | **Yes** | **Select** |

No current table is a sufficient authentic-seal store. The **minimum
repository-consistent** authority is a new append-only Prisma model in
`@fas/database`, following `EvaluationHistoryItem` (`recordJson` +
`contentSha256` + unique business id). This is not a new Engine, package, or
infrastructure product.

### 7.2 Selected authority

**A. Approved minimum storage authority (planning freeze):**

```text
Prisma model: PrematchPredictionSealItem
table:        prematch_prediction_seal_items
package:      @fas/database (Prisma owned only here)
```

Proposed columns (planning, not a migration in this task):

- `id` UUID
- `originalSealId` unique
- `matchId`
- `homeTeam` / `awayTeam`
- `competitionId` / season / `kickoffAt`
- `schemaVersion`
- `sealedAt`
- `contentSha256` (64 hex; seal authenticity digest)
- `recordJson` JSONB (full seal including nested snapshot)
- `createdAt` DB insert time (forensic; **not** authenticity)

Properties:

1. Can write before kickoff (application gate, not SQL).
2. Later read does not recompute projection.
3. Exact payload in `recordJson`.
4. Overwrite: **no update API**. Insert-only.
5. Mutation: second insert same id + different checksum → conflict error.
6. Immutable identity: `originalSealId`.
7. `schemaVersion` preserved in JSON and column.
8. Seal checksum in `contentSha256` and JSON.
9. Original `sealedAt` in JSON and column.
10. Retry same checksum → return existing row (History `save` pattern).
11. Conflicting checksum → fail closed.
12. Classification fields distinguish production vs test; memory adapter is
    not Class A source authority.
13. Historical Intake authenticates `sourceAuthority` + checksum + times.
14. **Prisma migration required** for this table.
15. Architecture Freeze: consistent with existing database-package ownership.

Memory repository: tests only. Later intake must not treat memory as Class A
storage.

Default API Evidence mode remains memory unless `platformPersistence`.
A prediction **MUST NOT** be classified as authentic Class A unless the
durable postgres `PrematchPredictionSealItem` write succeeds. Memory adapter
writes are test-only and never Class A. Analysis/report HTTP error policy on
persistence failure is separate; Class A classification is fail-closed.

## 8. Seal creation authority

| Candidate | Verdict |
|---|---|
| Historical Intake command | **Forbidden** — authenticates only |
| `@fas/statistics` domain + repository + capture function | **Owner of seal contract and persistence port** |
| `AnalyzeMatchUseCase` | Supplies `AnalysisResult`; must not persist seals itself (keeps Analysis free of Prisma) |
| `GenerateMatchReportUseCase` | **Approved auto-capture orchestrator:** freeze cutoff, pass into analyze, persist seal after `AnalysisResult` and **before** `ReportBuilder.build` |
| API controller | Transport only; no new public historical-intake HTTP |
| Database adapter | Implements port; does not decide PRE_MATCH policy |
| New Engine / package | **Forbidden** |

Capture command rules:

- PRE_MATCH only (`sealedAt < kickoff`, `analysisTime < kickoff`)
- Deterministic snapshot from already-computed `AnalysisResult`
- Exact fixture identity from MATCH_INFO (not fuzzy)
- Injected clock; no `Date.now()` in domain
- Idempotent save
- No retrospective mode flag
- No Actual / MATCH_RESULT input
- No post-match Evidence in the analysis evidence set
- No Class B promotion

## 9. Lifecycle

```text
PRE_MATCH
  injected clock → analysisTime
  analysisCutoff = analysisTime
  → AnalyzeMatchUseCase (governed under cutoff)
  → AnalysisResult
  → injected clock → sealedAt
  → sealIdentityHash → originalSealId
  → contentSha256
  → postgres insert (Class A only if this succeeds)
  → ReportBuilder.build (narrative / optional A1 overlay)

POST_MATCH (separate future sprint; still UNAUTHORIZED)
  verified real-world Actual
  → Historical Intake authenticates existing originalSealId + contentSha256
  → evaluatePrediction
  → Evaluation History (historical-intake variant)
```

`sealedAt` ≠ `historicalIntakeRecordedAt`. Intake time never proves
pre-kickoff existence.

Cutoff enforcement seam (exact):

```text
GenerateMatchReportUseCase.execute
  clock.now() → analysisTime / analysisCutoff
  → AnalyzeMatchUseCase.execute(matchId, { analysisTime, analysisCutoff })
       ImportMatchUseCase.execute(matchId, { collectedAt: analysisTime })
       evidenceQuery.findByMatch
       assert every evidence.collectedAt <= analysisCutoff
       assert no MATCH_RESULT
       assert analysisTime < MATCH_INFO.kickoff
       extractBundle(evidenceSet) … createAnalysisResult(evidenceSet)
  → clock.now() → sealedAt
  → capture-prematch-prediction-seal (postgres)
  → ReportBuilder.build
```

## 10. Idempotency and multiple seals

```text
originalSealId =
  "prematch-seal:" + matchId + ":" + sealIdentityHash
```

`sealIdentityHash` **excludes** `sealedAt`. `contentSha256` **includes**
`sealedAt`.

Save algorithm:

1. Compute `sealIdentityHash` / `originalSealId` from incoming `sealIdentity`.
2. If no row: persist with `sealedAt` + `contentSha256`; return that row.
3. If row exists and stored `sealIdentity` canonical-equals incoming:
   return the **existing** row (keep first `sealedAt` and `contentSha256`).
   This is an exact retry even if the caller’s clock produced a later
   `sealedAt`.
4. If row exists and stored `sealIdentity` differs: `SEAL_IDENTITY_CONFLICT`.
   Never overwrite.

- Same match, later legitimate PRE_MATCH re-analysis (new snapshot and/or new
  `analysisTime`): new `sealIdentityHash` → new `originalSealId`. Multiple
  authentic seals per match are **approved**.
- Seal at/after kickoff: `SEAL_NOT_PRE_MATCH`.
- Competing writers: unique `originalSealId` plus steps 3–4.

Do not collapse distinct seals because 1X2 numbers match.
Do not treat “same `originalSealId`, different `contentSha256` because
`sealedAt` changed” as a conflict; that is retry.

## 11. Reschedule / fixture change

Never mutate an old seal's kickoff.

| Event | Behavior |
|---|---|
| Kickoff changes before any seal | New analysis uses new kickoff; no supersession |
| Kickoff changes after seal, before start | Old seal **preserved** with original kickoff. New PRE_MATCH analysis may write a **new** seal. Optional `supersedesSealId` on the **new** row only. |
| Postponed | Existing seals remain. No intake until a later FINISHED Actual. |
| Abandoned / canceled | Seals remain. Intake stays blocked without verified FT Actual. |
| Provider fixture identity correction (new matchId) | New matchId → new seals. Old seals stay on old matchId. |
| Home/away correction | New orientation → new seal. Old seal remains; later Actual with corrected orientation will not match the old seal. |

A kickoff change **does not rewrite** the old seal. Later admission compares
the seal's embedded kickoff/identity to the Actual's fixture. Mismatch fails
intake; it does not edit the seal.

Which seal may be admitted: the Class A seal whose fixture identity matches
the verified Actual, after a separate Artifact Admission review. Not “latest
row wins” automatically.

## 12. Retrospective reconstruction — fail closed

| Failure code | Trigger |
|---|---|
| `SEAL_NOT_PRE_MATCH` | `sealedAt >= kickoff` or `analysisTime >= kickoff` |
| `INVALID_ANALYSIS_CUTOFF` | cutoff ≠ analysisTime |
| `EVIDENCE_AFTER_CUTOFF` | Any `AnalysisResult.evidenceSet` `collectedAt` > `analysisCutoff` |
| `POST_MATCH_EVIDENCE` | MATCH_RESULT or other post-kickoff Evidence in inputs |
| `ACTUAL_FORBIDDEN` | Actual supplied to capture |
| `RETROSPECTIVE_RECONSTRUCTION` | Explicit reconstruct/backfill/backdate mode |
| `REPLAY_NOT_ORIGINAL_SEAL` | Replay output offered as Class A |
| `SYNTHETIC_FIXTURE_REJECTED` | Class B / demo / test classification |
| `UNTRUSTED_SOURCE_AUTHORITY` | Git, browser storage, chat, memory-as-production |
| `TIMESTAMP_INFERRED` | Missing times; attempt to use Git/mtime |
| `FIXTURE_IDENTITY_MISMATCH` | matchId / teams / competition / season disagree |
| `HOME_AWAY_ORIENTATION_MISMATCH` | Reversed teams |
| `UNSUPPORTED_SEAL_SCHEMA_VERSION` | Not `prematch-prediction-seal.v1` |
| `UNSUPPORTED_CHECKSUM_ALGORITHM` | Not sha256 for seal digest |
| `UNSUPPORTED_CANONICALIZATION` | Not `fas-json-canonical.v1` |
| `INVALID_SEAL_CHECKSUM` | Tamper / mismatch |
| `MISSING_MODEL_VERSION` | Required pin absent |
| `SEAL_IDENTITY_CONFLICT` | Same id, different checksum |

## 13. Trust model (minimum)

- Trusted creator: private composition-root capture command after
  `AnalyzeMatchUseCase`, using injected clock and MATCH_INFO kickoff.
- Trusted store: postgres `PrematchPredictionSealItem` via `@fas/database`.
- Authenticated by checksum: canonical `sealPayload` (identity, class, times,
  snapshot, pins).
- Mutable: **nothing on the seal document**. DB `createdAt` is insert audit
  only.
- Silent overwrite: prevented by insert-only + unique id + checksum compare.
- Intake tamper detection: recompute SHA-256; mismatch → reject.
- Missing provenance / unknown source: fail closed, not “unverified Class A”.

V1 remains a trusted private environment. This is not a public signing /
WORM product. Checksum + append-only + classification is the minimum.

## 14. File boundary (future implementation; not this task)

### MODIFY (authorized implementation sprint)

| File | Why |
|---|---|
| `packages/database/prisma/schema.prisma` | New append-only `PrematchPredictionSealItem` |
| `packages/statistics/src/index.ts` | Export seal contract / port / capture |
| `packages/database/src/index.ts` (or equivalent barrel) | Prisma seal adapter export |
| `packages/analysis/src/use-case/analyze-match-use-case.ts` | Additive `execute(matchId, { analysisTime, analysisCutoff })`; cutoff / MATCH_RESULT fail-closed on `evidenceSet` |
| `packages/report/src/use-case/generate-match-report-use-case.ts` | Injected clock; freeze cutoff; call analyze with cutoff; auto-capture **after** `AnalysisResult` and **before** `ReportBuilder.build`; Class A only if postgres save succeeds |
| `packages/application/src/import-match-use-case.ts` | Per-request `collectedAt` aligned to frozen `analysisTime` (constructor-only stamp is insufficient) |
| `packages/analysis/src/evaluation/build-sealed-prediction-input.ts` | `ruleSetVersion` from exported `@fas/rule` constant |
| `packages/rule/src/evaluation/rule-evaluator.ts` and `packages/rule/src/index.ts` | Export `RULE_SET_VERSION` equal to current `RULE_POLICY` |
| `apps/api/src/evidence.module.ts` (composition) | Wire postgres seal repository + clock; no new public Intake HTTP |

### ADD

| File | Why |
|---|---|
| `packages/statistics/src/domain/prematch-prediction-seal.ts` | Seal types, classification, errors |
| `packages/statistics/src/seal/canonical-json.ts` | Production canonicalization |
| `packages/statistics/src/seal/create-prematch-prediction-seal.ts` | Pure validate + checksum |
| `packages/statistics/src/seal/capture-prematch-prediction-seal.ts` | Command: gates + save |
| `packages/statistics/src/repository/prematch-prediction-seal-repository.ts` | Port |
| `packages/statistics/src/repository/in-memory-prematch-prediction-seal-repository.ts` | Tests only |
| `packages/database/src/prisma-prematch-prediction-seal-repository.ts` | Durable adapter |
| Prisma migration generated by Prisma CLI (not hand-edited lock/SQL) | Table |

### TEST ONLY

- `packages/statistics/test/prematch-prediction-seal-capture.spec.ts` — matrix §16
- `packages/database/test/prisma-prematch-prediction-seal.spec.ts` — round-trip, conflict
- Class B fixture files: **reject** input only

### MUST NOT TOUCH

- Projection / Match Script / Unified Matrix / Feature / Rule **math**
- `evaluatePrediction` checksum formula
- `evaluation-history.mvp.a15` builder semantics
- Canonical FIP protocol
- Product Roadmap
- Architecture Freeze documents / new Engine / new package
- Calibration / Validation / Contribution population logic
- Case Engine
- Class B fixture contents (no promotion)
- Historical Intake production implementation
- Web UI / new public intake HTTP
- `packages/statistics/test/helpers/canonical-json.ts` as production import

**Prisma migration: required** for the selected storage authority. Not in
this planning task.

## 15. Acceptance test matrix

| ID | INPUT | EXPECTED | FAILURE CODE | WHY |
|---|---|---|---|---|
| T01 | Valid PRE_MATCH AnalysisResult; injected clock `<` kickoff; no Actual | Seal persisted; Class A fields; SHA-256 matches | — | Happy path |
| T02 | Exact retry (same `sealIdentity`, later caller `sealedAt`) | Same `originalSealId`; row count 1; first `sealedAt` and `contentSha256` kept | — | Identity hash excludes `sealedAt` |
| T03 | Same `originalSealId` attempted with different `sealIdentity` | Reject; original JSON unchanged | `SEAL_IDENTITY_CONFLICT` | Tamper / race |
| T04 | Same match, new analysisTime or new snapshot | Second distinct `originalSealId` | — | Re-analysis |
| T05 | `sealedAt === kickoff` | Reject | `SEAL_NOT_PRE_MATCH` | Inclusive kickoff |
| T06 | `sealedAt > kickoff` | Reject | `SEAL_NOT_PRE_MATCH` | Post-match |
| T07 | `analysisTime >= kickoff` | Reject | `SEAL_NOT_PRE_MATCH` | FIP |
| T08 | cutoff ≠ analysisTime | Reject | `INVALID_ANALYSIS_CUTOFF` | FIP |
| T09 | MATCH_RESULT in evidenceSet | Reject | `POST_MATCH_EVIDENCE` | Leakage |
| T10 | Snapshot matchId ≠ MATCH_INFO matchId | Reject | `FIXTURE_IDENTITY_MISMATCH` | Binding |
| T11 | Swapped home/away | Reject | `HOME_AWAY_ORIENTATION_MISMATCH` | Orientation |
| T12 | Competition/season disagree | Reject | `FIXTURE_IDENTITY_MISMATCH` | Binding |
| T13 | `schemaVersion` other | Reject | `UNSUPPORTED_SEAL_SCHEMA_VERSION` | Version |
| T14 | Seal algorithm not sha256 | Reject | `UNSUPPORTED_CHECKSUM_ALGORITHM` | Integrity |
| T15 | Canonicalization not v1 | Reject | `UNSUPPORTED_CANONICALIZATION` | Integrity |
| T16 | Stored `contentSha256` ≠ recompute over `{ schemaVersion, originalSealId, sealedAt, sealIdentity }` | Reject on read/auth | `INVALID_SEAL_CHECKSUM` | Tamper including `sealedAt` |
| T17 | Missing projection/feature/rule version | Reject | `MISSING_MODEL_VERSION` | Pin |
| T18 | sourceAuthority=git/browser/chat | Reject | `UNTRUSTED_SOURCE_AUTHORITY` | Provenance |
| T19 | Class B fixture as capture input | Reject | `SYNTHETIC_FIXTURE_REJECTED` | Isolation |
| T20 | Demo `EVALUATION_POPULATION_DEMO_V1` | Reject Class A | `SYNTHETIC_FIXTURE_REJECTED` | Demo |
| T21 | Replay port output as original | Reject | `REPLAY_NOT_ORIGINAL_SEAL` | Replay |
| T22 | Backdated timestamps / reconstruct flag | Reject | `RETROSPECTIVE_RECONSTRUCTION` | Reconstruction |
| T23 | Actual in capture command | Reject | `ACTUAL_FORBIDDEN` | Lifecycle |
| T24 | Prisma round-trip | Exact `recordJson` | — | Durability |
| T25 | Reload process; read seal | No `AnalyzeMatch` recompute | — | Persistence |
| T26 | Concurrent different checksum same id | One winner; other conflict | `SEAL_IDENTITY_CONFLICT` | Writers |
| T27 | Kickoff moved later; new analysis | Old seal intact; new seal optional | — | Reschedule |
| T28 | Attempt UPDATE kickoff on old row | No update path; old JSON unchanged | — | Immutability |
| T29 | In-place JSON kickoff edit | Checksum fail on auth | `INVALID_SEAL_CHECKSUM` | Mutation |
| T30 | Hypothetical intake authenticator | Reads store; does not call Analysis | — | Separation |
| T31 | Evidence in `evidenceSet` with `collectedAt` after cutoff | Analyze and/or capture reject; no Class A | `EVIDENCE_AFTER_CUTOFF` | Cutoff governance |
| T32 | Postgres seal write fails | Report path may still error per app policy; **no** Class A classification | durable-write fail-closed | Human decision 6 |
| T33 | `ruleSetVersion` on seal | Equals exported `RULE_SET_VERSION` / `RULE_POLICY`; not a third literal | — | Provenance |

## 16. Governance compatibility

| Surface | Change required? |
|---|---|
| Product Roadmap | **No** (A1 sequencing only) |
| Architecture Freeze | **No** (database package already owns Prisma) |
| Seven engines | **No** |
| Canonical FIP | **No** (runtime still unimplemented; do not rewrite protocol) |
| Historical Intake contract | **Aligned**: intake remains authenticator; `predictionGeneratedAt` maps to `sealedAt` |
| A1 evaluation checksums | **No** |
| A1.5 History semantics | **No** |
| Projection / Match Script / Matrix | **No** |
| Calibration / Validation | **No** membership |

No GOVERNANCE CONFLICT / BLOCKER against Freeze, Roadmap, or FIP. The
`generatedAt >= analysisTime` intake wording must be interpreted as **seal
`sealedAt`**, not `AnalysisResult.generatedAt`, when Intake is later
implemented.

## 17. Remaining risks

- Additive analyze/import execute signatures change composition wiring.
- Live import that stamps `collectedAt` after the frozen cutoff will fail
  closed (`EVIDENCE_AFTER_CUTOFF`); per-request `collectedAt = analysisTime`
  is required for auto-capture to succeed.
- Nested projection checksums remain FNV; seal authenticity is SHA-256.
- Multiple seals per match increase later admission complexity.
- This gate does **not** create any Class A artifact.

## 18. Final Gate recommendation

# A. READY FOR AUTHENTIC PRE_MATCH SEAL CAPTURE IMPLEMENTATION

Implementation authorization conditions (all required):

1. Sprint cites roadmap **A1** and this document; it is **not** Historical
   Intake implementation and **not** C1.
2. Prisma append-only `PrematchPredictionSealItem` + generated migration.
3. Hashes implemented as §0.1 / §6 (`sealIdentityHash` ≠ `contentSha256`).
4. Cutoff frozen **before** `AnalyzeMatchUseCase`; `sealedAt` after
   `AnalysisResult`; auto-capture before `ReportBuilder.build`.
5. Class A only after durable postgres write succeeds.
6. `ruleSetVersion` from exported `@fas/rule` constant via
   `buildSealedPredictionInput`.
7. No A1 evaluation checksum change; no a15 History semantic change.
8. `historical_evaluation_intake` remains **C_BLOCKED**;
   `production_historical_intake_authorized` remains **false**.
9. No fake Class A, no Class B promotion, no old-match backfill.

This does **not** mean Intake is authorized, artifacts are admitted, or
Calibration may consume seals.

## 19. Human decisions (frozen)

1. Storage authority: **APPROVED** — Prisma append-only
   `PrematchPredictionSealItem`.
2. Prisma migration: **APPROVED** for that table only.
3. Multiple authentic PRE_MATCH seals per match: **APPROVED**.
4. Unpinned parameter artifact: seal **may** be created; replay remains
   incomplete/ineligible; **do not fabricate a pin**.
5. Auto-capture: **APPROVED** at the post-`AnalysisResult` /
   pre-report-or-narrative seam, **provided** `analysisTime` / cutoff were
   established before analysis.
6. Durable storage: a prediction **MUST NOT** be Class A unless the postgres
   seal write succeeds. Analysis/report error mapping may be separate.
7. Historical Evaluation Intake: **REMAINS BLOCKED AND UNAUTHORIZED**.

## 20. Proposed PROJECT_STATE handoff (after this document)

```yaml
current_track: PREDICTION_VERTICAL_SLICE
current_stage: AUTHENTIC_PREMATCH_SEAL_CAPTURE_PLANNING_GATE_COMPLETED
current_gate: AUTHENTIC_PREMATCH_SEAL_CAPTURE_IMPLEMENTATION_AUTHORIZATION
historical_evaluation_intake: C_BLOCKED
authentic_prematch_seal: NOT_FOUND
authentic_seal_plus_verified_real_world_actual: NOT_FOUND
controlled_prematch_fixture: IMPLEMENTED_AND_VALIDATED
controlled_fixture_classification: B_CONTROLLED_SYNTHETIC
production_historical_intake_authorized: false
next_action: HUMAN_REVIEW_OF_AUTHENTIC_PREMATCH_SEAL_CAPTURE_GATE
next_production_capability: AUTHENTIC_PREMATCH_SEAL_CAPTURE
```

Historical Intake stays blocked until a real Class A seal exists, a verified
real-world Actual exists, and a separate Artifact Admission review passes.

## 21. Next implementation MUST NOT

- Implement Historical Evaluation Intake
- Set `production_historical_intake_authorized = true`
- Create a fake Class A artifact or promote Class B
- Backfill old matches / rerun today's model as historical prediction
- Derive a seal from Actual or replay
- Change A1 checksums or a15 History
- Add Calibration/Validation membership
- Add public historical-intake HTTP or UI
- Add an Engine or numbered architecture document
- Modify Product Roadmap or FIP
- Use Git/mtime as authenticity
- Import `packages/statistics/test/**` from production `src`
- Overwrite seals or edit kickoff in place

## 22. Stop

Planning / Gate only. No production code. No migration. No sprint start.
