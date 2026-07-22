# B0 — Football Intelligence Architecture Mapping

| Field | Value |
|---|---|
| Sprint id | **B0** |
| Document type | Architecture Mapping (design bridge only) |
| Purpose class | Map A0–A4 Intelligence designs onto Architecture Freeze **v0.2** |
| Governing | Project Bible; Architecture Freeze **v0.2**; docs 17 / 18 (read-only) |
| Design inputs | A0, A0.5, A1, A1.5, A1.8, A1.9, A1.10, A1.11, A2, A2.5, A3, A4 |
| Status | Mapping complete — **does not authorize coding** |
| Explicitly excluded | Production code; DTOs; schemas; implementation; package creation; redesign; Bible / Freeze / docs 17 / docs 18 edits |

---

## 1. Purpose

Answer:

> How should the current Football Intelligence design (A0–A4) be implemented **inside** the existing architecture?

This document is an **Architecture Mapping layer** between:

```text
Design (A-series)
  → Architecture Mapping (B0)   ← this document
  → Implementation (future coding gates)
```

It **maps** Intelligence concepts onto existing packages, layers, pipelines, and ownership.  
It does **not** redesign Architecture Freeze, invent Engines, or create packages.

---

## 2. Architecture Mapping Principles

| Principle | Meaning |
|---|---|
| **Freeze is authoritative** | Package map and dependency direction come from Freeze v0.2 / docs 17–18 |
| **Bible Engines unchanged** | Prompt, Knowledge, Rule, Case, Review, Evaluation, Statistics remain seven; Intelligence modules are not Engines (A0 / A4) |
| **Map, don’t invent** | Every A-series concept lands in an existing home |
| **Analysis coordinates** | Orchestrates pre-match Intelligence and pin selection; does not own Evidence/Feature/Rule definitions |
| **Ports inward** | Domain/application stay framework-neutral; Nest/Prisma/Provider SDKs stay at edges |
| **Seal immutability** | Prediction History / sealed reports are not rewritten by Calibration/Experiment (A1 / A2 / A2.5) |
| **Honesty first** | Reliability and honest absence remain Evidence/Feature/Rule concerns (A1.9 / A1.10 / A1.8) |
| **No parallel architecture** | No shadow packages, no “Intelligence Engine”, no bypass of docs 17 pipeline stages |

---

## 3. Package Ownership Mapping

### 3.1 Primary mapping (requested packages)

| Intelligence concept (A-series) | Existing package | Mapping note |
|---|---|---|
| Evidence Facts, trust class, selection, conflicts, freshness | **`@fas/evidence`** | A1.9 reliability; cutoff-qualified selection (doc 17) |
| FeatureBundle, FeatureModelVersion, extractors | **`@fas/feature`** | A1.10; Analysis-owned capability living in feature package (A0) |
| Rule findings, RuleSetVersion, hierarchy metadata | **`@fas/rule`** | A1.8; interim home → future `@fas/rule-engine` slot already in Freeze |
| Projection, Scenario, Confidence, AnalyzeMatch orchestration, Compatibility Profile pin enforcement | **`@fas/analysis`** | A1.5 / A1.11 / A2.5 coordination |
| Narrative assembly, Match Report seal, explainability index | **`@fas/report`** | A0.5 / A3 |
| Calibration projections, artifact records, population metrics | **`@fas/statistics`** | A1 metrics + A2 artifacts (Evaluation methodology remains Evaluation Engine) |
| Persistence of seals, history, jobs state (when implemented) | **`@fas/database`** | Sole Prisma/persistence owner (doc 18) |
| HTTP transport for analyze / future history/eval commands | **`apps/api`** | Controllers map transport → application ports |
| Durable post-match / calibration / experiment jobs | **`apps/worker`** | Long-running handlers; no inline heavy work in API (doc 18) |

### 3.2 Related existing packages (already in repo / Freeze — not new)

| Concern | Existing home | Role in Intelligence |
|---|---|---|
| Evidence normalization | `@fas/evidence-normalizer` | Provider shape → Evidence Facts |
| Evidence query | `@fas/evidence-query` | Read path for selection/query |
| Evidence import application | `@fas/evidence-import` / `@fas/application` | Import coordination already used by analyze path |
| Match identity / results | `@fas/match` | MatchId, result-version references |
| Football-data providers | `@fas/provider-football` (+ odds/scores providers as today) | Raw captures at edge only (A1.9) |
| Prompt composition | `@fas/prompt` | Narrative manifest composition (A3) |
| Local/AI narrative adapters | `@fas/ai-provider` | Untrusted rewrite / local deterministic narrator |
| Shared application ports | `@fas/application` | Cross-app use-case types where already present |
| Config | `@fas/config` | Env/config only |

