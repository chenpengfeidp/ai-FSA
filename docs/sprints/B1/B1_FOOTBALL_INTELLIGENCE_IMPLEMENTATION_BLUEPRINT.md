# B1 — Football Intelligence Implementation Blueprint

| Field | Value |
|---|---|
| Sprint id | **B1** |
| Document type | Implementation Blueprint (Architecture → Coding bridge) |
| Purpose class | Convert B0 Architecture Mapping into a concrete repository organization blueprint |
| Governing | Project Bible; Architecture Freeze **v0.2**; docs 17 / 18; `DEVELOPMENT_WORKFLOW` (read-only) |
| Design inputs | A0, A0.5, A1, A1.5, A1.8, A1.9, A1.10, A1.11, A2, A2.5, A3, A4, **B0** |
| Status | Design complete — **does not authorize production coding** |
| Explicitly excluded | Production code; DTOs; schemas; package creation; redesign; Bible / Freeze / docs 17 / docs 18 edits |

---

## 1. Purpose

This document is the **implementation blueprint** between Architecture Mapping and Coding:

```text
Design (A0–A4)
  → Architecture Mapping (B0)
  → Implementation Blueprint (B1)   ← this document
  → Coding sprints (future gates only)
```

It defines **exactly how Football Intelligence should be organized inside the existing repository** before any coding sprint begins.

It is **not** a redesign. It organizes existing packages, layers, ports, adapters, and use-cases so future coding sprints can implement inside Freeze-aligned homes without inventing Engines, packages, or parallel architecture.

---

## 2. Repository Mapping

Every package below already exists (or is an existing Freeze composition root). B1 assigns Intelligence responsibility; it does **not** create packages.

### 2.1 `@fas/evidence`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Own Evidence Facts, trust class, selection, conflicts, freshness, cutoff-qualified readiness inputs (A1.9; doc 17). |
| **Public API** | Domain Fact contracts; selection/query operations; import-facing service ports; reliability labels as domain vocabulary. |
| **Internal modules** | Fact models; trust/conflict/freshness policies; selection helpers; provider-facing service orchestration (not Feature/Rule). |
| **Application layer** | Evidence selection / readiness preparation invoked before AnalyzeMatch; import coordination surfaces already shared with evidence-import. |
| **Domain layer** | Fact identities, trust classes, conflict states, freshness windows, cutoff qualification results. |
| **Infrastructure layer** | None owned here for Prisma; persistence via `@fas/database` adapters implementing evidence ports. |
| **Ownership** | Evidence module owns Facts and reliability semantics. Does not own Features, Rules, Projection, or Narrative. |

### 2.2 `@fas/feature`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Derive `FeatureBundle` from Evidence under `FeatureModelVersion` (A1.10). Analysis-owned capability living in this package (A0 / B0). |
| **Public API** | Feature extraction operation; FeatureBundle / FeatureModelVersion contracts; honest-absence Feature states. |
| **Internal modules** | Extractors by feature family; bundle builders; version identity helpers. |
| **Application layer** | Extraction use-case/operation invoked by Analysis; no match orchestration. |
| **Domain layer** | Feature identities, FeatureBundle, FeatureModelVersion, derivation invariants, absence semantics. |
| **Infrastructure layer** | None for providers; consumes Evidence contracts only. |
| **Ownership** | Feature package owns derivation definitions. Does not read Provider SDKs or Rule/Projection internals. |

### 2.3 `@fas/rule`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Deterministic Rule evaluation over FeatureBundle under RuleSetVersion / hierarchy (A1.8). Interim home for Rule Engine slot. |
| **Public API** | Rule evaluation operation; RuleResult / finding contracts; RuleSetVersion identity. |
| **Internal modules** | Rule evaluators; hierarchy metadata; finding builders. |
| **Application layer** | Evaluation operation invoked by Analysis; no Evidence selection. |
| **Domain layer** | Rule identities, RuleResult, hierarchy labels, RuleSetVersion, evaluation invariants. |
| **Infrastructure layer** | None for Evidence tables or Provider JSON. |
| **Ownership** | Rule package owns deterministic findings. Does not author Facts, Features, or probabilities. |

