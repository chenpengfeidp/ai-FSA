# Analysis Pipeline V2 — Deterministic Orchestration Design

## 1. Document Status

| Field | Value |
|---|---|
| Status | Design only — not implemented |
| Kind | Future pipeline / orchestration planning artifact |
| Authority | Non-authoritative relative to `docs/00_PROJECT_BIBLE.md`, ADRs, and owning numbered contracts (`02`, `04`, `07`, `17`, etc.), including existing [17_ANALYSIS_PIPELINE](./17_ANALYSIS_PIPELINE.md) |
| Companion documents | Complements [30_RULE_ENGINE_V2](./30_RULE_ENGINE_V2.md), [31_PREDICTION_ENGINE_V2](./31_PREDICTION_ENGINE_V2.md), and [32_REPORT_ENGINE_V2](./32_REPORT_ENGINE_V2.md); does **not** replace or supersede them |
| Implementation | Forbidden by this task; no code, APIs, databases, schemas, schedulers, queues, UI, or runtime changes are implied |
| Governance / architecture | This file does not amend the Project Bible, ADRs, architecture documents, or governance workflow |

This document designs **Analysis Pipeline V2**: the orchestration contract that sequences deterministic stages from a user analysis request to a sealed Analysis Report, and onward to workspace, library, and replay consumers.

### Non-authoritative notice

This file is a planning artifact. It must not be treated as an implementation gate, an override of V1 pipeline authority, or permission to change engines, APIs, or persistence. Adoption requires a separate authorization that updates owning canonical documents when needed.

### Place in the V2 design set

```text
30_RULE_ENGINE_V2.md       → feature & rule computation (owned algorithms)
31_PREDICTION_ENGINE_V2.md → projection computation (owned algorithms)
32_REPORT_ENGINE_V2.md     → report assembly (owned composition)
33_ANALYSIS_PIPELINE_V2.md → orchestration between stages (this document)
```

Pipeline V2 answers:

> What happens from the moment a user requests an analysis until a sealed report is produced — and how is that result replayed without drift?

It does **not** redefine algorithms already owned by Rule, Prediction, or Report Engine V2 designs.

---

## 2. Purpose

### 2.1 Pipeline owns orchestration only

| Pipeline owns | Pipeline does not own |
|---|---|
| Stage ordering and boundaries | Feature formulas |
| Handoff contracts between stages | Rule condition logic |
| Lifecycle of an analysis run | xG / probability / scoreline math |
| Failure propagation semantics | Report section copy or DTO field invention beyond assembly rules in doc 32 |
| Version pinning across the run | Evidence collection provider specifics |
| Replay assumptions | AI narration / Prompt Engine |
| Cache eligibility (design-level) | Scheduler, queue, or infrastructure topology |

### 2.2 Computation stays in engines

```text
Pipeline coordinates:
  Snapshot → Evidence → Normalize → Feature → Rule → Prediction → Report → Seal

Engines compute (within their designs):
  Feature / Rule     → doc 30
  Prediction         → doc 31
  Report assembly    → doc 32
```

### 2.3 Non-recompute mandate

The pipeline must never:

- recalculate features, rules, predictions, or report analytics inside the orchestrator;
- “refresh” an upstream stage with newer versions during the same sealed run;
- invent defaults that hide missing upstream outputs;
- call an LLM to fill gaps.

The pipeline may only:

- invoke stages in order;
- pass sealed upstream artifacts by identity/checksum;
- record stage statuses;
- stop, degrade, or fail according to §6;
- seal a complete report when contracts are satisfied.

---

## 3. Complete End-to-End Flow

### 3.1 Happy path

```text
User Request
  → Analysis Request
  → Snapshot Builder
  → Evidence Collection
  → Evidence Normalization
  → Feature Engine
  → Rule Engine
  → Prediction Engine
  → Report Engine
  → Sealed Analysis Report
  → Workspace / Library / Replay
```

### 3.2 Orchestration diagram

