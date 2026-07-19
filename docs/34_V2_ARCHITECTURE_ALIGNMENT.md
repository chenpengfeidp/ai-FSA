# V2 Deterministic Analysis — Architecture Alignment

## 1. Document Status

| Field | Value |
|---|---|
| Status | Architecture alignment proposal — design only, not approved, not implemented |
| Kind | Future planning and conflict-resolution artifact |
| Authority | Non-authoritative relative to `docs/00_PROJECT_BIBLE.md`, accepted ADRs, and owning numbered architecture documents |
| V2 inputs reviewed | [30_RULE_ENGINE_V2](./30_RULE_ENGINE_V2.md), [31_PREDICTION_ENGINE_V2](./31_PREDICTION_ENGINE_V2.md), [32_REPORT_ENGINE_V2](./32_REPORT_ENGINE_V2.md), [33_ANALYSIS_PIPELINE_V2](./33_ANALYSIS_PIPELINE_V2.md) |
| Canonical documents reviewed | `00`, `02`, `04`, `05`, `07`, `11`, `14`, `17`, and `18` |
| Implementation | Forbidden by this document; no code, API, database, schema, frontend, backend, or package change is authorized |
| Governance / architecture | This file does not amend the Project Bible, ADRs, canonical architecture, or governance workflow |

### 1.1 Non-authoritative notice

This document answers one planning question:

> How could the deterministic concepts in documents 30–33 fit into the existing FAS architecture without silently creating new engines or a parallel source of truth?

Its conclusions are **proposals for review**, not accepted architecture. Where a proposal conflicts with a higher-authority document, the higher-authority document continues to govern.

No V2 implementation may begin merely because this file exists. The implementation gate in §12 must be satisfied first.

---

## 2. Executive Conclusion

The V2 design direction is compatible with FAS principles, but documents 30–33 currently use three names that could be misread as new governed engines:

- Feature Engine;
- Prediction Engine;
- Report Engine.

The Project Bible and canonical architecture define exactly seven governed engines:

1. Prompt;
2. Knowledge;
3. Rule;
4. Case;
5. Review;
6. Evaluation;
7. Statistics.

Therefore, the proposed alignment is:

| V2 design name | Proposed canonical interpretation | Not interpreted as |
|---|---|---|
| Feature Engine V2 | **Analysis-owned deterministic feature derivation capability** that converts selected normalized Evidence into versioned analysis inputs | An eighth governed engine |
| Prediction Engine V2 | **Analysis-owned deterministic match projection capability** that computes per-match xG, 1X2, scorelines, goal ranges, and recommendation from pinned inputs | A new governed engine or Statistics Engine replacement |
| Report Engine V2 | **Analysis-owned deterministic report assembly capability**, optionally implemented through a supporting package | A new governed engine or AI-generated Analysis Revision |
| Analysis Pipeline V2 | An additive **deterministic analysis profile** coordinated by the existing Analysis Orchestrator | A second orchestrator or replacement for canonical pipeline authority |

This alignment minimizes architectural change:

```text
Evidence module
  → Analysis-owned feature derivation
  → Rule Engine (existing governed engine)
  → Analysis-owned deterministic match projection
  → Analysis-owned deterministic report assembly
  → sealed deterministic report artifact
```

The alignment is not yet implementation-ready because canonical contracts do not currently define:

- the deterministic match projection artifact;
- the deterministic report artifact and its relation to an Analysis Revision;
- the Analysis-owned feature derivation boundary;
- an additive deterministic-only analysis profile that can end without Prompt/AI generation.

Those contract decisions must be approved before implementation.

---

## 3. Authority Baseline

### 3.1 Project Bible constraints

The Project Bible establishes:

- the mission is an AI football analysis platform, not a prediction toy;
- evidence precedes intuition;
- facts, market signals, and inference remain separate;
- every analysis is reviewable;
- the governed engine set contains seven engines;
- AI explains why, not only what.

The deterministic V2 design is consistent with evidence-first and reviewability goals. It is not automatically consistent with engine ownership merely because it is deterministic.

### 3.2 Canonical architecture constraints

The accepted architecture states:

| Constraint | Consequence for V2 |
|---|---|
| Seven governed engines are fixed in V1 | Feature, Prediction, and Report cannot be introduced as engines without an explicit architectural change |
| Analysis Orchestrator is an application service, not an engine | V2 orchestration belongs under existing Analysis ownership |
| Web contains presentation only | Workspace and Library cannot calculate xG, confidence, probabilities, or recommendations |
| Engines communicate through published application contracts | Rule evaluation consumes a declared immutable input view, not another package’s persistence |
| Statistics owns population metrics and rebuildable projections | Per-match outcome projection terminology must be explicitly distinguished |
| Prompt composes frozen selected inputs | A future AI narrative layer consumes deterministic outputs; it does not produce their numbers |

### 3.3 Existing package-boundary constraints

Canonical package ownership currently gives:

- `@fas/evidence`: evidence selection, quality, freshness, conflicts, and provenance;
- `@fas/analysis`: lifecycle, orchestration, snapshots, runs, revisions, claims, citations, validation, and publication;
- `@fas/rule-engine`: governed rule lifecycle and deterministic per-snapshot evaluation;
- `@fas/statistics-engine`: population-level metric definitions, uncertainty, calibration, and rebuildable metric projections.

The current repository also contains thin implementation packages:

- `@fas/feature`;
- `@fas/rule`;
- `@fas/report`;
- `@fas/analysis`.

Existing code is lower authority than canonical documents. The presence of a package does not establish permanent architectural ownership.

---

## 4. Current Implementation Baseline

This alignment must distinguish existing code from the future V2 target.

### 4.1 Current deterministic path

The current implementation performs a thin synchronous flow:

```text
fixture match import
  → MATCH_INFO Evidence
  → three presence Features (homeTeam, awayTeam, kickoff)
  → three presence Rules
  → AnalysisResult
  → basic AnalysisReport
```

### 4.2 Current ownership in code

| Current package | Current role | Architectural observation |
|---|---|---|
| `@fas/feature` | Extracts presence fields from `MATCH_INFO` | Useful implementation seam, but not yet canonicalized as a bounded module |
| `@fas/rule` | Evaluates three presence rules | Precursor implementation, not equivalent to governed `@fas/rule-engine` target |
| `@fas/analysis` | Orchestrates import → evidence → feature → rule | Directionally aligned with Analysis Orchestrator ownership |
| `@fas/report` | Calls analysis and builds a basic report | Supporting package exists, but canonical report ownership is not separately declared as an engine |

### 4.3 What is not implemented

The repository does not yet implement:

- football strength features such as Attack Rating or Defense Rating;
- governed versioned rules from document 30;
- xG or any probability distribution;
- scoreline or goal-range calculation;
- calibrated confidence;
- a V2 projection bundle;
- a sealed V2 Report DTO;
- deterministic replay from full version pins;
- Prompt/AI narrative generation.

The V2 documents describe a future target; they do not document current behavior.

---

## 5. Naming and Terminology Alignment

### 5.1 “Engine” is reserved

Within canonical FAS terminology, “Engine” denotes one of the seven governed capabilities named by the Project Bible.

Until architecture is explicitly amended, V2 planning should use:

| Avoid as canonical name | Use in alignment and implementation planning |
|---|---|
| Feature Engine | Feature derivation capability |
| Prediction Engine | Deterministic match projection capability |
| Report Engine | Deterministic report assembly capability |
| Prediction pipeline as separate engine graph | Deterministic analysis profile under Analysis Orchestrator |

Documents 30–33 may retain their filenames as historical planning artifacts, but implementation specifications must use aligned terminology.

### 5.2 “Prediction” versus “projection”

Use:

- **deterministic match projection** for per-match xG, 1X2, scorelines, and goal ranges;
- **Statistics projection** for population metrics, calibration curves, intervals, and historical performance aggregates;
- **AI inference** for provider-generated structured analytical interpretation.

This prevents a per-match projection component from being confused with the governed Statistics Engine.

### 5.3 “Report” versus “Analysis Revision”

Proposed distinction:

| Artifact | Meaning |
|---|---|
| Deterministic report | Structured, machine-produced assembly of Evidence/Feature/Rule/Projection outputs; contains no AI prose |
| Analysis revision | Canonical validated analytical document that may contain typed AI inference under existing Prompt/AI workflow |
| Published revision | Explicitly published immutable Analysis Revision under canonical lifecycle |

A deterministic report must not silently claim to be a published Analysis Revision.

---

## 6. Proposed Ownership Map

### 6.1 Feature derivation

**Proposed owner:** Analysis domain/application capability.

Rationale:

1. Evidence owns normalized observations and selection, not analytical derivation.
2. Rule Engine canonically consumes exact normalized input values and does not retrieve or manufacture them.
3. Analysis already owns snapshot composition and orchestration.
4. Feature values are reusable deterministic analysis inputs for both Rule evaluation and match projection.

Proposed contract:

```text
Evidence Selection
  → Feature Derivation Port
  → immutable Feature Bundle
       id
       snapshot / evidence-selection references
       feature-definition versions
       values and explanations
       checksum
```

The feature capability must not:

- collect or normalize Evidence;
- evaluate governed Rules;
- generate probabilities;
- access provider payloads directly;
- read time, randomness, network, or filesystem state.

### 6.2 Rule evaluation

**Owner remains:** governed Rule Engine.

The proposed V2 work may extend rule input schemas and rule outcomes only through approved Rule Engine contracts.

Rule Engine must continue to:

- evaluate exact rule versions;
- emit `matched`, `not_matched`, `inapplicable`, or `error`;
- preserve condition-level explanation;
- avoid probabilistic calculation unless a separately governed rule outcome schema explicitly permits a bounded deterministic adjustment.

Rule Engine must not become the owner of xG, Poisson matrices, calibration, or recommendation policy.

### 6.3 Deterministic match projection

**Proposed owner:** Analysis domain/application capability.

Rationale:

- it is per-match computation over one sealed analytical input set;
- it is not population Statistics;
- it is not rule governance or rule evaluation;
- it produces an Analysis-owned artifact consumed by report assembly and optional Prompt composition.

Proposed artifact name:

```text
DeterministicMatchProjection
```

Proposed contents:

- home and away expected goals;
- home/draw/away distribution;
- scoreline distribution and top scorelines;
- goal-range distribution;
- deterministic recommendation code;
- projection-confidence breakdown;
- exact model/calibration references;
- lineage and checksum.

This proposal does not authorize a package named `@fas/prediction-engine`.

### 6.4 Deterministic report assembly

**Proposed owner:** Analysis lifecycle, with report assembly as a supporting pure capability.

An implementation may retain a supporting `@fas/report` package only if later canonical package documentation explicitly allows it and dependency direction remains inward-facing.

Report assembly must:

- copy and organize upstream values;
- validate references and completeness;
- compute canonical serialization/checksums;
- produce a structured deterministic report artifact.

It must not:

- recompute features, rules, projections, confidence, or recommendations;
- generate AI narrative;
- publish an Analysis Revision automatically.

### 6.5 Orchestration

**Owner remains:** `@fas/analysis` Analysis Orchestrator.

No V2 Pipeline Engine is proposed.

The Analysis Orchestrator:

- selects an approved analysis profile;
- invokes published ports in order;
- records exact stage results;
- propagates `blocked`, `failed`, `degraded`, and successful statuses;
- seals artifacts only when the profile’s completeness policy permits.

---

## 7. Proposed Dependency Direction

### 7.1 Logical direction

```text
Evidence selection contract
  ↓
Analysis feature derivation
  ├──────────────→ Rule Engine evaluation port
  │                         ↓
  └──────────────→ Analysis match projection
                              ↓
                  Analysis report assembly
                              ↓
                Deterministic report artifact
                              ↓
        Workspace / Library / optional Prompt context
```

### 7.2 Allowed dependencies

| Consumer | May depend on |
|---|---|
| Feature derivation capability | Evidence published contracts, Match values, Analysis-owned definitions |
| Rule Engine | Feature/input view contracts, domain primitives |
| Match projection capability | Feature bundle, immutable Rule findings, versioned model configuration |
| Report assembly | Immutable Evidence refs, Feature bundle, Rule evaluation set, Match projection |
| Web | Report/query DTO contracts only |