### 2.4 `@fas/analysis`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Orchestrate pre-match Intelligence; own Projection / Scenario / Confidence; enforce Compatibility Profile pins (A1.5 / A1.11 / A2.5). |
| **Public API** | `AnalyzeMatchUseCase` (and related application result types); Projection / Scenario / Confidence contracts; pin-enforcement surfaces. |
| **Internal modules** | `projection/`, `scenario/`, `confidence/`, `use-case/`, `domain/`; future experiment/replay coordination modules as application services. |
| **Application layer** | AnalyzeMatch; ReplayPrediction; Experiment/Promotion/Rollback coordination (with Evaluation gates); pin selection enforcement. |
| **Domain layer** | Projection distributions, ScenarioSet, Confidence block, Compatibility Profile identity, version pin value objects. |
| **Infrastructure layer** | None for Prisma; reads calibration/experiment pins via ports implemented elsewhere. |
| **Ownership** | Analysis coordinates; does not redefine Evidence/Feature/Rule semantics. |

### 2.5 `@fas/report`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Narrative assembly, Match Report seal, explainability index composition (A0.5 / A3). |
| **Public API** | `GenerateReportUseCase` / report builder operations; sealed report contracts; narrative assembly ports. |
| **Internal modules** | `builder/`, `narrative/` (including MVP deterministic path), `use-case/`, `domain/`. |
| **Application layer** | Generate sealed Match Report from AnalysisResult + narrative adapter output. |
| **Domain layer** | Report identity, seal checksum/lineage fields, explainability index structure (conceptual). |
| **Infrastructure layer** | Persistence of seals via database ports; AI rewrite only through `@fas/ai-provider` adapters. |
| **Ownership** | Report owns seal assembly. Does not recompute Feature/Projection. |

### 2.6 `@fas/statistics`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Population metrics, calibration projections, artifact records (A1 / A2). Does not decide release gates. |
| **Public API** | Metrics/projection readers; calibration artifact identity contracts; population rollup operations. |
| **Internal modules** | Metric projectors; calibration fit/validation helpers (application/domain); artifact metadata models. |
| **Application layer** | CalibrationUseCase computational surfaces; evaluation metric refresh support. |
| **Domain layer** | Metric definitions, calibration artifact identities, population windows. |
| **Infrastructure layer** | Artifact bytes/metadata via database/storage ports; no Evaluation gate ownership. |
| **Ownership** | Statistics computes projections. Evaluation Engine slot owns promotion gates (A1 / A2 / B0). |

### 2.7 `@fas/database`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Sole Prisma / persistence owner (doc 18). Implements repository ports for seals, history, jobs state, pins metadata when coded. |
| **Public API** | Adapter implementations of inward ports; no Intelligence domain exports. |
| **Internal modules** | Prisma schema ownership; repository adapters; mappers from persistence records → application contracts. |
| **Application layer** | None for Intelligence policy. |
| **Domain layer** | None for Intelligence domain models. |
| **Infrastructure layer** | Full ownership of DB access. |
| **Ownership** | Persistence only. Never exports Prisma types as Intelligence contracts. |

### 2.8 `apps/api`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | HTTP transport composition root for analyze / report / future history & promotion commands. |
| **Public API** | Nest controllers / routes (transport-only). |
| **Internal modules** | Controllers; Nest modules; wiring of ports → adapters. |
| **Application layer** | Invokes package use-cases; does not embed pipeline policy. |
| **Domain layer** | None. |
| **Infrastructure layer** | Composition root wiring. |
| **Ownership** | Transport + composition. No Projection math in controllers. |

### 2.9 `apps/worker`

| Aspect | Blueprint |
|---|---|
| **Responsibility** | Durable post-match / calibration / experiment / replay / evaluation refresh jobs (doc 18). |
| **Public API** | Job handlers as composition surfaces. |
| **Internal modules** | Handlers invoking application/engine ports; job module wiring. |
| **Application layer** | Invokes EvaluatePrediction, Calibration, Experiment, Replay use-cases. |
| **Domain layer** | None. |
| **Infrastructure layer** | Composition root for long-running work. |
| **Ownership** | Durable execution. No inline heavy Intelligence work in API request thread. |

### 2.10 Related existing packages (mapped, not redesigned)

