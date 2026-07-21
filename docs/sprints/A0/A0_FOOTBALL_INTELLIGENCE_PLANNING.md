# Sprint A0 — Football Intelligence Layer — Planning

| Field | Value |
|---|---|
| Sprint id | **A0** |
| Document type | Architecture Sprint / Planning only |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md), Architecture Freeze **v0.2** |
| Pipeline authority | [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) |
| Backend authority | [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) |
| AI authority | [`docs/03_AI_PRINCIPLES.md`](../../03_AI_PRINCIPLES.md) |
| Prior facts path | [`docs/sprints/F1.1/`](../F1.1/) (Provider → Evidence → Workspace → Report) |
| Status | Planning complete — **does not authorize coding** |
| Explicitly excluded | Production code, DTOs, Entities, Repositories, Provider implementation, Architecture document edits, existing doc edits |

---

## 0. Purpose and non-goals

### 0.1 Why A0 exists

FAS already has a solid **facts path**:

```text
Provider → Evidence → Workspace → Report
```

F1.1 slices (Venue, Player, Availability, foundation) made that path reviewable.  
The project can **aggregate football facts**. It cannot yet **reason about a match** in a football-intelligence sense: absences do not change features; venue does not change rules; narrative mostly restates sealed numbers.

A0 designs the first **Football Intelligence layer**: structured, deterministic reasoning that sits **between Evidence and Report**, so analysts see *why* a lean exists — not only *what* was imported.

### 0.2 Non-goals (binding for this document)

- No production code.
- No DTO / Entity / Repository / Prisma designs.
- No Provider implementation or new Provider categories.
- No new numbered Architecture document.
- No eighth **governed Engine** invented under the Bible (see §0.3).
- No Expected Lineup invention; no AI football decisions.

### 0.3 Naming discipline (critical)

Bible Engines remain exactly seven: Prompt, Knowledge, Rule, Case, Review, Evaluation, Statistics.

User-facing module names in this sprint (**Feature Engine**, **Scenario Engine**, **Confidence Engine**, **Narrative Engine V2**) are **Intelligence Modules** — logical capabilities inside the frozen `deterministic_report` profile — **not** new Bible Engines.

| A0 module name (product language) | Canonical ownership (Freeze v0.2) | Existing package home (today) |
|---|---|---|
| Feature Engine | Feature derivation (Analysis-owned capability) | `@fas/feature` |
| Rule Engine | Governed **Rule Engine** (Bible) — deepen interim evaluator | `@fas/rule` → future `@fas/rule-engine` |
| Scenario Engine | Deterministic match projection / Analysis | `@fas/analysis` |
| Confidence Engine | Projection confidence policy / Analysis (+ later Evaluation/Statistics calibration) | `@fas/analysis` (+ `@fas/statistics` artifacts) |
| Narrative Engine V2 | Deterministic report assembly + Prompt/AI rewrite path | `@fas/report`, `@fas/prompt`, `@fas/ai-provider` |

Analysis Orchestrator remains the coordinator. Modules do not call each other across table boundaries; they consume sealed upstream envelopes through declared contracts (doc 17 / 18).

### 0.4 Current baseline (repository truth)

| Layer | Today |
|---|---|
| Provider / Evidence | Real (F.1 + F1.1 fact slices) |
| Workspace / Report presentation of facts | Real (Venue, Player, Availability, timeline) |
| Feature derivation | Real but **thin** — form/stats/H2H/odds; **ignores** VENUE / PLAYER / INJURY / SUSPENSION |
| Rule evaluation | Real but **thin** — hardcoded slice-1 rules on features |
| Projection | Real — Poisson / 1X2 / confidence A·C·S·X / recommendation |
| Narrative | Real but **local restatement** — does not explain football causality from absences/venue |
| Scenario set as product object | **Missing** (scoreline matrix exists internally; not product Scenario library) |
| Knowledge / Case / Review Engines | Docs only |

**Diagnosis:** The math pipeline exists, but Football Intelligence is incomplete because new Facts never enter Feature → Rule → Projection, and Narrative does not explain structured findings.

---

## 1. Feature Engine (Intelligence Module)

### 1.1 Purpose

Convert cutoff-qualified **Evidence** into normalized, versioned **football features** that Rules and Projection can consume without reading raw Evidence payloads or Provider shapes.

