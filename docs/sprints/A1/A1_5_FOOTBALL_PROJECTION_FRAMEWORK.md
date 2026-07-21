# A1.5 — Football Projection Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A1.5** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation design | [`A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 |
| Pipeline authority | [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) §3.5 / §4.13 (`deterministic_report`) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; formulas; DTO/Entity/Repository schemas; Provider work; Architecture / Bible edits; other doc edits |

---

## 0. Goal

Design how Football Intelligence converts deterministic **Features** and **Rules** into **probabilistic match outcomes**.

```text
FeatureBundle
  ↓
Rule Findings
  ↓
Projection
  ↓
Probability Distribution
  ↓
Scenario
  ↓
Confidence
```

**Ownership rule (binding):**

| Capability | Owns | Does not own |
|---|---|---|
| **Projection** | Probability generation (1X2, scorelines, goal distribution, sealed distribution identity) | Product scenario labelling; release gates; population Statistics |
| **Scenario** | Selection and presentation of a small reviewable world set from the sealed distribution | Inventing or recomputing probabilities |
| **Confidence** | Trust / upset / completeness / agreement signals over the sealed Projection (+ Scenario concentration) | Independent probability engines |

Design only. No implementation. No new package. No new Bible Engine.

### Non-goals

- Defining mathematical formulas (Poisson, λ mapping, softmax scales, etc.).
- Calibration Engine design (A2) or Evaluation metric formulas (A1).
- Provider / Evidence / Feature / Rule redesign.
- Market-as-truth or wagering advice.
- LLM probability invention.
- Collapsing Projection into Statistics Engine population metrics (doc 17 / 11 boundary).

---

## 1. Problem statement

A0 / A0.5 already place Scenario and Confidence in the product path, and Slice-1 coding may already emit sealed Scenario / Confidence objects. Without an explicit **Projection Framework**, those modules risk drifting into:

- Scenario inventing score worlds from Rules directly;
- Confidence inventing its own win probabilities;
- Future Market / xG / Weather signals each spawning a parallel “mini projection.”

A1.5 freezes the contract:

> **Projection is the sole pre-match probability owner inside `@fas/analysis`. Scenario and Confidence are consumers of that sealed distribution.**

This aligns with doc 17: Rule findings may influence bounded channel adjustments only through the pinned projection policy; Rules do not compute the probability matrix. Projection is not a Statistics Engine population metric and does not train calibration during a run.

---

## 2. Naming discipline

| Term | Meaning | Package / Engine |
|---|---|---|
| **Football Projection** (this framework) | Deterministic match-level probability generation for one sealed analysis | Intelligence module inside **Analysis** — `@fas/analysis` |
| **Probability Distribution** | Sealed 1X2 + scoreline + goal-mass outputs of Projection | Part of Projection envelope |
| **Scenario** (A0 module) | Top worlds selected/labelled for product presentation | `@fas/analysis` scenario module |
| **Confidence** (A0 module) | Trustworthiness signals over sealed Projection/Scenario | `@fas/analysis` confidence module |
| **Statistics Engine** (Bible) | Post-match population metrics / rebuildable projections | Distinct — not this framework |
| **Evaluation Engine** (Bible) | Post-match quality policy / gates | Distinct — consumes sealed claims later (A1) |

Bible Engines remain seven. Projection / Scenario / Confidence are **not** new Engines.

---

## 3. Projection Pipeline

### 3.1 Canonical order

```text
Feature
  ↓
Rule
  ↓
Projection
  ↓
Probability Distribution
  ↓
Scenario
  ↓
Confidence
```

| Stage | Responsibility | Output (conceptual) |
|---|---|---|
| **Feature** | Derive measurements from Evidence | FeatureBundle (+ status, checksum, featureModelVersion) |
| **Rule** | Deterministic findings on Features only | Rule Findings / RuleEvaluationEnvelope |
| **Projection** | Apply pinned projection policy to Features + Rule channels (+ completeness / agreement signals as policy allows) | DeterministicMatchProjection-shaped envelope |
| **Probability Distribution** | The probabilistic core of Projection (not a separate package stage) | 1X2, top scorelines, goal distribution, residual/truncation notes |
| **Scenario** | Select Most Likely / Second Likely / Upset (or future N) from the sealed distribution | ScenarioSet |
| **Confidence** | Score trust using Projection concentration + Evidence Completeness + Rule Agreement (+ honesty caps) | IntelligenceConfidence / confidence block |