| Package | Intelligence role (blueprint) |
|---|---|
| `@fas/evidence-normalizer` | Provider shape → Evidence Facts |
| `@fas/evidence-query` | Read/query path for selection |
| `@fas/evidence-import` / `@fas/application` | Import coordination already on analyze path |
| `@fas/match` | MatchId, verified result references |
| `@fas/provider-football` (+ odds/scores providers) | Raw captures at edge only |
| `@fas/prompt` | Narrative manifest composition (A3) |
| `@fas/ai-provider` | Untrusted rewrite / local deterministic narrator |
| `@fas/config` | Env selects approved profile/artifact **ids** only |
| `@fas/jobs` | Job definitions for worker durability |
| `@fas/domain` | Shared kernel types where already present |
| Evaluation / Review engine slots (Freeze targets) | Gates / optional human review — not new Intelligence packages |

**Do not create:** `feature-engine`, `calibration-engine`, `experimentation-engine`, `explainability-engine`, or any eighth Bible Engine package.

---

## 3. Suggested Directory Layout

Blueprint trees only. Existing folders may already match; coding sprints refine without inventing packages.

### 3.1 `@fas/evidence`

```text
packages/evidence/src/
  domain/
  ports/
  services/
  repository/          # port contracts / local facades as today
  provider/            # intake-facing helpers (not Feature)
  application/         # selection / readiness use-cases (as needed)
  index.ts
```

### 3.2 `@fas/feature`

```text
packages/feature/src/
  domain/
  ports/
  extraction/          # extractors
  builders/            # FeatureBundle assembly
  factories/
  application/
  index.ts
```

### 3.3 `@fas/rule`

```text
packages/rule/src/
  domain/
  ports/
  evaluation/
  policies/            # hierarchy / precedence (conceptual)
  factories/
  application/
  index.ts
```

### 3.4 `@fas/analysis`

```text
packages/analysis/src/
  domain/
  ports/
  projection/
  scenario/
  confidence/
  use-case/            # AnalyzeMatch, Replay, Experiment coordination
  services/            # pin enforcement, compatibility profile
  factories/
  index.ts
```

### 3.5 `@fas/report`

```text
packages/report/src/
  domain/
  ports/
  builder/
  narrative/
    mvp/               # deterministic local path
  use-case/            # GenerateReport
  factories/
  index.ts
```

### 3.6 `@fas/statistics`

```text
packages/statistics/src/
  domain/
  ports/
  projections/         # population / calibration projections
  services/
  application/         # Calibration computational use-cases
  factories/
  index.ts
```

### 3.7 `@fas/database`

```text
packages/database/src/
  prisma/              # schema ownership (existing pattern)
  adapters/
    repositories/
  mappers/
  index.ts
```

### 3.8 `apps/api`

```text
apps/api/src/
  modules/             # Nest composition
  controllers/         # transport only
  bridges/             # thin import/analyze wiring if needed
  main.ts
```

### 3.9 `apps/worker`

```text
apps/worker/src/
  modules/
  handlers/            # evaluation / calibration / experiment / replay
  main.ts
```

Directory names are organizational guidance. Coding sprints must not invent parallel root packages to “mirror” this tree.

---

## 4. Domain Model Blueprint

Conceptual only — no schemas, DTOs, or class bodies.

### 4.1 Aggregates (conceptual)

| Aggregate | Home | Boundary |
|---|---|---|
| **EvidenceSelection** | `@fas/evidence` | Selected Facts for a match at a cutoff; trust/conflict resolution outcome |
| **FeatureBundle** | `@fas/feature` | Derived features for one analysis pin |
| **RuleEvaluation** | `@fas/rule` | Findings for one RuleSetVersion over one FeatureBundle |
| **AnalysisResult** | `@fas/analysis` | Projection + Scenario + Confidence under Compatibility Profile pins |
| **MatchReport** | `@fas/report` | Sealed narrative + explainability index + lineage |
| **PredictionHistoryRecord** | Analysis + persistence ports | Immutable sealed pre-match snapshot (A1) |
| **CalibrationArtifact** | `@fas/statistics` | Fitted calibration object + identity (A2) |
| **ExperimentAssignment** | `@fas/analysis` coordination | Arm assignment for future pins only (A2.5) |

### 4.2 Entities (conceptual)