### 7.3 Forbidden dependencies

- Evidence importing Analysis, Rule, projection, or report code;
- Rule Engine importing projection/report implementations;
- projection capability reading Rule persistence or Evidence tables;
- report assembly importing provider SDKs;
- Web importing domain/engine implementation packages;
- circular package references;
- Report calling Feature/Rule/Projection to “fill” missing fields.

---

## 8. Pipeline Alignment

### 8.1 Canonical V1 pipeline

The authoritative V1 path currently includes:

```text
Readiness
→ Evidence selection
→ Knowledge
→ Rule
→ Case
→ Seal snapshot
→ Prompt composition
→ AI generation
→ Validation
→ Publication
→ later Review / Evaluation / Statistics
```

### 8.2 Proposed additive deterministic profile

Documents 30–33 imply an additional path:

```text
Readiness
→ Evidence selection
→ Feature derivation
→ Rule evaluation
→ Deterministic match projection
→ Deterministic report assembly
→ Seal deterministic report
```

This path must be treated as an **additive analysis profile**, not a silent replacement for the canonical AI workflow.

### 8.3 Relationship between profiles

Proposed model:

| Profile | Terminal artifact | AI required |
|---|---|---|
| `deterministic_report` | Sealed deterministic report | No |
| `ai_analysis` | Validated/published Analysis Revision | Yes |
| Future combined profile | Deterministic report feeds Prompt context; AI produces validated interpretation | Yes, after deterministic stages |

The combined future profile is:

```text
deterministic report
  → Prompt composition (report references + sealed context)
  → AI structured interpretation
  → validation
  → explicit publication
```

AI may explain the deterministic report but cannot modify its sealed values.

### 8.4 Canonical conflict requiring review

Current canonical pipeline does not explicitly authorize a deterministic-only terminal report profile. Therefore:

- it may be designed and specified;
- it may not be claimed as accepted production architecture;
- implementation requires canonical contract updates and approval first.

---

## 9. Statistics and Calibration Boundary

### 9.1 Per-match projection is not Statistics projection

| Deterministic match projection | Statistics projection |
|---|---|
| One match, one cutoff, one sealed input set | Declared population of historical immutable records |
| Produces xG, 1X2, scoreline and goal-range distribution | Produces Brier score, calibration bins, reliability, intervals, population metrics |
| Proposed Analysis-owned capability | Statistics Engine-owned |
| Used before kickoff | Usually refreshed from reviewed/post-match records |

### 9.2 Calibration ownership

Proposed split:

- Statistics Engine computes historical calibration metrics/maps and qualification metadata from immutable reviewed populations.
- Analysis-owned match projection consumes an **exact qualified calibration artifact reference** if policy permits.
- Match projection does not train, refresh, or select a new calibration map during a run.
- Evaluation determines whether a calibration artifact satisfies release policy; Statistics does not approve it.

### 9.3 Initial vertical slice

The first deterministic vertical slice should use an explicitly versioned uncalibrated baseline (for example, independent Poisson) and label limitations. It must not claim validated predictive accuracy before historical calibration evidence exists.

---

## 10. Report and Presentation Alignment

### 10.1 Report artifact boundary

The deterministic report is an immutable Analysis-owned artifact with:

- exact upstream references;
- schema and assembler versions;
- content checksum;
- no generated AI prose;
- no publication status implied merely by construction.

### 10.2 Workspace

Workspace remains presentation-only:

- renders report DTO values;
- displays lineage and limitations;
- formats percentages without changing underlying values;
- does not calculate confidence, xG, scorelines, or recommendations.

### 10.3 Library

Analysis Library indexes report identities and presentation metadata. A future durable library must reference sealed report IDs; local browser history is not authoritative report persistence.

### 10.4 Analysis Session

The existing presentation-stage timeline is not authoritative pipeline execution status. A future integration may display real stage events from Analysis orchestration, but it must not infer completion solely from timers.

---

## 11. Decision Register