Features are **derived measurements**, not Facts and not Rule findings.

### 1.2 Example feature vocabulary (illustrative, not a schema)

| Feature family | Intent |
|---|---|
| AttackStrength (home/away) | Offensive capability from form/stats (/ later xG) |
| DefenseStrength (home/away) | Defensive capability |
| AvailabilityPenalty (home/away) | Quantified impact of injury/suspension Facts when present |
| VenueAdvantage | Home/venue context as a bounded feature (not invented weather) |
| RecentForm (home/away) | Windowed form signal |
| Fatigue | Schedule density / rest when Evidence supports it (honest absence otherwise) |
| Momentum | Short-term trajectory |
| MarketConfidence | Market-implied lean as **signal**, never Fact |

Honest absence: if Injury Evidence is missing, **do not** invent `AvailabilityPenalty = 0` meaning “full strength.” Prefer `unavailable` / omitted feature with explicit degradation, consistent with doc 41 and F1.1D honesty.

### 1.3 Responsibilities

- Select only Evidence types declared in the pinned Feature-derivation policy.
- Produce a versioned FeatureBundle with checksum and status (`completed_nonempty` | `degraded` | blocked per policy).
- Keep transforms pure and deterministic (clock/network injected only at orchestration edge).
- Never call Providers, Rules, Projection, or LLM.

### 1.4 Input

- Sealed or cutoff-qualified Evidence selection for one Match (MATCH_INFO + optional TEAM_FORM, STATISTICS, HEAD_TO_HEAD, ODDS, VENUE, INJURY, SUSPENSION, PLAYER, … as policy allows).
- Exact feature-model / extractor version identity.

### 1.5 Output

- FeatureBundle: ordered Features (name, value, provenance to Evidence ids where useful), bundle checksum, degradation notes.
- No probabilities, no recommendations, no narrative prose.

### 1.6 Folder (target ownership, not a new Engine package)

```text
packages/feature/          # continues as Feature derivation home
  src/
    domain/                # feature names, bundle identity (conceptual)
    extraction/            # pure extractors per family
    policy/                # which Evidence types feed which features
```

Do **not** create `packages/feature-engine` unless a later ADR proves the Analysis-owned capability must be extracted. Freeze prefers extending `@fas/feature`.

### 1.7 Interfaces (conceptual ports only)

- `FeatureDerivationPort.derive(evidenceSelection, featurePolicyVersion) → FeatureBundleEnvelope`
- Forbidden: Provider SDK types, Prisma records, Nest request objects, RuleResult mutation.

### 1.8 Future extensibility

- Add extractors for LINEUP / Referee Facts when F1.1 completes those Evidence types.
- Add xG-backed Attack/Defense when F1.3 Facts exist — still Features, not Engines.
- Feature library versioning allows A1/A2 to evaluate “which feature model won.”

---

## 2. Rule Engine (Intelligence Module → Bible Engine)

### 2.1 Purpose

Consume **Features** (never raw Evidence, never Provider JSON) and emit deterministic **findings**: PASS / FAIL / INAPPLICABLE with weight, channel, and explanation suitable for Projection adjustment and Narrative citation.

### 2.2 Example rules (illustrative policy language, not code)

```text
IF AvailabilityPenaltyHome < -10
THEN DefenseScoreHome -= 15   # expressed as a Rule finding channel / weight, not free mutation

IF RecentFormHome > RecentFormAway
AND VenueAdvantage > 5
THEN HomeProbabilityChannel += 8   # bounded channel for Projection policy — Rule does not own softmax
```

Rules produce **findings**. Projection policy alone maps findings into probability space (doc 17 §4.13).

### 2.3 Responsibilities

- Evaluate pinned Rule versions against FeatureBundle.
- Return complete evaluation envelope (including zero eligible rules only when policy permits).
- Explain each finding in structured text (machine-usable, not LLM prose).
- Remain free of AI evaluation of conditions (Bible / doc 03).

### 2.4 Architecture

```text
FeatureBundle
  → Rule Evaluator (deterministic)
  → RuleResult[] + envelope checksum
  → Projection / Narrative consumers
```