| Entity | Notes |
|---|---|
| Match (identity) | Via `@fas/match` |
| Fact | Evidence-owned |
| Feature | Member of FeatureBundle |
| Rule / RuleSet | Rule-owned hierarchical definition identity |
| Scenario | Selected narrative outcomes; not probability author |
| ReportRevision / Seal | Report-owned immutable seal identity |
| Compatibility Profile | Version pin set identity (A1.11) |
| Experiment / Arm | Future-pin experiment identity (A2.5) |

### 4.3 Value Objects (conceptual)

| Value object | Notes |
|---|---|
| MatchId, CutoffInstant, TrustClass | Evidence / shared |
| FeatureModelVersion, RuleSetVersion | A1.10 / A1.8 |
| ProjectionDistribution, Probability | Projection-owned (A1.5) |
| ConfidenceLabel / ConfidenceBlock | Trust of sealed distribution |
| CalibrationArtifactId, CompatibilityProfileId | Pins |
| Checksum / LineageStamp | Seal immutability |
| Reliability / HonestAbsence markers | A1.9 / A1.10 |

### 4.4 Domain Services (conceptual)

| Service | Home |
|---|---|
| Fact conflict resolution / freshness qualification | Evidence |
| Feature derivation orchestration (pure extractors) | Feature |
| Hierarchical rule precedence evaluation | Rule |
| Projection policy (Feature+Rule → distribution) | Analysis |
| Scenario selection (from sealed projection) | Analysis |
| Confidence assessment (from sealed projection + reliability) | Analysis |
| Narrative fidelity constraints | Report |
| Population metric aggregation | Statistics |

### 4.5 Factories (conceptual)

| Factory | Produces |
|---|---|
| FeatureBundleFactory | Bundle under FeatureModelVersion |
| RuleResultFactory | Findings under RuleSetVersion |
| AnalysisResultFactory | Projection+Scenario+Confidence under pins |
| MatchReportFactory / ReportSealFactory | Sealed report |
| CalibrationArtifactFactory | Artifact identity after fit |
| CompatibilityProfileFactory | Pin set identity (definitions in owning packages) |

### 4.6 Policies (conceptual)

| Policy | Owner |
|---|---|
| Cutoff / readiness policy | Evidence + Analysis readiness gate |
| Honest absence policy | Feature / Evidence |
| Rule hierarchy precedence | Rule (A1.8) |
| Projection ownership of probabilities | Analysis (A1.5) |
| Seal immutability | Report / History |
| Future-pin-only promotion | Analysis + Evaluation gates (A2 / A2.5 / A4) |
| No auto-activation | Governance (A4) |

### 4.7 Specifications (conceptual)

| Specification | Purpose |
|---|---|
| CutoffQualifiedSpec | Fact usable for analysis |
| FeatureCompletenessSpec | Bundle usable for Rule stage |
| CompatibilityProfileMatchSpec | Run pins match active profile |
| EvaluationGatePassSpec | Promotion / experiment eligibility |
| ReplayIdentitySpec | Same pins + same Evidence selection for replay |

---

## 5. Application Layer Blueprint

Major use-cases. Homes follow B0. No DTO/schema design here.

### 5.1 `AnalyzeMatchUseCase`

| Field | Blueprint |
|---|---|
| **Home** | `@fas/analysis` |
| **Purpose** | Run Evidence→Feature→Rule→Projection→Scenario→Confidence under Compatibility Profile pins; emit AnalysisResult |
| **Consumes** | Evidence selection, Feature extraction, Rule evaluation, pin config |
| **Does not** | Seal report; fit calibration; mutate history |
| **Triggered by** | `apps/api` (interactive); optionally worker for batch analyze |

### 5.2 `GenerateReportUseCase`

| Field | Blueprint |
|---|---|
| **Home** | `@fas/report` |
| **Purpose** | Assemble narrative + explainability index; seal Match Report from AnalysisResult |
| **Consumes** | AnalysisResult; narrative adapter; prompt composition as needed |
| **Does not** | Recompute Feature/Projection; author Facts |
| **Triggered by** | `apps/api` after analyze, or dedicated report command |

### 5.3 `ReplayPredictionUseCase`

