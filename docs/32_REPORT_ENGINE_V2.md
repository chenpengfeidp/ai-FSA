# Report Engine V2 — Deterministic Analysis Report Design

## 1. Document Status

| Field | Value |
|---|---|
| Status | Design only — not implemented |
| Kind | Future engine design / planning artifact |
| Authority | Non-authoritative relative to `docs/00_PROJECT_BIBLE.md`, ADRs, and owning numbered contracts (`02`, `04`, `07`, `13`, `17`, etc.) |
| Companion documents | Complements [30_RULE_ENGINE_V2](./30_RULE_ENGINE_V2.md) and [31_PREDICTION_ENGINE_V2](./31_PREDICTION_ENGINE_V2.md); does not supersede them |
| Implementation | Forbidden by this task; no code, API, schema, database, UI, or runtime changes are implied |
| Governance / architecture | This file does not amend governance documents, architecture documents, existing ADRs, or the Project Bible |

This document designs **Report Engine V2**: the deterministic stage that **assembles** sealed upstream outputs into a structured, reviewable Analysis Report.

Epistemic note: “prediction” appears only as a product label for **deterministic projections** already produced upstream. The Report Engine does not create predictions, facts, or AI inference.

### Non-authoritative notice

This file is a planning artifact. It must not be treated as an implementation gate, contract override, or permission to change V1 report builders, APIs, or persistence. Adoption requires a separate authorization that updates owning canonical documents when needed.

### Place in the V2 design set

```text
30_RULE_ENGINE_V2.md       → features, rules, confidence components
31_PREDICTION_ENGINE_V2.md → xG, probabilities, scorelines, recommendation
32_REPORT_ENGINE_V2.md     → assemble those outputs into a reviewable report (this document)
```

### End-to-end pipeline (assembly view)

```text
Evidence
  → Feature
  → Rule
  → Prediction (deterministic projections)
  → Report   ← Report Engine V2 owns only this step
```

---

## 2. Report Engine Responsibility

### 2.1 What Report Engine V2 owns

| Responsibility | Meaning |
|---|---|
| Report assembly | Combine sealed upstream bundles into one immutable report document |
| Section composition | Map upstream artifacts into a stable section hierarchy |
| Report DTO contract | Define the structured object consumers read (design-level shape) |
| Explainability references | Preserve and surface IDs/checksums that link sections to upstream nodes |
| Rendering contract | Specify what presentation layers may display and what they must not recompute |
| Report identity & checksums | Assign report version, content checksum, and trace identifiers for replay |
| Completeness validation | Verify required upstream references exist before sealing a report |
| Presentation-neutral formatting hints | Optional display ordinals, section keys, severity labels — never new analytics |

### 2.2 What Report Engine V2 does **not** own

| Non-responsibility | Owning design / context |
|---|---|
| Evidence collection, normalization, quality | Evidence / Normalizer / Provider |
| Feature calculation | Rule Engine V2 feature catalog (doc 30) |
| Rule evaluation or rule governance | Rule Engine V2 |
| Expected goals, 1X2, scorelines, calibration | Prediction Engine V2 (doc 31) |
| Confidence arithmetic | Confidence model in docs 30/31 (Report only **embeds** the result) |
| AI narration, prompts, LLM calls | Prompt Engine / future narrative layer |
| Human publication approval policy | Analysis / Review governance (outside this design) |
| Statistics release decisions | Statistics Engine |
| UI layout systems, CSS, routing | Presentation applications |

### 2.3 One-line mandate

> Report Engine V2 organizes deterministic outputs into a reviewable report. It does not calculate, infer, or narrate.

### 2.4 Relationship to companion engines

| Concern | Rule Engine V2 | Prediction Engine V2 | Report Engine V2 |
|---|---|---|---|
| Compute features / rules | Yes | No | No |
| Compute projections | Sketch / channel deltas | Yes | No |
| Assemble sections | No | Hands off bundle | Yes |
| Store explainability edges | Emits rule/feature traces | Emits projection traces | Indexes and presents traces |
| Change numeric outcomes | Yes (within its domain) | Yes (within its domain) | **Never** |

---

## 3. Report Architecture

### 3.1 Section hierarchy

```text
Overview
  → Team Comparison
  → Key Evidence
  → Feature Summary
  → Rule Findings
  → Prediction
  → Risk Factors
  → Confidence
  → Recommendation
  → Appendix
```