Interim runtime today: `@fas/rule`. Target governed home remains Rule Engine (doc 07) with activation, sample-size, and confidence governance — **activation of an existing Engine slot**, not a new Engine.

### 2.5 Folder

```text
packages/rule/             # interim evaluator (extend)
# future (only with implementation gate):
# packages/rule-engine/    # governed lifecycle + evaluation
```

### 2.6 Interface (conceptual)

- `RuleEvaluationPort.evaluate(featureBundle, ruleSetVersion) → RuleEvaluationEnvelope`
- Input: Features only.
- Output: findings + explanations + checksums.
- Forbidden: Evidence table reads, Provider calls, probability matrix computation, LLM.

### 2.7 Pipeline role

Rules sit **after** Feature derivation and **before** Scenario / Confidence / Narrative. They do not seal snapshots; Analysis Orchestrator does.

### 2.8 Future Rule Library

- Catalog of versioned rules by theme: form, availability, venue, market-signal (channel none), later lineup.
- Lifecycle: draft → review → active → retired (doc 07).
- Sample-size / confidence gates prevent overconfident rules on thin Evidence.
- A1 Evaluation scores rule-set versions; A2 may calibrate how channels map — still not AI-owned rules.

---

## 3. Scenario Engine (Intelligence Module)

### 3.1 Purpose

Generate a **small, reviewable set of match scenarios** from sealed Features + Rule findings + pinned Projection policy — so the product answers “what worlds are plausible?” not only “what is p(Home).”

### 3.2 Example product scenarios

| Scenario | Narrative label | Example score | Example probability |
|---|---|---|---|
| A | Home win | 2–1 | 55% |
| B | Draw | 1–1 | 28% |
| C | Away win | 0–1 | 17% |

Probabilities are **deterministic projection outputs**, not LLM guesses. They must sum under the pinned policy (or be explicitly truncated top-N with residual mass disclosed).

### 3.3 How Scenario Engine consumes Rule Engine

```text
FeatureBundle
  → RuleEvaluationEnvelope
  → Deterministic Projection Policy
       (λ / score matrix / channel adjustments from Rule findings)
  → Scenario Set
       (top worlds: label, scoreline, probability, supporting rule ids)
```

Rules **nudge channels**; they do not invent scorelines. Scenario Module **selects and labels** worlds from the projection distribution (and may attach which Rule findings supported the lean). Missing Rules → fewer explanatory links, not invented scenarios.

### 3.4 Responsibilities / ownership

- Owner: Analysis (same as Deterministic Match Projection).
- Input: FeatureBundle + RuleEvaluationEnvelope + projection-policy version (+ optional calibration artifact id).
- Output: ScenarioSet (ordered scenarios, residual probability note, checksum).
- Forbidden: AI scenario invention; Evidence re-fetch; treating market odds as scenario truth.

### 3.5 Folder

```text
packages/analysis/
  src/
    projection/            # existing math
    scenario/              # scenario selection / labelling (future coding home)
```

No `packages/scenario-engine`.

---

## 4. Confidence Engine (Intelligence Module)

### 4.1 Purpose

Compute **prediction confidence**, **upset risk**, and **stability** signals for the sealed Scenario / Projection package — so Report can show trustworthiness without claiming oracle accuracy.

### 4.2 Example outputs (product language)

| Signal | Example |
|---|---|
| Confidence | 82 — High |
| Upset Risk | 31% |
| Stability | Stable / Fragile (e.g. market contradiction, thin Evidence, high residual) |

Today’s projection already uses a confidence composition (A / C / S with contradiction penalty X). A0 designs this as an explicit **Confidence Module** with clear inputs and later Evaluation hooks — still Analysis-owned, not a Bible Engine.

### 4.3 Responsibilities

- Combine Evidence completeness, Rule agreement, Scenario concentration, and market contradiction into confidence / upset / stability.
- Never silently raise confidence when Facts are missing (Availability honest absence must not look like “full strength certainty”).
- Emit structured scores + human labels for Report.

### 4.4 How future Evaluation calibrates this score

```text
A0/F2: Confidence Module emits raw confidence under policy vN
  → sealed with analysis report
A1: Evaluation pairs sealed confidence bands with outcomes
  → reliability tables (“did High confidence win more?”)
A2: Calibration artifacts adjust mapping raw → displayed confidence
  → Analysis pins approved artifact id; no auto-promotion
```