| Field | Blueprint |
|---|---|
| **Home** | `@fas/analysis` (coordination) |
| **Purpose** | Re-run or materialize sealed path under identical pins and Evidence selection for audit/replay (A1 / A1.11) |
| **Consumes** | Prediction History identity / sealed inputs |
| **Does not** | Rewrite sealed history; apply new calibration to past seals |
| **Triggered by** | `apps/worker` (preferred); API may enqueue |

### 5.4 `EvaluatePredictionUseCase`

| Field | Blueprint |
|---|---|
| **Home** | Evaluation Engine slot + Analysis history coordination; Statistics supplies metrics |
| **Purpose** | Compare sealed prediction to verified Actual; produce evaluation records / gates inputs (A1) |
| **Consumes** | Sealed history; verified match result (`@fas/match` + Evidence outcome) |
| **Does not** | Alter pre-match seals; auto-promote profiles |
| **Triggered by** | `apps/worker` |

### 5.5 `CalibrationUseCase`

| Field | Blueprint |
|---|---|
| **Home** | `@fas/statistics` (compute) + Evaluation gates + Analysis pin consumption |
| **Purpose** | Fit/validate calibration artifacts; expose artifact ids for **future** pins only (A2) |
| **Consumes** | Population of sealed predictions + outcomes |
| **Does not** | Rewrite history; decide release without Evaluation; auto-activate |
| **Triggered by** | `apps/worker` |

### 5.6 `ExperimentUseCase`

| Field | Blueprint |
|---|---|
| **Home** | `@fas/analysis` coordination + Evaluation + worker |
| **Purpose** | Assign experiment arms / Compatibility Profile variants for **future** analyses (A2.5) |
| **Consumes** | Experiment definition; Evaluation eligibility |
| **Does not** | Mutate sealed past predictions; bypass Evaluation |
| **Triggered by** | `apps/worker` / API command enqueue |

### 5.7 `PromotionUseCase`

| Field | Blueprint |
|---|---|
| **Home** | Application command (Analysis coordination) + Evaluation gate + human approval (A4) |
| **Purpose** | Promote approved Compatibility Profile / calibration / experiment default for **future** runs |
| **Consumes** | Gate-pass evidence; human decision |
| **Does not** | Auto-promote inside Statistics; rewrite sealed reports |
| **Triggered by** | `apps/api` command → application/worker |

### 5.8 `RollbackUseCase`

| Field | Blueprint |
|---|---|
| **Home** | Same promotion ownership; Analysis pin coordination |
| **Purpose** | Roll active future pins back to prior approved Compatibility Profile / artifact ids |
| **Consumes** | Prior pin identity; governance authorization |
| **Does not** | Delete Prediction History; alter past seals |
| **Triggered by** | `apps/api` command → application/worker |

---

## 6. Port Blueprint

Important ports (conceptual contracts). Implementation packages implement; consumer packages depend inward.

