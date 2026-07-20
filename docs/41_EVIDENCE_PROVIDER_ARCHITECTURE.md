# 41 — Evidence Provider Architecture

| Field | Value |
|---|---|
| Status | **Architecture Planning — Evidence Provider Layer frozen as contract intent** |
| Date | 2026-07-20 |
| Authority | Numbered architecture document under Project Bible + ADRs; does **not** amend Architecture Freeze **v0.2** pipeline package inventory |
| Trigger | Sprint F1.1 Capability Research showed single-vendor Football ingest pressure; product future requires multi-provider Evidence intake |
| Inputs | [`00_PROJECT_BIBLE.md`](./00_PROJECT_BIBLE.md), [`02_DOMAIN_MODEL.md`](./02_DOMAIN_MODEL.md), [`04_ARCHITECTURE.md`](./04_ARCHITECTURE.md), [`36_PROJECT_HEALTH_CHECK.md`](./36_PROJECT_HEALTH_CHECK.md), [`40_PRODUCT_ROADMAP.md`](./40_PRODUCT_ROADMAP.md), [`sprints/F1.1/01_PROVIDER_CAPABILITY_RESEARCH.md`](./sprints/F1.1/01_PROVIDER_CAPABILITY_RESEARCH.md) |
| Explicitly does **not** authorize | Coding, new packages, new TypeScript interfaces, new Engines, Redis/BullMQ, public platform, changes to Freeze v0.2 dependency rules |

### Why this document exists (governance note)

Project Governance Rule forbids new Architecture documents unless a structural defect or unresolvable gap appears.  
F1.1 research confirmed a **structural incompleteness**: Football facts today are delivered through one vendor adapter path, while the product roadmap and Bible require provider-replaceable, multi-source Evidence. This document freezes the **Evidence Provider Architecture** so Sprint F1.1 and later providers do not hard-wire the analysis chain to API-Sports.

This document **does not** reopen Analysis Pipeline Freeze, invent an eighth engine, or redesign Feature / Rule / Projection math.

---

## 0. Purpose and freeze boundary

### Purpose

Define how FAS acquires, normalizes, registers, merges, and qualifies **Evidence** from many external and internal sources — without letting any vendor identity leak into Feature derivation, Rule evaluation, or Deterministic Match Projection.

### Freeze boundary (this planning freeze only)

| Frozen by this document | Not frozen / not changed |
|---|---|
| Evidence Provider Layer concepts | Existing package tree / Freeze v0.2 edges |
| Evidence Categories (provider families) | Feature formulas, Rule versions, Projection models |
| Provider Registry responsibilities | HTTP routes, Prisma schemas, concrete DTOs |
| Evidence lifecycle relative to providers | New Engines |
| Replaceability, merge, provenance, freshness, confidence strategies | Implementation timing or Sprint F1.1 coding |

**Coding is forbidden by this document alone.**

---

## 1. Evidence Provider Layer

### 1.1 Definition

The **Evidence Provider Layer** is the sole intake boundary between the outside world (and internal recorded/synthetic sources) and the **Evidence** bounded context.

It exists to:

1. Fetch or load **source records** (append-only captures of what a source supplied).
2. Map vendor- or source-specific payloads into **provider-neutral FAS observation shapes** owned by Evidence (never raw vendor JSON as Evidence payload truth).
3. Emit **Evidence items** with type, subject, times, quality, provenance, and integrity metadata.
4. Declare **capability and coverage** so missing data is explicit Uncertainty — not silent emptiness.

```text
[ Football | Market | Sentiment | Prediction | Internal ] Providers
                         |
                         v
              Evidence Provider Layer
           (fetch → map → validate → emit)
                         |
                         v
              Evidence Context (items, conflicts, quality)
                         |
                         v
         Cutoff-qualified Evidence selection (Analysis)
                         |
          +--------------+--------------+
          v              v              v
       Features        Rules      Projection / Report
     (provider-blind) (provider-blind) (provider-blind)
```