Sections are ordered for human review. Omitted optional sections must be explicit (`absent` with reason), never silently dropped when required upstream data exists.

### 3.2 Section catalog

#### 3.2.1 Overview

| Field | Design |
|---|---|
| Purpose | Orient the reader: fixture identity, headline projection lean, confidence band, report status. |
| Inputs | `MATCH_INFO` (or match catalog snapshot); Prediction summary (`pHome`/`pDraw`/`pAway` or top outcome); Confidence scalar + clamp flags; report metadata. |
| Outputs | Title block, teams, competition, kickoff, headline outcome label, confidence badge, report id/version. |
| Consumers | Web workspace hero, library cards, export cover page, review queues. |

#### 3.2.2 Team Comparison

| Field | Design |
|---|---|
| Purpose | Side-by-side comparison of deterministic team features (attack, defense, momentum, availability, etc.). |
| Inputs | Feature bundle for home/away (pinned feature versions). |
| Outputs | Comparison rows: feature key, home value, away value, optional delta, feature explanation fragments. |
| Consumers | Analyst UI comparison panels; PDF “teams” page. |

#### 3.2.3 Key Evidence

| Field | Design |
|---|---|
| Purpose | Surface the most material evidence items supporting the analysis, with provenance — not a raw dump of every record. |
| Inputs | Cutoff-qualified evidence selection; optional importance ranking produced upstream or by a pinned selection policy **outside** Report (Report only applies an already-ranked list or a declared citation set from features/rules). |
| Outputs | Ordered evidence cards: type, subject, summary fields, quality/freshness, provenance refs, link into lineage. |
| Consumers | Evidence timeline UI; review “what was known at cutoff.” |

Report must not invent importance scores. If no ranking is supplied, it lists cited evidence IDs from the explainability graph (features/rules/prediction) in stable ID order and labels the list “citation-ordered,” not “importance-ranked.”

#### 3.2.4 Feature Summary

| Field | Design |
|---|---|
| Purpose | Present the full (or policy-filtered) feature set with values, ranges, and short explanations. |
| Inputs | Feature Engine / Rule Engine V2 feature outputs. |
| Outputs | Feature table or grouped panels; missing-feature markers; feature version ids. |
| Consumers | Power-user workspace; debugging; explainability drill-down. |

#### 3.2.5 Rule Findings

| Field | Design |
|---|---|
| Purpose | Show which rules matched, not-matched, or were inapplicable, with weights and explanations. |
| Inputs | Rule evaluation records from Rule Engine V2. |
| Outputs | Finding list: rule identity/version, status, weight, explanation, affected projection channels. |
| Consumers | Rule panel UI; reviewers validating deterministic rationale. |

#### 3.2.6 Prediction

| Field | Design |
|---|---|
| Purpose | Display deterministic projections: 1X2, top scorelines, goal ranges, xG foundation values. |
| Inputs | Prediction Engine V2 projection bundle. |
| Outputs | Probability bars; top-3 scorelines; goal-range distribution; `λh`/`λa` readout; model version labels. |
| Consumers | Primary prediction section of the workspace; library quick preview (subset). |

#### 3.2.7 Risk Factors

| Field | Design |
|---|---|
| Purpose | Highlight conditions that increase uncertainty or reverse-lean risk (availability hits, market conflict, travel fatigue, contradictions). |
| Inputs | Selected rule findings (risk-oriented); confidence contradiction component `X`; explicit limitation flags from prediction/recommendation. |
| Outputs | Risk list with severity labels (`info` \| `warning` \| `critical`) derived only from declared upstream severities — Report does not invent new risk math. |
| Consumers | Caution banners; recommendation footnotes. |

#### 3.2.8 Confidence

| Field | Design |
|---|---|
| Purpose | Explain how confident the projection bundle is and why. |
| Inputs | Confidence scalar + breakdown (`A`, `C`, `S`, `X`); clamp reasons; missing evidence list. |
| Outputs | Meter/value; component breakdown; textual limitation bullets copied from upstream. |
| Consumers | Confidence meter UI; gates for recommendation presentation. |

#### 3.2.9 Recommendation

| Field | Design |
|---|---|
| Purpose | Present the closed recommendation code and supporting pointers. |
| Inputs | Prediction Engine recommendation payload (code, limitations, policy version). |
| Outputs | Primary recommendation label; supporting probability/range citations; limitations. |
| Consumers | Final recommendation card; export summary. |

