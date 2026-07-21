# A2 — Football Intelligence Calibration Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A2** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation design | [`../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Projection design | [`../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| Rule hierarchy | [`../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md) |
| Evidence reliability | [`../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md) |
| Feature framework | [`../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md) |
| Versioning | [`../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md`](../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 10 / 11 / 17 / 18 (read-only alignment) |
| Precondition | A1 Comparison / Evaluation / Calibration Input available for sealed predictions |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; DTO/database schemas; Bible / Architecture Freeze / docs 17 / docs 18 edits; new packages; new Bible Engines; other doc edits |

---

## 0. Purpose

Design the complete **Calibration Framework** governing how sealed Football Intelligence predictions, after actual match results, yield **candidate improvements** that are validated offline and, only after explicit approval, published as **new versioned policies** for **future** runs — without modifying historical predictions.

```text
Sealed Prediction (immutable)
  → Actual Result
  → A1 Comparison / Evaluation / Metrics
  → Calibration Input (immutable facts)
  → Candidate Artifact / Policy Version
  → Offline Validation
  → Human Promotion Gate
  → Approved pin for FUTURE runs only
```

**Naming discipline:** “Calibration Framework” is a **governed workflow** across existing Bible Engines and Intelligence modules. It is **not** an eighth Bible Engine and **not** a new package.

Aligns with A0 §4.4:

```text
A0/A0.5: emit raw confidence under policy vN (sealed)
A1:      pair sealed bands with outcomes → reliability / contribution facts
A2:      build + govern calibration artifacts; Analysis pins approved artifact id
         → no auto-promotion
```

### Hard constraints (binding)

- Calibration **never** changes historical Prediction History.  
- Calibration **always** produces **new versioned policies** / artifacts (A1.11).  
- Calibration **never** modifies Evidence Facts.  
- Calibration **never** bypasses Feature, Rule, or Projection ownership.  
- Calibration **uses** Evaluation outputs but **does not replace** Evaluation.  
- Historical reproducibility remains guaranteed (Replay binds original pins — A1.11).  
- No new Bible Engine. No new packages.  
- Analysis **coordinates** Calibration consumption pins; it does **not** own Feature/Rule definitions.  
- Design only. No formulas. No schemas.

### Non-goals

- Implementing fitting algorithms (isotonic, Platt, temperature scaling, etc.).  
- Auto-activating Rule or FeatureModel changes from lift charts.  
- Letting LLM invent calibration maps.  
- Rewriting sealed Match Reports “to look better in hindsight.”  
- Market-as-truth calibration targets.

---

## 1. Calibration Goals

| Goal | Meaning |
|---|---|
| **Reliability** | Displayed Confidence bands and (optionally) probability claims match observed frequencies in declared cohorts |
| **Honesty** | Missing/unknown Evidence and abstentions remain visible; calibration must not launder uncertainty into certainty |
| **Governed improvement** | Better mappings become new approved pins for future runs only |
| **Fair comparison** | Candidates are validated on version-sliced cohorts (A1 / A1.11) |
| **Reproducibility** | Every live pin is exact, immutable, and replayable |
| **Separation of duties** | Evaluation judges quality; Statistics computes population reliability; domains own policy definitions; humans promote |

Calibration does **not** aim to maximize Winner Accuracy by secretly editing past seals or inventing Facts.

---

## 2. Calibration Scope

### 2.1 What may be calibrated

| Target family | May produce | Owning definition domain |
|---|---|---|
| **Confidence display mapping** | New ConfidencePolicyVersion and/or approved **calibration artifact** mapping raw confidence → displayed band/score | Analysis Confidence module owns policy identity; artifact compute under Statistics; acceptance under Evaluation methodology (docs 10 / 11) |
| **Probability display / post-process mapping** (optional later) | New ProjectionPolicyVersion **or** pinned calibration artifact consumed by Projection **without** changing Feature/Rule ownership | Analysis Projection (A1.5); still new version only |
| **Recommendation caution thresholds** (optional) | New recommendation-policy identity if treated as Projection annex | Analysis Projection |
| **Cohort-specific maps** | Artifacts sliced by league/season/completeness/FeatureModel×RuleSet×ProjectionPolicy | Declared in artifact metadata + Compatibility Profile |

### 2.2 What must not be calibrated (out of A2 scope as silent rewrite)

| Non-target | Why |
|---|---|
| **Evidence Facts** | Facts are not “adjusted” by outcomes (A1.9) |
| **Historical FeatureBundles / Rule findings / Distributions** | Sealed; Replay-only under original pins (A1.11) |
| **Feature definitions / FeatureModelVersion contents** | Feature ownership (`@fas/feature`); changes are Feature upgrades, not Calibration maps |
| **Rule conditions / RuleSetVersion contents** | Rule ownership; contribution metrics may **inform** human Rule governance, not auto-edit Rules |
| **Scenario selection contract** | Scenario consumes Projection; calibration does not invent Scenario slots |
| **Narrative templates as probability engines** | Narrative explains; it does not absorb calibration |
| **Evaluation metric definitions** | Statistics/Evaluation own metrics; Calibration consumes them |

### 2.3 Scope sentence (binding)

> Calibration proposes **new policy/artifact versions for future Intelligence runs**. It never mutates sealed predictions, Evidence, Feature catalogues, or Rule libraries in place.

---

## 3. Calibration Pipeline

```text
1. Sealed Prediction History (immutable)
2. Verified Actual Result
3. A1 Comparison Record
4. A1 Evaluation / Statistics Metrics  →  Calibration Input
5. Cohort freeze (version pins + population watermark)
6. Candidate generation (new artifact / policy version draft)
7. Offline Validation (holdout / walk-forward / contamination checks)
8. Evaluation Gate (qualify / pass / fail / not_qualified)
9. Human Promotion decision (approve / reject / defer)
10. Publish pin for FUTURE Compatibility Profile / run config
11. Optional Rollback to prior approved pin
```

| Stage | Responsibility |
|---|---|
| **1–4** | A1 path — inputs only; A2 does not redefine Comparison |
| **5 Cohort freeze** | Freeze exact Prediction History membership + version pins + Statistics watermarks |
| **6 Candidate generation** | Produce a **new** candidate artifact/policy identity (never overwrite approved) |
| **7 Offline Validation** | Score candidate on frozen cohort under declared validation policy |
| **8 Evaluation Gate** | Apply versioned assessment definition (Evaluation Engine) |
| **9 Human Promotion** | Explicit rationale; no auto-promotion |
| **10 Publish pin** | Future runs may select the approved id; history unchanged |
| **11 Rollback** | Switch future pin to previous approved id; history still unchanged |

Analysis orchestration may sequence jobs and pin selection; it does not compute Statistics projections or author Feature/Rule definitions.

---

## 4. Calibration Dataset Requirements

### 4.1 Minimum membership

A calibration cohort entry requires (A1):

1. Sealed Match Report with completed (non-blocked) Projection;  
2. Verified FT Actual;  
3. Comparison Record under a pinned comparison-policy version;  
4. Full Intelligence version pins (A1.11 §8 minimum).

Abstentions (`cautious` / insufficient) **remain in the dataset** for honesty — they must not be dropped to inflate reliability.

### 4.2 Required pins on every cohort row

| Pin | Purpose |
|---|---|
| Evidence Selection Version | Input Facts cohort |
| FeatureModelVersion | Feature Contribution fairness |
| RuleSetVersion | Rule Contribution fairness |
| ProjectionPolicyVersion | Probability claim identity |
| ScenarioPolicyVersion | Scenario Hit identity |
| ConfidencePolicyVersion | Raw confidence policy being calibrated |
| NarrativeTemplateVersion | When narrative consistency is in scope |
| Compatibility Profile version | Declared tuple |
| Comparison + metric-definition versions | Evaluation/Statistics identities |

### 4.3 Cohort hygiene

| Requirement | Meaning |
|---|---|
| **Version homogeneity for gates** | Release-grade calibration cohorts do not mix incompatible Majors unlabeled |
| **Contamination control** | Training/validation split policy prevents testing on the same matches used to fit a candidate (Evaluation methodology — doc 10) |
| **Reliability acknowledgements** | Conflicted/stale acknowledgements from Evidence selection remain labeled (A1.9) |
| **No hindsight Facts** | Post-match outcomes are labels only; never injected into pre-match Feature/Rule inputs |
| **Watermark freeze** | Statistics projections used for validation carry exact watermarks |

### 4.4 Dataset immutability

Once a **Calibration Cohort Version** is frozen for a candidate, membership and pins do not change. Expanding the population creates a new cohort version.

---

## 5. Calibration Targets

Targets are **claims to improve for future seals**, not edits to past seals.

| Target | Raw input (sealed historically) | Desired future effect | New version minted |
|---|---|---|---|
| **Confidence reliability** | Prediction Confidence + band under ConfidencePolicyVersion | Displayed confidence aligns with observed Winner hit rates by band/cohort | ConfidencePolicyVersion and/or calibration artifact id |
| **Upset Risk resolution** | Upset Risk vs Upset/Most Likely outcomes | Risk signal better tracks contrarian outcomes | ConfidencePolicyVersion / artifact |
| **1X2 calibration** (optional later) | Sealed pHome/pDraw/pAway | Better probability reliability if policy admits | ProjectionPolicyVersion and/or artifact consumed by Projection |
| **Caution thresholds** (optional) | Recommendation vs outcomes / conflict flags | Better Cautious vs lean tradeoff | Recommendation/projection policy version |

### 5.1 Non-targets (again)

Winner Accuracy improvements that require **changing Features or Rules** are **governance proposals** to Feature/Rule owners (informed by A1 contribution metrics), not Calibration artifacts that rewrite Feature/Rule definitions in place.

---

## 6. Candidate Model Lifecycle

“Candidate” means a proposed **calibration artifact** and/or **new policy version**, not an LLM model.

| State | Meaning |
|---|---|
| **Draft** | Candidate identity created; not used in live runs |
| **Fitting** | Statistics (or governed offline job) computes candidate map under frozen cohort — methodology owned by Evaluation policy references |
| **Validated** | Offline Validation completed with recorded metrics/watermarks |
| **Gate-evaluated** | Evaluation Report exists (`passed` / `failed` / `not_qualified`) |
| **Approved** | Human promotion accepted; eligible to be pinned for future runs |
| **Published (active pin)** | Selected by Compatibility Profile / run config for new analyses |
| **Deprecated** | Disallowed for new runs; still readable for audit |
| **Rejected / Superseded** | Not promoted, or replaced by a newer approved candidate |

### 6.1 Lifecycle rules

1. Fitting never writes into Prediction History rows.  
2. Each candidate has a unique immutable identity + checksum.  
3. Re-fitting on a new cohort ⇒ new candidate identity.  
4. Approval does not delete prior approved artifacts (Rollback needs them).  
5. No state transition to Approved without Evaluation gate + human rationale.

---

## 7. Offline Validation

### 7.1 Purpose

Prove a candidate improves (or honestly does not harm) reliability on a frozen cohort **before** any future-run pin.

### 7.2 Validation dimensions (conceptual — no formulas)

| Dimension | Intent |
|---|---|
| **Reliability improvement** | Band hit rates closer to nominal / lower calibration error vs baseline pin |
| **Honesty preservation** | UNKNOWN/availability/venue honesty caps not weakened |
| **Abstention integrity** | Abstentions not reclassified into false High confidence |
| **Slice stability** | No catastrophic degradation on declared slices (league, completeness, version tuple) |
| **Sample qualification** | Statistics `qualified` requirements met for gate-eligible claims |
| **Contamination** | Train/validate separation honored |
| **Determinism** | Same candidate + cohort ⇒ same validation report checksum |

### 7.3 Baseline

Offline Validation always compares against an explicit baseline:

- current approved pin, or  
- identity/raw ConfidencePolicyVersion with no artifact,  

recorded by exact version ids (A1.11).

### 7.4 Failure modes

| Outcome | Meaning |
|---|---|
| **not_qualified** | Insufficient sample / incomplete slices — cannot promote |
| **failed** | Gate thresholds missed or honesty violated |
| **passed** | Eligible for human promotion consideration — still not auto-live |

---

## 8. Promotion and Publish Policy

### 8.1 Promotion prerequisites

All must hold:

1. Candidate in Validated + Gate-evaluated state;  
2. Evaluation gate `passed` under pinned assessment-definition version;  
3. Statistics projections used are exact and qualified where the gate requires;  
4. Compatibility Profile draft updated to include the new pin tuple;  
5. Explicit human actor + rationale + scope (which leagues/profiles);  
6. Rollback target identified (prior approved pin).

### 8.2 Publish effect (future only)

| May change | Must not change |
|---|---|
| Default pin for **new** AnalyzeMatch / Compatibility Profile | Any sealed Prediction History entry |
| Allowed artifact id list for future Projection/Confidence consumption | Evidence Facts; FeatureModel contents; RuleSet contents |
| Documentation of active pin | Past Report checksums |

### 8.3 No auto-promotion (binding)

Evaluation scores, Statistics lifts, dashboards, or jobs **never** activate a candidate. Only the explicit human promotion command (or equivalent governed approval) publishes a future pin.

### 8.4 Shadow mode (optional)

A Compatibility Profile may allow **shadow** computation of a candidate artifact for logging only, without affecting sealed Confidence/Projection outputs. Shadow outputs are not Prediction History truth.

---

## 9. Rollback Principles

| Principle | Meaning |
|---|---|
| **Future-pin switch** | Rollback = set future runs to a previous **Approved** artifact/policy pin |
| **History intact** | Predictions sealed under the rolled-back pin remain under that pin forever |
| **No tombstone rewrite** | Rollback does not delete the failed/superseded candidate identity |
| **Explicit rationale** | Rollback requires actor + reason (regression, honesty defect, contamination discovery) |
| **Compat profile bump** | Rollback that changes the active tuple mints/uses a Compatibility Profile version that points at the restored pins |
| **Replay unaffected** | Replay of old seals still uses their original pins, not the rolled-back future default |

Emergency rollback must still fail closed if the prior pin identity is missing — it must not invent an unpinned “latest.”

---

## 10. Relationship with Version Governance (A1.11)

| A1.11 concept | A2 use |
|---|---|
| Immutable Prediction | Calibration never overwrites seals |
| New versions for semantic change | Every promoted calibration is a new ConfidencePolicyVersion and/or artifact id (+ ProjectionPolicyVersion if probability maps change) |
| Compatibility Profile | Future runs pin approved artifact through an updated profile |
| Replay | Always original pins; calibration what-if = new lineage |
| Major/Minor/Patch | Mapping semantic change ≥ Minor; breaking display contract ⇒ Major |
| Evaluation version recording | Candidates and gates carry full pin sets |

### 10.1 Version minting matrix (calibration-specific)

| Calibration action | Mints |
|---|---|
| New confidence map artifact | Artifact id + checksum; usually new ConfidencePolicyVersion that references it |
| Change raw→display policy without artifact file | ConfidencePolicyVersion |
| New 1X2 map consumed by Projection | Artifact id + ProjectionPolicyVersion |
| Allow new tuple in live runs | Compatibility Profile version |
| Freeze dataset for a candidate | Calibration Cohort Version |

FeatureModelVersion / RuleSetVersion are **not** minted by Calibration. If contribution analysis suggests Feature/Rule changes, that is a separate domain upgrade under A1.8 / A1.10 / A1.11 — informed by Evaluation, not performed by Calibration publish.

---

## 11. Relationship with Evaluation (A1)

| Concern | Evaluation (A1 / Bible Evaluation Engine) | Calibration (A2) |
|---|---|---|
| Per-match Comparison | Owns | Consumes |
| Accuracy / contribution / reliability metrics | Statistics projections under Evaluation-relevant definitions | Consumes as Calibration Input |
| Quality gates / promotion eligibility | Owns gate decision on candidates | Supplies candidate; cannot self-approve |
| Calibration methodology (bins, accepted error, slices) | Evaluation methodology ownership (doc 10) | Obeys pinned methodology version |
| Population reliability tables | Statistics computes (doc 11) | Reads exact projection ids |
| Live pin selection | Does not run matches | After approval, Analysis pins for future runs |

### 11.1 Boundary sentence (binding)

> Evaluation **assesses**. Statistics **aggregates**. Calibration **proposes new future pins**. None of them rewrite sealed predictions.

---

## 12. DDD Ownership

### 12.1 Ownership map

| Concern | Owner | Package home (existing) |
|---|---|---|
| Sealed predictions / run coordination / future pin selection | Analysis orchestration | `@fas/analysis` |
| Confidence policy identity + consumption of approved artifact | Analysis Confidence module | `@fas/analysis` |
| Projection consumption of optional probability artifact | Analysis Projection module | `@fas/analysis` |
| Feature definitions | Feature | `@fas/feature` |
| Rule definitions | Rule | `@fas/rule` → `@fas/rule-engine` |
| Evidence Facts | Evidence | `@fas/evidence` |
| Calibration methodology, gates, promotion assessment | **Evaluation Engine** | target `@fas/evaluation-engine` |
| Reliability / calibration **projections** and watermarks | **Statistics Engine** | `@fas/statistics` → `@fas/statistics-engine` |
| Artifact storage (binary/object) | Infrastructure | `@fas/object-storage` / `@fas/database` as already architected — no new package |
| Human promotion command transport | API / worker | `apps/api`, `apps/worker` |
| Narrative | Report | `@fas/report` |

### 12.2 Analysis coordination (not ownership)

Analysis may:

- select Compatibility Profile + approved calibration artifact id for a **new** run;  
- refuse to seal if a required approved pin is missing when policy demands calibration;  
- enqueue offline validation jobs.

Analysis must not:

- define FeatureModelVersion or RuleSetVersion;  
- recompute Statistics projections inside Projection;  
- auto-approve candidates;  
- mutate historical seals when a new artifact is published.

### 12.3 Forbidden creations

```text
packages/calibration-engine/
packages/calibration/
eighth Bible Engine named Calibration
```

A0 already places calibration artifacts under `@fas/statistics` with Evaluation methodology ownership — A2 preserves that split.

### 12.4 Folder intent (folders only — no implementation)

```text
packages/statistics/          # calibration projections + artifact records (interim/target)
packages/evaluation-engine/   # methodology, gates, promotion assessment (target slot)
packages/analysis/
  src/confidence/             # consume approved artifact id
  src/projection/             # optional consume probability artifact id
```

---

## 13. Acceptance Criteria

When a coding sprint implements this design (separate authorization), the system must:

1. Build calibration candidates only from A1 Calibration Inputs / Evaluation+Statistics outputs on frozen cohorts.  
2. Never modify Prediction History, Evidence Facts, FeatureModels, or RuleSets when publishing calibration.  
3. Mint new ConfidencePolicyVersion and/or artifact ids (and ProjectionPolicyVersion if applicable) for every promoted mapping.  
4. Require Offline Validation + Evaluation gate `passed` + human promotion before any future-run pin.  
5. Allow Rollback by switching future pins to a prior approved identity without rewriting history.  
6. Keep Replay bound to original pins (A1.11).  
7. Keep Feature/Rule/Projection ownership intact; Analysis only coordinates pins.  
8. Introduce no new package and no new Bible Engine; leave Bible, Architecture Freeze, docs 17/18 unmodified by this design sprint.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Calibration Goals | **Designed** |
| Calibration Scope | **Designed** |
| Calibration Pipeline | **Designed** |
| Calibration Dataset Requirements | **Designed** |
| Calibration Targets | **Designed** |
| Candidate Model Lifecycle | **Designed** |
| Offline Validation | **Designed** |
| Promotion and Publish Policy | **Designed** |
| Rollback Principles | **Designed** |
| Relationship with Version Governance | **Designed** |
| Relationship with Evaluation | **Designed** |
| DDD Ownership | **Designed** |
| Acceptance Criteria | **Designed** |
| Production code / schemas | **Out of scope** |
| Bible / Architecture / docs 17–18 / new packages | **Out of scope** |

---

## 14. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md) *(read-only)*
- [`docs/10_EVALUATION_ENGINE.md`](../../10_EVALUATION_ENGINE.md) *(read-only)*
- [`docs/11_STATISTICS_ENGINE.md`](../../11_STATISTICS_ENGINE.md) *(read-only)*
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
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A2 Football Intelligence Calibration Framework design. Design only — no implementation.*