### 1.2 What the layer is not

- Not a governed Engine (Bible still has seven engines only).
- Not the Analysis Orchestrator.
- Not Feature derivation, Rule evaluation, or Projection.
- Not a place to store AI inference as “facts.”
- Not a requirement to add packages or ports in this planning step.

### 1.3 Non-negotiable boundary rule

**Downstream of Evidence emission, the analysis chain may depend only on Evidence contracts** (type, payload schema for that type, provenance fields, quality, freshness, conflict links) — never on provider product names, endpoint paths, vendor field names, or plan tiers.

---

## 2. Evidence Categories

Evidence Categories classify **provider families** by the kind of world they observe. They are orthogonal to Evidence **types** (`MATCH_INFO`, `TEAM_FORM`, `LINEUP`, `INJURY`, `ODDS`, …).

| Category | Observes | Epistemic default | Example sources (illustrative, not authorized installs) | Must not be treated as |
|---|---|---|---|---|
| **Football Providers** | Match facts: fixtures, form, lineups, injuries, stats, venues, referees, H2H | **Fact** (when normalized without interpretation) | API-Sports Football, future alternate football feeds, recorded football cassettes | Market truth or AI guess |
| **Market Providers** | Bookmaker / exchange prices and movement | **Market signal** | The Odds API (existing optional path), other odds feeds | Ground truth of outcome |
| **Sentiment Providers** | Aggregated public or editorial mood / volume signals | **Market-adjacent or low-reliability observation** — never Fact without strict normalization | News/sentiment APIs (future) | Causal proof or lineup truth |
| **Prediction Providers** | External model forecasts or tip feeds | **External inference / signal** — never FAS Fact; never silent overwrite of FAS projection | Vendor “predictions” endpoints, third-party models | FAS DeterministicMatchProjection or Rule finding |
| **Internal Providers** | FAS-controlled sources: recorded cassettes, curated fixtures, human-entered verified observations, replay fixtures | Same epistemic type as the declared observation | `recorded-snapshot` football bundles, demo populations | “More true” merely because internal — still need provenance |

### 2.1 Category rules

1. A single vendor product may implement **one or more** categories only if each emitted Evidence item declares the correct category and epistemic treatment.
2. **Prediction Provider** output must never be normalized into `LINEUP`, `INJURY`, or other Fact types without an explicit, reviewable domain operation (default: **forbidden**).
3. **Internal Providers** are first-class for CI and private demos; they use the same Evidence contracts as live providers.
4. Categories do not create new Engines and do not expand the seven-engine set.

### 2.2 Relation to existing Evidence types

Evidence **types** remain owned by the Evidence / Domain contracts already in force. Categories answer *which family of providers may emit a type*; they do not invent parallel type systems.

| Evidence type (examples) | Typical category |
|---|---|
| `MATCH_INFO`, `TEAM_FORM`, `STATISTICS`, `HEAD_TO_HEAD`, `LINEUP`, `INJURY`, `RANKING` | Football (sometimes Internal recorded) |
| `ODDS` | Market |
| `NEWS` / future sentiment-shaped types | Sentiment (strict normalization required) |
| External tip / model forecast artifacts | Prediction (separate from FAS projection; if persisted, must not masquerade as Fact) |
| Curated demo / cassette emissions | Internal |

---

## 3. Provider Registry

### 3.1 Definition

The **Provider Registry** is the conceptual catalog of every Evidence Provider known to FAS for a deployment environment.

It answers:

- Which providers exist?
- Which **Evidence Category** do they serve?
- Which **Evidence types** can they emit?
- Which competitions / seasons / subjects are in **coverage**?
- Which **modes** are allowed (`recorded` / `live` / `fixture-shell` / future)?
- What is their **priority** for merge when multiple providers claim the same subject?
- Are they **enabled** for this environment?

### 3.2 Registry responsibilities