Evaluation Engine (Bible) **owns quality policy**; Statistics Engine may own population projections. Confidence Module **consumes** approved calibration artifacts; it does not self-certify.

### 4.5 Folder

```text
packages/analysis/
  src/
    confidence/            # policy composition (future coding home)
packages/statistics/       # calibration artifacts (existing thin home)
```

---

## 5. Narrative Engine V2 (Intelligence Module)

### 5.1 Purpose

Explain **WHY** the sealed intelligence package leans a certain way — from Features, Rule findings, Scenarios, and Confidence — not merely restate Facts or percentages.

### 5.2 Example reasoning spine (structured, pre-LLM)

```text
1. Home loses two starting defenders → AvailabilityPenaltyHome material (Feature + INJURY Evidence cites)
2. Away RecentForm >> Home RecentForm (Feature)
3. Rules: MOMENTUM_AWAY PASS; HOME_ADVANTAGE_MATERIAL insufficient to offset (Rule findings)
4. VenueAdvantage present but below compensation threshold (Feature + Rule)
5. ScenarioSet: Away lean worlds dominate; Confidence High with moderate Upset Risk
⇒ Structured conclusion: Away tactical / availability advantage
```

Narrative V2 **assembles this spine first**. LLM (if used) only rewrites the spine into natural language.

### 5.3 Architecture only

```text
Sealed Deterministic Package
  (Features, Rules, Scenarios, Confidence, Evidence citations)
  → Narrative Planner (deterministic structure / sections / citations)
  → optional Prompt Engine composition
  → optional LLM rewrite (untrusted candidate)
  → FAS validation (schema, citation integrity, no numeric mutation)
  → Report Narrative section
```

Local/offline adapter remains valid for private demos (current pattern). Network AI never becomes the football decision-maker.

### 5.4 Responsibilities

- Build explanation sections: evidence cites, feature drivers, rule findings, scenario contrast, confidence caveats, falsifiers.
- Preserve epistemic labels (Fact vs Market vs Finding vs Inference).
- Forbid inventing Facts or changing sealed probabilities.

### 5.5 Folder

```text
packages/report/           # assembly
packages/prompt/           # composition manifests (when AI path used)
packages/ai-provider/      # rewrite adapters only
```

No `packages/narrative-engine`.

---

## 6. Complete Analysis Pipeline (Football Intelligence view)

### 6.1 Target product pipeline

```text
Provider
  ↓
Evidence
  ↓
Workspace                    # human review of Facts (already strong after F1.1)
  ↓
Feature Engine               # Evidence → Features
  ↓
Rule Engine                  # Features → Findings
  ↓
Scenario Engine              # Findings + Projection policy → ScenarioSet
  ↓
Confidence Engine            # trust / upset / stability on sealed package
  ↓
Narrative Engine V2          # WHY explanation (structured ± LLM rewrite)
  ↓
Report                       # sealed presentation; no recompute
```

This specializes the existing `deterministic_report` profile (doc 17 §3.5 / §4.13). It does **not** replace the canonical AI profile (Knowledge → Cases → Prompt → LLM → Publish); that remains later (A1+ / K1 / C1). A0 focuses on making the deterministic intelligence path football-meaningful.

### 6.2 Layer responsibilities

| Layer | Responsibility | Must not |
|---|---|---|
| Provider | Acquire vendor observations; map to FAS domain candidates | Own Evidence quality; invent Facts |
| Evidence | Normalize, provenance, quality, cutoff selection | Compute Features/Rules/probabilities |
| Workspace | Present Facts for human inspection | Recompute math; invent absences |
| Feature Engine | Normalize Evidence into Features | Call Rules/LLM/Providers |
| Rule Engine | Deterministic findings from Features | Softmax / scenarios / AI decisions |
| Scenario Engine | Label plausible worlds from projection policy | Invent odds-as-truth scenarios |
| Confidence Engine | Trustworthiness of the sealed lean | Self-calibrate without Evaluation |
| Narrative Engine V2 | Explain WHY from sealed package | Change numbers or invent Facts |
| Report | Assemble immutable presentation | Re-run Feature/Rule/Projection |

### 6.3 Relation to apps/api