#### 3.2.10 Appendix

| Field | Design |
|---|---|
| Purpose | Technical reproducibility: versions, checksums, trace ids, evaluator identities, truncation notes. |
| Inputs | Metadata from all upstream bundles + report assembly metadata. |
| Outputs | Version table; checksum table; correlation/trace identifiers; model pins. |
| Consumers | Developers, auditors, historical replay tooling. |

### 3.3 Assembly diagram

```text
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────────────┐
│  Evidence   │→│  Features   │→│    Rules    │→│   Prediction     │
└─────────────┘   └─────────────┘   └─────────────┘   └────────┬─────────┘
                                                                │
                                                                ▼
                                                     ┌────────────────────┐
                                                     │ Report Engine V2   │
                                                     │  section compose   │
                                                     │  DTO + checksums   │
                                                     └─────────┬──────────┘
                                                               │
                                                               ▼
                                                     Analysis Report DTO
                                                     (UI / export / review)
```

---

## 4. Data Ownership

Report sections **reference** upstream data; they never recompute it.

| Report section | Data comes from | Must not come from |
|---|---|---|
| Overview | `MATCH_INFO` / match snapshot; Prediction headline; Confidence scalar; Report metadata | Fresh provider calls; UI-local guesses |
| Team Comparison | Feature Engine outputs (home/away features) | Ad-hoc averages in the report layer |
| Key Evidence | Evidence selection + citation set from lineage | Re-ranking invented by Report |
| Feature Summary | Feature Engine | Recalculated ratings |
| Rule Findings | Rule Engine evaluations | Re-run rules inside Report |
| Prediction | Prediction Engine bundle (xG, 1X2, scorelines, ranges) | Poisson/matrix math in Report |
| Risk Factors | Rule findings + confidence contradiction/limitations | New risk model in Report |
| Confidence | Confidence model output embedded in prediction/rule bundle | Re-blending `A/C/S/X` in Report |
| Recommendation | Prediction Engine recommendation | Prompted AI text; tipster copy |
| Appendix | Upstream metadata + assembly metadata | Mutable “latest version” resolution at render time |

### 4.1 No duplicated computation

Allowed report operations (deterministic, non-analytical):

- select, order, and group already-computed fields;
- copy explanation strings emitted upstream;
- compute **presentation-only** aggregates that are pure views (e.g. count of matched rules) if and only if they are defined as DTO derived fields with a pinned derivation rule and do not alter projections;
- validate referential integrity (every cited ID exists).

Forbidden report operations:

- recalculating xG, probabilities, scorelines, or confidence;
- changing recommendation codes;
- silently dropping contradicting rules;
- filling gaps with defaults that imply evidence was present.

### 4.2 Sealed input manifest

Before assembly, Report Engine V2 requires a manifest of exact identities:

- analysis snapshot / cutoff identity;
- evidence selection checksum;
- feature bundle checksum + feature model versions;
- rule evaluation set checksum + evaluator version;
- prediction bundle checksum + prediction/calibration model versions;
- confidence policy version.

Missing required manifests → assembly status `blocked` (not an empty successful report).

---

## 5. Report DTO

Design-level shape of the sealed Analysis Report object. Field names are conceptual, not an API schema.

### 5.1 Top-level object

| Area | Contents |
|---|---|
| Report Metadata | `reportId`, `matchId`, `createdAt` (assembly time), `cutoffAt`, `status` (`sealed` \| `blocked` \| `failed`), `locale` (if any), assembler version |
| Overview | Fixture identity, headline lean, short status flags |
| Sections | Ordered map/list of section payloads (§3) |
| Recommendations | Primary recommendation object (mirrors Prediction Engine; Report does not alter) |
| Confidence | Scalar + breakdown + clamps |
| Evidence References | List of evidence IDs (+ optional excerpt pointers already normalized upstream) |
| Feature References | Feature keys/IDs + versions + values snapshot for cited features |
| Rule References | Rule evaluation IDs + rule version IDs + statuses |
| Prediction References | Projection bundle ID/checksum + model versions |
| Version | `reportSchemaVersion`, `reportAssemblerVersion` |
| Checksums | `contentChecksum` over canonical serialization of sealed fields; upstream checksums echoed |
| Trace IDs | `correlationId`, `analysisRunId`, `snapshotId`, optional `traceId` |