| Responsibility | Meaning |
|---|---|
| Identity | Stable FAS provider id (opaque), distinct from vendor account keys |
| Category binding | Football / Market / Sentiment / Prediction / Internal |
| Capability declaration | Evidence types + coverage predicates (league, season, feature flags) |
| Mode policy | Which runtime modes may invoke the provider |
| Precedence | Ordered preference within a category for the same Evidence type/subject |
| Health / quota class | Operational class (e.g. free-tier fragile vs paid) — operational metadata, not domain truth |
| Disablement | Soft-disable without deleting historical Evidence already recorded |

### 3.3 Registry non-goals (this planning freeze)

- Not a microservice discovery bus.
- Not Redis-backed dynamic plugin loading.
- Not authorization for installing new vendor SDKs (still requires product/milestone gate).
- Not a place to encode Rule or Projection logic.

---

## 4. Evidence lifecycle

Evidence lifecycle is owned by the Evidence context. Providers only **introduce candidates**; they do not own quality decisions or snapshot sealing.

```text
1. Source capture
   Provider obtains a source record (HTTP body, cassette file, internal feed)
        |
2. Map & validate
   Vendor shape → FAS observation candidate (reject or quarantine invalid)
        |
3. Emit Evidence item
   Typed Evidence with provenance, times, quality seed, checksum
        |
4. Quality & conflict handling
   Evidence context may mark verified / unverified / rejected; link conflicts
        |
5. Cutoff qualification
   Analysis selects items with observedAt ≤ cutoffAt (Bible / Domain)
        |
6. Snapshot freeze
   Selected Evidence identities + checksums sealed for the analysis lineage
        |
7. Downstream use
   Features / Rules / Projection / Report consume sealed Evidence only
        |
8. Post-match outcome path (separate)
   Outcome Evidence may verify results; does not rewrite pre-match Evidence
```

### 4.1 Lifecycle invariants

1. **Append-oriented truth:** source records are not silently overwritten; corrections create new records / quality changes with auditability ( Domains: Source record vs Evidence item ).
2. **Cutoff beats retrieval time:** late observations cannot enter an earlier sealed snapshot.
3. **Provider failure ≠ empty Fact:** transport failure, empty coverage, or “too early for lineups” must surface as **Uncertainty / limitations**, not as “no injuries.”
4. **Sealed snapshots are immutable** with respect to provider refreshes after seal.
5. **Internal recorded** items follow the same lifecycle; `recorded-snapshot` is a provenance method, not a bypass.

---

## 5. Provider 与 Evidence 的关系

| Side | Owns | Must not own |
|---|---|---|
| Provider (adapter role) | How to talk to a source; how to map into FAS observation candidates; capability/coverage claims | Evidence quality authority; Feature math; Rule findings; Projection probabilities |
| Evidence context | Normalized Evidence items, provenance links, quality, conflicts, query for cutoff selection | Vendor SDKs; knowing API-Sports path names; market settlement logic |
| Analysis | Cutoff selection, snapshot sealing, orchestration | Re-fetching vendor APIs during Rule/Projection |
| Feature / Rule / Projection | Deterministic consumption of Evidence contracts | Provider ids as branching conditions for core math |

### 5.1 Cardinality

- One Provider may emit many Evidence types.
- One Evidence type may be emitted by many Providers (same category or, rarely, cross-category only under explicit merge policy).
- One Match may accumulate Evidence from multiple Providers over time.
- One Analysis snapshot pins an exact set of Evidence item identities — not “whatever the provider returns now.”

### 5.2 Identity rule (Bible-aligned)

External provider identifiers (fixture ids, player ids, bookmaker event ids) are **aliases**, never FAS Match / Evidence identity. Mapping tables or provenance fields may retain aliases for traceability.

---

## 6. Provider Replaceability

### 6.1 Definition

**Replaceability** means FAS can change, disable, or dual-run a provider for a given Evidence type without rewriting Feature, Rule, or Projection logic.

### 6.2 Replaceability requirements