**Do not create** `packages/feature-engine`, `packages/calibration-engine`, `packages/experimentation-engine`, or `packages/explainability-engine` (A0 / A2 / A2.5 / A3 / A4).

### 3.3 Bible Engine → package slot (unchanged Freeze intent)

| Bible Engine | Freeze target package | Intelligence use |
|---|---|---|
| Rule Engine | `@fas/rule` → `@fas/rule-engine` | Hierarchical RuleSets (A1.8) |
| Evaluation Engine | `@fas/evaluation-engine` (target slot) | Gates for Evaluation / Calibration / Experiment promotion (A1 / A2 / A2.5) |
| Statistics Engine | `@fas/statistics` → `@fas/statistics-engine` | Metrics + calibration projections |
| Review Engine | `@fas/review-engine` (target slot) | Optional human post-match (out of MVP coding) |
| Prompt / Knowledge / Case | existing engine slots | Not required for deterministic Intelligence path; later AI profile |

---

## 4. DDD Layer Mapping

| Layer | What lives here for Intelligence | Examples |
|---|---|---|
| **Domain** | Pure types, invariants, version identities, hierarchy labels, status unions | FeatureBundle, RuleResult, ScenarioSet, Confidence block, trust class labels |
| **Application** | Use-cases, orchestration ports, pin enforcement, result types | `AnalyzeMatchUseCase`, GenerateMatchReport, future Comparison/Replay/Experiment coordinators |
| **Ports** | Inward interfaces | FeatureExtractionOperation, RuleEvaluationOperation, EvidenceByMatchQuery, StatisticsProjectionReader, Evaluation gate port |
| **Adapters** | Implement ports at edges | Prisma repos in database package; Recorded/live football providers; LocalDeterministicNarrativeAdapter |
| **Infrastructure** | Persistence, jobs, object storage, observability | `@fas/database`, `@fas/jobs`, worker handlers |
| **Interfaces** | Transport DTOs/controllers (future coding — not designed here) | `apps/api` Nest controllers |
| **Composition Root** | Wire ports to adapters | `apps/api` EvidenceModule / app module; `apps/worker` module |

### 4.1 Layer rules (Freeze-aligned)

- Domain imports no Nest / Prisma / Provider SDK / Redis.  
- Application depends on ports + domain contracts, not controllers.  
- Adapters depend inward; never leak Prisma/SDK types as Intelligence contracts.  
- Composition roots may import adapters; domain packages must not.

---

## 5. Runtime Pipeline Mapping

```text
Evidence
  ↓
Feature
  ↓
Rule
  ↓
Projection
  ↓
Scenario
  ↓
Confidence
  ↓
Narrative
  ↓
Report
```

| Step | Owner package | Application home | Doc refs |
|---|---|---|---|
| **Evidence** (select / qualify) | `@fas/evidence` (+ normalizer/import path) | Import + query use-cases; readiness inputs | A1.9; doc 17 §3.2 / §4.2–4.3 |
| **Feature** | `@fas/feature` | Invoked by Analysis use-case | A1.10; doc 17 Feature derivation |
| **Rule** | `@fas/rule` | Invoked by Analysis use-case | A1.8; doc 17 Rule stage |
| **Projection** | `@fas/analysis` (`projection/`) | Inside AnalyzeMatch / projection policy | A1.5 |
| **Scenario** | `@fas/analysis` (`scenario/`) | After Projection; selection only | A1.5 / A0.5 |
| **Confidence** | `@fas/analysis` (`confidence/`) | After Projection/Scenario; consumes sealed distribution | A1.5 / A0.5 / A2 pin |
| **Narrative** | `@fas/report` (+ `@fas/prompt` / `@fas/ai-provider`) | ReportBuilder / narrative MVP | A3 / A0.5 |
| **Report** | `@fas/report` | `GenerateMatchReportUseCase` | A0.5; doc 17 deterministic_report |

### 5.1 Post-match pipeline (mapped, not redesigned)