| Port | Purpose | Owner (defines) | Input (conceptual) | Output (conceptual) | Implementation package | Consumer package |
|---|---|---|---|---|---|---|
| **EvidenceByMatchQuery** | Load/select Facts for match+cutoff | Evidence | MatchId, cutoff | EvidenceSelection | `@fas/database` (+ query adapters) | Analysis, Evidence application |
| **EvidenceImportOperation** | Intake/normalize provider captures | Evidence / evidence-import | Provider capture refs | Import result / Facts | Provider + normalizer + database | API bridges, analyze priming |
| **FeatureExtractionOperation** | Evidence → FeatureBundle | Feature | EvidenceSelection, FeatureModelVersion | FeatureBundle | `@fas/feature` (in-package) | Analysis |
| **RuleEvaluationOperation** | FeatureBundle → RuleResult | Rule | FeatureBundle, RuleSetVersion | RuleResult | `@fas/rule` (in-package) | Analysis |
| **ProjectionOperation** | Features+Rules → distribution | Analysis | FeatureBundle, RuleResult, pins | Projection | `@fas/analysis` | AnalyzeMatch |
| **ScenarioSelectionOperation** | Select scenarios from projection | Analysis | Projection, policy pins | ScenarioSet | `@fas/analysis` | AnalyzeMatch |
| **ConfidenceAssessmentOperation** | Trust sealed distribution | Analysis | Projection, reliability inputs, pins | ConfidenceBlock | `@fas/analysis` | AnalyzeMatch |
| **CompatibilityProfilePort** | Resolve/enforce version pins | Analysis | ProfileId / config id | Pin set | Analysis + config + database | AnalyzeMatch, Promotion, Experiment |
| **NarrativeGenerationPort** | AnalysisResult → narrative text blocks | Report | AnalysisResult, prompt manifest | Narrative draft | `@fas/ai-provider` / local MVP | Report |
| **PromptCompositionPort** | Build narrative prompt manifest | Prompt | Sealed analysis fields | Manifest | `@fas/prompt` | Report |
| **ReportSealPort** / builder | Seal Match Report | Report | AnalysisResult + narrative | Sealed MatchReport | `@fas/report` (+ database) | GenerateReport |
| **PredictionHistoryRepository** | Persist/read immutable seals | Analysis/Report ports | Seal write/read keys | History records | `@fas/database` | Analyze/Report/Replay/Evaluate |
| **StatisticsProjectionReader** | Read metrics / calibration projections | Statistics | Query window / artifact id | Metrics / artifact view | `@fas/statistics` + database | Evaluation, Calibration, Analysis pin read |
| **CalibrationFitPort** | Fit calibration artifact | Statistics | Population inputs | Artifact identity | `@fas/statistics` | CalibrationUseCase |
| **EvaluationGatePort** | Pass/fail promotion eligibility | Evaluation Engine slot | Evaluation inputs | Gate decision | Future evaluation-engine / interim home | Promotion, Experiment, Calibration |
| **ExperimentAssignmentPort** | Assign arm for future match | Analysis | MatchId, experiment id | Arm / profile pins | Analysis + database | ExperimentUseCase |
| **JobEnqueuePort** | Enqueue durable work | Jobs | Job command | Job id | `@fas/jobs` + worker | API |

Ports remain framework-neutral. Nest/Prisma/SDK types never appear on port surfaces.

---

## 7. Adapter Blueprint

Adapters implement ports at edges. No code.

### 7.1 Provider adapters

| Adapter | Package | Implements / feeds | Constraint |
|---|---|---|---|
| Football data recorded/live adapters | `@fas/provider-football` | Raw captures → Evidence import | Never Feature/Rule/Projection |
| Odds / scores adapters (existing) | provider packages | Raw captures → Evidence | Edge only (A1.9) |
| Fixture / cassette adapters | `@fas/provider-fixture` etc. | Deterministic intake for demos/tests | Same Evidence boundary |

### 7.2 Repository adapters

| Adapter | Package | Implements | Constraint |
|---|---|---|---|
| Evidence / Fact repositories | `@fas/database` | Evidence query/write ports | Map to application contracts |
| Prediction History repository | `@fas/database` | History port | Immutable writes; no rewrite APIs |
| Calibration artifact metadata repository | `@fas/database` | Statistics ports | Bytes may use approved storage |
| Compatibility Profile / pin repository | `@fas/database` | Profile port | Stores ids; policy in Analysis |
| Experiment assignment repository | `@fas/database` | Experiment port | Future pins only |

### 7.3 AI adapters

| Adapter | Package | Role | Constraint |
|---|---|---|---|
| Local deterministic narrative adapter | `@fas/ai-provider` / report MVP | Faithful narrative without remote AI | Untrusted as Fact author |
| Remote AI narrative rewrite adapter | `@fas/ai-provider` | Optional rewrite of sealed-grounded narrative | Never publishes domain state; never authors Facts |

### 7.4 Narrative adapters

| Adapter | Package | Role |
|---|---|---|
| MVP narrative path | `@fas/report` `narrative/mvp` | Deterministic assembly for V1 Intelligence path |
| Prompt-backed narrative path | `@fas/prompt` + `@fas/ai-provider` | Manifest + adapter rewrite under Report ownership |

AI and narrative adapters **cannot** write Evidence, Feature, Rule, Projection, or seal lineage directly.

---

## 8. Runtime Call Graph

### 8.1 Pre-match Intelligence (complete sequence)

