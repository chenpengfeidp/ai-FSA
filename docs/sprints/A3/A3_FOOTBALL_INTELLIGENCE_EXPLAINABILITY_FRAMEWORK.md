# A3 — Football Intelligence Explainability Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A3** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation | [`../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Projection | [`../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| Rule hierarchy | [`../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md) |
| Evidence reliability | [`../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md) |
| Feature framework | [`../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md) |
| Versioning | [`../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md`](../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md) |
| Calibration | [`../A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md`](../A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md) |
| Experimentation | [`../A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md`](../A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 (read-only alignment) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; DTO/database schemas; formulas; package creation; Bible / Architecture Freeze / docs 17 / docs 18 edits; other doc edits |

---

## 1. Purpose

Design the complete **Explainability Framework** for Football Intelligence so every sealed prediction can be explained from Evidence through Feature, Rule, Projection, Scenario, Confidence, Narrative, and Report — with deterministic, reviewable, human-readable reasoning that never invents Facts or recomputes probabilities in the explainer.

```text
Evidence → Feature → Rule → Projection → Scenario → Confidence → Narrative → Report
                              ↑
                     Explainability Trace (refs only)
```

**Naming discipline:** Explainability is a **cross-cutting presentation and audit concern** over sealed Intelligence outputs. It is **not** a new Bible Engine and **not** a new package. Narrative remains the primary human-readable surface (`@fas/report`); structured traces remain owned by each upstream domain’s sealed envelopes.

---

## 2. Goals

| Goal | Meaning |
|---|---|
| **Transparency** | A reader can see *what* was claimed (winner lean, score world, confidence) and *on what basis* |
| **Traceability** | Every material claim cites upstream Feature names, Rule ids, Evidence ids, and policy version pins (A1.11) |
| **Auditability** | An auditor can reconstruct the reasoning chain from sealed artifacts without trusting chat memory or LLM improvisation |
| **Deterministic explanations** | Same sealed package ⇒ same structured explanation spine; no stochastic rewrite of facts |
| **Human-readable reasoning** | Narrative sections explain WHY in plain language while remaining subordinate to the sealed spine (A0 / A0.5) |

Supporting goals: honesty about absence/conflict (A1.9); no market-as-truth; no post-hoc rewriting of history after Actuals (A1 / A2).

---

## 3. Explainability Scope

### 3.1 What can be explained

| Subject | Explainable as |
|---|---|
| Evidence presence / absence / conflict / freshness | Reliability and completeness disclosures |
| Feature values and omissions | Measurement meaning + Evidence provenance + honest absence |
| Rule PASS / FAIL / INAPPLICABLE | Condition outcome + required Features + hierarchy tier |
| Projection distribution shape (qualitative) | Which Feature/Rule channels were eligible inputs under ProjectionPolicyVersion — **not** re-derived math |
| Scenario selection | Why a world was Most Likely / Second / Upset vs rejected alternatives under ScenarioPolicyVersion |
| Confidence / Upset Risk / Completeness / Agreement | Which sealed signals and honesty caps applied under ConfidencePolicyVersion (+ artifact pin if any) |
| Narrative claims | Mapping to Rule/Feature/Scenario/Confidence citations |
| Report package | End-to-end index of the above for one MatchId seal |
| Version pins | Which FeatureModel / RuleSet / policies produced the seal (A1.11) |

### 3.2 What cannot be explained (as Intelligence truth)

| Non-explainable as Fact/proof | Why |
|---|---|
| Causal “proof” that a Rule *caused* the FT result | Correlation ≠ causation; Evaluation contribution is descriptive (A1) |
| Provider-internal proprietary scoring unknown to FAS | Outside sealed Evidence |
| LLM free-text that adds Facts or new probabilities | Untrusted inference only (A1.9 AI-generated class) |
| Counterfactual “what if” under newest models presented as the original seal | Requires Experiment/Replay lineage (A2.5 / A1.11), not silent overwrite |
| Exact numeric recomputation inside Narrative | Projection owns probabilities; explainer cites sealed numbers only (A1.5) |
| Hidden Evidence not in the Evidence Selection Version | Not part of the sealed run |

### 3.3 Scope sentence (binding)

> Explainability **cites and organizes sealed decisions**. It does not invent Evidence, evaluate Rules, or own probabilities.

---

## 4. Evidence Trace

Canonical forward chain (also the explanation backbone):

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

| Hop | Trace payload (conceptual) |
|---|---|
| Evidence | Evidence id, trust class, quality/freshness/conflict state, selection version (A1.9 / A1.11) |
| Feature | Feature id, value or *omitted*, sourceEvidenceId(s), FeatureModelVersion, bundle checksum (A1.10) |
| Rule | ruleId, status, channel, tier/priority, sourceFeatureIds, RuleSetVersion (A1.8) |
| Projection | Distribution checksum, ProjectionPolicyVersion, limitations, upstream Feature/Rule refs (A1.5) |
| Scenario | Slot, winner/score/probability (copied), ScenarioPolicyVersion, supporting rule annotations |
| Confidence | Scores/bands, honesty caps, ConfidencePolicyVersion, optional calibration artifact id (A2) |
| Narrative | Section → citation list (Rule/Feature/Scenario/Confidence/Evidence) |
| Report | Report id + checksum binding the entire sealed package |

No hop may skip provenance: e.g. Narrative must not claim Venue support without `venueAdvantage` Feature or an explicit VENUE_UNAVAILABLE honesty finding.

---

## 5. Reasoning Chain

### 5.1 Reference discipline

Every **material output claim** must reference at least one upstream sealed identity:

| Claim type | Minimum citation |
|---|---|
| Identity / kickoff | Match Identity Features + MATCH_INFO Evidence |
| Lean / winner language | Scenario Most Likely **or** sealed recommendation + supporting Primary Rule PASSes |
| Recommended score | Scenario Most Likely scoreline from Projection |
| Probability percentages | Sealed Projection Distribution fields only |
| Confidence language | Sealed Confidence block + policy/artifact pins |
| Risk / upset language | Scenario Upset + Confidence Upset Risk + honesty/conflict Rules |
| Absence / unknown squad | Supporting Honesty Rules + omitted Features (not “full strength”) |

### 5.2 Chain completeness levels

| Level | Meaning |
|---|---|
| **Spine** | Minimal citations for Overview / Prediction / Recommended Score |
| **Full trace** | Per-Feature and per-Rule table suitable for audit |
| **Reliability annex** | Completeness, conflicts, stale/unknown states (A1.9) |
| **Governance annex** | Full A1.11 version pin list |

Report Explainability (§12) exposes Spine by default; Full/Reliability/Governance on demand for audit.

### 5.3 Determinism

Structured traces are pure functions of the sealed package + ExplainabilityTemplateVersion (conceptual; may coincide with or extend NarrativeTemplateVersion — owned under Report/Narrative governance, not a new Engine).

---

## 6. Feature Explanation

For each Feature (emitted or omitted):

| Explain | Content |
|---|---|
| **What** | Feature id, domain/tier/category (A1.10), value if emitted |
| **From where** | sourceEvidenceId(s), Evidence trust class |
| **Why omitted** | Missing/unknown/partial/stale Evidence (A1.9) — never “zero means full strength” for Availability |
| **Model pin** | Feature Version / FeatureModelVersion |
| **Downstream use** | Which Rules required it; whether Projection treats it as Primary |

Feature explanation never states probabilities.

---

## 7. Rule Explanation

For each Rule in the RuleSetVersion envelope:

| Status | Explanation must include |
|---|---|
| **PASS (fired)** | Why matched: required Features present + condition intent in product language; channel; tier/priority (A1.8); sourceFeatureIds |
| **FAIL (not fired)** | Required Features present but condition not matched — explicit non-match, not silence |
| **INAPPLICABLE** | Which required Features were missing/omitted; honesty implication if Supporting |

### 7.1 Conflict explanation

When opposing Primary PASSes exist, explanation **retains both** and points to Projection netting + Confidence agreement penalty (A1.8) — never deletes one side for neatness.

### 7.2 Market / honesty

Market Signal Rules explain as **signal, not Fact**. Honesty Rules explain certainty caps.

---

## 8. Projection Explanation

Projection owns probabilities (A1.5). Explainability cites sealed outputs and **eligible inputs**, without re-running formulas.

| Topic | Explain as |
|---|---|
| **Why probability moved** (vs neutral / vs limitations baseline language) | Which Primary/Secondary Rule channels were PASS-eligible under ProjectionPolicyVersion; which Primary Features were present; disclosed dual-basis/limitation notes already on the seal |
| **Why recommendation is Cautious / insufficient** | Sealed recommendation code + limitations + missing Primaries / conflicts / confidence floors — as recorded on Projection |
| **Why confidence components on Projection differ from Intelligence Confidence** | Distinct objects: Projection may carry A/C/S/X-style components; Intelligence Confidence is the product Confidence block — explain each under its own policy pin, do not merge silently |
| **Why upset mass exists** | Residual / opposing worlds exist in sealed Distribution; Scenario Upset selection is separate (§9) |

Explainer must not invent a second 1X2.

---

## 9. Scenario Explanation

| Topic | Explain as |
|---|---|
| **Why selected** | Slot policy (Most Likely / Second Likely / Upset) under ScenarioPolicyVersion; probability and scoreline **copied from Projection**; optional supporting Rule annotations |
| **Why rejected** | Higher-ranked or non-contrarian worlds not chosen for a slot; residual mass disclosure when actual worlds fall outside top set (for post-match Evaluation context — not pre-match fortune-telling) |
| **Consistency with Projection** | Scenario probabilities must match sealed Distribution citations |

Scenario explanation never claims Rules “picked the score” directly (A1.5 / A1.8).

---

## 10. Confidence Explanation

| Signal | Explain as |
|---|---|
| **Prediction Confidence / band** | Sealed value + ConfidencePolicyVersion; inputs: Scenario concentration, Evidence Completeness, Rule Agreement, contradiction/honesty caps (A0.5 conceptual) |
| **Upset Risk** | Link to Scenario Upset probability + concentration/honesty factors as sealed |
| **Evidence Completeness** | Present/partial/missing/unknown/stale scopes (A1.9) |
| **Rule Agreement** | Alignment vs opposing Primary channels (A1.8) |
| **Calibration pin** | If an approved artifact id was applied for **this seal**, cite it; if not, state raw policy only (A2) |

Confidence explanation never computes a parallel win probability.

---

## 11. Narrative Explanation

Narrative is inference/explanation prose over the sealed spine (A0 / A0.5).

| Requirement | Meaning |
|---|---|
| **Citation binding** | Each explanatory claim maps to Rule id, Feature name, Evidence id, and/or Scenario/Confidence field |
| **No orphan claims** | Forbidden: “home will win because of rain” without Weather Feature/Evidence |
| **LLM rewrite (if any)** | May only paraphrase sealed spine; Explainability validates citation binding still holds; AI-generated class never becomes Evidence Fact (A1.9) |
| **Template pin** | NarrativeTemplateVersion recorded (A1.11) |
| **Section roles** | Overview, Key Factors, Strength Comparison, Risk, Prediction, Recommended Score remain explanation surfaces, not probability engines |

---

## 12. Report Explainability

The Match Report is the sealed consumer package. Explainability layers:

| Layer | Audience | Content |
|---|---|---|
| **Product Narrative** | Analyst | Human-readable sections (§11) |
| **Structured appendix** | Analyst / power user | Feature table, Rule table, Scenario trio, Confidence block |
| **Trace index** | Auditor | Evidence→…→Report hop list + checksums |
| **Governance pin list** | Auditor / methodology | Full A1.11 version taxonomy |
| **Limitations** | All | Projection limitations + reliability honesty |

Report Explainability must not recompute FeatureBundle or Projection on read (doc 17 alignment).

---

## 13. Audit Trail

Conceptual audit records for one sealed prediction (not a schema):

| Record family | Captures |
|---|---|
| **Selection audit** | Evidence Selection Version, acknowledgements, conflicts |
| **Derivation audit** | FeatureModelVersion, FeatureBundle checksum, omissions |
| **Evaluation audit (Rules)** | RuleSetVersion, full findings envelope checksum |
| **Projection audit** | ProjectionPolicyVersion, distribution checksum, limitations |
| **Scenario / Confidence audit** | Policy versions + checksums + artifact pins |
| **Narrative audit** | Template version, manifest/checksum, provider id (local deterministic vs rewrite) |
| **Report seal audit** | Report id, generatedAt, package checksum |
| **Access / promotion audits** (ops) | Who promoted Calibration/Experiment defaults later — linked by pin ids, not by mutating this seal |

Audit Trail is append-oriented for governance events; the prediction seal itself remains immutable.

---

## 14. Replay Relationship (A1.11)

| Concern | Explainability behavior |
|---|---|
| **Replay of original seal** | Explanation must use **original** pins and sealed values only |
| **Successful Replay** | Structured explanation regenerates identically from sealed package |
| **Counterfactual Replay / Experiment lineage** | Labeled as experiment/counterfactual explanation — never presented as the original Report’s explanation |
| **not_replayable** | Explanation states unreplayable; does not approximate with latest models |

---

## 15. Evaluation Relationship (A1)

| Concern | Relationship |
|---|---|
| Post-match Comparison | Evaluation explains *outcome vs claim*; Explainability explains *pre-match reasoning* — distinct |
| Miss analysis | May join Explainability trace (“which Primary Rules PASSed”) with Comparison miss — still not causal proof |
| Narrative structural consistency metric | Uses citation-binding rules from this framework |
| Contribution metrics | Descriptive; Explainability may surface them in post-match review UI later without changing pre-match seal |

Evaluation does not rewrite Narrative after the match to “fit” the Actual.

---

## 16. Calibration Relationship (A2)

| Concern | Relationship |
|---|---|
| Artifact applied on seal | Confidence/Projection explanation must cite approved artifact id + policy version |
| Artifact not applied | Explanation states raw ConfidencePolicyVersion only |
| New calibration published later | Does **not** alter explanations of historical seals; future seals explain new pins |
| Honesty caps | Calibration must not remove honesty disclosures from explanation requirements |

---

## 17. Experiment Relationship (A2.5)

| Concern | Relationship |
|---|---|
| Champion seal | Standard Explainability under champion pins |
| Challenger seal (canary/A/B) | Full Explainability under challenger pins; labeled with Experiment id |
| Shadow outputs | If retained, explained as **non-authoritative shadow** — not Report Explainability |
| Offline/Replay experiment lineage | Counterfactual explanation labeling required |
| Promotion | Does not rewrite prior explanations; changes future default pins only |

---

## 18. DDD Ownership

| Concern | Owner | Package home |
|---|---|---|
| Evidence provenance / reliability states | Evidence | `@fas/evidence` |
| Feature explanations / omissions | Feature | `@fas/feature` |
| Rule finding explanations | Rule | `@fas/rule` → `@fas/rule-engine` |
| Projection limitations / sealed distribution citations | Analysis Projection | `@fas/analysis` |
| Scenario selection rationale fields | Analysis Scenario | `@fas/analysis` |
| Confidence signal rationale fields | Analysis Confidence | `@fas/analysis` |
| Narrative composition + human-readable sections | Report (+ Prompt/AI rewrite adapter if used) | `@fas/report`, `@fas/prompt`, `@fas/ai-provider` |
| Report seal + explainability index assembly | Report / Analysis coordination | `@fas/report`, `@fas/analysis` |
| Version pin listing | Domains own definitions; Analysis coordinates pins (A1.11) | existing packages |
| Evaluation / Calibration / Experiment explain links | Evaluation / Statistics / Analysis coordination | existing Engine slots + `@fas/analysis` |

### 18.1 Forbidden creations

```text
packages/explainability-engine/
packages/explanation/
eighth Bible Engine named Explainability
```

### 18.2 Ownership sentence (binding)

> Each domain **emits** explainable sealed fields. Report/Narrative **assembles** human-readable explanation. No domain may bypass another’s ownership to “explain” by recomputing its outputs.

### 18.3 Preserve existing ownership

Explainability does not move probability ownership to Narrative, Rule evaluation to Report, or Evidence normalization to Feature.

---

## 19. Acceptance Criteria

When a coding sprint implements this design (separate authorization), the system must:

1. Provide a deterministic Evidence→…→Report trace for every sealed Football Intelligence prediction.  
2. Explain Features (including omissions) and Rules (PASS/FAIL/INAPPLICABLE) with upstream citations.  
3. Explain Projection/Scenario/Confidence using **sealed** values and policy pins only — no explainer-side probability engine.  
4. Ensure Narrative claims are citation-bound; LLM rewrite cannot add Facts.  
5. Expose Report explainability layers (Narrative, structured appendix, trace index, governance pins).  
6. Keep Replay/Experiment/Calibration/Evaluation relationships labeled so historical seals are never silently re-explained under new pins.  
7. Preserve package ownership; create no new package or Bible Engine.  
8. Leave Bible, Architecture Freeze, and docs 17/18 unmodified by this design sprint.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Purpose / Goals | **Designed** |
| Explainability Scope | **Designed** |
| Evidence Trace | **Designed** |
| Reasoning Chain | **Designed** |
| Feature / Rule / Projection / Scenario / Confidence / Narrative / Report explanation | **Designed** |
| Audit Trail | **Designed** |
| Replay / Evaluation / Calibration / Experiment relationships | **Designed** |
| DDD Ownership | **Designed** |
| Acceptance Criteria | **Designed** |
| Production code / DTOs / formulas | **Out of scope** |
| Bible / Architecture / docs 17–18 / new packages | **Out of scope** |

---

## 20. References

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
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A3 Football Intelligence Explainability Framework design. Design only — no implementation.*