### 5.2 Section payload pattern

Each section includes:

| Field | Purpose |
|---|---|
| `sectionKey` | Stable key (`overview`, `teamComparison`, …) |
| `schemaVersion` | Per-section schema pin |
| `status` | `present` \| `absent` \| `degraded` |
| `absenceReason` | Required when absent/degraded |
| `body` | Section-specific structured data |
| `references` | Upstream IDs used by this section |
| `sectionChecksum` | Hash of `body` + `references` |

### 5.3 Overview body (illustrative)

- home team / away team / competition / kickoff  
- headline outcome (`home` \| `draw` \| `away` \| `none`) copied from prediction ranking  
- confidence display value  
- recommendation code (optional duplicate pointer for cover convenience; canonical recommendation remains in Recommendations)

### 5.4 Prediction body (illustrative)

- `λh`, `λa`  
- `pHome`, `pDraw`, `pAway`  
- `topScorelines[3]`  
- `goalRange` buckets  
- probability/calibration model version labels  

### 5.5 Integrity rules

1. `contentChecksum` covers all sealed analytical fields; cosmetic ordering hints may be excluded only if declared.  
2. Re-assembly with identical manifests must yield identical checksums.  
3. DTO must distinguish **absent** vs **zero** vs **failed upstream**.  
4. No `any`-shaped provider payloads; only normalized reference types.

---

## 6. Explainability

### 6.1 Full chain

```text
Evidence
  → Feature
  → Rule
  → Prediction
  → Report
```

Report Engine V2 does not create new analytical edges. It **indexes** upstream lineage so each section can answer “why is this on the report?”

### 6.2 Section → upstream tracing

| Section | Trace target |
|---|---|
| Overview | Match evidence + prediction headline node + confidence node |
| Team Comparison | Feature nodes (per row) → evidence inputs of those features |
| Key Evidence | Evidence nodes directly; optionally “cited by” feature/rule IDs |
| Feature Summary | Feature nodes → evidence |
| Rule Findings | Rule evaluation nodes → features → evidence |
| Prediction | Projection nodes → xG → features → evidence; also rule deltas if applied |
| Risk Factors | Subset of rule/confidence limitation nodes |
| Confidence | `A/C/S/X` nodes + missing evidence list |
| Recommendation | Recommendation gate node → probabilities/confidence/agreement |
| Appendix | All version/checksum nodes |

### 6.3 Lineage example

```text
Evidence TEAM_FORM(home), STATISTICS(home)
  → Feature AttackRating_home = 72
Evidence STATISTICS(away)
  → Feature DefenseRating_away = 48
  → Rule HOME_ATTACK_EDGE matched
  → Prediction λh=1.55, λa=1.05 → pHome=0.47 → top scoreline 1-0
  → Confidence 0.66 (A=0.71, C=0.80, S=0.64, X=0.18)
  → Recommendation lean_home
  → Report
       Overview cites prediction headline + confidence
       Team Comparison cites AttackRating_home / DefenseRating_away
       Rule Findings cites HOME_ATTACK_EDGE evaluation id
       Prediction section cites projection bundle checksum
       Recommendation section cites recommendation policy version
       Appendix pins all versions + contentChecksum
```

### 6.4 Explainability invariants for reports

1. Every displayed numeric projection appears in the Prediction references with the same value.  
2. Every rule shown as “matched” has an evaluation reference.  
3. Evidence listed as “key” appears in Evidence references.  
4. UI expansion of a report field must be satisfiable from the DTO + referenced upstream bundles — no hidden server recompute.  
5. If upstream lineage is incomplete, section status is `degraded` or assembly is `blocked`.

---

## 7. Rendering Principles

| Principle | Rule |
|---|---|
| Presentation never modifies values | UI/export may format/round for display but must not change sealed analytical meaning; round-trip identity preserved in Appendix. |
| Report only consumes deterministic outputs | Renderers read Report DTO (+ optionally hydrate referenced bundles by ID). |
| No hidden calculations | No client-side Poisson, weighting, or confidence blend. |
| No duplicated business logic | Shared formatters only (timestamps, percent display). |
| No recomputation | Refreshing the page must not call Feature/Rule/Prediction engines unless the user starts a new analysis. |
| UI only renders Report DTO | Workspace prediction panels for V2 reports bind to report sections, not ad-hoc API mosaics. |
| Epistemic honesty | Market signals labeled as market; facts labeled as evidence; projections labeled as projections. |
| Failure visibility | `blocked`/`failed`/`degraded` states are visible; never replaced with empty charts that look like zero confidence success. |
| Accessibility of uncertainty | Limitations and clamps from Confidence/Recommendation always render near claims they qualify. |