```text
Verified Actual (@fas/match + Evidence outcome)
  → Comparison / History (Analysis application coordination)
  → Evaluation Engine slot (gates/reports)
  → Statistics (@fas/statistics metrics / calibration projections)
  → Calibration candidates (A2) / Experiment outcomes (A2.5)
  → Human promotion → future Compatibility Profile pins (@fas/analysis coordination)
```

Pre-match packages remain outcome-blind (doc 17).

---

## 6. Module Dependency Mapping

### 6.1 Allowed dependencies (Intelligence path)

```text
apps/api / apps/worker
  → @fas/analysis / @fas/report / @fas/application
       → @fas/feature → @fas/evidence (contracts only as needed)
       → @fas/rule → @fas/feature (Feature types only)
       → @fas/analysis projection/scenario/confidence
            → @fas/feature, @fas/rule, @fas/statistics (artifact reader)
       → @fas/report → @fas/analysis, @fas/prompt, @fas/ai-provider
  → @fas/evidence* / @fas/match (import & query)
Infrastructure adapters:
  @fas/database ← implements ports from above
  @fas/provider-* ← Evidence intake edge only
```

### 6.2 Forbidden dependencies

| Forbidden | Why |
|---|---|
| `@fas/feature` → Provider SDK / `@fas/provider-*` | A1.9 / A1.10: Feature consumes Evidence only |
| `@fas/rule` → `@fas/evidence` tables or Provider JSON | Rules consume FeatureBundle only |
| `@fas/analysis` Projection → raw Evidence reads | A1.5 |
| `@fas/report` → recompute Feature/Projection | doc 17; A3 |
| Domain → `@fas/database` / Prisma | doc 18 |
| `@fas/statistics` → decide release gates | Evaluation owns gates (A1 / A2) |
| Narrative/LLM → write Evidence Facts | A1.9 |
| Any Intelligence module → new cross-module table coupling | Freeze |

---

## 7. Application Service Mapping

| Concern | Belongs in | Does not belong in |
|---|---|---|
| Pre-match AnalyzeMatch (Evidence→…→AnalysisResult) | **`@fas/analysis` application** | Controllers embedding pipeline logic |
| Report seal / narrative assembly | **`@fas/report` application** | Recomputing projections in API |
| Compatibility Profile pin selection for a run | **`@fas/analysis` application** | Feature/Rule packages |
| HTTP request/response mapping, OpenAPI | **`apps/api`** | Domain policy decisions |
| Priming providers / import triggers before analyze | **`apps/api` bridges** calling application/import ports (as today) | Projection math in controllers |
| Post-match Comparison job, Evaluation run, Statistics refresh, Calibration fit, Experiment assignment | **`apps/worker`** handlers invoking application/engine ports | Synchronous heavy work in API request thread |
| Human promotion commands (calibration/experiment defaults) | **`apps/api` command → worker/application** | Auto-promotion inside Statistics |

### 7.1 Orchestration sentence (binding)

> **Analysis** orchestrates the deterministic Intelligence pipeline and version pins. **API** adapts transport. **Worker** runs durable post-match and offline jobs. Domains keep their definitions.

---

## 8. Infrastructure Mapping

| Infra concern | Existing home | Intelligence mapping |
|---|---|---|
| **Persistence** | `@fas/database` | Future storage for Prediction History, comparison, pins, artifacts metadata — via ports only |
| **Jobs** | `@fas/jobs` + `apps/worker` | Evaluation refresh, calibration offline validation, experiment arms, replay jobs |
| **Football / odds / scores Providers** | `@fas/provider-football`, `@fas/provider-odds`, related | Raw captures → Evidence intake; never Feature/Rule/Projection direct |
| **AI Providers** | `@fas/ai-provider` | Narrative rewrite / local deterministic narrator only; never Fact author |
| **Config** | `@fas/config` | Selects approved Compatibility Profile / artifact **ids**; does not redefine policy semantics (doc 18 config rules) |
| **Object storage** (if used for artifacts) | Freeze-assigned storage package when present | Calibration artifact bytes — not a new Intelligence package |

No Redis/BullMQ/pgvector introduction is authorized by this mapping document.

---

## 9. Cross-cutting Concerns