Narrative and Match Report assembly remain **downstream consumers** of the sealed Projection + Scenario + Confidence package (A0 Narrative ownership). They never generate probabilities.

### 3.2 What “Projection owns probability generation” means

Projection alone may:

- produce Home / Draw / Away probabilities;
- produce ranked scoreline probabilities;
- produce goal-count / goal-range mass;
- attach projection-policy version, limitations, checksum, and status;
- apply Rule channel adjustments **only** as the pinned policy defines;
- optionally apply an **approved** calibration artifact reference when policy permits (identity pin only — no training in-run).

Projection must not:

- call Providers or re-fetch Evidence;
- invent Facts;
- publish or activate learning;
- treat ODDS / Market as ground truth;
- ask an LLM for λ or 1X2;
- let Scenario or Confidence rewrite its matrix after seal.

### 3.3 Failure and honesty

| Condition | Projection behavior |
|---|---|
| Required Features missing (policy minimum) | `blocked` / insufficient — no fabricated distribution |
| FeatureBundle `degraded` | Continue only if policy allows; limitations must disclose |
| Opposing Rule channels | Both findings remain upstream; Projection applies net/policy adjustment, does not delete findings |
| Optional signals absent (venue, market, xG, …) | Omit their contribution; do not invent neutral “full information” |

Empty success is forbidden: missing probability mass must be explicit status or residual disclosure.

---

## 4. Projection Inputs

All inputs are **conceptual contracts**. No DTO schema in this document.

### 4.1 Required inputs

| Input | Role in Projection |
|---|---|
| **FeatureBundle** | Primary quantitative state (attack/defense/form/venue/availability/momentum/home advantage, … as present). Projection reads Features, not raw Evidence payloads. |
| **Rule Findings** | Channel nudges (home+ / away+ / none), weights, PASS/FAIL/INAPPLICABLE. Used only through pinned projection policy — Rules do not emit scorelines. |
| **Evidence Completeness** | Structured completeness signal (or equivalent derived from Evidence-type presence / FeatureBundle degradation). Informs whether Projection may complete and which limitations apply; may also feed Confidence later. |
| **Rule Agreement** | Structured agreement / contradiction signal across P1 channels (or equivalent derived from Rule Findings). Informs caution / limitation / Confidence; must not silently erase opposing findings. |
| **Projection Policy Version** | Exact pinned identity for how Features + Rules become a distribution (and which optional inputs are eligible). Required for reproducibility and A1 Evaluation cohorts. |

### 4.2 Optional / future inputs (still Projection-owned when adopted)

See §8. Until policy admits them, they are absent — not zeroed into false certainty.

### 4.3 Explicit non-inputs

| Forbidden as Projection input | Why |
|---|---|
| Post-match FT result / outcome Evidence | Pre-match cutoff discipline (doc 17) |
| LLM free text | Not deterministic; not probability owner |
| Mutable “latest calibration table” | Only exact approved artifact id when policy allows |
| ScenarioSet | Scenario is downstream; Projection must not depend on Scenario |
| Narrative prose | Downstream explanation only |

### 4.4 Input envelope (conceptual)

```text
ProjectionRequest (conceptual)
  matchId
  featureBundleRef          # identity + checksum + featureModelVersion
  ruleEvaluationRef         # identity + checksum + rule-set version
  evidenceCompleteness      # structured signal / version
  ruleAgreement             # structured signal / version
  projectionPolicyVersion
  optionalCalibrationArtifactId?   # approved pin only
```

Identical inputs + identical policy version ⇒ identical Probability Distribution (determinism).

---

## 5. Probability Distribution