```text
┌──────────────┐
│ User Request │  (Analyze match / re-run / rebuild)
└──────┬───────┘
       ▼
┌──────────────────┐
│ Analysis Request │  matchId, cutoff policy, correlation ids
└──────┬───────────┘
       ▼
┌──────────────────┐
│ Snapshot Builder │  freeze match state + cutoff + request pins
└──────┬───────────┘
       ▼
┌────────────────────┐
│ Evidence Collection│  acquire source records (edge)
└──────┬─────────────┘
       ▼
┌──────────────────────┐
│ Evidence Normalization│  typed evidence items + quality
└──────┬───────────────┘
       ▼
┌────────────────┐
│ Feature Engine │  doc 30 feature catalog
└──────┬─────────┘
       ▼
┌─────────────┐
│ Rule Engine │  doc 30 rule evaluations
└──────┬──────┘
       ▼
┌──────────────────┐
│ Prediction Engine│  doc 31 projections
└──────┬───────────┘
       ▼
┌──────────────┐
│ Report Engine│  doc 32 assembly
└──────┬───────┘
       ▼
┌────────────────────────┐
│ Sealed Analysis Report │  immutable DTO + checksums
└──────┬─────────────────┘
       ▼
┌─────────────────────────────────────┐
│ Workspace  ·  Library  ·  Replay    │  consumers (no recompute)
└─────────────────────────────────────┘
```

### 3.3 Conceptual vs physical execution

This design describes **logical stage order**. It does not mandate threads, jobs, message buses, or deployment topology. A future implementation may collocate stages in-process or across workers **only if** sealed artifacts and checksums remain equivalent.

### 3.4 Consumer distinction

| Consumer | Role after seal |
|---|---|
| Workspace | Renders sealed report for the match analysis session |
| Library | Indexes sealed report identity for browse/favorite/reopen |
| Replay | Re-loads sealed artifacts by pin; must not upgrade versions |

---

## 4. Stage Responsibilities

For each stage: purpose, inputs, outputs, owner (design ownership), failure behavior.

### 4.1 User Request

| Field | Design |
|---|---|
| Purpose | Express intent to analyze a match (or rebuild/replay). |
| Inputs | User action; match identifier; optional mode (`analyze` \| `rebuild` \| `replay`). |
| Outputs | Trigger for Analysis Request creation. |
| Owner | Presentation / product surface (not an analytical engine). |
| Failure behavior | Invalid match id → do not create analysis request; surface empty/not-found. |

### 4.2 Analysis Request

| Field | Design |
|---|---|
| Purpose | Normalize intent into a durable orchestration command identity. |
| Inputs | `matchId`, requested cutoff policy, correlation id, actor/context (private V1: operator). |
| Outputs | `analysisRequestId`, pinned policy references, accepted/rejected status. |
| Owner | Analysis application orchestration (design). |
| Failure behavior | Reject malformed requests; never start snapshot with incomplete identity. |

### 4.3 Snapshot Builder

| Field | Design |
|---|---|
| Purpose | Freeze the analytical frame: match state at cutoff, request pins, empty lineage slots for later stages. |
| Inputs | Accepted Analysis Request; match catalog/state. |
| Outputs | `snapshotId`, `cutoffAt`, match state checksum, snapshot status (`open` → later `sealed` with full manifest). |
| Owner | Analysis / Snapshot lifecycle (design). |
| Failure behavior | Unknown match or illegal cutoff → `failed` / `blocked`; no evidence stage. |

Note: “Snapshot” here is the sealed analytical frame. Intermediate snapshot rows may exist before full seal; the **analysis report seal** still requires complete downstream pins (§8).

### 4.4 Evidence Collection

| Field | Design |
|---|---|
| Purpose | Acquire external source records relevant to the snapshot subjects. |
| Inputs | Snapshot identity; allowed source configuration; subject ids. |
| Outputs | Append-only source records with retrieval metadata and payload checksums. |
| Owner | Provider adapters / Evidence intake (edge). |
| Failure behavior | Source timeout/error → stage `failed` or partial set with explicit gaps; pipeline applies §6. |

### 4.5 Evidence Normalization