1. **Stable Evidence types and payload meanings** across providers for the same type (semantic stability > field-name stability).
2. **Provenance always names the producing provider id + method** (`http-live`, `recorded-snapshot`, etc.).
3. **Coverage honesty:** a replacement provider with weaker coverage must fail explicitly, not invent values.
4. **Recorded Internal Providers** remain the CI contract so vendor replacement cannot break offline validation.
5. **No analysis-chain imports** of vendor packages or vendor DTO names (Architecture / ADR-001 direction).

### 6.3 Replacement scenarios (product)

| Scenario | Expected behavior |
|---|---|
| Swap Football Provider A → B | Same Evidence types emitted; provenance changes; Features/Rules/Projection unchanged |
| Disable live Football; keep recorded Internal | Analyze path still works for cassette matches |
| Add second Football Provider | Registry precedence + merge policy decide; conflicts recorded |
| Odds Market Provider fails | Football facts path remains analyzable (F.1 already requires this split) |

### 6.4 What replaceability does not mean

- Bit-identical payloads across vendors.
- Guaranteed equal coverage (lineups/injuries vary by league — F1.1 research).
- Zero migration cost for historical Source records (old provenance remains valid history).

---

## 7. Multi-source Merge Strategy

When two or more providers emit Evidence about the same subject (match/side/type window), FAS uses an explicit merge strategy. **Silent overwrite is forbidden.**

### 7.1 Strategies (policy menu)

| Strategy | When | Result |
|---|---|---|
| **Precedence** | Registry declares primary for (category, type, scope) | Primary wins for selection; secondary retained as conflicting or supplemental Evidence |
| **Complement** | Providers cover disjoint fields (e.g. venue from A, injuries from B) | Union into the snapshot if non-overlapping; each field keeps provenance |
| **Conflict retain** | Contradictory values for the same metric | Keep both Evidence items; mark conflict; Analysis / readiness may raise Uncertainty |
| **Freshness prefer** | Same provider family, newer observation | Prefer fresher if quality allows; keep older for audit |
| **Quality prefer** | One item verified, one unverified | Prefer higher quality class for selection; do not delete the other |
| **Category firewall** | Prediction/Sentiment vs Football Fact | Never auto-merge Prediction into Fact types |

### 7.2 Default policy for v1 private product (planning default)

1. **Football Facts:** single active primary Football Provider + Internal recorded for CI; secondary football sources use **Conflict retain** or **Complement**, never silent blend of contradictory scores/lineups.
2. **Market:** optional overlay; never required for football analyzability.
3. **Sentiment / Prediction:** off by default until a gated Sprint; if present, **Category firewall** applies.
4. Snapshot selection documents **which** strategy produced the chosen set (via provenance / selection manifest concepts already implied by Domain snapshots).

### 7.3 Merge must not happen inside Rules or Projection

Merge and conflict resolution decisions belong to Evidence selection / readiness **before** Feature derivation. Rules see sealed inputs only.

---

## 8. Provenance Strategy

Provenance makes every Evidence item reviewable (Bible: evidence before intuition; every analysis reviewable).

### 8.1 Minimum provenance content (conceptual)

Every Evidence item must be able to answer:

| Question | Provenance field concept |
|---|---|
| Who collected it? | Provider id / collector |
| How? | Method (`http-live`, `recorded-snapshot`, future methods) |
| From which external alias? | Source id / vendor fixture id (alias only) |
| When observed vs when collected? | `eventTime` / `observedAt` vs `collectedAt` |
| Which normalization? | Normalization / mapper version identity |
| Integrity? | Content checksum |
| What category? | Evidence Category |
| What epistemic type? | Fact vs Market signal vs … (Domain epistemic types) |

### 8.2 Provenance rules

1. Raw vendor payloads may be retained as **Source records** for audit; they are not Feature inputs.
2. Provenance is **mandatory** for publication-grade and deterministic-report paths.
3. Changing provider or mapper version implies new Evidence identity or explicit quality supersession — not quiet mutation of sealed snapshot members.
4. UI/Report may display human-readable provider labels derived from provenance; math must not branch on those labels.

---

