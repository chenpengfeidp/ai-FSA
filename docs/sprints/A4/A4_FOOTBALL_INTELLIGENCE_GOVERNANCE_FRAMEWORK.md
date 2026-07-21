# A4 — Football Intelligence Governance Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A4** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| A1 Evaluation | [`../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| A1.5 Projection | [`../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| A1.8 Rule Hierarchy | [`../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md) |
| A1.9 Evidence Reliability | [`../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md) |
| A1.10 Feature Framework | [`../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md) |
| A1.11 Versioning | [`../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md`](../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md) |
| A2 Calibration | [`../A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md`](../A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md) |
| A2.5 Experimentation | [`../A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md`](../A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md) |
| A3 Explainability | [`../A3/A3_FOOTBALL_INTELLIGENCE_EXPLAINABILITY_FRAMEWORK.md`](../A3/A3_FOOTBALL_INTELLIGENCE_EXPLAINABILITY_FRAMEWORK.md) |
| Workflow (read-only) | [`docs/DEVELOPMENT_WORKFLOW.md`](../../DEVELOPMENT_WORKFLOW.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 (read-only alignment) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; schemas; formulas; package creation; Bible / Architecture Freeze / docs 17 / docs 18 edits; other doc edits |

---

## 1. Purpose

Design the **long-term governance model** for Football Intelligence: how the platform evolves safely while preserving architecture stability, reproducibility, ownership boundaries, and evidence-first reviewability.

```text
Design (A-series)
  → Design Review
  → Architecture Review Gate (when triggered)
  → Coding Gate
  → Implementation (owned packages only)
  → Experiment / Calibration (optional)
  → Evaluation evidence
  → Release / pin publish (future runs only)
  → Deprecation / Rollback
```

**Naming discipline:** Governance is a **process and ownership framework** over existing Bible Engines, Freeze packages, and A-series Intelligence designs. It is **not** a new Bible Engine and **not** a new package.

---

## 2. Governance Principles

| Principle | Meaning |
|---|---|
| **Bible supremacy** | Mission and engine count remain binding; Intelligence modules are not eighth Engines (A0) |
| **Freeze stability** | Architecture Freeze v0.2 ownership and dependency direction are not bypassed by sprint convenience |
| **Evidence before intuition** | Facts, signals, findings, inference stay separate |
| **Determinism where claimed** | Feature / Rule / Projection / Scenario / Confidence seals are reproducible under pinned versions (A1.11) |
| **Immutability of seals** | Prediction History is never rewritten by Calibration, Experiment promotion, or docs churn (A1 / A2 / A2.5) |
| **Domain ownership** | Each domain authors its definitions; Analysis coordinates pins only |
| **Honesty first** | Absence, conflict, and unknown beat false certainty (A1.9 / A1.8) |
| **Human promotion** | Learning, calibration, and default pin changes never auto-activate |
| **Small reversible change** | Prefer reviewable increments; breaking changes require explicit gates |
| **Documentation as contract** | Design docs and ADRs outrank agent assumptions; status claims stay narrower than evidence |
| **Fail closed** | Incompatible pins, missing replay ability, or failed gates block seal/publish — not silent degrade-to-success |

---

## 3. Architecture Ownership

| Layer | Owns | Must not |
|---|---|---|
| **Project Bible** | Mission, principles, seven Engines | Be edited by Intelligence sprints casually |
| **Architecture Freeze / numbered architecture docs** | Module boundaries, dependency direction, pipeline contracts | Be “fixed in code” without ADR + doc authority |
| **ADRs** | Durable decisions and supersession | Be ignored when Freeze and implementation disagree |
| **A-series design docs** | Football Intelligence specialization contracts | Invent parallel architecture or new packages |
| **Implementation** | Code inside owned packages | Create shadow ownership or cross-table coupling |

Authority order for conflicts remains the repository hierarchy (Bible → ADRs → numbered architecture → approved plans/gates → PROJECT_STATE → sprint reports → implementation). This A4 document **does not** replace that hierarchy; it specializes governance for Football Intelligence evolution.

Analysis Orchestrator coordinates pre-match Intelligence runs; it is not an Engine (docs 17 / 18).

---

## 4. Domain Ownership

Preserved package ownership (no changes authorized by A4):

| Domain | Package home | Intelligence responsibility |
|---|---|---|
| Evidence | `@fas/evidence` (+ normalizer) | Facts, reliability, selection (A1.9) |
| Feature | `@fas/feature` | Derived measurements, FeatureModelVersion (A1.10) |
| Rule | `@fas/rule` → `@fas/rule-engine` | Findings, RuleSetVersion, hierarchy (A1.8) |
| Projection / Scenario / Confidence | `@fas/analysis` | Probabilities, selection, trust (A1.5) |
| Report / Narrative | `@fas/report` (+ prompt/AI rewrite path) | Explanation assembly (A3) |
| Evaluation | Evaluation Engine slot | Quality gates, methodology (A1 / A2) |
| Statistics | `@fas/statistics` → statistics-engine | Metrics, calibration projections (A1 / A2) |
| Review | Review Engine slot | Optional human post-match assessment |
| Match | `@fas/match` | Fixture / result version references |
| Providers | provider packages (edge) | Raw captures only |
| Persistence / jobs | `@fas/database`, `@fas/jobs` | Infra only |

**Cross-layer ownership is forbidden:** Feature does not own RuleSets; Report does not own probabilities; Calibration does not own Evidence Facts; Experimentation does not author Feature catalogues.

---

## 5. Version Governance

**Reference:** [`A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md`](../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md)

Governance mandates:

1. Every sealed prediction pins the full Intelligence version taxonomy.  
2. Domains own version **definitions**; Analysis owns run **pin coordination** only.  
3. Sealed Prediction History pins are immutable.  
4. Compatibility Profiles declare allowed tuples; incompatible tuples fail closed.  
5. Replay binds original pins; latest-model what-if is new lineage.  
6. Evaluation and Calibration cohorts must record pins for fair comparison.

A4 does not redefine version identities; it requires all Intelligence releases to obey A1.11.

---

## 6. Feature Lifecycle

**Reference:** [`A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md)

| Stage | Governance meaning |
|---|---|
| Declare / Bind | Feature id + Evidence binding enters a FeatureModelVersion draft |
| Design Review | Honesty omission, tier/domain/category, compatibility with RuleSets |
| Coding Gate | Implementation only in `@fas/feature` |
| Experiment | Trial via A2.5 before default Compatibility Profile adoption |
| Publish model version | New FeatureModelVersion for future runs |
| Evaluate | A1 Feature Contribution — descriptive, not auto-merge |
| Deprecate / Retire | Disallow for new runs; keep readable for Replay |

Forbidden: inventing Availability full-strength zeros; Feature reading Providers or Projection.

---

## 7. Rule Lifecycle

**Reference:** [`A1_8_FOOTBALL_RULE_HIERARCHY.md`](../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md) and Bible Rule Engine governance intent (doc 07, read-only).

| Stage | Governance meaning |
|---|---|
| Draft Rule / RuleSet | Tier, domain, category, channel, priority assigned |
| Design Review | Conflict retention, honesty Rules, market channel-none |
| Coding Gate | Implementation in `@fas/rule` / future `@fas/rule-engine` |
| Activate RuleSetVersion | Pin for Compatibility Profile / experiments |
| Evaluate | A1 Rule Contribution |
| Retire | Omit from new RuleSets; historical envelopes keep ids |

Forbidden: AI-authored auto-activated conditions; Rules computing probability matrices; silent in-place edits of active RuleSetVersions.

---

## 8. Projection Lifecycle

**Reference:** [`A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md)

| Stage | Governance meaning |
|---|---|
| Policy draft | ProjectionPolicyVersion (+ Scenario/Confidence policy pairing) |
| Design Review | Probability ownership stays in Projection; Scenario/Confidence consume |
| Coding Gate | Changes only in `@fas/analysis` projection/scenario/confidence modules |
| Experiment / Calibration | Trial maps and policies (A2 / A2.5) |
| Publish pin | Future runs only |
| Limitations discipline | Dual-basis / uncalibrated notes remain honest disclosures |

Forbidden: Projection reading raw Evidence; Scenario inventing distributions; Confidence as a second 1X2 engine.

---

## 9. Calibration Governance

**Reference:** [`A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md`](../A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md)

| Mandate | Meaning |
|---|---|
| Input | A1 Calibration Input / Evaluation + Statistics only |
| Output | New artifact ids and/or Confidence/Projection policy versions |
| Gate | Offline Validation + Evaluation gate + human promotion |
| Effect | Future pins only; history untouched |
| Rollback | Prior approved pin for new runs |
| Non-ownership | Does not edit FeatureModels or RuleSets in place |

Auto-promotion is a governance violation.

---

## 10. Experiment Governance

**Reference:** [`A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md`](../A2/A2_5_FOOTBALL_INTELLIGENCE_EXPERIMENTATION.md)

| Mandate | Meaning |
|---|---|
| Modes | Offline / Replay / Shadow / Canary / A/B / Champion–Challenger |
| Freeze | Pins and scope immutable once Running |
| Seal rules | Shadow non-authoritative; canary/A/B seals carry challenger pins forever |
| Promotion | Qualified + human approval → future defaults |
| Calibration coupling | Draft artifacts default to shadow/offline until A2 Approved |
| Rollback | Restore prior default pins for future traffic |

Experiments must not hijack original-seal Replay into “latest challenger.”

---

## 11. Documentation Governance

| Document class | Rule |
|---|---|
| **Bible / Freeze / docs 17–18 / ADRs** | Edit only through their own authority process — not by Intelligence coding sprints |
| **A-series design docs** | Immutable historical design records once accepted; supersession via newer sprint docs, not silent rewrite |
| **PROJECT_STATE** | Updated after real delivery milestones with evidence-narrow claims |
| **Sprint reports** | Evidence of what shipped; never replace canonical contracts |
| **Evidence Catalog (doc 50)** | Delivery status tracking — complements, does not replace Freeze |
| **Agent / workflow guides** | Change only when collaboration lifecycle changes |

Documentation changes that alter ownership or pipeline contracts require Design Review + Architecture Review Gate when Freeze/Bible/ADR-impacting.

Status language must remain **narrower than validation evidence**.

---

## 12. Architecture Freeze

| Mandate | Meaning |
|---|---|
| **Respect** | Football Intelligence evolves **inside** Freeze v0.2 module map |
| **No casual thaw** | New packages, new Engines, Redis/BullMQ/pgvector, auth/public deploy remain Freeze / milestone gated |
| **Intelligence modules** | Feature / Scenario / Confidence / Narrative are modules, not Engines (A0) |
| **Exceptions** | Require ADR + canonical doc updates — not sprint markdown alone |
| **This A4 doc** | Does **not** edit the Freeze; it binds Intelligence work to obey it |

---

## 13. ADR Policy

| When an ADR is required | Examples for Intelligence |
|---|---|
| Ownership / package boundary change | Splitting `@fas/feature` into a new package; moving Projection to Statistics |
| New infrastructure | Queue, cache, vector store for Intelligence |
| Trust boundary change | Treating Market as Fact; AI writing Evidence |
| Breaking architectural decision | Eighth Engine; cross-module table reads |
| Intentional Freeze exception | Any approved deviation |

| When ADR is not required | Examples |
|---|---|
| Additive Feature/Rule inside owned packages under existing contracts | New Optional Feature + RuleSetVersion |
| New Compatibility Profile / calibration artifact | A1.11 / A2 pins |
| Design-only A-series docs | This governance series |

ADR supersession must be explicit. Implementation must not precede ADR when the trigger table matches.

---

## 14. Breaking Change Policy

A change is **breaking** for Football Intelligence when it:

- alters sealed Distribution / Scenario / Confidence **contracts** consumers rely on;  
- removes or renames Primary Features or changes their meaning incompatibly;  
- changes Rule channel eligibility so Projection weighting silently shifts without ProjectionPolicyVersion bump;  
- allows Projection to read raw Evidence or Narrative to invent probabilities;  
- breaks Replay of historical pins;  
- changes Compatibility edge semantics without a new Compatibility Profile major.

**Required for breaking changes:**

1. Design Review (§18)  
2. Architecture Review Gate if Freeze/ADR-impacting (§20)  
3. Major version bumps per A1.11 on affected identities  
4. Coding Gate (§19) with migration/Replay notes  
5. Experiment evidence before production default (A2.5) unless emergency rollback  
6. No mutation of historical Prediction History  

---

## 15. Deprecation Policy

| Step | Meaning |
|---|---|
| **Announce** | Mark version/profile deprecated for new runs; document successor |
| **Dual-run window** (optional) | Experiment/canary successor while deprecated remains readable |
| **Disallow new seals** | Compatibility Profiles stop selecting deprecated pins |
| **Retain for Replay/Evaluation** | Deprecated pins remain loadable for history |
| **Archive** | After governance retention period, keep audit identity even if runtime code paths are removed — removal that breaks Replay is itself a breaking change |

Deprecation never deletes sealed reports or silently retargets their pins to successors.

---

## 16. Release Governance

| Release kind | Includes | Gate |
|---|---|---|
| **Design release** | Accepted A-series doc | Design Review only — no coding authorization |
| **Compatibility Profile release** | New default pin tuple for future runs | Evaluation/Experiment evidence as required + human publish |
| **Domain version release** | FeatureModel / RuleSet / Projection/Confidence/Narrative policy versions | Domain Coding Gate + compat edges |
| **Calibration artifact release** | Approved artifact id | A2 promotion checklist |
| **Product/code release** | Shipable git tag / app release | Repository validation baseline + review |

Intelligence “going live” on a new default means **pin publish for future runs**, not rewriting past seals.

Tags/releases still follow repository rules: only when explicitly requested and after validation (agent/workflow norms).

---

## 17. Compatibility Governance

**Reference:** A1.11 Compatibility Profiles and edges.

| Mandate | Meaning |
|---|---|
| Edge checks | FeatureModel ↔ RuleSet ↔ ProjectionPolicy (+ Scenario/Confidence/Narrative/Evidence selection) before seal |
| Profile versioning | Widening or tightening allowed tuples ⇒ new Compatibility Profile version |
| Mixed majors | Unqualified “overall accuracy” across incompatible majors forbidden for release gates (A1) |
| Experiment challengers | Must pass edge checks before Running (A2.5) |
| Fail closed | No seal on incompatible pins |

Analysis enforces; domains declare edge constraints for their endpoints.

---

## 18. Design Review Process

Applies to new or superseding Football Intelligence design docs and to design deltas that change contracts.

| Step | Action |
|---|---|
| 1 | Author states goal, non-goals, ownership impact, Freeze/Bible impact |
| 2 | Align with A-series chain (A0→A4) and docs 17/18 read-only |
| 3 | Review checklist: ownership, versioning, honesty, immutability, no new Engine/package |
| 4 | Record acceptance or required changes |
| 5 | Design acceptance **≠** Coding Gate |

Small implementation tasks inside existing architecture may skip a new design doc when goal/scope/acceptance are already clear (repository workflow), but **must not** skip Architecture Review Gate when Freeze/ADR triggers fire.

---

## 19. Coding Gate

Coding for Football Intelligence is authorized only when:

1. Owning design contracts exist (or change is clearly within an accepted design);  
2. Package ownership is unchanged or ADR-approved;  
3. Version minting plan exists (A1.11);  
4. Tests/acceptance evidence are defined;  
5. Explicit human/coding authorization for the sprint (design docs alone do not ship code);  
6. No Provider/Bible/Freeze drive-by edits outside scope.

During coding: keep deterministic boundaries; no LLM Rule evaluation; no Projection↔Evidence bypass; collect validation evidence.

After coding: review diff for scope leakage; run affected quality gates; optional sprint report for durable evidence.

---

## 20. Architecture Review Gate

**Required** when Intelligence work would:

- change Freeze module map or dependency direction;  
- add packages or Bible Engines;  
- introduce infra (queue/cache/vector/microservice);  
- alter Evidence/Analysis seal contracts in docs 17/18 sense;  
- collapse Evaluation/Statistics/Review boundaries;  
- expose system publicly / add auth in V1 contrary to Freeze.

**Not required** for routine additive Feature/Rule/policy versions inside owned packages obeying A-series designs — those use Design Review + Coding Gate + Experiment/Calibration as applicable.

Architecture Review outcomes: approve / approve with ADR / reject / request design revision. Implementation must not start on reject.

---

## 21. Acceptance Criteria

When this governance model is adopted for Football Intelligence delivery (operational process — not a code sprint by itself), the program must:

1. Obey Bible Engine count and Freeze ownership; create no Intelligence-only eighth Engine or rogue package.  
2. Route versioned evolution through A1.11 pins, Compatibility Profiles, and immutable Prediction History.  
3. Govern Feature / Rule / Projection lifecycles per A1.10 / A1.8 / A1.5 without cross-domain authorship.  
4. Require A2 Calibration and A2.5 Experiment human promotion before production default pin changes (when those mechanisms are in use).  
5. Keep Explainability (A3) citation-bound and deterministic over seals.  
6. Use Design Review, Coding Gate, and Architecture Review Gate per §§18–20.  
7. Apply Breaking / Deprecation / Release / Compatibility policies (§§14–17) without rewriting history.  
8. Leave Bible, Architecture Freeze, and docs 17/18 unmodified by this design document alone.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Purpose / Principles | **Designed** |
| Architecture / Domain Ownership | **Designed** |
| Version / Feature / Rule / Projection lifecycles | **Designed** (by reference) |
| Calibration / Experiment governance | **Designed** (by reference) |
| Documentation / Freeze / ADR policies | **Designed** |
| Breaking / Deprecation / Release / Compatibility | **Designed** |
| Design Review / Coding Gate / Architecture Review Gate | **Designed** |
| Acceptance Criteria | **Designed** |
| Production code / schemas / formulas / new packages | **Out of scope** |
| Bible / Architecture Freeze / docs 17–18 edits | **Out of scope** |

---

## 22. Alignment map (A-series)

| Doc | Governance role |
|---|---|
| A0 / A0.5 | Intelligence module map + MVP contracts |
| A1 | Post-match Evaluation / history |
| A1.5 | Projection probability ownership |
| A1.8 | Rule hierarchy lifecycle |
| A1.9 | Evidence reliability honesty |
| A1.10 | Feature lifecycle |
| A1.11 | Version / compat / replay |
| A2 | Calibration promotion |
| A2.5 | Experimentation before defaults |
| A3 | Explainability over seals |
| **A4** | Long-term governance wrapper |

---

## 23. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md) *(read-only)*
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) *(read-only)*
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) *(read-only)*
- [`docs/DEVELOPMENT_WORKFLOW.md`](../../DEVELOPMENT_WORKFLOW.md) *(read-only)*
- [`docs/decisions/`](../../decisions/) *(read-only)*
- All A0–A3 paths listed in the header table
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A4 Football Intelligence Governance Framework design. Design only — no implementation.*
