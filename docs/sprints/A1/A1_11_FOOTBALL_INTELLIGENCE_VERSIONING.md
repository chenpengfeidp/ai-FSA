# A1.11 — Football Intelligence Versioning Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A1.11** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation design | [`A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Projection design | [`A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](./A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| Rule hierarchy | [`A1_8_FOOTBALL_RULE_HIERARCHY.md`](./A1_8_FOOTBALL_RULE_HIERARCHY.md) |
| Evidence reliability | [`A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](./A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md) |
| Feature framework | [`A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](./A1_10_FOOTBALL_FEATURE_FRAMEWORK.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 (read-only alignment) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; DTO/database schemas; Bible / Architecture Freeze / docs 17 / docs 18 edits; new packages; new Bible Engines; other doc edits |

---

## 0. Goal

Design **unified Version Governance** for Football Intelligence so every sealed prediction is reproducible, comparable, and replayable under the exact policy identities that produced it.

```text
Evidence* → Feature* → RuleSet* → ProjectionPolicy*
  → ScenarioPolicy* → ConfidencePolicy* → NarrativeTemplate*
  → Sealed Prediction (all versions frozen)
  → Evaluation / Replay (bind original versions only)
```

**Hard constraints:**

- Design only. No production code. No DTO/database schemas.
- No Bible / Architecture Freeze / docs 17 / docs 18 edits.
- No new package. No new Bible Engine.
- Align with A1, A1.5, A1.8, A1.9, A1.10 (and A0 / A0.5 lineage).
- **Analysis coordinates** version pins for a run; it does **not** own domain version definitions.
- Versions are immutable once sealed into a Prediction History entry.

### Non-goals

- Choosing concrete version string syntax beyond conceptual Major/Minor/Patch principles.
- Implementing registries, migrations, or UI.
- Calibration artifact promotion workflow (A2) beyond version-pin requirements.
- Provider SDK versioning (edge concern; referenced only as provenance, not owned here).

---

## 1. Problem statement

Football Intelligence already implies many versioned identities (FeatureModelVersion, rule-set, projection policy, scenario/confidence policies, Evidence selection checksums). Without a single governance frame:

- Evaluation compares unlike models as if they were one;
- Replay silently uses “latest” Rules/Features;
- Prediction History omits a critical pin and cannot be reconstructed;
- Domains overwrite each other’s version meaning;
- Analysis becomes a shadow owner of all policy versions.

A1.11 freezes **taxonomy, ownership, immutability, compatibility, upgrade, replay, evaluation recording, and DDD boundaries** for Intelligence versions.

---

## 2. Version taxonomy

Each identity below is a **governed pin**. Product string shapes are illustrative only.

| Version identity | What it freezes | Typical consumers |
|---|---|---|
| **Evidence Version** | Immutable normalized Evidence item identity/content checksum + normalizer identity for one Fact | Evidence selection; Feature provenance |
| **Evidence Selection Version** | Immutable cutoff-qualified selection set for one analysis run (selection checksum, cutoff, reliability acknowledgements) | Feature derivation input; Prediction History |
| **Feature Version** | Immutable semantics of one Feature id (meaning/units/emission rules for that id) | Feature catalogue; Rule required-feature contracts |
| **FeatureModelVersion** | Frozen Feature catalogue + Evidence→Feature bindings + honest-absence policy for a derivation run | FeatureBundle; Rules/Projection compatibility |
| **RuleSetVersion** | Frozen set of Rule versions + hierarchy metadata (tier/domain/priority/channel) evaluated together | Rule Findings envelope |
| **ProjectionPolicyVersion** | Frozen mapping of FeatureBundle + Rule findings → Probability Distribution (eligibility, channel weighting policy — not formulas here) | Projection seal |
| **ScenarioPolicyVersion** | Frozen selection/labelling rules for ScenarioSet from a sealed Distribution | ScenarioSet |
| **ConfidencePolicyVersion** | Frozen trust/upset/completeness/agreement composition policy over sealed Projection/Scenario | Confidence block |
| **NarrativeTemplateVersion** | Frozen local narrative section order/templates/citation rules for sealed spine explanation | Narrative draft in Report |

### 2.1 Related identities (recorded, not renamed)

These are not replacements for the taxonomy above; Prediction History should also retain them when present:

| Related identity | Role |
|---|---|
| FeatureBundle checksum | Concrete derivation result integrity |
| Rule evaluation envelope checksum | Concrete findings integrity |
| Projection / Scenario / Confidence checksums | Concrete sealed outputs |
| Match Report id + checksum | Consumer-facing seal |
| Evaluator / composition builder versions | Implementation identity of deterministic engines (owned by their domains) |
| Optional calibration artifact id | Approved pin only (A1.5 / A2) — not a substitute for ConfidencePolicyVersion |

### 2.2 Taxonomy rules

1. One sealed prediction run pins **exactly one** of each Intelligence policy identity above (or records explicit `not_applicable` only when a stage is policy-skipped — V1 Football Intelligence does not skip Feature/Rule/Projection/Scenario/Confidence/Narrative).  
2. Evidence Version is many (per item); Evidence Selection Version is one per sealed selection.  
3. Feature Version is per Feature id; FeatureModelVersion pins a set of Feature Versions.  
4. No version identity may be “latest” at seal time — only exact ids.

---

## 3. Ownership (no cross-layer ownership)

| Version identity | Owning domain / package home | May define | Must not |
|---|---|---|---|
| Evidence Version | **Evidence** (`@fas/evidence` + normalizer path) | Item integrity, normalizer lineage | Feature/Rule/Projection policies |
| Evidence Selection Version | **Evidence** (selection semantics) | Cutoff-qualified selection identity | Feature emission rules |
| Feature Version | **Feature** (`@fas/feature`) | Per-Feature semantics | Rule hierarchy; probability policy |
| FeatureModelVersion | **Feature** (`@fas/feature`) | Model catalogue + Evidence bindings | Projection weighting |
| RuleSetVersion | **Rule** (`@fas/rule` → `@fas/rule-engine`) | Rule set + hierarchy pins | FeatureModel contents; 1X2 policy |
| ProjectionPolicyVersion | **Analysis / Projection** (`@fas/analysis` projection module) | Probability-generation policy identity | Feature catalogue; Rule conditions |
| ScenarioPolicyVersion | **Analysis / Scenario** (`@fas/analysis` scenario module) | Selection policy identity | Recompute probabilities |
| ConfidencePolicyVersion | **Analysis / Confidence** (`@fas/analysis` confidence module) | Trust-policy identity | Own Evidence Facts |
| NarrativeTemplateVersion | **Report / Narrative** (`@fas/report`; Prompt composition identity if used) | Template/citation policy identity | Invent Facts or scores |

### 3.1 Analysis coordination (not ownership)

**Analysis Orchestrator / AnalyzeMatch application** may:

- accept a **compatibility profile** (allowed version tuple);
- pass pinned versions into domain ports;
- refuse to seal if any required pin is missing or incompatible;
- record the full pin set on Prediction History / Report lineage.

Analysis must **not**:

- mint FeatureModelVersion or RuleSetVersion contents;
- silently substitute a newer domain version during a run;
- own a parallel “AnalysisVersion” that redefines domain policies.

### 3.2 Ownership sentence (binding)

> Version **definitions** live in their domains. Version **pins for a run** are coordinated by Analysis. Version **history** is immutable once sealed.

---

## 4. Immutable Prediction

### 4.1 Seal event

A Football Intelligence prediction becomes immutable when a Match Report (or equivalent sealed analysis result) is successfully produced and a **Prediction History** entry is created (A1).

At that moment, the following are frozen as references (not editable fields):

- Evidence Selection Version (+ constituent Evidence Version refs as recorded);
- FeatureModelVersion + FeatureBundle checksum (+ Feature Version pins implied by the model);
- RuleSetVersion + findings checksum;
- ProjectionPolicyVersion + Projection checksum;
- ScenarioPolicyVersion + ScenarioSet checksum;
- ConfidencePolicyVersion + Confidence checksum;
- NarrativeTemplateVersion + narrative manifest/template identity;
- MatchId, timestamps, report identity.

### 4.2 Immutability rules

| Rule | Meaning |
|---|---|
| **No overwrite** | Sealed Prediction History entries are append-only; corrections create superseding lineage |
| **No pin mutation** | Version ids on a sealed entry never change |
| **No content rewrite** | FeatureBundle / findings / distribution / scenarios / confidence / narrative of that seal are not recalculated in place |
| **Supersession** | New Evidence selection or new policies ⇒ new prediction lineage, new history entry |
| **Outcome separation** | Post-match Actual / Comparison / Evaluation attach by reference; they do not alter pre-match version pins (A1) |

### 4.3 What “update the model” means

Publishing a new FeatureModelVersion or RuleSetVersion affects **future** runs only. Historical seals remain under their original pins forever.

---

## 5. Compatibility

Compatibility is a **declared relation between version identities**, owned jointly as a pin matrix coordinated by Analysis but authored by domain owners for their edges.

### 5.1 Required compatibility edges

| Edge | Meaning |
|---|---|
| **FeatureModelVersion ↔ RuleSetVersion** | Every required Feature name/version assumed by the RuleSet must be emit-able (or honestly omittable → INAPPLICABLE) under the FeatureModel |
| **RuleSetVersion ↔ ProjectionPolicyVersion** | Projection policy must recognize Rule channels/tiers it weights; unknown rule ids are policy-error, not silent ignore |
| **FeatureModelVersion ↔ ProjectionPolicyVersion** | Projection required Primaries must exist in the FeatureModel; optional Features remain optional |
| **ProjectionPolicyVersion ↔ ScenarioPolicyVersion** | Scenario selection assumes Distribution outputs the Projection policy seals (1X2 / scorelines / residual disclosure) |
| **ProjectionPolicyVersion ↔ ConfidencePolicyVersion** (and ScenarioPolicyVersion ↔ ConfidencePolicyVersion) | Confidence reads concentration/upset from sealed Projection/Scenario under known shapes |
| **Evidence Selection Version ↔ FeatureModelVersion** | FeatureModel Evidence bindings must be satisfiable from selection types/reliability states; acknowledgements recorded |
| **NarrativeTemplateVersion ↔ sealed spine** | Templates cite only Feature/Rule/Scenario/Confidence fields present in the sealed package contract |

### 5.2 Compatibility profile (conceptual)

A **Compatibility Profile** is a named, versioned tuple of allowed pins, for example conceptually:

```text
compat.football-intelligence.a05
  FeatureModelVersion = …
  RuleSetVersion = …
  ProjectionPolicyVersion = …
  ScenarioPolicyVersion = …
  ConfidencePolicyVersion = …
  NarrativeTemplateVersion = …
```

Rules:

1. A run selects one Compatibility Profile **or** an explicitly approved custom tuple that passes the same edge checks.  
2. Incompatible tuples fail closed — no seal.  
3. Widening compatibility (accepting more pairs) is a new Compatibility Profile version.  
4. Domains declare their edge constraints; Analysis enforces at orchestration time.

### 5.3 Non-compatibility (forbidden assumptions)

- “Any RuleSet works with any FeatureModel.”  
- “New ProjectionPolicy can read old Feature names without a pin bump.”  
- “Market Features imply football Primary completeness.”  
- “NarrativeTemplate can require Fields not in the sealed spine.”

---

## 6. Upgrade policy

### 6.1 Version evolution principles (Major / Minor / Patch)

Applied **per owning domain** to that domain’s version identity (FeatureModelVersion, RuleSetVersion, etc.). Conceptual meaning:

| Class | When to use | Consumer impact |
|---|---|---|
| **Major** | Breaking semantic change: remove/rename Primary Feature meaning; change Rule channel eligibility; change Distribution contract Scenario/Confidence rely on; change honesty omission into false zero; change Narrative required sections incompatibly | Requires new Compatibility Profile; old seals untouched; new Evaluation cohort |
| **Minor** | Backward-compatible additive change: new Optional Feature; new Supporting Rule with channel none; new limitation note; new Narrative optional appendix | May extend Compatibility Profile to include new pairings; old RuleSets may INAPPLICABLE new Features |
| **Patch** | Non-semantic fix: typo in explanation text policy, documentation-equivalent clarifications that do not change emit/evaluate/select outcomes | Allowed only if sealed outputs for identical inputs remain identical; if not → Minor/Major |

If uncertain whether outputs change ⇒ **not Patch**.

### 6.2 Changes that **must** mint a new version

| Change | Must mint |
|---|---|
| Evidence normalizer changes Fact meaning | New Evidence Version lineage for new items; FeatureModel may need Minor/Major if bindings break |
| Selection cutoff/reliability acknowledgement policy change affecting eligibility | New Evidence Selection Version for new runs; selection policy identity bump as Evidence-owned |
| Feature emission/omission/semantics change | Feature Version and/or FeatureModelVersion |
| Rule condition/tier/channel/priority/set membership change | Rule version + RuleSetVersion (A1.8) |
| Probability-generation policy change (eligibility, channel use, distribution contract) | ProjectionPolicyVersion (A1.5) |
| Scenario slot/selection contract change | ScenarioPolicyVersion |
| Confidence composition/cap policy change | ConfidencePolicyVersion |
| Narrative section/citation contract change | NarrativeTemplateVersion |
| Compatibility matrix change | Compatibility Profile version |

### 6.3 Changes that must **not** silently rewrite old versions

- Editing an active FeatureModelVersion or RuleSetVersion in place.  
- Retagging an old Prediction History row to a newer policy.  
- “Hotfix” probabilities on a sealed report.

### 6.4 Deprecation

Domains may mark a version **deprecated** (disallowed for new runs) while remaining **readable** for Replay/Evaluation. Retirement does not delete history.

---

## 7. Replay

### 7.1 Definition

**Replay** reconstructs or re-verifies a historical prediction’s deterministic outputs using the **original pinned versions** and the **original sealed inputs** (Evidence Selection Version and checksums).

### 7.2 Replay rules (binding)

1. Replay **must** bind original FeatureModelVersion, RuleSetVersion, ProjectionPolicyVersion, ScenarioPolicyVersion, ConfidencePolicyVersion, NarrativeTemplateVersion.  
2. Replay **must not** substitute latest models “to see what would happen now” under the same history entry id.  
3. A “what-if with newest models” exercise is a **new run** / counterfactual lineage — new Prediction History entry — never an overwrite.  
4. If an implementation of an old version is unavailable, Replay fails explicitly (`not_replayable`) — it does not approximate with a newer version.  
5. Web/API presentation must not recompute FeatureBundle or Projection fields (doc 17 alignment); Replay is an explicit governed operation, not page-load recompute.

### 7.3 Replay inputs vs outputs

| Bind | Purpose |
|---|---|
| Evidence Selection Version + Evidence Version refs | Input Facts |
| All Intelligence policy versions | Policy pins |
| Prior checksums | Integrity verification target |

Successful Replay either confirms checksum equality or emits a governed mismatch defect — it does not “fix” history.

---

## 8. Evaluation

A1 Evaluation / Comparison / Metrics must record enough versions for **fair cohort comparison**.

### 8.1 Minimum version fields on Evaluation subjects

For each evaluated Prediction History entry, Evaluation inputs must include (by reference):

| Pin | Why |
|---|---|
| Evidence Selection Version | Input Fact cohort |
| FeatureModelVersion (+ FeatureBundle checksum) | Feature Contribution slices (A1 / A1.10) |
| RuleSetVersion (+ findings checksum) | Rule Contribution slices (A1 / A1.8) |
| ProjectionPolicyVersion (+ Projection checksum) | Probability claim identity (A1.5) |
| ScenarioPolicyVersion (+ Scenario checksum) | Scenario Hit metrics |
| ConfidencePolicyVersion (+ Confidence checksum) | Confidence calibration inputs |
| NarrativeTemplateVersion | Narrative consistency checks when assessed |
| Compatibility Profile version (if used) | Declared tuple identity |
| Comparison-policy version / metric-definition versions | A1 Evaluation/Statistics identities |

### 8.2 Fair comparison rules

1. Accuracy leaderboards must slice by **FeatureModelVersion × RuleSetVersion × ProjectionPolicyVersion** (minimum).  
2. Mixing seals from incompatible policy majors in one unqualified “overall accuracy” number is prohibited for release gates (exploratory views must label mixed cohorts as unqualified).  
3. Confidence reliability tables slice by ConfidencePolicyVersion (and preferably ProjectionPolicyVersion).  
4. Evaluation never upgrades a subject’s pins to latest before scoring.  
5. Superseded predictions remain scoreable under their own pins; corrected Actuals create new Comparison lineage (A1), not pin mutation.

### 8.3 Calibration input (forward reference to A2)

Calibration Input envelopes (A1) must carry the same Intelligence version pins so A2 artifacts are trained/accepted only against declared cohorts — still no Calibration Engine design here.

---

## 9. DDD ownership

### 9.1 Governance map

| Concern | Owner |
|---|---|
| Version **definitions** | Each domain listed in §3 |
| Compatibility edge declarations | Domain owners of each edge endpoint |
| Compatibility Profile catalogue | Coordinated under Analysis application governance **without** Analysis owning domain contents |
| Pin enforcement at run time | Analysis orchestration |
| Prediction History immutability | Analysis / Report seal path + A1 history design |
| Replay binding | Analysis application operation using domain readers |
| Evaluation version recording | Evaluation / Statistics subjects consuming History pins (A1) |
| Persistence of version catalogs | `@fas/database` (future implementation only) |

### 9.2 Forbidden ownership patterns

```text
Analysis owns FeatureModelVersion contents
Report owns RuleSetVersion
Feature package owns ProjectionPolicyVersion
A single packages/version-governance engine
An eighth Bible “Version Engine”
```

### 9.3 Package homes (unchanged)

| Version family | Package |
|---|---|
| Evidence* | `@fas/evidence` (+ normalizer) |
| Feature* | `@fas/feature` |
| RuleSet* | `@fas/rule` → `@fas/rule-engine` |
| Projection* / Scenario* / Confidence* | `@fas/analysis` |
| NarrativeTemplate* | `@fas/report` (+ `@fas/prompt` composition identity when used) |
| Run coordination | `@fas/analysis` application |

No new packages.

### 9.4 Alignment with prior A1 designs

| Document | Versioning touchpoint |
|---|---|
| **A1** | Prediction History stores version pins; Evaluation slices by them |
| **A1.5** | ProjectionPolicyVersion sole probability-policy pin; Scenario/Confidence consume |
| **A1.8** | RuleSetVersion carries hierarchy; conflict retention across versions |
| **A1.9** | Evidence Version / Selection Version + reliability acknowledgements |
| **A1.10** | Feature Version + FeatureModelVersion + bundle checksum |

---

## 10. End-to-end pin flow

```text
Evidence domain
  Evidence Version(s)
  Evidence Selection Version
        │
Feature domain
  Feature Version(s)
  FeatureModelVersion → FeatureBundle checksum
        │
Rule domain
  RuleSetVersion → findings checksum
        │
Analysis Projection / Scenario / Confidence
  ProjectionPolicyVersion → distribution checksum
  ScenarioPolicyVersion → scenario checksum
  ConfidencePolicyVersion → confidence checksum
        │
Report
  NarrativeTemplateVersion → narrative identity
        │
SEAL → Prediction History (all pins frozen)
        │
Replay (original pins only)
Evaluation (record pins; fair cohorts)
```

---

## 11. Acceptance criteria (for a future Coding gate)

When a coding sprint implements this design (separate authorization), the system must:

1. Pin all taxonomy versions in §2 on every sealed Football Intelligence prediction.  
2. Keep version **definitions** in their owning domains; Analysis only coordinates and enforces pins.  
3. Make Prediction History append-only with frozen version references (no overwrite).  
4. Enforce FeatureModelVersion ↔ RuleSetVersion ↔ ProjectionPolicyVersion compatibility before seal.  
5. Apply Major/Minor/Patch upgrade discipline so semantic changes mint new versions.  
6. Replay only under original pins; latest-model what-if creates a new lineage.  
7. Record the §8 version set on Evaluation subjects for fair model comparison.  
8. Introduce no new package and no new Bible Engine; leave Bible, Architecture Freeze, docs 17/18 unmodified by this design sprint.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Version taxonomy | **Designed** |
| Ownership (no cross-layer ownership) | **Designed** |
| Immutable Prediction | **Designed** |
| Compatibility | **Designed** |
| Upgrade Policy | **Designed** |
| Replay | **Designed** |
| Evaluation version recording | **Designed** |
| DDD Ownership | **Designed** |
| Production code / schemas | **Out of scope** |
| Bible / Architecture / docs 17–18 / new packages | **Out of scope** |

---

## 12. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md) *(read-only)*
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) *(read-only)*
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) *(read-only)*
- [`docs/sprints/A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/sprints/A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md)
- [`docs/sprints/A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md)
- [`docs/sprints/A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](./A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md)
- [`docs/sprints/A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](./A1_8_FOOTBALL_RULE_HIERARCHY.md)
- [`docs/sprints/A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](./A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md)
- [`docs/sprints/A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](./A1_10_FOOTBALL_FEATURE_FRAMEWORK.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A1.11 Football Intelligence Versioning Framework design. Design only — no implementation.*