## 9. Freshness Strategy

Freshness describes whether an Evidence item is still suitable for a cutoff.

### 9.1 Existing freshness classes (keep)

Align with current Evidence freshness vocabulary already in the platform:

| Class | Meaning |
|---|---|
| `fresh` | Within the expected update horizon for that Evidence type |
| `stale` | Exceeded expected horizon; usable only with explicit Uncertainty / limitations |
| `unknown` | Horizon cannot be determined |

### 9.2 Type-sensitive horizons (policy intent — not code)

Horizons differ by observation kind (informed by F1.1 research):

| Observation kind | Freshness intent |
|---|---|
| Confirmed lineup | Short pre-match horizon; “missing because too early” ≠ stale fact |
| Injuries / suspensions | Medium horizon (provider updates on the order of hours) |
| Team form / finished results | Stable after match settlement |
| Odds | Short horizon; market signal aging is expected |
| Sentiment | Short horizon; low trust if aged |
| External predictions | Age quickly; never become Facts |

### 9.3 Freshness vs cutoff

- Freshness does **not** override cutoff: a fresh observation after cutoff is still ineligible for that snapshot.
- Stale-but-pre-cutoff Evidence may enter with limitations; readiness policy decides hard fail vs warn.

---

## 10. Confidence Strategy

Confidence is overloaded in FAS. This architecture freezes separations already required by the Domain Model.

| Kind | Owner | Meaning | Must not be confused with |
|---|---|---|---|
| **Source / Evidence quality** | Evidence | `verified` / `unverified` / `rejected` (and conflict state) | Model confidence |
| **Provider reliability class** | Registry / operations | Operational expectation (quota, historical accuracy class) | Per-match Fact truth |
| **Rule confidence** | Rule Engine governance | Declared metadata on a rule version | AI confidence |
| **Projection confidence** | Analysis projection | Completeness / agreement score for sealed projection | Odds price or provider tip |
| **Inference confidence** | AI path after validation | Model self-assessment under schema | Evidence quality |
| **External Prediction Provider score** | Prediction category item | Vendor’s own score | FAS projection confidence |

### 10.1 Evidence Provider Layer duties regarding confidence

1. Emit **quality** and **provenance**, not Rule/Projection confidence numbers.
2. May attach provider-declared uncertainty **as payload metadata** only when it is source-backed (e.g. coverage unknown).
3. Must not invent “confidence = 0.9” for missing lineups.
4. Missing coverage → **Uncertainty / limitations**, not fabricated high-confidence empty squad health.

---

## 11. Why Rule, Feature, and Projection must never depend on a concrete Provider

1. **Bible — Evidence before intuition; separate facts, market signals, and inference.** Provider brands are not epistemic types. Branching on “if API-Sports then …” collapses that separation.
2. **Replaceability.** If Rules encode vendor quirks, replacing a Football Provider rewrites analytical law — unacceptable.
3. **Reviewability.** Findings must cite Evidence identities and rule versions, not “because RapidAPI returned field X.”
4. **Determinism.** Projection must be a pure function of sealed FeatureBundle + Rule findings + model versions. Vendor latency, plan tier, or endpoint shape must not change sealed math.
5. **Multi-provider future.** Sentiment and Prediction sources will disagree with Football Facts; vendor-specific branches would entangle categories.
6. **Architecture Freeze v0.2 direction.** Dependency edges already keep infrastructure adapters outward; this document reaffirms that Feature/Rule/Projection sit **above** Evidence contracts, not beside vendor adapters.
7. **F1.1 practical lesson.** Lineups/injuries are coverage- and timing-variant. Rules that assume “API-Football always has lineups” would create false certainty.

**Allowed:** Features/Rules may depend on Evidence **type and payload semantics** (e.g. presence of confirmed lineup status, injury reason codes defined by FAS).  
**Forbidden:** Features/Rules/Projection may depend on provider id, vendor endpoint, or plan tier for core analytical outcomes.

---

## 12. Why future Providers do not require analysis-chain changes