| Concern | Design home (A-series) | Architecture mapping |
|---|---|---|
| **Versioning** | A1.11 | Version **definitions** in owning packages; **pin enforcement** in `@fas/analysis` application; persistence via `@fas/database` ports |
| **Evaluation** | A1 | Evaluation Engine slot (+ Statistics projections); worker jobs; API queries |
| **Calibration** | A2 | Statistics artifact/projection + Evaluation gates; Analysis consumes approved artifact id on future runs |
| **Experimentation** | A2.5 | Analysis coordinates arms/profiles; Evaluation judges; worker executes offline/shadow/canary jobs |
| **Explainability** | A3 | Sealed fields from each domain; assembly in `@fas/report`; no explainer package |
| **Governance** | A4 | Process gates (Design / Coding / Architecture Review); no runtime Engine |

Cross-cutting concerns **do not** justify new packages; they compose existing ports.

---

## 10. Architecture Constraints

1. No new Bible Engine; no new package from B0.  
2. No edits to Bible, Architecture Freeze, docs 17, or docs 18 by this document.  
3. No redesign of ports/adapters beyond mapping intent.  
4. Deterministic Intelligence path remains the additive `deterministic_report` profile specialization (doc 17).  
5. Market/AI never become Facts; Projection never reads raw Evidence.  
6. Historical seals immutable under Calibration/Experiment promotion.  
7. Prisma only inside `@fas/database`; Provider SDKs only in provider/ai-provider packages.  
8. V1 private environment constraints (no auth/public commercialization) remain Freeze-bound.  
9. Implementation requires a later Coding Gate (A4); B0 alone is not authorization to code.

---

## 11. DDD Ownership

| Bounded context / capability | Owner | Package |
|---|---|---|
| Evidence | Evidence | `@fas/evidence` |
| Feature derivation | Feature (Analysis-owned capability) | `@fas/feature` |
| Rule evaluation | Rule Engine | `@fas/rule` |
| Match projection / scenario / confidence | Analysis | `@fas/analysis` |
| Report / narrative | Report | `@fas/report` |
| Statistics projections / calibration artifacts | Statistics | `@fas/statistics` |
| Evaluation gates | Evaluation Engine | target evaluation-engine slot |
| Transport | API | `apps/api` |
| Durable execution | Worker + Jobs | `apps/worker`, `@fas/jobs` |
| Persistence | Database infra | `@fas/database` |

Analysis **coordinates**; it does **not** absorb Feature/Rule/Evidence ownership (A4 / A1.11).

---

## 12. Acceptance Criteria

This mapping document is accepted when:

1. Every A0–A4 Intelligence concept has an explicit existing package/home in §§3–9.  
2. Runtime pipeline steps each have a single ownership row (§5).  
3. Allowed/forbidden dependencies are stated without inventing new edges that violate Freeze (§6).  
4. API vs Analysis vs Worker responsibilities are separated (§7).  
5. Cross-cutting Versioning / Evaluation / Calibration / Experiment / Explainability / Governance map to existing homes without new packages (§9).  
6. Document remains design-only: no code, DTO, schema, Freeze/Bible/docs 17–18 edits, and no architecture redesign.

### Deliverable checklist

| Deliverable | Status |
|---|---|
| Purpose / Mapping principles | **Done** |
| Package ownership mapping | **Done** |
| DDD layer mapping | **Done** |
| Runtime pipeline mapping | **Done** |
| Dependency mapping | **Done** |
| Application service mapping | **Done** |
| Infrastructure mapping | **Done** |
| Cross-cutting mapping | **Done** |
| Constraints / DDD ownership / Acceptance | **Done** |
| Implementation / redesign / new packages | **Out of scope** |

---

## 13. A-series → Freeze quick index

| A-series doc | Primary Freeze landing |
|---|---|
| A0 / A0.5 | `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report` |
| A1 Evaluation | Evaluation Engine slot + `@fas/statistics` + Analysis history coordination |
| A1.5 Projection | `@fas/analysis` projection/scenario/confidence |
| A1.8 Rules | `@fas/rule` |
| A1.9 Evidence | `@fas/evidence` (+ normalizer/providers edge) |
| A1.10 Features | `@fas/feature` |
| A1.11 Versioning | Domain packages define; `@fas/analysis` pins |
| A2 Calibration | `@fas/statistics` + Evaluation; Analysis consumes pins |
| A2.5 Experiment | `@fas/analysis` coordination + Evaluation + worker |
| A3 Explainability | Sealed domain fields + `@fas/report` |
| A4 Governance | Process over Freeze — no new runtime package |
| **B0** | This mapping bridge |

---

## 14. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md) *(read-only)*
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) *(read-only)*
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) *(read-only)*
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
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of B0 Football Intelligence Architecture Mapping. Mapping only — no implementation, no redesign.*