API remains transport: import / analyze commands invoke application use cases. NestJS modules must not become the Intelligence Modules. Composition stays: controller → application operation → Feature → Rule → Projection/Scenario/Confidence → Report (doc 18).

---

## 7. DDD Boundary Matrix

| Module | Input | Output | Depends on | Forbidden dependency | Ownership |
|---|---|---|---|---|---|
| Feature Engine | Evidence selection | FeatureBundle | Evidence contracts, feature policy versions | Provider SDKs, Rule, Projection, Nest, Prisma records | Analysis capability (`@fas/feature`) |
| Rule Engine | FeatureBundle | RuleEvaluationEnvelope | Feature contracts, rule-set versions | Evidence tables, Provider, Projection matrix, LLM | Rule Engine slot (`@fas/rule` interim) |
| Scenario Engine | Features + Rules + projection policy | ScenarioSet | Rule envelope, projection policy | Provider, Evidence rewrite, LLM probabilities | Analysis (`@fas/analysis`) |
| Confidence Engine | Sealed projection/scenario package + completeness signals | Confidence / Upset / Stability | Projection outputs; optional Statistics calibration artifact | Auto-promoting calibration; AI confidence invention | Analysis (+ Statistics artifacts) |
| Narrative Engine V2 | Entire sealed intelligence package | Narrative sections (structured ± validated rewrite) | Prompt port (optional), AI provider port (optional) | Rule evaluation; Feature math; Provider Facts | Report / Prompt / AI-provider adapters |
| Analysis Orchestrator | Match id, profile, cutoff policy | Sealed report lineage | All module ports | Cross-module table joins | Analysis application |
| Workspace / Report UI | Sealed DTOs from API | Human review surfaces | API contracts only | Local recompute of Features/Projection | `apps/web` |

Cross-cutting invariants:

- Evidence selects; Analysis seals (doc 17).
- Empty / missing ≠ silent success.
- Market signals never become Facts.
- Learning never auto-activates (Review / Evaluation later).

---

## 8. Future AI integration

### 8.1 Principle

**LLM must never make football decisions.**  
Football reasoning always comes from Feature → Rule → Scenario → Confidence (deterministic).  
LLM may only **rewrite structured reasoning into natural language**.

### 8.2 Allowed AI uses (post-A0, when gated)

- Turn Narrative Planner spine into readable prose.
- Summarize sealed Scenario contrasts for analysts.
- Draft Reviewer notes after post-match (still human-accountable).

### 8.3 Forbidden AI uses

- Choosing winners, scorelines, or probabilities.
- Inventing injuries, lineups, or venue effects.
- Replacing Rule conditions or “interpreting” Features differently from sealed findings.
- Silent conflict resolution or Evidence retrieval outside the snapshot (doc 03).

### 8.4 Integration shape

```text
Deterministic Intelligence Package (sealed)
  → Prompt Engine (compose rewrite request + citation map)
  → AI Provider Port (untrusted text)
  → Validators (no numeric drift; citations intact)
  → Narrative section on Report
```

AI drafts; FAS validates; human publishes (Bible / doc 03).

---

## 9. Roadmap recommendation

### 9.1 Recommended sequence

```text
F1.1          # finish Fact enrichment (Lineup / Referee / richer Form)
  ↓
A0            # THIS SPRINT — Football Intelligence architecture planning
  ↓
F2            # Intelligence Implementation-1 (wire Facts → Features → Rules → Scenarios → Confidence → Narrative V2)
  ↓
F3            # Intelligence depth + football model enrichment (advanced stats / xG consumption path)
  ↓
A1            # Prediction Evaluation (sealed lean vs results)
  ↓
A2            # Calibration (confidence / probability artifacts under governance)
```

### 9.2 Why this order