| Field | Design |
|---|---|
| Purpose | Transform source records into typed evidence items with quality, freshness, provenance. |
| Inputs | Source records; normalizer versions. |
| Outputs | Normalized evidence set; selection eligibility flags relative to cutoff. |
| Owner | Normalizer / Evidence module. |
| Failure behavior | Schema/quality rejection → item `rejected`; material missing core types → downstream `blocked` risk. |

### 4.6 Feature Engine

| Field | Design |
|---|---|
| Purpose | Derive versioned features from eligible evidence (algorithms in doc 30). |
| Inputs | Cutoff-qualified evidence; feature model versions; baselines. |
| Outputs | Feature bundle + checksum + per-feature explanations/status. |
| Owner | Rule Engine V2 feature side (doc 30). |
| Failure behavior | Missing required evidence → features `inapplicable` / bundle `blocked`; no silent neutral inventiveness beyond declared policies in doc 30. |

### 4.7 Rule Engine

| Field | Design |
|---|---|
| Purpose | Evaluate deterministic rules against the feature bundle (doc 30). |
| Inputs | Feature bundle; eligible rule versions; evaluator version. |
| Outputs | Rule evaluation set (matched / not_matched / inapplicable / error) + checksum. |
| Owner | Rule Engine V2. |
| Failure behavior | Feature bundle blocked → rules not run (`skipped`/`blocked`); evaluator error → `failed`. |

### 4.8 Prediction Engine

| Field | Design |
|---|---|
| Purpose | Produce deterministic projections from features (+ optional rule channel deltas) (doc 31). |
| Inputs | Feature bundle; optional rule adjustments; prediction/calibration model versions. |
| Outputs | Projection bundle (xG, 1X2, scorelines, ranges, recommendation, confidence) + checksum. |
| Owner | Prediction Engine V2. |
| Failure behavior | Blocked features or failed required rules → prediction `blocked`/`failed`; no fabricated probabilities. |

### 4.9 Report Engine

| Field | Design |
|---|---|
| Purpose | Assemble sealed upstream outputs into Analysis Report DTO (doc 32). |
| Inputs | Evidence selection refs; feature, rule, prediction bundles; match overview fields. |
| Outputs | Report DTO + `contentChecksum` + report schema/assembler versions. |
| Owner | Report Engine V2. |
| Failure behavior | Missing required bundles → report `blocked`; never assemble a “success” report with invented sections. |

### 4.10 Sealed Analysis Report

| Field | Design |
|---|---|
| Purpose | Mark the report immutable and publish its identity to consumers. |
| Inputs | Valid Report Engine output + complete pin manifest. |
| Outputs | Sealed report identity; status `sealed`. |
| Owner | Analysis lifecycle / Report seal step. |
| Failure behavior | Incomplete pins → refuse seal. |

### 4.11 Workspace / Library / Replay

| Field | Design |
|---|---|
| Purpose | Consume sealed reports for review, browsing, and identical reproduction. |
| Inputs | Sealed report id + checksums (Library may store presentation indexes). |
| Outputs | Rendered UI / export / replay verification result. |
| Owner | Presentation & replay tooling (consumers). |
| Failure behavior | Checksum mismatch → show integrity error; do not silently recompute. |

---

## 5. Stage Contracts

### 5.1 Adjacent-stage contract table

| Upstream → Downstream | Downstream may read | Downstream must not |
|---|---|---|
| Analysis Request → Snapshot | Request identity, cutoff policy, match id | Invent match state |
| Snapshot → Evidence Collection | Snapshot subjects, cutoff | Change cutoff mid-collection for same snapshot |
| Evidence Collection → Normalization | Source records + checksums | Treat raw payloads as features |
| Normalization → Feature | Typed evidence items, quality, eligibility | Re-fetch providers; invent evidence |
| Feature → Rule | Feature bundle values + versions | Recompute features |
| Feature (+ Rules) → Prediction | Feature bundle; optional rule channel deltas | Re-run feature math; ignore declared rule deltas silently |
| Prediction → Report | Projection bundle + confidence + recommendation | Recompute Poisson/xG/calibration |
| Report → Seal / Consumers | Report DTO + checksums | Mutate sealed fields |
| Seal → Workspace/Library/Replay | Sealed identity | Upgrade pinned versions on read |