```text
apps/api  (HTTP transport)
  ↓
Application composition  (AnalyzeMatchUseCase @fas/analysis
                          + optional GenerateReportUseCase @fas/report)
  ↓
Evidence  (@fas/evidence: select / qualify Facts at cutoff)
  ↓
Feature   (@fas/feature: extract FeatureBundle)
  ↓
Rule      (@fas/rule: evaluate hierarchical RuleSet)
  ↓
Projection  (@fas/analysis/projection: own probabilities)
  ↓
Scenario    (@fas/analysis/scenario: select from sealed projection)
  ↓
Confidence  (@fas/analysis/confidence: trust sealed distribution)
  ↓
Narrative   (@fas/report + prompt/ai-provider adapters)
  ↓
Report      (@fas/report: seal Match Report + explainability index)
  ↓
Persistence (@fas/database adapters via history/report ports)
```

### 8.2 Post-match / learning (future pins only)

```text
apps/worker
  ↓
Verified Actual (@fas/match + Evidence outcome)
  ↓
EvaluatePredictionUseCase  (Evaluation slot + history)
  ↓
Statistics projections / CalibrationUseCase  (@fas/statistics)
  ↓
EvaluationGatePort
  ↓
Human PromotionUseCase / RollbackUseCase  (API command → application)
  ↓
Future Compatibility Profile pins  (@fas/analysis coordination)
```

Pre-match packages remain **outcome-blind** (doc 17). Calibration/Experiment never rewrite sealed history (A1 / A2 / A2.5).

---

## 9. Dependency Blueprint

### 9.1 Allowed dependencies

```text
apps/api / apps/worker
  → @fas/analysis / @fas/report / @fas/application
       → @fas/feature → @fas/evidence (contracts)
       → @fas/rule → @fas/feature (Feature types only)
       → @fas/analysis projection/scenario/confidence
            → @fas/feature, @fas/rule, @fas/statistics (artifact/pin reader)
       → @fas/report → @fas/analysis, @fas/prompt, @fas/ai-provider
  → @fas/evidence* / @fas/match (import & query)
  → @fas/jobs (enqueue)

@fas/database  ← implements ports from above (adapters depend inward)
@fas/provider-* ← Evidence intake edge only
@fas/config ← ids only
```

### 9.2 Forbidden dependencies

| Forbidden edge | Why |
|---|---|
| `@fas/feature` → Provider SDK / `@fas/provider-*` | Feature consumes Evidence only |
| `@fas/rule` → Evidence tables or Provider JSON | Rules consume FeatureBundle only |
| `@fas/analysis` Projection → raw Evidence reads | Projection uses Feature+Rule (A1.5) |
| `@fas/report` → recompute Feature/Projection | Report seals; does not re-derive |
| Domain packages → `@fas/database` / Prisma | doc 18 |
| `@fas/statistics` → decide release gates | Evaluation owns gates |
| Domain → NestJS / Next.js / Provider SDK / Redis | Freeze / AGENTS |
| New Intelligence Engine package imports | A0 / A4 / B0 |

### 9.3 Composition root

| Root | Wires |
|---|---|
| `apps/api` | HTTP → use-cases; Evidence import priming; port → adapter bindings for request path |
| `apps/worker` | Jobs → Evaluate / Calibration / Experiment / Replay use-cases; same port → adapter bindings |

Composition roots may import adapters. Domain and engine policy packages must not.

---

## 10. Coding Guidelines

Every future Football Intelligence coding sprint must obey:

1. **Gate first** — No production coding until an explicit coding gate/sign-off authorizes the sprint; B1 alone is insufficient.
2. **Freeze homes only** — Implement inside existing packages mapped in B0/B1; do not create Intelligence Engine packages.
3. **Pipeline order** — Preserve Evidence → Feature → Rule → Projection → Scenario → Confidence → Narrative → Report → Persistence.
4. **Ownership** — Projection owns probabilities; Scenario selects; Confidence trusts; Feature derives; Rule evaluates Features; Evidence owns Facts; Analysis coordinates pins; Report seals.
5. **Ports inward** — Domain/application framework-neutral; Prisma only in `@fas/database`; Provider/AI SDKs only in provider/ai-provider packages.
6. **Immutability** — Never rewrite Prediction History or sealed reports via Calibration/Experiment/Promotion.
7. **Future pins only** — Calibration/Experiment/Promotion/Rollback affect subsequent analyses only.
8. **No auto-activation** — AI and Statistics propose; Evaluation gates + human publish/promote (A4).
9. **Honesty** — Preserve trust class, conflicts, freshness, honest absence; fail explicitly; never empty-success on missing Evidence.
10. **Deterministic core** — Rule Engine never delegates deterministic evaluation to AI; AI drafts narrative only.
11. **Tests as acceptance** — Behavior changes require tests; collect executable validation evidence per `DEVELOPMENT_WORKFLOW` / AGENTS.
12. **Scope discipline** — No Bible, Architecture Freeze, docs 17, or docs 18 edits from Intelligence coding sprints unless a separate governance task authorizes them.
13. **Language** — Canonical domain terms; do not use “prediction” as a synonym for analysis workflow stages where Bible distinguishes them.
14. **Small reversible diffs** — Prefer reviewable slices that match one use-case or one pipeline stage.

