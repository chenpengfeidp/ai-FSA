# A2.5 — Football Intelligence Experimentation Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A2.5** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation design | [`../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](../A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Projection design | [`../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](../A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| Rule hierarchy | [`../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](../A1/A1_8_FOOTBALL_RULE_HIERARCHY.md) |
| Evidence reliability | [`../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](../A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md) |
| Feature framework | [`../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md`](../A1/A1_10_FOOTBALL_FEATURE_FRAMEWORK.md) |
| Versioning | [`../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md`](../A1/A1_11_FOOTBALL_INTELLIGENCE_VERSIONING.md) |
| Calibration | [`A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md`](./A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 (read-only alignment) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; DTO/database schemas; formulas; package creation; Bible / Architecture Freeze / docs 17 / docs 18 edits; redesign of existing modules; other doc edits |

---

## 0. Purpose

Design the complete **Experimentation Framework** for Football Intelligence: how new FeatureModels, RuleSets, Projection Policies, Confidence Policies, Compatibility Profiles, and approved Calibration artifacts are **compared and validated** before any of them become **production defaults** for future runs.

```text
Candidate version tuple
  → Experiment (offline / replay / shadow / canary / A/B / champion–challenger)
  → A1 Evaluation evidence
  → Optional A2 Calibration path
  → Human Promotion / Reject
  → New production default pins (future runs only)
```

**Naming discipline:** Experimentation is a **governed workflow** coordinated by Analysis application concerns and judged by Evaluation — **not** a new Bible Engine and **not** a new package.

### Hard constraints (binding)

- Design only. No implementation, schemas, formulas, or production code.  
- No package creation. No Bible / Architecture Freeze / docs 17 / docs 18 edits.  
- Do not redesign Feature, Rule, Projection, Evidence, Evaluation, or Calibration modules — only how candidates are **trialed**.  
- Preserve current package ownership.  
- Historical Prediction History remains immutable (A1 / A1.11 / A2).  
- Align with A0, A0.5, A1, A1.5, A1.8, A1.9, A1.10, A1.11, and A2.

---

## 1. Goals and scope

### 1.1 Experimentation purpose

| Goal | Meaning |
|---|---|
| **Safe improvement** | Trial new Intelligence pins without silently rewriting history or Facts |
| **Fair comparison** | Champion vs Challenger under declared cohorts and version slices (A1 / A1.11) |
| **Evidence before default** | Production default changes require Evaluation (and Calibration gates when applicable) plus human approval |
| **Controlled exposure** | Shadow / canary / scoped traffic before full default |
| **Reproducibility** | Every experiment run binds exact candidate pins; Replay remains possible |
| **Ownership respect** | Domains still own Feature/Rule/Projection/Confidence/Calibration definitions |

### 1.2 In scope

- Declaring experiments over **versioned candidates**: FeatureModelVersion, RuleSetVersion, ProjectionPolicyVersion, ConfidencePolicyVersion, Compatibility Profile, calibration artifact ids.  
- Offline, Replay, Shadow, Canary, A/B, and Champion vs Challenger modes.  
- Traffic / rollout scoping (full, partial, shadow-only, competition/league/season).  
- Integration with A1 Evaluation, A2 Calibration, A1.11 Version Governance.  
- Promotion and Rollback of **future defaults** only.

### 1.3 Out of scope

- Changing Evidence Facts or Provider adapters as “experiments.”  
- LLM-authored Rule/Feature definitions.  
- In-play / live betting experiments.  
- Auto-promotion from dashboards.  
- Implementing experiment infrastructure, assignment algorithms, or UI.  
- Redesigning Scenario selection contract (challengers may only change upstream pins that feed Projection).  
- Replacing Evaluation or Calibration frameworks.

---

## 2. Experiment taxonomy

| Type | Purpose | Seals Prediction History? | Uses latest policies? |
|---|---|---|---|
| **Offline Experiment** | Score challenger pins on a frozen historical cohort with Actuals already known | No new production seals; may create **experiment result lineage** only | Challenger pins on frozen Evidence Selection Versions — not “latest Evidence rewrite” |
| **Replay Experiment** | Re-verify or recompute under **explicit** candidate pins as a **new counterfactual lineage** (A1.11 what-if) | New lineage entries if outputs are retained; **never** overwrites original seals | Only the declared candidate pins — never silent latest |
| **Shadow Experiment** | On live/pre-match traffic, compute challenger outputs **alongside** champion; challenger does **not** affect sealed customer-facing Report | Champion seal only (shadow outputs logged, non-authoritative) | Challenger pins for shadow path only |
| **Canary Experiment** | Small fraction of eligible **new** runs seal under challenger Compatibility Profile | Yes — for canary-assigned new runs only | Challenger pins for assigned traffic |
| **A/B Experiment** | Split eligible new runs between champion and challenger profiles by assignment policy | Yes — per assigned arm | Arm-specific pins |
| **Champion vs Challenger** | Product pattern spanning the above: named baseline (champion) vs candidate (challenger) under one Experiment identity | Depends on mode (offline/shadow ⇒ no challenger seal; canary/A/B ⇒ challenger seals for assigned traffic) | Declared tuples only |

### 2.1 Taxonomy rules

1. An Experiment declares **mode**, **champion pin tuple**, **challenger pin tuple**, **cohort/scope**, and **success criteria references** (Evaluation assessment-definition versions).  
2. Offline and Replay never mutate original Prediction History pins.  
3. Shadow never lets challenger values enter the sealed Report spine.  
4. Canary/A/B may seal challenger Reports for assigned new matches only — those seals carry challenger version pins forever.  
5. “Champion vs Challenger” is the comparison posture; it must still pick an executable mode from the taxonomy.

---

## 3. Experiment lifecycle

| State | Meaning |
|---|---|
| **Draft** | Experiment identity + pin tuples + scope defined; not executing |
| **Running** | Assignments / offline jobs / shadow computes in progress under frozen experiment definition |
| **Completed** | Execution finished; raw experiment outcomes recorded; not yet gate-qualified |
| **Qualified** | A1 Evaluation (and A2 gates if required) produced `passed` / eligible decision for the experiment’s success criteria |
| **Approved** | Human promotion accepted; challenger may become future production default (or scoped default) |
| **Rejected** | Human or gate rejection; challenger not promoted |
| **Archived** | Terminal retention state; readable for audit; not runnable |

### 3.1 Lifecycle rules

1. Definition is immutable once **Running** begins (scope/pins frozen — A1.11 spirit).  
2. **Qualified** requires Evaluation evidence; Completion alone is insufficient for promotion.  
3. **Approved** never rewrites historical champion seals.  
4. Transition to Approved requires human rationale + rollback target (prior default pins).  
5. Rejected/Archived candidates remain identifiable; they are not deleted to erase failure.

---

## 4. Traffic and rollout strategy

Applies to **new runs** (and shadow side-computes). Not to rewriting old seals.

| Strategy | Meaning |
|---|---|
| **Full traffic** | All eligible new runs use challenger as default after Approval (post-experiment publish) |
| **Partial traffic** | Canary/A/B: only an assigned fraction of eligible new runs seal under challenger |
| **Shadow only** | Challenger computed but never sealed as the authoritative Report |
| **Competition scoped** | Eligibility limited to declared competitions |
| **League scoped** | Eligibility limited to declared leagues |
| **Season scoped** | Eligibility limited to declared seasons / date windows |

### 4.1 Rollout principles

1. Scope is part of the frozen Experiment definition and of any Compatibility Profile publish that follows Approval.  
2. Partial traffic assignment must be deterministic and auditable (exact assignment policy version — not designed as algorithm here).  
3. Expanding scope after Running starts requires a **new Experiment** (or new Experiment version), not an in-place edit.  
4. Full traffic publish is a Promotion event (§10), not an implicit end of Running.  
5. Evidence reliability acknowledgements and readiness still apply per run (A1.9); experiment scope cannot waive honesty.

---

## 5. Candidate ownership

Candidates are **version identities owned by their domains**. Experimentation trials them; it does not take ownership of their contents.

| Candidate | Owning domain | Package home | Experiment may |
|---|---|---|---|
| **FeatureModelVersion** | Feature | `@fas/feature` | Select as challenger pin; never edit catalogue in-experiment |
| **RuleSetVersion** | Rule | `@fas/rule` → `@fas/rule-engine` | Select as challenger pin |
| **ProjectionPolicyVersion** | Analysis Projection | `@fas/analysis` | Select as challenger pin |
| **ConfidencePolicyVersion** | Analysis Confidence | `@fas/analysis` | Select as challenger pin |
| **Calibration artifact** | Statistics artifact + Evaluation methodology; consumed by Confidence/Projection | `@fas/statistics` (+ Evaluation) | Select approved or draft-eligible artifact id per A2 rules (draft artifacts only in offline/shadow unless policy allows) |
| **Compatibility Profile** | Coordinated pin tuple (A1.11); Analysis enforces | `@fas/analysis` coordination | Champion/challenger profiles are the usual experiment unit |

### 5.1 Candidate composition

An Experiment challenger is typically a **Compatibility Profile** (or explicit tuple) that differs from champion in one or more of the above pins. Multi-change challengers are allowed but must be labeled; Evaluation slices must still permit fair attribution where gates require single-factor cohorts.

### 5.2 Ownership sentence (binding)

> Domains **author** candidates. Experimentation **assigns and compares** them. Evaluation **judges**. Humans **promote**. Analysis **coordinates** pins for new runs.

---

## 6. Evaluation integration (A1)

| Concern | A1 Evaluation | A2.5 Experimentation |
|---|---|---|
| Comparison / metrics / gates | Owns assessment of sealed or experiment-lineage subjects | Declares which assessment-definition versions and metrics constitute success |
| Fair version cohorts | Requires version pins on subjects | Guarantees champion/challenger pins are recorded on every experiment outcome |
| Rule/Feature contribution | Post-match analytics | May be success criteria inputs; cannot auto-edit Rule/Feature |
| Gate decisions | `passed` / `failed` / `not_qualified` | Drive Qualified vs cannot-promote |

### 6.1 Integration rules

1. Offline/Replay experiment outcomes become Evaluation subjects under experiment lineage — not mutations of original seals.  
2. Canary/A/B challenger seals are normal Prediction History entries with challenger pins; Evaluation scores them like any seal, sliced by experiment id.  
3. Shadow outputs may be evaluated only if explicitly retained as non-authoritative experiment artifacts under policy — they are never confused with sealed Reports.  
4. Experimentation does **not** replace Evaluation reports or metric ownership.

---

## 7. Calibration integration (A2)

| Concern | A2 Calibration | A2.5 Experimentation |
|---|---|---|
| Candidate calibration artifacts | Fit/validate/promote maps for future Confidence/Projection | May trial an approved or gate-eligible artifact as challenger pin |
| Offline Validation / gates | Required before artifact Approval | Experiment may **include** calibration candidates but cannot skip A2 promotion prerequisites for making an artifact “Approved” |
| History immutability | Never rewrite seals | Same |

### 7.1 Integration rules

1. Using a **draft** calibration artifact in production canary/A/B seals requires explicit Experiment policy allowance; default is **shadow/offline only** until A2 Approved.  
2. Experiment Approval to use an artifact as default still requires the artifact’s own A2 Approved state (or a combined human decision that satisfies both Experiment and Calibration promotion checklists).  
3. Calibration Offline Validation cohorts and Experiment offline cohorts should share version-pin discipline (A1.11); they may be distinct cohort versions.  
4. Experimentation never fits calibration maps itself — that remains A2 / Statistics under Evaluation methodology.

---

## 8. Version Governance integration (A1.11)

| A1.11 rule | Experimentation implication |
|---|---|
| Exact pins at seal | Champion and challenger arms record full taxonomy pins |
| No overwrite of history | Experiments append lineage / new seals only |
| Compatibility edges | Challenger tuples must pass compatibility checks before Running |
| Replay binds original pins | Experiment Replay mode uses declared candidate pins as a **new** lineage, not “latest” |
| Compatibility Profile | Primary vehicle for champion/challenger defaults after Approval |
| Major/Minor/Patch | New candidate versions follow domain upgrade policy before they can be experimented |

### 8.1 Experiment definition freeze

When an Experiment enters **Running**, its champion tuple, challenger tuple, mode, scope, assignment-policy version, and success-criteria references are frozen. Changes require a new Experiment identity.

---

## 9. Replay compatibility

| Mode | Replay relationship |
|---|---|
| **Replay Experiment** | Explicit counterfactual: recompute under challenger pins from frozen Evidence Selection Versions; store as new lineage if retained |
| **Historical Replay (A1.11)** | Still binds **original** seal pins; Experimentation must not hijack this into latest-challenger recompute under the same history id |
| **Offline Experiment** | Uses frozen selections + Actuals; may call the same deterministic path as Replay without claiming to be the original seal |

### 9.1 Replay rules (binding)

1. Original Prediction History Replay remains sacred under original pins.  
2. Challenger Replay/Offline is labeled `experiment` / `counterfactual` lineage.  
3. If old implementation of a pin is unavailable ⇒ `not_replayable` for that arm — no silent substitute.  
4. Web/API must not recompute sealed champion fields on page load (doc 17 alignment).

---

## 10. Promotion policy

Promotion makes a challenger (or subset of its pins) the **future production default** within a declared scope.

### 10.1 Prerequisites

1. Experiment state **Qualified** (Evaluation success criteria met).  
2. Any calibration artifact involved is A2-Approved (or explicitly co-approved).  
3. Compatibility Profile (or tuple) for the new default passes A1.11 edge checks.  
4. Human actor + rationale + scope (league/season/competition/traffic).  
5. Rollback target = prior champion default pins.  
6. Honesty/reliability: no promotion that removes Availability/Venue honesty constraints without Feature/Rule domain Major change governance.

### 10.2 Promotion effects

| May change | Must not change |
|---|---|
| Future default Compatibility Profile / pin selection | Past Prediction History entries |
| Canary→full traffic schedule (as a new publish step) | Evidence Facts |
| Experiment state → Approved | Feature/Rule catalogue contents (unless separate domain release already minted those versions) |

### 10.3 No auto-promotion

Metrics, lifts, or job completion never flip production defaults. Only explicit human Promotion does.

---

## 11. Rollback policy

| Principle | Meaning |
|---|---|
| **Future default revert** | Point new runs at prior Approved champion pins / Compatibility Profile |
| **History intact** | Canary/A/B seals made under challenger remain under challenger pins |
| **Shadow/offline** | Rollback is a no-op for seals (none were challenger-authoritative) |
| **Explicit rationale** | Actor + reason (regression, honesty defect, contamination, ops failure) |
| **Compat profile version** | Rollback publish uses a profile version that restores prior pins |
| **Experiment state** | May move to Rejected/Archived; does not erase records |

Rollback must fail closed if the prior pin identity is missing — never “latest mutable.”

---

## 12. DDD ownership

| Concern | Owner | Package home |
|---|---|---|
| Experiment definition, assignment coordination, pin selection for arms | Analysis application coordination | `@fas/analysis` |
| FeatureModel candidates | Feature | `@fas/feature` |
| RuleSet candidates | Rule | `@fas/rule` → `@fas/rule-engine` |
| Projection / Confidence / Compatibility Profile pins | Analysis modules | `@fas/analysis` |
| Calibration artifacts | Statistics + Evaluation methodology | `@fas/statistics` / Evaluation Engine slot |
| Success criteria, gates, quality reports | **Evaluation Engine** | target `@fas/evaluation-engine` |
| Population metrics used in criteria | **Statistics Engine** | `@fas/statistics` → `@fas/statistics-engine` |
| Evidence Facts / selections | Evidence | `@fas/evidence` |
| Sealed Report presentation | Report | `@fas/report` |
| Jobs / API commands | worker / api | `apps/worker`, `apps/api` |
| Persistence | Infrastructure | `@fas/database` |

### 12.1 Forbidden creations

```text
packages/experimentation-engine/
packages/experiment/
eighth Bible Engine named Experimentation
```

### 12.2 Non-redesign statement

Experimentation **selects and compares** existing versioned outputs of Feature, Rule, Projection, Confidence, and Calibration. It does not redefine their internal pipelines (A1.5 / A1.8 / A1.9 / A1.10 / A2).

### 12.3 Dependency direction

```text
Domain candidates (Feature/Rule/Projection/Confidence/Calibration/Compat)
  → Experiment definition (Analysis coordinates)
  → Arm execution (shadow / seal / offline)
  → Evaluation (+ Statistics)
  → Human Promotion / Rollback
  → Future default pins only
```

---

## 13. Acceptance Criteria

When a coding sprint implements this design (separate authorization), the system must:

1. Support declared Experiment modes: Offline, Replay, Shadow, Canary, A/B, and Champion vs Challenger posture.  
2. Freeze experiment pins/scope at Running; record full A1.11 version taxonomy on every arm outcome.  
3. Keep original Prediction History immutable; challenger seals only for assigned new runs (or experiment lineage).  
4. Integrate success criteria with A1 Evaluation gates; do not replace Evaluation.  
5. Respect A2 Calibration approval rules when artifacts are challenger pins.  
6. Promote/Rollback **future defaults** only, with human rationale and prior-pin rollback targets.  
7. Preserve package ownership; create no new package or Bible Engine.  
8. Leave Bible, Architecture Freeze, and docs 17/18 unmodified by this design sprint.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Goals and scope | **Designed** |
| Experiment taxonomy | **Designed** |
| Experiment lifecycle | **Designed** |
| Traffic and rollout strategy | **Designed** |
| Candidate ownership | **Designed** |
| Evaluation integration | **Designed** |
| Calibration integration | **Designed** |
| Version Governance integration | **Designed** |
| Replay compatibility | **Designed** |
| Promotion policy | **Designed** |
| Rollback policy | **Designed** |
| DDD ownership | **Designed** |
| Acceptance Criteria | **Designed** |
| Production code / schemas / formulas | **Out of scope** |
| Bible / Architecture / docs 17–18 / new packages | **Out of scope** |

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
- [`docs/sprints/A2/A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md`](./A2_FOOTBALL_INTELLIGENCE_CALIBRATION_FRAMEWORK.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A2.5 Football Intelligence Experimentation Framework design. Design only — no implementation.*