### 5.2 Single-writer rule

Each analytical artifact has exactly one producing stage:

| Artifact | Producer |
|---|---|
| Source record | Evidence Collection |
| Evidence item | Normalization |
| Feature bundle | Feature Engine |
| Rule evaluation set | Rule Engine |
| Projection bundle | Prediction Engine |
| Report DTO | Report Engine |

No later stage may rewrite an earlier artifact in place. Corrections require a **new analysis request** / **rebuild** with a new identity.

### 5.3 Read direction

```text
Each stage reads only upstream sealed (or stage-complete) outputs.
No stage reads downstream outputs.
No circular dependencies.
```

### 5.4 Empty vs blocked

| Result | Meaning |
|---|---|
| `completed_nonempty` | Stage produced usable artifacts |
| `completed_empty` | Stage succeeded but found nothing eligible (must be allowed by policy) |
| `blocked` | Upstream insufficiency prevents meaningful continuation |
| `failed` | Stage error / contract break / non-finite outputs |
| `skipped` | Not executed because upstream blocked (recorded, not silent) |
| `degraded` | Completed with explicit partial capability (flags required) |

A `completed_empty` evidence set is not automatically a successful prediction. Prediction/Report policies decide continuation (§6).

---

## 6. Failure Propagation

### 6.1 Status vocabulary

| Status | Meaning | Typical consumer impact |
|---|---|---|
| `blocked` | Cannot proceed due to missing/insufficient upstream inputs | No sealed success report; UI shows blockers |
| `failed` | Stage defect, timeout, invalid contract, non-finite math | Hard stop; diagnostics required |
| `degraded` | Partial run with declared limitations | May seal only if policy allows degraded seal; limitations mandatory |
| `skipped` | Not run because prior stage blocked/failed | Appears in lineage as skipped |

### 6.2 Canonical propagation example

```text
Missing critical evidence
  → Feature blocked
  → Rule skipped
  → Prediction blocked
  → Report blocked
  → No sealed success report
```

### 6.3 Propagation matrix (design)

| If this stage is… | Feature | Rule | Prediction | Report | Seal |
|---|---|---|---|---|---|
| Evidence normalization `failed` | skipped/blocked | skipped | blocked | blocked | refuse |
| Feature `blocked` | — | skipped | blocked | blocked | refuse |
| Rule `failed` (required set) | ok | — | blocked/failed | blocked | refuse |
| Rule `degraded` (optional rules only) | ok | — | may continue with flags | may assemble with limitations | policy-gated |
| Prediction `blocked` | ok | ok/skipped | — | blocked | refuse |
| Prediction `degraded` | ok | ok | — | assemble with limitations | policy-gated |
| Report `blocked`/`failed` | … | … | … | — | refuse |

### 6.4 Degraded seal policy (design stance)

Default stance for Pipeline V2 design:

- **Do not seal** a “successful” report when Prediction is blocked.  
- **Allow degraded seal** only when Prediction completed with explicit limitation flags **and** a pinned degraded-seal policy version permits it.  
- Degraded seals must carry visible limitations in Overview/Confidence/Recommendation sections (doc 32).

### 6.5 No silent success

Forbidden:

- converting `failed` into empty probabilities;  
- skipping Rule Engine without recording `skipped`;  
- sealing Report while prediction checksum is absent;  
- Workspace inventing a lean when Report is blocked.

---

## 7. Replay Pipeline

### 7.1 Goal

Replay reproduces **identical** sealed outputs for a historical analysis identity. It is verification and review support, not a stealth upgrade path.

### 7.2 Replay inputs (always pinned)

| Pin | Role |
|---|---|
| Snapshot identity + checksum | Analytical frame and cutoff |
| Evidence selection checksum | Exact evidence set |
| Feature bundle version + checksum | Exact features |
| Rule versions + evaluation checksum | Exact findings |
| Prediction model/calibration versions + checksum | Exact projections |
| Report schema/assembler versions + checksum | Exact DTO |