Projection produces a sealed **Probability Distribution**. This section defines **ownership and outputs only** — not formulas.

### 5.1 Owned outputs

| Output | Meaning | Owner |
|---|---|---|
| **Home Win %** | Probability mass for home win (1X2) | Projection |
| **Draw %** | Probability mass for draw | Projection |
| **Away Win %** | Probability mass for away win | Projection |
| **Top Scorelines** | Ordered list of (homeGoals, awayGoals, probability) under pinned truncation policy | Projection |
| **Goal Distribution** | Goal-count / goal-range mass (e.g. 0–1 / 2–3 / 4+ or finer policy) and/or side goal expectations as policy defines | Projection |

Supporting sealed metadata (still Projection-owned):

| Metadata | Purpose |
|---|---|
| Distribution checksum | Integrity of the sealed probabilistic core |
| Truncation / residual mass | Disclose mass outside top scorelines or truncated support |
| Basis notes | e.g. which parts are pre- vs post-rule-adjustment under policy (product limitations, not formula) |
| Status | `completed_nonempty` / `blocked` / `failed` |
| Limitations | Honest constraints (thin evidence, uncalibrated baseline, omitted optional signals) |
| Upstream refs | FeatureBundle checksum, Rule evaluation refs, policy versions |

### 5.2 Consistency expectations (product, not math)

- Home + Draw + Away probabilities are a coherent 1X2 claim under the pinned policy (normalization / residual handled explicitly by policy — not redefined here).  
- Top Scorelines are drawn from the same sealed generative claim as 1X2 (or an explicitly disclosed dual-basis limitation if policy keeps a temporary dual basis — already a known Slice-1 honesty note).  
- Goal Distribution is consistent with the same sealed claim family.  
- No second module may publish a competing 1X2 for the same report seal.

### 5.3 Boundary with Scenario and Confidence

```text
Probability Distribution  ──select/label──►  ScenarioSet
Probability Distribution  ──concentration/risk inputs──►  Confidence
```

Scenario and Confidence **read** these outputs. They do not regenerate them.

---

## 6. Scenario Selection

### 6.1 Why Scenario consumes Projection (not Rules directly)

Rules answer **directional findings** (“home attack edge PASS”). They do not answer **how probability mass is arranged across scorelines**.

If Scenario read Rules directly, it would have to:

1. invent a private mapping from findings → scores/probabilities;  
2. diverge from the sealed 1X2 shown elsewhere in the Report;  
3. break A1 Evaluation (Winner/Score/Scenario Hit would not share one probabilistic spine);  
4. force every new signal (xG, weather, …) to teach Scenario a new invention path.

Therefore:

```text
Rules  →  (channel inputs to) Projection  →  Distribution  →  Scenario selection
```

Scenario responsibilities remain:

- rank / select worlds (Most Likely, Second Likely, Upset, …);
- label winner / score / goals / probability **copied from Projection**;
- attach explanatory links to supporting Rule ids where useful;
- disclose residual mass when the selected set does not cover the full distribution.

Scenario must not:

- recompute Home/Draw/Away %;
- invent scorelines absent from Projection support (except explicit policy fallback worlds that still cite Projection 1X2 mass — as A0.5 Upset fallback does conceptually);
- treat market odds as scenario truth;
- call Feature extractors or Providers.

### 6.2 Selection contract (conceptual)

| Field | Source |
|---|---|
| Scenario probability | Projection Top Scorelines and/or 1X2 mass |
| Scenario score / goals | Projection scoreline world |
| Scenario winner | Derived from that scoreline (or 1X2 world under policy) |
| Supporting rule ids | Optional annotation from Rule Findings — explanatory only |

Owner: `@fas/analysis` scenario module. No `packages/scenario-engine`.

---

## 7. Confidence Interaction

### 7.1 Why Confidence consumes Projection

Confidence answers **how much to trust** the sealed lean — not **what the probabilities are**.

If Confidence computed its own win probabilities:

1. Report could show conflicting “model %” vs “confidence-implied %”;  
2. Upset Risk would not be anchored to the same Upset world Scenario presents;  
3. A1 Confidence Calibration metrics would pair the wrong claim with outcomes;  
4. A2 calibration artifacts would have no single raw distribution to map.

Therefore Confidence **consumes**:

| Input | From |
|---|---|
| Scenario concentration / Most Likely mass | Projection via Scenario (or directly from Distribution) |
| Upset world probability | Projection via Scenario Upset slot |
| 1X2 shape (optional) | Projection Probability Distribution |
| Evidence Completeness | Structured completeness signal (shared with Projection inputs) |
| Rule Agreement / contradictions | Rule Findings–derived signal |
| Honesty caps | e.g. Availability UNKNOWN, VENUE unavailable |
| Optional approved calibration artifact | Statistics/Evaluation-governed pin (A2+) — display mapping only |

Confidence **emits** Prediction Confidence, band, Upset Risk, Completeness, Agreement (A0.5 product language) — not a second 1X2.

### 7.2 Interaction diagram

```text
FeatureBundle + Rule Findings
        │
        ▼
   Projection ──► Probability Distribution ──► ScenarioSet
        │                                   │
        └──────────► Confidence ◄───────────┘
                     (also Completeness + Agreement + honesty flags)
```

### 7.3 Forbidden Confidence behaviors

- Generating Home/Draw/Away % from scratch.  
- Raising confidence when Facts are honestly absent.  
- Self-certifying calibration without Evaluation/Statistics governance.  
- Using LLM to “feel” confidence.

Owner: `@fas/analysis` confidence module.

---

## 8. Future Extension

New football signals must enter as **Feature and/or Rule inputs to Projection**, not as Scenario forks.

### 8.1 Extension pattern

```text
New Evidence type
  → Feature extractor (honest absence)
  → optional Rule findings
  → Projection policy version N+1 admits the new Feature/Rule channels
  → Probability Distribution shape unchanged as a product contract
  → Scenario selection policy unchanged (still reads Distribution)
  → Confidence still reads Distribution/Scenario + completeness/agreement
```

Scenario’s public slots (Most Likely / Second Likely / Upset) stay stable. Only the **mass underneath** changes when Projection policy evolves.

### 8.2 Signal → entry point map (illustrative)

| Future signal | Enters as | Projection role | Scenario impact |
|---|---|---|---|
| **Market / Odds** | Market Features + channel-none Rules (signals, not Facts) | Optional adjustment / contradiction limitations under policy | None direct — only via changed Distribution |
| **xG** | Attack/Defense (or dedicated xG) Features when Evidence exists | Stronger Feature basis for Distribution | Selection unchanged |
| **Weather** | Weather Feature when Evidence exists | Policy-bounded effect on Distribution | Selection unchanged |
| **Referee** | Referee / card-tendency Features + Rules when Evidence exists | Channel/limitation inputs | Selection unchanged |
| **Travel** | Travel / distance Feature | Policy-bounded effect | Selection unchanged |
| **Fatigue** | Fatigue / rest Feature | Policy-bounded effect | Selection unchanged |

### 8.3 Extension rules (binding)

1. **No Scenario bypass** — new signals never invent scenarios without Projection.  
2. **Honest absence** — missing Weather/Referee/xG does not imply neutral full-information Features.  
3. **Version the policy** — admitting a new input requires a new `projectionPolicyVersion` (and usually feature/rule-set versions) so A1 history cohorts stay valid.  
4. **Market is never truth** — ODDS may inform limitations or bounded signal channels; they do not replace football Distribution as ground truth.  
5. **Statistics ≠ Projection** — post-match population calibration remains Statistics/Evaluation; live Projection only pins approved artifacts.

---

## 9. DDD Ownership

### 9.1 Package ownership