### 11.1 Proposed decisions for human review

| ID | Question | Proposed answer | Status |
|---|---|---|---|
| VA-01 | Is Prediction a new governed engine? | No; Analysis-owned deterministic match projection capability | Accepted for planning of document 35 |
| VA-02 | Is Feature a new governed engine? | No; Analysis-owned deterministic feature derivation capability | Accepted for planning of document 35 |
| VA-03 | Is Report a new governed engine? | No; Analysis-owned deterministic assembly capability | Accepted for planning of document 35 |
| VA-04 | Who orchestrates V2? | Existing Analysis Orchestrator | Accepted for planning of document 35 |
| VA-05 | Does deterministic report replace AI analysis? | No; additive profile/artifact | Accepted for planning of document 35 |
| VA-06 | Who owns historical calibration computation? | Statistics Engine; Evaluation qualifies; Analysis consumes exact approved artifact | Accepted for planning of document 35 |
| VA-07 | Can Rule Engine calculate probabilities? | No; it emits governed deterministic findings/adjustments only | Accepted for planning of document 35 |
| VA-08 | Can UI calculate projections? | No; UI renders DTOs only | Accepted for planning of document 35 |
| VA-09 | Can existing `@fas/feature` and `@fas/report` packages remain? | Yes for the first vertical slice: reuse `@fas/feature`, `@fas/rule`, `@fas/report`, and `@fas/analysis`; do not create new engine packages | Accepted for planning of document 35 |
| VA-10 | Is an ADR required? | No new ADR for this slice if no eighth engine, no system-shape change, and no replacement of the canonical AI workflow; canonical amendments to owning docs remain required before implementation | Accepted for planning of document 35 |

Planning acceptance of VA-01 through VA-10 authorized writing [35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION](./35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION.md). Canonical amendments corresponding to §12.1 have been applied to `02`, `04`, `07`, `14`, and `17`. Remaining gate items before code are architecture review of dependency direction and explicit implementation authorization.

### 11.2 Decisions explicitly deferred

- exact package layout;
- database representation;
- API commands/resources;
- job/synchronous execution choice;
- exact state-machine persistence;
- model formulas and coefficients beyond documents 30/31;
- report DTO transport schema;
- Prompt integration timing.

---

## 12. Required Alignment Before Implementation

### 12.1 Canonical documents likely affected

If the proposed alignment is accepted, implementation still requires authorized updates to owning documents:

| Document | Required clarification before implementation | Status |
|---|---|---|
| `02_DOMAIN_MODEL.md` | Deterministic match projection/report artifacts and ownership under Analysis | Amended |
| `04_ARCHITECTURE.md` | Additive deterministic analysis profile; confirm no new governed engines | Amended |
| `07_RULE_ENGINE.md` | Exact boundary for feature inputs and bounded rule channel findings | Amended |
| `12_DATABASE.md` | Only if durable artifact persistence is in scope | Deferred (first slice may use existing analyze response without new persistence) |
| `13_API.md` | Only if new commands/resources are exposed | Deferred until transport field changes are implemented |
| `14_MONOREPO.md` | Accepted package ownership (`@fas/feature`, `@fas/report`, or Analysis-internal alternatives) | Amended |
| `17_ANALYSIS_PIPELINE.md` | Stage order, failure semantics, seal point, relation to Prompt/AI profile | Amended |
| `18_BACKEND_ARCHITECTURE.md` | Runtime composition only if execution placement changes | Deferred unless composition placement changes |

Owning-document amendments for the first vertical slice are in place. This alignment document remains non-authoritative relative to those owning documents.

### 12.2 ADR decision test

Create or amend an ADR before implementation if any accepted plan:

1. adds an eighth governed engine;
2. changes the modular-monolith/system shape;
3. replaces the canonical AI analysis workflow rather than adding a profile;
4. moves Statistics-owned population projection/calibration computation into Analysis;
5. introduces new infrastructure (Redis, BullMQ, pgvector, new service boundary);
6. establishes a durable package boundary not reconcilable with current package authority.

If none applies, an architecture review may conclude that canonical-document amendments plus an approved implementation specification are sufficient.