| Step | Why |
|---|---|
| **F1.1 first** | Intelligence without Lineup/Referee/richer Form still runs, but availability alone is a partial brain. Finish Facts (or a declared F1.1 subset) so Features have honest inputs. F1.1D already proved Availability Facts; remaining F1.1E–G complete the context set. |
| **A0 next** | Design the intelligence boundary **before** coding so Feature/Rule/Scenario/Confidence/Narrative do not become accidental new Engines or Provider creep. |
| **F2** | First coding milestone of A0 design: wire INJURY/SUSPENSION/VENUE (and later LINEUP) into Features; expand Rule library; expose ScenarioSet + Confidence; Narrative V2 spine. Still no new Bible Engine. |
| **F3** | Deepen football model quality (aligns with roadmap F1.2 advanced stats and/or F1.3 xG **as Feature inputs**). Keeps Provider work as Facts; intelligence consumes richer Evidence. |
| **A1** | Only after intelligence outputs are stable enough to score — Evaluation of sealed projections/scenarios/confidence. |
| **A2** | Calibration requires A1 evidence; closes the improvement loop without letting LLM invent trust. |

### 9.3 Mapping to doc 40 (no edit in this sprint)

| A0 sequence id | Relation to `docs/40_PRODUCT_ROADMAP.md` |
|---|---|
| F1.1 | Same Sprint F1.1 (in progress / partial) |
| A0 | **New planning milestone** (this document) — not yet a doc-40 Sprint id; proposes insertion before Evaluation |
| F2 | Implementation of A0 intelligence wiring (product work; cite A0 + doc 40 when coding) |
| F3 | Overlaps product intent of F1.2 / F1.3 (depth Facts → Features) — schedule as Facts+consumption, not a new Engine |
| A1 / A2 | Same roadmap A1 / A2 |

**Governance note:** Promoting A0/F2/F3 into the sole product roadmap requires an explicit update to `docs/40_PRODUCT_ROADMAP.md` in a later governance step. This planning document **proposes** the sequence; it does not silently amend doc 40.

### 9.4 What A0 does *not* schedule

- Knowledge Engine (K1), Case Engine (C1), Review Engine (R1), full Statistics Engine productization (S1) — remain later activations of existing Bible Engines.
- Redis / BullMQ / microservices.
- Public auth / commercialization.

---

## 10. Implementation readiness (for a later Coding gate — not now)

When Coding is authorized after A0 review, suggested vertical slices (still no DTO design here):

1. Feature extractors for AvailabilityPenalty + VenueAdvantage (honest absence).  
2. Rules that consume those Features (bounded channels).  
3. ScenarioSet surface on Report (from existing projection distribution).  
4. Confidence / Upset labels clarified in Report.  
5. Narrative V2 structured spine (local rewrite first; LLM optional later).

Acceptance direction for that future Coding sprint:

- A match with Injury/Suspension Evidence changes Features/Rules/Scenarios vs an identical match without inventing absences.
- Narrative cites Rule findings and Evidence ids.
- Feature / Rule / Projection packages change only inside declared scope; Provider layer unchanged except consuming already-imported Evidence.
- No new governed Engine package without ADR + Bible update.

---

## 11. Exit criteria for Sprint A0 (Planning)

A0 Planning is complete when:

1. This document exists under `docs/sprints/A0/`.
2. Intelligence Modules are mapped to Freeze ownership without inventing Bible Engines.
3. Pipeline Feature → Rule → Scenario → Confidence → Narrative V2 is specified at responsibility level.
4. DDD boundaries and AI rewrite-only rule are explicit.
5. Roadmap proposal F1.1 → A0 → F2 → F3 → A1 → A2 is recorded with rationale.
6. **No code** and **no Architecture/doc edits** outside this file were made for A0.

Coding is a separate gate.

---

## 12. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md)
- [`docs/03_AI_PRINCIPLES.md`](../../03_AI_PRINCIPLES.md)
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md)
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md)
- [`docs/20_IMPLEMENTATION_PLAN.md`](../../20_IMPLEMENTATION_PLAN.md)
- [`docs/21_ARCHITECTURE_SIGNOFF.md`](../../21_ARCHITECTURE_SIGNOFF.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)
- [`docs/41_EVIDENCE_PROVIDER_ARCHITECTURE.md`](../../41_EVIDENCE_PROVIDER_ARCHITECTURE.md)
- [`docs/sprints/F1.1/F1.1_REVIEW.md`](../F1.1/F1.1_REVIEW.md)
- [`docs/sprints/F1.1/F1.1D_PLANNING.md`](../F1.1/F1.1D_PLANNING.md)
- [`docs/50_EVIDENCE_CATALOG.md`](../../50_EVIDENCE_CATALOG.md)

---

*End of A0 Football Intelligence Planning. Design only — no production code.*