| Concern | Owner | Package |
|---|---|---|
| Projection + Probability Distribution | Analysis | **`@fas/analysis`** (`projection/`) |
| Scenario selection | Analysis | **`@fas/analysis`** (`scenario/`) |
| Confidence signals | Analysis | **`@fas/analysis`** (`confidence/`) |
| FeatureBundle | Feature derivation | `@fas/feature` |
| Rule Findings | Rule Engine | `@fas/rule` → `@fas/rule-engine` |
| Report assembly / Narrative | Report (+ Prompt/AI rewrite later) | `@fas/report`, `@fas/prompt`, `@fas/ai-provider` |
| Calibration artifacts (consume later) | Statistics (+ Evaluation methodology) | `@fas/statistics` / Evaluation Engine |
| Post-match scoring of sealed claims | Evaluation + Statistics | A1 design — not Projection |

### 9.2 Forbidden package moves

Do **not** create:

```text
packages/projection-engine/
packages/probability-engine/
packages/scenario-engine/
packages/confidence-engine/
```

Do **not** move match-level Projection into `@fas/statistics` or `@fas/statistics-engine`.

### 9.3 Folder intent (folders only)

```text
packages/analysis/
  src/
    projection/     # probability generation + sealed distribution
    scenario/       # selection / labelling only
    confidence/     # trust signals over sealed projection/scenario
    application/    # orchestration use-cases
```

### 9.4 Dependency direction

```text
@fas/feature  → (bundle)
@fas/rule     → (findings)
      \         /
       ▼       ▼
   @fas/analysis Projection
           │
           ├─► Scenario
           └─► Confidence
                 │
                 ▼
            @fas/report
```

Analysis does not import Nest/Prisma/Provider SDKs in domain projection logic (doc 18).

---

## 10. Relationship to A0 / A0.5 / A1

| Document | Relationship |
|---|---|
| **A0** | Introduced Scenario / Confidence modules; A1.5 clarifies Projection as the probability spine they already conceptually depended on |
| **A0.5** | MVP Scenario trio + Confidence block remain product shapes; their **inputs** are reframed as Projection-first |
| **A1** | Evaluation compares sealed Projection/Scenario/Confidence claims to Actual — requires one probability owner |
| **A2** (future) | Calibration maps raw Projection/Confidence displays; does not relocate probability ownership |

### 10.1 End-to-end intelligence chain (updated clarity)

```text
Evidence
  → FeatureBundle
  → Rule Findings
  → Projection → Probability Distribution
  → ScenarioSet
  → Confidence
  → Narrative → Match Report
       │
       ▼ (post-match, A1)
  Comparison → Evaluation → Metrics → Calibration Input (A2)
```

---

## 11. Acceptance criteria (for a future Coding gate)

When a coding sprint implements this design (separate authorization), the system must:

1. Generate 1X2, Top Scorelines, and Goal Distribution only inside `@fas/analysis` Projection.  
2. Build ScenarioSet exclusively from the sealed Probability Distribution (plus explicit residual disclosure).  
3. Build Confidence without an independent probability engine.  
4. Pin `projectionPolicyVersion` on every sealed Projection.  
5. Keep Feature / Rule packages free of probability matrices.  
6. Allow future Market / xG / Weather / Referee / Travel / Fatigue to enter via Feature/Rule → Projection policy versions without changing Scenario’s selection contract.  
7. Introduce no new package and no new Bible Engine.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Projection Pipeline | **Designed** |
| Projection Inputs | **Designed** |
| Probability Distribution outputs (no formulas) | **Designed** |
| Scenario consumes Projection | **Designed** |
| Confidence consumes Projection | **Designed** |
| DDD Ownership (`@fas/analysis`) | **Designed** |
| Future extension path | **Designed** |
| Production code / formulas | **Out of scope** |
| Architecture / Bible edits | **Out of scope** |

---

## 12. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md)
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md)
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md)
- [`docs/20_IMPLEMENTATION_PLAN.md`](../../20_IMPLEMENTATION_PLAN.md)
- [`docs/21_ARCHITECTURE_SIGNOFF.md`](../../21_ARCHITECTURE_SIGNOFF.md)
- [`docs/sprints/A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/sprints/A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md)
- [`docs/sprints/A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A1.5 Football Projection Framework design. Design only — no implementation.*