### 12.3 Implementation gate

Implementation may begin only after:

1. VA-01 through VA-08 receive explicit human acceptance or revision — **satisfied for planning** (see §11.1);
2. VA-09 package placement is resolved — **satisfied for planning** (`@fas/feature`, `@fas/rule`, `@fas/report`, `@fas/analysis`);
3. the ADR decision test is completed — **no new ADR required** under the accepted framing;
4. affected canonical documents are updated under normal authority order — **done** for `02`/`04`/`07`/`14`/`17`;
5. a first vertical-slice specification defines scope, exclusions, formulas, contracts, files/areas, and acceptance evidence — **done** in document 35;
6. architecture review signs off dependency direction and no duplicate computation — **done** (recorded in document 35 §14.1);
7. explicit implementation authorization for the first vertical slice — **done**.

Documents 30–35 remain design/specification aids. Owning numbered documents above them are authoritative for the amended contracts. Implementation of document 35 is authorized.

---

## 13. Recommended First Vertical Slice Boundary

This section is non-binding guidance for the next specification, not implementation authorization.

### 13.1 Include

| Layer | Initial scope |
|---|---|
| Evidence | Existing `MATCH_INFO` plus controlled fixtures for `TEAM_FORM` and `STATISTICS` |
| Feature derivation | Attack Rating, Defense Rating, Momentum, Home Advantage |
| Rules | Home/Away attack edge, Home/Away momentum, material home advantage |
| Match projection | Home/Away xG, independent Poisson, 1X2, top 3 scorelines, `0-1` / `2-3` / `4+` |
| Recommendation | `lean_home`, `lean_away`, `lean_draw`, `cautious`, `insufficient_evidence` |
| Report | Minimum structured DTO with overview, features, rules, projection, confidence, recommendation, lineage/version appendix |
| Verification | Golden fixtures, probability invariants, deterministic replay checks |

### 13.2 Exclude

- live providers;
- injury, lineup, weather, travel, referee, and news;
- bivariate Poisson and Monte Carlo;
- market blending;
- historical calibration;
- Prompt/LLM narration;
- durable jobs or new infrastructure;
- frontend redesign;
- automatic publication.

### 13.3 Product claim after the slice

Permitted claim:

> The system produces a reproducible deterministic football projection from controlled structured inputs.

Prohibited claim:

> The model is calibrated, production-accurate, or validated for real-world decision making.

---

## 14. Risks and Stop Conditions

| Risk | Required response |
|---|---|
| New “Prediction Engine” is introduced without Project Bible change | Stop; authority conflict |
| Feature calculation is duplicated in Rule and Analysis | Stop; assign one owner |
| Report recomputes probabilities | Stop; consume projection bundle only |
| Statistics calibration is copied into match projection | Stop; restore owner boundary |
| AI is asked to supply missing deterministic values | Stop; block/degrade explicitly |
| UI derives winner/confidence from counts | Remove when V2 DTO is integrated; render authoritative fields |
| Existing implementation package is treated as canonical proof | Stop; resolve against owning documents |
| Deterministic-only path is implemented without canonical pipeline acceptance | Stop; update/approve owning contracts first |

---

## 15. Out of Scope

This alignment document does not:

- implement any code;
- define APIs, database schemas, or migrations;
- add packages or dependencies;
- approve architecture changes;
- update canonical documents;
- replace documents 30–33;
- define exact statistical coefficients;
- design Prompt text;
- authorize frontend/backend changes;
- claim production readiness or predictive accuracy.

---

## 16. Alignment Outcome

The V2 deterministic design can proceed without creating new governed engines if it is reframed as:

```text
Evidence-owned normalized inputs
  → Analysis-owned feature derivation
  → existing governed Rule Engine
  → Analysis-owned deterministic match projection
  → Analysis-owned deterministic report assembly
  → optional future Prompt/AI interpretation
```

This is the recommended alignment for human review.

The next document, after acceptance of the decisions above, should be:

```text
docs/35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION.md
```

That specification must translate the accepted ownership decisions into a small, testable, explicitly authorized delivery scope.

This document alone is not an implementation gate.