---

## 11. Acceptance Criteria

This blueprint is complete when all of the following hold:

| # | Criterion | Status target |
|---|---|---|
| 1 | Blueprint between Architecture (B0) and Coding is explicit (§1) | Required |
| 2 | Every listed package has responsibility, public API, layers, ownership (§2) | Required |
| 3 | Suggested directory layouts exist for each package (§3) | Required |
| 4 | Domain model blueprint covers aggregates through specifications (§4) | Required |
| 5 | All eight named use-cases are defined (§5) | Required |
| 6 | Important ports list purpose, owner, I/O, implementer, consumer (§6) | Required |
| 7 | Provider, repository, AI, and narrative adapters are listed (§7) | Required |
| 8 | Full runtime call graph is documented (§8) | Required |
| 9 | Allowed/forbidden dependencies and composition roots are stated (§9) | Required |
| 10 | Coding guidelines for future sprints are stated (§10) | Required |
| 11 | **No code** in this deliverable | Required |
| 12 | **No DTO / schema** design | Required |
| 13 | **No package creation** | Required |
| 14 | **No redesign** of Freeze / Bible Engines | Required |
| 15 | **No Bible / Architecture Freeze / docs 17 / docs 18 edits** | Required |

---

## 12. Authority and next step

| Layer | Document | Role |
|---|---|---|
| Product / architecture law | Project Bible; Architecture Freeze v0.2; docs 17 / 18 | Unchanged by B1 |
| Design | A0–A4 | Requirements and module semantics |
| Architecture mapping | B0 | Concept → package homes |
| **Implementation blueprint** | **B1 (this document)** | Repository organization before coding |
| Coding | Future gated sprints only | Implement inside this blueprint |

**B1 does not authorize production coding.**

This document is the implementation blueprint for all future Football Intelligence coding sprints.

---

## 13. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md) *(read-only)*
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) *(read-only)*
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) *(read-only)*
- [`docs/DEVELOPMENT_WORKFLOW.md`](../../DEVELOPMENT_WORKFLOW.md) *(read-only)*
- [`docs/sprints/A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/sprints/A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md)
- [`docs/sprints/A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md)
- [`docs/sprints/A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md)
- [`docs/sprints/A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md)
- [`docs/sprints/A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md)
- [`docs/sprints/A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md)
- [`docs/sprints/A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md`](../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md)
- [`docs/sprints/A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md`](../A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md)
- [`docs/sprints/A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md`](../A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md)
- [`docs/sprints/A3/A3_FOOTBALL_INTELLIGENCE_EXPLAINABILITY_FRAMEWORK.md`](../A3/A3_FOOTBALL_INTELLIGENCE_EXPLAINABILITY_FRAMEWORK.md)
- [`docs/sprints/A4/A4_FOOTBALL_INTELLIGENCE_GOVERNANCE_FRAMEWORK.md`](../A4/A4_FOOTBALL_INTELLIGENCE_GOVERNANCE_FRAMEWORK.md)
- [`docs/sprints/B0/B0_FOOTBALL_INTELLIGENCE_ARCHITECTURE_MAPPING.md`](../B0/B0_FOOTBALL_INTELLIGENCE_ARCHITECTURE_MAPPING.md)

---

*End of B1 Football Intelligence Implementation Blueprint. Blueprint only — no implementation, no redesign, no coding authorization.*
