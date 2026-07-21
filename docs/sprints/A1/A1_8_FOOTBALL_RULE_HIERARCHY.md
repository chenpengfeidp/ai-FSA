# A1.8 — Football Rule Hierarchy Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A1.8** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation design | [`A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Projection design | [`A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](./A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 / 07 |
| Pipeline authority | [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) |
| Backend authority | [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; formulas; DTO/database schemas; implementation edits; Bible / Architecture Freeze edits; package-ownership changes; other doc edits |

---

## 0. Goal

Design the **canonical Rule Hierarchy** for Football Intelligence: how Rules are classified, owned, ordered, conflicted, versioned, and extended — without turning Rules into a second Projection engine or a new Bible Engine.

```text
Evidence (Facts)
  → FeatureBundle (derived measurements)
  → Rule Findings (hierarchy-evaluated)
  → Projection (weighting / probability ownership)
  → Scenario / Confidence / Narrative
```

**Hard constraints:**

- Design only. No production code. No implementation edits.
- No new Bible Engine. No new packages. No package-ownership changes.
- Rules evaluate **Features**, never raw Provider payloads and never FT outcomes.
- Projection alone maps findings into probability space (A1.5 / doc 17 §4.13).
- No AI-authored Rule conditions. No formulas in this document.

### Non-goals

- Listing every future Rule id as a frozen catalogue.
- Implementing `@fas/rule-engine` lifecycle UI.
- Changing Feature / Projection / Scenario / Confidence ownership.
- Calibration (A2) or Evaluation metric design (covered by A1).
- Market-as-truth or wagering advice.

---

## 1. Problem statement

A0.5 introduced ~22 MVP Rules with P0 / P1 / P2 priorities. Slice coding and A1.5 clarified that Rules **nudge channels** while Projection **owns probabilities**.

Without a hierarchy framework, the Rule library will drift into:

- flat lists with no Primary vs Supporting distinction;
- Scenario or Narrative inventing winners from a single loud Rule;
- Market / xG / Weather Rules silently overriding football lean;
- version churn that breaks A1 Evaluation cohorts;
- unclear conflict behavior when Form says Home and Availability hurts Home.

A1.8 freezes the hierarchy so every future Rule knows its **tier**, **domain**, **category**, **dependencies**, **conflict class**, and **version lineage**.

---

## 2. Rule taxonomy

### 2.1 Tier model (Primary / Secondary / Supporting)

| Tier | Role | Projection influence | Narrative role |
|---|---|---|---|
| **Primary Rules** | Core football lean drivers | Eligible for directional channels (`home+` / `away+`) under Projection policy | First-class Key Factors |
| **Secondary Rules** | Amplifiers, dampeners, context strengtheners | May adjust channel strength or limitations; must not alone invent a lean when no Primary PASS exists (policy-governed) | Supporting bullets / Risk context |
| **Supporting Rules** | Honesty, presence, consistency, market-signal, meta | Usually `channel: none` or limitation-only; never override Primary football Facts/Features as truth | Limitations, caution, “do not claim…” |

Mapping to A0.5 priority language (compatibility):

| A0.5 Priority | A1.8 Tier (canonical) |
|---|---|
| P0 (gates / honesty) | Supporting (with gate semantics) |
| P1 (lean drivers) | Primary |
| P2 (amplifiers / nuance) | Secondary (or Supporting when honesty/limitation-only) |

A Rule has exactly one tier inside a given **rule-set version**. Retiering requires a new rule-set version.

### 2.2 Football domains

Domains group Rules by football subject. A Rule belongs to **one primary domain** (optional secondary tag allowed for search only).

| Domain | Intent | Example themes (illustrative) |
|---|---|---|
| **Presence** | Match identity completeness | Teams present, kickoff present |
| **Form** | Recent results trajectory | Form superior / near parity |
| **Attack** | Offensive edge | Attack home/away edge |
| **Defense** | Stability / fragility | Defense stable / fragile |
| **Momentum** | Short-term directional momentum | Momentum home/away |
| **Home Context** | Home edge and venue | Home advantage, venue support / unavailable |
| **Availability** | Absences and honesty | Penalty hit / unknown |
| **Consistency** | Multi-signal alignment | Signals aligned home/away |
| **Market Signal** | Odds/market as **signal**, never Fact | Market lean (channel none) |
| **Set Piece / Special** (future) | Narrow football mechanisms when Evidence exists | Later catalogue |
| **External Conditions** (future) | Weather, travel, fatigue, referee | Later catalogue |
| **Lineup** (future) | Expected / confirmed lineup when Evidence exists | Later catalogue |

Domains are taxonomy labels for governance and dashboards (A1 Rule Performance). They do not create packages.

### 2.3 Rule categories

Categories describe **semantic job**, orthogonal to domain and tier.

| Category | Meaning | Typical tier |
|---|---|---|
| **Gate** | Must hold for analysis to proceed meaningfully; failure blocks or forces Cautious | Supporting |
| **Honesty** | Prevents false certainty when Features/Evidence are absent | Supporting |
| **Directional** | Asserts a home+ or away+ football lean | Primary (sometimes Secondary) |
| **Damping** | Softens extreme leans (parity, conflict, thin sample) | Secondary |
| **Amplifier** | Strengthens an existing lean when context supports it | Secondary |
| **Limitation** | Records a disclosed constraint without directional claim | Supporting |
| **Market Signal** | Records market state; never Fact; never sole football winner claim | Supporting |
| **Meta / Consistency** | Asserts agreement among other findings/Features | Secondary |

### 2.4 Finding statuses (unchanged product semantics)

Every Rule evaluation yields a finding status:

| Status | Meaning |
|---|---|
| **PASS** | Condition matched under pinned rule version |
| **FAIL** | Required Features present; condition not matched |
| **INAPPLICABLE** | Required Features missing / not eligible — not a silent false |

Honesty Rules that PASS on absence remain **Supporting / Honesty**, not “bad football.”

### 2.5 Illustrative placement (not a frozen id list)

| Example (conceptual) | Tier | Domain | Category |
|---|---|---|---|
| Teams / kickoff present | Supporting | Presence | Gate |
| Availability UNKNOWN | Supporting | Availability | Honesty |
| Form / Attack / Defense / Momentum edges | Primary | Form / Attack / Defense / Momentum | Directional |
| Home advantage material | Primary | Home Context | Directional |
| Venue supports home | Secondary | Home Context | Amplifier |
| Form near parity | Secondary | Form | Damping |
| Signals aligned | Secondary | Consistency | Meta / Consistency |
| Venue unavailable | Supporting | Home Context | Limitation |
| Market lean home/away | Supporting | Market Signal | Market Signal |

---

## 3. Rule ownership

Canonical pipeline ownership (aligned with A0, A1.5, docs 17 / 18):

| Concern | Owns | Must not |
|---|---|---|
| **Evidence** | Facts (normalized, provenance, cutoff) | Rules, probabilities |
| **Feature** (`@fas/feature`) | Derive FeatureBundle from Evidence | Evaluate Rules; invent Facts; compute 1X2 |
| **Rule** (`@fas/rule` → `@fas/rule-engine`) | Evaluate Features → findings (tier/domain/category under rule-set) | Read Providers; compute probability matrix; seal reports |
| **Projection** (`@fas/analysis`) | Weighting of eligible findings into Probability Distribution | Delete opposing findings; invent Facts |
| **Scenario** (`@fas/analysis`) | Select/present worlds from Projection | Read Rules as a private probability engine |
| **Confidence** (`@fas/analysis`) | Trust / upset / agreement over Projection + honesty findings | Independent win probabilities |
| **Narrative** (`@fas/report`) | Explain sealed Rule findings (+ Features / Scenarios) | Author new findings or scores |

### 3.1 Ownership sentences (binding)

1. **Feature derives** reviewable measurements from Evidence Facts — it does not “decide” the match.  
2. **Rule evaluates** those Features into hierarchical findings — it does not own softmax / λ / 1X2.  
3. **Projection owns weighting** of Primary (and policy-eligible Secondary) channel findings into probabilities (A1.5).  
4. **Scenario consumes Projection** — Rules may only annotate why a world is plausible.  
5. **Confidence consumes Projection** — plus Completeness / Rule Agreement / Honesty caps.  
6. **Narrative explains Rules** — citing rule identity and supporting Feature names; never inventing unmatched findings.

### 3.2 Channel ownership

| Channel | Who may assign | Meaning |
|---|---|---|
| `home+` / `away+` | Rule definition (within rule-set) | Directional eligibility for Projection weighting |
| `none` | Rule definition | Finding-only / honesty / market / limitation — not a football probability vote |

Projection policy decides **how** channels combine. Rule hierarchy decides **whether** a Rule is allowed to carry a directional channel (Primary/Secondary only; Supporting defaults to `none`).

---

## 4. Rule dependency graph

### 4.1 Dependency kinds

| Dependency | Meaning |
|---|---|
| **Feature dependency** | Rule requires named Features to be present before PASS/FAIL; else INAPPLICABLE |
| **Rule soft dependency** | Meta/Consistency Rules may reference other Rules’ conceptual outcomes only through Features or declared finding refs under policy — never hidden temporal re-entry |
| **Tier dependency** | Secondary Amplifiers should not create a lean unless at least one Primary Directional finding is PASS (Projection/Narrative policy may enforce) |
| **Honesty dependency** | Directional Availability HIT Rules require the Availability Feature; UNKNOWN Honesty Rules PASS when that Feature is absent — mutually exclusive outcomes by construction |

### 4.2 Conceptual graph

```text
                    Evidence Facts
                          │
                          ▼
                    FeatureBundle
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
     Supporting       Primary       Secondary
     Gate/Honesty    Directional    Amp/Damp/Meta
            │             │             │
            └─────────────┼─────────────┘
                          ▼
                   Rule Findings
                          │
                          ▼
               Projection (weighting)
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
          Scenario                 Confidence
              │                       │
              └───────────┬───────────┘
                          ▼
                      Narrative
```

### 4.3 Evaluation order (conceptual, not runtime API)

1. Evaluate **Supporting Gate** Rules (presence).  
2. Evaluate **Supporting Honesty / Limitation** Rules.  
3. Evaluate **Primary Directional** Rules.  
4. Evaluate **Secondary** Amplifiers / Dampeners / Meta.  
5. Evaluate **Supporting Market Signal** Rules last (channel none).  

Order affects explanation grouping and gate short-circuit policy only. It must not allow later Rules to mutate earlier finding records — the envelope is a complete immutable set (doc 17 Rule stage).

### 4.4 Forbidden edges

- Rule → Evidence table read  
- Rule → Projection probability read (no feedback loop in one run)  
- Rule → Scenario / Confidence / Narrative  
- Scenario → Rule  
- LLM → Rule condition evaluation  

---

## 5. Rule conflict strategy

### 5.1 Principles

1. **Retention** — Opposing findings both remain in the envelope. Conflict is information, not an error to delete.  
2. **No silent winner** — Hierarchy never auto-picks “Form beats Availability.” Projection applies net weighting; Confidence raises Upset Risk / lowers Confidence.  
3. **Honesty beats false certainty** — UNKNOWN / UNAVAILABLE Supporting findings cap confidence and narrative claims even if Primary lean is strong.  
4. **Market never overrides football Facts** — Market Signal Rules stay `channel: none` and cannot cancel Primary football findings as if they were false.  
5. **Gate failure is explicit** — Failed Presence Gates block or force Cautious per analysis policy; they do not invent a Draw.

### 5.2 Conflict classes

| Class | Example | Resolution |
|---|---|---|
| **Opposing Primary** | FORM_HOME_SUPERIOR PASS vs AVAILABILITY_HOME_HIT PASS (away+ channel) | Both PASS retained; Projection nets channels; Confidence penalizes agreement |
| **Primary vs Secondary damper** | Attack edge PASS vs FORM_NEAR_PARITY PASS | Both retained; Projection/Confidence apply damping policy |
| **Directional vs Honesty** | Attack edge PASS vs AVAILABILITY_HOME_UNKNOWN PASS | Lean may remain; Confidence band capped; Narrative must disclose unknown squad |
| **Football vs Market Signal** | lean_home football vs MARKET_LEAN_AWAY | Market recorded as signal/limitation; not Fact; recommendation may go Cautious under Projection policy |
| **Mutual exclusion by construction** | AVAILABILITY_HOME_HIT vs AVAILABILITY_HOME_UNKNOWN | Feature presence makes one INAPPLICABLE/FAIL and the other PASS — not a true conflict |
| **Meta disagreement** | SIGNALS_ALIGNED_HOME FAIL while some Primary home PASSes | Allowed; Meta is Secondary, not a veto |

### 5.3 What conflict must never do

- Drop a PASS finding to make the Report “look clean.”  
- Let Narrative claim “full strength” when Honesty UNKNOWN PASSed.  
- Let Scenario invent a world that Projection did not support in order to reconcile conflict.  
- Delegate conflict arbitration to an LLM.

---

## 6. Rule priority model

Priority is the **operational ordering** inside a rule-set version. It complements tier/category; it does not replace Projection ownership.

### 6.1 Priority bands

| Band | Name | Typical contents | Effect |
|---|---|---|---|
| **P0** | Integrity | Gates + Honesty | May block analysis, force Cautious, or cap Confidence / Narrative claims |
| **P1** | Primary lean | Primary Directional Rules | Default eligible for Projection channel weighting |
| **P2** | Context | Secondary Amplifiers / Dampeners / Meta; some Limitations | Modulate lean strength and explanation; limited solo authority |
| **P3** (optional future) | Signal annex | Market Signal and other non-football annexes | Channel none; Evaluation/Review interest; never sole winner claim |

A0.5’s P0–P2 remain the MVP subset. P3 is reserved so Market/Odds annexes do not get smuggled into P1.

### 6.2 Priority vs tier

| Rule | Tier | Priority band |
|---|---|---|
| Presence Gate | Supporting | P0 |
| Availability UNKNOWN | Supporting | P0 |
| Form / Attack / Defense / Momentum edges | Primary | P1 |
| Availability HIT (directional) | Primary | P1 |
| Venue support / near parity / signals aligned | Secondary | P2 |
| Venue unavailable limitation | Supporting | P2 (limitation) or P0 if policy elevates honesty |
| Market lean | Supporting | P3 |

### 6.3 Authority ladder (product)

```text
P0 Honesty/Gates
  constrain what may be claimed
P1 Primary Directional
  drive lean eligibility
P2 Secondary
  amplify / dampen / contextualize
P3 Market Signal annex
  disclose external signal only
Projection
  sole probability weighting authority
```

Narrative citation order should prefer P1 PASSes, then P2, then P0 honesty disclosures, then P3 signals.

---

## 7. Rule versioning strategy

### 7.1 Version identities

| Identity | Meaning |
|---|---|
| **Rule id** | Stable logical id for one Rule concept across versions |
| **Rule version** | Immutable definition of condition semantics for that id |
| **Rule-set version** | Frozen set of Rule versions evaluated together (e.g. conceptual `rule-set.mvp.a05`) |
| **Evaluator version** | Deterministic evaluator implementation identity (governance; not designed as code here) |

Identical FeatureBundle + identical rule-set version + identical evaluator version ⇒ identical findings envelope (doc 17 determinism).

### 7.2 Change rules

| Change | Requires |
|---|---|
| Threshold / condition / channel / tier / priority change | New **Rule version** and new **rule-set version** that pins it |
| Add/remove Rule in the active library | New **rule-set version** |
| Rename product label only | Allowed only if rule id remains stable; prefer explicit alias note in governance docs — never silent id reuse |
| Retire Rule | Rule-set omits it or marks retired; historical envelopes keep old ids |

### 7.3 Compatibility with Evaluation (A1)

- A1 Rule Contribution metrics slice by **rule id + rule version + rule-set version**.  
- Recomparison under a new rule-set does **not** rewrite old sealed Match Reports.  
- Projection policy versions and rule-set versions are paired in Prediction History (A1).

### 7.4 Activation governance (design intent)

Target Rule Engine lifecycle (doc 07): draft → review → active → retired.  
A1.8 does not implement that lifecycle; it requires that **only pinned active rule-set versions** enter Football Intelligence Projection runs. No auto-activation from Evaluation scores.

### 7.5 Forbidden versioning behaviors

- Editing an active Rule in place.  
- Evaluating “latest mutable rules” without a pin.  
- Mixing Rule versions from different rule-set pins in one envelope.  
- AI proposing and auto-activating Rule conditions.

---

## 8. Future expansion

New signals enter the hierarchy as **Features first**, then Rules, then Projection policy — never as Scenario shortcuts (A1.5 §8).

| Future signal | Feature entry | Rule tier / category (expected) | Channel stance | Notes |
|---|---|---|---|---|
| **xG** | Attack/Defense or dedicated xG Features when Evidence exists | Primary Directional (or Secondary Amplifier) in Attack/Defense domains | `home+` / `away+` when football-directional | Absence → INAPPLICABLE, not “xG = 0 means average” |
| **Odds** | Market implied / lean Features | Supporting / Market Signal (P3) | `none` | Never Fact; never sole winner |
| **Betting Volume** | Volume / steam Features when Evidence exists | Supporting / Market Signal (P3) | `none` | Signal annex only |
| **Weather** | Weather Feature | Secondary Amplifier/Damper or Supporting Limitation in External Conditions | Bounded; often `none` until policy proves directional value | Honest absence required |
| **Referee** | Referee tendency Features | Secondary or Primary only after Evidence + sample governance | Directional only with explicit rule-set promotion | Wait for Evidence readiness |
| **Travel** | Travel / distance Feature | Secondary in External Conditions | Bounded directional or limitation | |
| **Fatigue** | Fatigue / rest Feature | Secondary (or Primary if later promoted) | Bounded directional | |
| **Expected Lineup** | Lineup Features when Evidence exists | Primary Availability/Lineup domain + Honesty Rules for unknown lineup | Directional HIT + UNKNOWN honesty | Do not invent Expected Lineup Facts |

### 8.1 Expansion checklist (for future rule-set versions)

1. Evidence type exists and is cutoff-qualified.  
2. Feature extractor with honest absence.  
3. Rule tier/domain/category/priority assigned.  
4. Channel allowed by hierarchy (`none` default for market/external until promoted).  
5. Conflicts with existing Primary Rules declared (retention strategy).  
6. New **rule-set version** + Projection policy pin.  
7. A1 Evaluation cohort can slice the new rule-set.  
8. Scenario contract unchanged; Confidence honesty caps updated if UNKNOWN Rules added.

---

## 9. DDD ownership

### 9.1 Package map (unchanged ownership)

| Concern | Package home | Notes |
|---|---|---|
| Feature derivation | `@fas/feature` | No Rule hierarchy types required beyond Feature names Rules already depend on |
| Rule evaluation + hierarchy metadata in rule-set | `@fas/rule` → `@fas/rule-engine` | Bible Rule Engine slot; interim `@fas/rule` |
| Projection weighting | `@fas/analysis` | A1.5 |
| Scenario / Confidence | `@fas/analysis` | Consumers |
| Narrative | `@fas/report` | Explains findings |
| Evaluation of rule-set performance | Evaluation + Statistics (A1) | Post-match |
| Persistence | `@fas/database` | Future implementation only |

### 9.2 No new packages / engines

Do **not** create:

```text
packages/rule-hierarchy/
packages/rule-taxonomy-engine/
packages/football-rules-engine/   # eighth Engine by another name
```

Hierarchy is a **governed catalogue concern inside the Rule Engine slot**, not a new Engine.

### 9.3 Alignment with docs 17 / 18

| Doc 17 / 18 rule | A1.8 stance |
|---|---|
| Rule Engine applies deterministic conditions; never delegates to LLM | Affirmed |
| Rules consume snapshot/Feature inputs; complete envelope | Affirmed |
| Findings may influence Projection only through pinned policy | Affirmed (Primary/Secondary channels) |
| `@fas/rule-engine` owns Rule governance; Analysis coordinates | Affirmed; interim `@fas/rule` unchanged in ownership |
| No cross-module table coupling | Hierarchy metadata travels in evaluation envelope / rule-set identity, not foreign table reads |

### 9.4 Folder intent (folders only — no file mandate)

```text
packages/rule/                 # interim
  src/
    evaluation/
    library/                   # future hierarchy catalogue home (when coding authorized)
      hierarchy/               # tiers/domains/categories metadata (future)
packages/rule-engine/          # target governed lifecycle (existing architecture slot)
```

No ownership move of Projection/Scenario/Confidence out of `@fas/analysis`.

---

## 10. Relationship to prior sprints

| Document | Relationship |
|---|---|
| **A0** | Rule Module sits after Feature and before Scenario/Confidence; A1.8 supplies hierarchy for the Rule library |
| **A0.5** | P0/P1/P2 and conflict retention become special cases of Supporting/Primary/Secondary + conflict classes |
| **A1** | Rule Contribution metrics require stable rule id / version / rule-set / tier labels |
| **A1.5** | Projection remains sole probability/weighting owner; hierarchy only constrains which Rules may carry channels |

### 10.1 End-to-end chain

```text
Evidence Facts
  → Features          (@fas/feature)
  → Rule Findings     (@fas/rule hierarchy)
  → Projection        (@fas/analysis weighting)
  → Scenario + Confidence
  → Narrative explains Rules
  → Match Report
       → A1 Evaluation scores rule-set versions post-match
```

---

## 11. Acceptance criteria (for a future Coding gate)

When a coding sprint implements this design (separate authorization), the system must:

1. Attach tier, domain, category, and priority band to every Rule in a pinned rule-set version.  
2. Keep opposing findings retained under the conflict strategy.  
3. Restrict directional channels to hierarchy-eligible tiers; Market/Odds annexes remain channel none until explicitly promoted in a new rule-set.  
4. Leave probability weighting in Projection; Scenario/Confidence/Narrative remain consumers/explainers.  
5. Version Rules only via immutable Rule version + rule-set version pins.  
6. Introduce no new package and no new Bible Engine.  
7. Leave Bible, Architecture Freeze, and package ownership unchanged.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Rule taxonomy (tiers, domains, categories) | **Designed** |
| Rule ownership across Feature → Narrative | **Designed** |
| Rule dependency graph | **Designed** |
| Rule conflict strategy | **Designed** |
| Rule priority model | **Designed** |
| Rule versioning strategy | **Designed** |
| Future expansion map | **Designed** |
| DDD ownership | **Designed** |
| Production code / formulas / schemas | **Out of scope** |
| Bible / Architecture / package-ownership edits | **Out of scope** |

---

## 12. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md)
- [`docs/07_RULE_ENGINE.md`](../../07_RULE_ENGINE.md)
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md)
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md)
- [`docs/sprints/A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/sprints/A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md)
- [`docs/sprints/A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md)
- [`docs/sprints/A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](./A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A1.8 Football Rule Hierarchy Framework design. Design only — no implementation.*