### 7.1 Allowed presentation transforms

- localization of labels (not of numbers’ analytical identity);  
- chart geometry derived from DTO arrays;  
- collapsing appendix by default;  
- deep-linking to section keys.

### 7.2 Forbidden presentation transforms

- renormalizing probabilities to “look nicer”;  
- hiding contradicting rules;  
- substituting odds for model probabilities without showing both when both exist in the DTO;  
- generating recommendation text via LLM inside the render path.

---

## 8. Versioning Strategy

### 8.1 Version axes

| Axis | Meaning |
|---|---|
| `reportSchemaVersion` | Shape of the Report DTO (sections, required fields) |
| `reportAssemblerVersion` | Deterministic assembly logic identity |
| Upstream pins | Feature/Rule/Prediction/Evidence selection versions echoed in Appendix |

### 8.2 Report V1 vs Report V2 (design labels)

| Label | Intent |
|---|---|
| Report V1 | Minimal presence-style / early deterministic summaries (historical product surface) |
| Report V2 | Full section hierarchy in this document, bound to Rule/Prediction Engine V2 bundles |

These labels are design eras, not an instruction to migrate production automatically.

### 8.3 Schema compatibility

| Change type | Compatibility expectation |
|---|---|
| Add optional section | Backward compatible if readers ignore unknown keys |
| Add required field | New `reportSchemaVersion`; old readers must not assume presence |
| Remove/rename field | New major schema version; historical documents keep old schema |
| Change meaning of a field without rename | Forbidden; mint a new field or version |

### 8.4 Backward compatibility & historical replay

1. Sealed reports are immutable.  
2. Replay renders the sealed DTO under its original `reportSchemaVersion`.  
3. Replay must not re-assemble from “latest” engines unless an explicit **rebuild** command creates a **new** report id with new checksums.  
4. Libraries and reviews cite `reportId` + `contentChecksum`, not “current match report.”

### 8.5 Version pinning at assembly

Assembly records pins for:

- evidence selection;  
- feature bundle;  
- rule evaluations;  
- prediction bundle + calibration map;  
- report schema + assembler.

If any pin is missing, do not seal.

---

## 9. Future Extensions

Non-binding possibilities only. None are authorized by this document.

| Extension | Description |
|---|---|
| Narrative Layer | Prompt Engine prose that **cites** report section IDs without altering DTO numbers |
| Interactive Explainability | UI graph navigation Evidence ↔ Feature ↔ Rule ↔ Prediction ↔ Report |
| Statistics Feedback | Post-match overlays comparing sealed projections to verified results (read-only on the original report) |
| Multi-language Rendering | Label catalogs for section titles; numeric payload unchanged |
| PDF Export | Paginated rendering of the same DTO |
| Sharing | Stable links to sealed `reportId` in private environments |
| Review Workflow | Attach reviewer annotations referencing section keys |
| Human Approval | Publication gate that freezes a sealed report as the reviewable revision |

Future narrative or review layers remain outside Report Engine compute ownership.

---

## 10. Out of Scope

This design explicitly excludes:

- AI generation, LLM prompts, and provider calls inside Report Engine;  
- backend / frontend / API / database / schema implementation;  
- Provider, Normalizer, Evidence, Feature, Rule, or Prediction algorithm changes;  
- governance document edits, architecture document edits, ADR changes, Project Bible changes;  
- business logic that alters projections or recommendations;  
- live in-play reports;  
- betting tips, staking, or commercialization;  
- automatic rebuild of historical reports on engine upgrade;  
- treating this file as an implementation gate.

---

## 11. Non-binding adoption notes

1. Define a frozen Report DTO golden fixture that only **copies** sample upstream bundles.  
2. Enforce checksum tests: mutating a copied probability without changing upstream references must fail integrity checks.  
3. Wire UI to Report DTO sections before exposing V2 predictions broadly.  
4. Keep narrative/AI layers optional and citation-bound.

This document alone is not an implementation gate.