If this architecture is honored, adding a provider is an **intake + registry + mapping** change, not an Analysis rewrite:

```text
New Provider P
  → declare Category + capabilities in Provider Registry
  → implement map-to-FAS-observation for supported Evidence types
  → emit Evidence with provenance
  → (optional) adjust merge precedence
  → existing cutoff selection → Features → Rules → Projection → Report
```

| Layer | Change when adding a Provider? |
|---|---|
| Provider Registry | **Yes** — register capabilities / precedence |
| Mapping / source capture | **Yes** — new adapter behavior |
| Evidence types (usually) | **No** — reuse types; new type only via Domain/Evidence contract change |
| Feature derivation | **No** — unless a genuinely new Evidence type/semantic is introduced |
| Rule Engine | **No** — unless governance adds rules that consume new semantics |
| Projection | **No** — unless projection model version explicitly opts into new features |
| Report / UI | **Optional** — display new sections; not required for math |
| Architecture Freeze package graph | **No** — unless a later gated milestone adds an approved package |

This is the operational meaning of **provider-replaceable Evidence** already stated in F.1 gates and Domain ownership: Analysis must not own provider-specific concepts.

---

## 13. Implications for Sprint F1.1 (planning only)

F1.1 remains a **Football Provider enrichment** sprint (lineup / injury / referee / richer form) under [`40_PRODUCT_ROADMAP.md`](./40_PRODUCT_ROADMAP.md).

Within this architecture:

- F1.1 work must emit FAS Evidence (`LINEUP`, `INJURY`, enriched `MATCH_INFO` / `TEAM_FORM`) with provenance — not pass API-Sports JSON downstream.
- Expected lineup remains forbidden (no Fact source) — consistent with Category firewall (Prediction ≠ Lineup Fact).
- Recorded Internal Provider cassettes are mandatory for CI replaceability.
- F1.1 must not teach Rules/Projection to require API-Sports.
- Implementing Registry/Merge in full generality is **not** a prerequisite to start F1.1 coding after a thin Spec — but F1.1 must not violate this architecture’s boundary rules.

---

## 14. Explicit non-goals

- No coding, no new packages, no new interfaces authorized here.
- No amendment to Architecture Freeze **v0.2** dependency-cruiser package edges.
- No new Engine.
- No Redis / BullMQ / pgvector.
- No requirement to onboard Sentiment / Prediction providers in v1.
- No redesign of Feature formulas, Rule versions, or Projection models.
- No parallel Evidence type system outside Domain / Evidence contracts.

---

## 15. Authority and conflict resolution

| Topic | Winning authority |
|---|---|
| Epistemic types, Evidence meaning, cutoff | `00_PROJECT_BIBLE.md`, `02_DOMAIN_MODEL.md` |
| Engines vs Analysis ownership | Bible + `04_ARCHITECTURE.md` |
| Product sprint order | `40_PRODUCT_ROADMAP.md` |
| F1.1 provider capability facts | `sprints/F1.1/01_PROVIDER_CAPABILITY_RESEARCH.md` |
| Evidence Provider Layer strategies (this doc) | **This document** for intake / registry / merge / replaceability intent |
| Live delivery status | `PROJECT_STATE.md` |

If this document conflicts with Bible or Domain on epistemic meaning, **Bible / Domain win** and this document must be corrected.

---

## 16. Freeze statement

**Evidence Provider Architecture (sections 1–12) is frozen as planning contract intent.**

This freeze:

- guides Sprint F1.1 and future provider work;
- does **not** start coding;
- does **not** add packages or interfaces;
- does **not** modify Architecture Freeze v0.2;
- does **not** add Engines.

Next product step remains a **thin Sprint F1.1 Specification** (inputs / outputs / acceptance / recorded fixtures) citing [`40_PRODUCT_ROADMAP.md`](./40_PRODUCT_ROADMAP.md), then implementation only after an explicit gate.

---

*End of Evidence Provider Architecture — Architecture Planning only.*