### 7.3 Replay flow

```text
Replay Request (reportId or analysisRunId)
  → Load sealed manifest (all pins)
  → Verify checksums
  → Optional: re-execute pure engines in pin-compatible mode
  → Compare to sealed artifacts
  → Emit replay result: identical | mismatch | incomplete_manifest
```

### 7.4 Replay modes (design)

| Mode | Behavior |
|---|---|
| `load_only` | Re-load sealed report DTO; no engine execution (primary UI reopen) |
| `verify_recompute` | Re-run Feature→Rule→Prediction→Report under **exact pins**; require byte/semantic identity with sealed checksums |
| `rebuild` | **Not replay** — new request that may use newer versions; produces a **new** report id |

### 7.5 Forbidden during replay

- Resolving “latest” rule/feature/prediction versions;  
- Refreshing evidence from providers;  
- Moving cutoff to “now”;  
- Market re-blend with current odds;  
- Silent repair of mismatches.

Mismatch → surface integrity failure; do not overwrite history.

---

## 8. Version Pinning

### 8.1 Pin inventory

| Pin | Protects |
|---|---|
| Snapshot checksum | Match state + cutoff frame |
| Evidence selection checksum | Exact normalized evidence set |
| Feature checksum (+ feature model versions) | Feature bundle identity |
| Rule checksum (+ rule/evaluator versions) | Evaluation set identity |
| Prediction checksum (+ probability/xG/calibration versions) | Projection bundle identity |
| Report checksum (+ schema/assembler versions) | Sealed DTO identity |
| Pipeline version | Orchestration semantics identity |
| Analysis version / analysis run id | End-to-end run identity |

### 8.2 Why every stage must be reproducible

1. **Reviewability** — humans must see the same numbers tomorrow.  
2. **Explainability** — lineage IDs only work if artifacts are immutable.  
3. **Learning integrity** — post-match review compares against what was actually sealed.  
4. **Debugging** — mismatches localize to a stage checksum.  
5. **Trust** — no hidden “model improved underneath” after publication.

### 8.3 Manifest sketch

```text
AnalysisRunManifest {
  analysisRunId
  pipelineVersion
  snapshotId, snapshotChecksum
  evidenceSelectionChecksum
  featureBundleChecksum, featureModelVersions[]
  ruleEvaluationChecksum, ruleVersions[], evaluatorVersion
  predictionBundleChecksum, predictionModelVersions[], calibrationMapVersion?
  reportId, reportContentChecksum, reportSchemaVersion, reportAssemblerVersion
  stageStatuses[]
  correlationId
}
```

Seal requires all required fields present. Partial manifests cannot produce `sealed` success.

---

## 9. Caching Strategy (Design Only)

Caching is optional performance. Correctness always prefers sealed artifacts over cache.

### 9.1 Where caching may be allowed

| Cache | Eligibility | Conceptual cache key |
|---|---|---|
| Evidence cache | Normalized items by source identity + normalizer version + subject | `evidenceType + subjectId + sourceId + normalizerVersion + contentChecksum` |
| Feature cache | Pure functions of evidence selection + feature versions | `evidenceSelectionChecksum + featureModelVersions + baselineVersion` |
| Prediction cache | Pure functions of feature (+ rule deltas) + model pins | `featureChecksum + ruleEvaluationChecksum + predictionModelVersions + calibrationMapVersion` |
| Report cache | Pure assembly of upstream bundles + report assembler version | `evidenceSelectionChecksum + featureChecksum + ruleChecksum + predictionChecksum + reportAssemblerVersion + reportSchemaVersion` |

### 9.2 Cache principles

1. Cache keys **include versions and upstream checksums**, not only `matchId`.  
2. A cache hit returns an artifact that still verifies against its checksum.  
3. Cutoff/snapshot changes invalidate all downstream caches.  
4. Replay `load_only` reads sealed store first; cache is irrelevant if seal exists.  
5. Caches must not store provider secrets or raw credentials.  
6. No cache may serve “latest” under an old key.

### 9.3 What not to cache as analytical truth

- Live odds without cutoff observation time;  
- UI formatting results as if they were projection bundles;  
- Partial failed stage outputs presented as complete.

---

## 10. Orchestration Principles

| Principle | Statement |
|---|---|
| Single-direction pipeline | Data flows only forward through the stage list in §3. |
| Immutable upstream outputs | Completed stage artifacts are append-only / sealed; corrections create new runs. |
| No circular dependencies | Prediction never feeds Feature; Report never feeds Rule. |
| No hidden recomputation | Orchestrator does not quietly re-run stages with new versions mid-request. |
| Pure deterministic execution | Same pins → same artifacts (engine purity assumed per docs 30–32). |
| Sealed outputs | Consumer-visible success requires sealed report + complete manifest. |
| Explicit status | Every stage records `completed_*` / `blocked` / `failed` / `degraded` / `skipped`. |
| Fail loudly | Prefer `blocked`/`failed` over empty success. |
| Epistemic separation | Pipeline preserves labels: evidence vs market signal vs projection vs recommendation. |
| Engine autonomy | Pipeline invokes; engines compute; pipeline does not merge competing algorithms. |

---

## 11. Explainability Across Pipeline

### 11.1 End-to-end lineage

```text
Evidence
  → Feature
  → Rule
  → Prediction
  → Report
```

Every downstream object references upstream IDs (and checksums where applicable).

### 11.2 Reference obligations by stage

| Artifact | Must reference |
|---|---|
| Feature value | Evidence item IDs (+ baseline ids if used) |
| Rule evaluation | Feature IDs/versions; rule version; evaluator version |
| Projection field | Feature IDs; rule evaluation IDs (if deltas applied); model versions |
| Report section | Prediction/rule/feature/evidence references per doc 32 |
| Analysis run manifest | All stage checksums |

### 11.3 Pipeline-level lineage example

```text
AnalysisRun R
  Snapshot S (match-example-1, cutoff T)
  Evidence E1 (TEAM_FORM home), E2 (STATISTICS away), …
  Features F: AttackRating_home←E1…, DefenseRating_away←E2…
  Rules: HOME_ATTACK_EDGE matched ← F
  Prediction P: λh/λa ← F; pHome ← P model; recommendation lean_home ← P gates
  Report Rep: sections cite E/F/Rules/P; contentChecksum C
  Manifest pins S,E,F,Rules,P,Rep,C + pipelineVersion
```

### 11.4 Consumer explainability

Workspace/Library/Replay must be able to answer, from sealed data:

1. Which evidence supported a shown feature?  
2. Which rules supported a lean?  
3. Which xG and model produced probabilities?  
4. Which report section cites which prediction fields?  

If any link is missing, the run is `degraded` or must not seal (§6).

---

## 12. Out of Scope

This design explicitly excludes:

- Any implementation in packages, apps, or infrastructure;  
- Schedulers, cron, message queues, Redis/BullMQ, or worker topologies;  
- API design or HTTP route definitions;  
- Frontend or backend code changes;  
- Database schemas, migrations, or persistence models;  
- Architecture document edits, ADR changes, Project Bible changes;  
- Redefinition of Rule / Prediction / Report algorithms (owned by docs 30–32);  
- AI/LLM generation inside the pipeline;  
- Live in-play pipelines;  
- Authorization of implementation or governance process changes.

Existing [17_ANALYSIS_PIPELINE](./17_ANALYSIS_PIPELINE.md) remains the authoritative V1 pipeline contract unless formally superseded by a future approved change — this V2 document does not perform that supersession.

---

## 13. Non-binding Adoption Notes

Planning guidance only. No implementation approval. No governance changes.

1. Treat docs 30–33 as a complementary design quartet; resolve conflicts by not implementing until owning canonical docs are updated under normal process.  
2. Prototype orchestration as a pure stage graph over fixtures before any persistence work.  
3. Prove failure propagation with golden manifests (`blocked` chains).  
4. Prove replay identity before exposing Library “reopen” as historically stable.  
5. Keep consumer UI bound to sealed Report DTOs (doc 32), not live multi-endpoint mosaics.

This document alone is not an implementation gate.
