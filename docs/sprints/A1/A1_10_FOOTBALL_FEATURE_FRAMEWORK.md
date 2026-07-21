# A1.10 — Football Feature Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A1.10** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation design | [`A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Projection design | [`A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](./A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| Rule hierarchy | [`A1_8_FOOTBALL_RULE_HIERARCHY.md`](./A1_8_FOOTBALL_RULE_HIERARCHY.md) |
| Evidence reliability | [`A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](./A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md) |
| Evidence catalog (status) | [`docs/50_EVIDENCE_CATALOG.md`](../../50_EVIDENCE_CATALOG.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 |
| Pipeline authority | [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) |
| Backend authority | [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; formulas; DTO/database schemas; implementation; package creation; Bible / Architecture Freeze edits; other doc edits |

---

## 0. Goal

Design the **canonical Football Feature Framework** for Football Intelligence: how cutoff-qualified Evidence becomes a versioned **FeatureBundle**, how Features are classified and owned, and how Rules and Projection consume them — without Features becoming a second Rule engine or a probability engine.

```text
Provider
  → Evidence (Facts)
  → Feature (derived measurements)
  → Rule (evaluation)
  → Projection (probabilities)
  → Scenario (selection)
  → Confidence (trust)
  → Narrative (explanation)
```

**Hard ownership (binding):**

| Capability | Owns |
|---|---|
| **Evidence** | Facts |
| **Feature** | Derived football measurements |
| **Rule** | Evaluation of Features → findings |
| **Projection** | Probabilities |
| **Scenario** | Selection of worlds from Projection |
| **Confidence** | Trust signals |
| **Narrative** | Explanation |

**Feature must never:**

- compute probabilities;
- evaluate Rules;
- read Providers directly;
- invent Evidence;
- read Projection / Scenario / Confidence / Narrative.

**Consumers (binding):**

- **Rules consume FeatureBundle only** (not raw Evidence, not Provider JSON).  
- **Projection consumes FeatureBundle only** for measurements (plus Rule findings and structured completeness signals per A1.5 — never raw Evidence).

Design only. No implementation. No formulas. No schemas. No new package. No new Bible Engine.

### Non-goals

- Replacing A0.5’s MVP Feature list with a mandatory large catalogue.  
- Implementing extractors or changing `@fas/feature` code.  
- Provider / Evidence / Rule / Projection redesign.  
- Calibration (A2) or Evaluation metric formulas (A1).

---

## 1. Problem statement

A0 defines Feature derivation as an Analysis-owned intelligence capability living in `@fas/feature`. A0.5 freezes a small MVP Feature set with honest absence. A1.5 / A1.8 / A1.9 clarify Projection, Rule hierarchy, and Evidence reliability.

Without a Feature Framework, extractors risk:

- inventing `AvailabilityPenalty = 0` as “full strength”;
- emitting Market Features as football Facts;
- letting Projection re-read Evidence;
- version churn that breaks A1 Feature Contribution cohorts;
- unbounded Feature sprawl with no Primary vs Optional discipline.

A1.10 freezes **taxonomy, lifecycle, FeatureBundle contract, dependency graph, versioning, expansion, and DDD ownership** for Features.

---

## 2. Naming discipline

| Term | Meaning |
|---|---|
| **Feature** | One named derived measurement for a MatchId, with provenance to Evidence where applicable |
| **FeatureBundle** | Immutable set of Features for one MatchId under one FeatureModelVersion |
| **FeatureModelVersion** | Pinned derivation policy + extractor identity set that defines which Features may be emitted and from which Evidence types |
| **Feature Engine** (A0 product language) | Intelligence module name — **not** a Bible Engine; owned as `@fas/feature` |
| **Derived** (A1.9 trust class) | Epistemic label for composed/derived surfaces; FeatureBundle is derived relative to Evidence Facts |

Bible Engines remain seven. Feature is not an eighth Engine.

---

## 3. Feature taxonomy

### 3.1 Tiers: Primary / Supporting / Optional

| Tier | Role | Typical consumers | Honest absence |
|---|---|---|---|
| **Primary Features** | Core football measurements required for a meaningful lean under pinned policy | Primary Rules (A1.8 P1); Projection lambdas/channels | Missing required Primaries → bundle `blocked` or analysis insufficient per policy |
| **Supporting Features** | Context that strengthens honesty, home context, or dampens false certainty | Supporting/Secondary Rules; Confidence caps; Narrative | Prefer **omit** over fake zero (Availability, Venue) |
| **Optional Features** | Annex measurements when Evidence present (market, H2H, environmental, …) | Supporting Market Signal Rules (`channel: none`); Projection limitations | Missing ⇒ INAPPLICABLE Rules; no invented neutral market |

Mapping to A0.5 MVP (compatibility, not a freeze of names):

| A0.5 MVP Feature (product) | Tier (A1.10) |
|---|---|
| Attack / Defense / RecentForm / Momentum / HomeAdvantage | Primary (DefenseStabilityAway may exist as Primary even if MVP table listed one side — Projection needs both sides when policy requires) |
| VenueAdvantage, AvailabilityPenalty* | Supporting |
| Market implied / lean, H2H lean (when present) | Optional |

A Feature has exactly one tier inside a given **FeatureModelVersion**. Retiering requires a new model version.

### 3.2 Domains

| Domain | Intent | Examples (illustrative) |
|---|---|---|
| **Match Identity** | Side names, kickoff, fixture anchors as Features | homeTeam, awayTeam, kickoff |
| **Form** | Windowed recent results | recentFormHome/Away |
| **Attack** | Offensive capability | attackRating / AttackStrength home/away |
| **Defense** | Defensive stability | defenseRating / DefenseStability home/away |
| **Momentum** | Short-term trajectory | momentumHome/Away, signed momentum lean |
| **Home Context** | Home edge and venue | homeAdvantage, venueAdvantage |
| **Availability** | Absence impact when Evidence exists | availabilityPenaltyHome/Away |
| **Consistency** | Multi-signal derived leans used by Meta Rules | signed momentum / alignment inputs (not Rule findings) |
| **Market** | Odds-implied measurements as **signal** | marketLean, marketImplied*, asianHandicap* |
| **External Conditions** | Weather, travel, fatigue when Evidence exists | future |
| **Lineup** | Lineup / expected lineup measurements when Evidence exists | future |
| **Future domains** | Set-piece, motivation, etc. when Evidence and policy exist | reserved |

Domains align with A1.8 Rule domains where practical so Rule Feature dependencies stay readable.

### 3.3 Feature categories

| Category | Meaning | Typical tier |
|---|---|---|
| **Measurement** | Direct numeric/string extraction with minimal transform | Match Identity; some Market fields |
| **Derived Metric** | Bounded score from one Evidence family (form score, ratings) | Primary Form/Attack/Defense |
| **Aggregate** | Combination across windows or sides under Feature policy | Momentum lean; some Attack/Defense composites |
| **Snapshot** | Point-in-time identity/context copy from Evidence | kickoff, team names |
| **Availability** | Absence-impact Features with honest omission | Supporting Availability |
| **Context** | Home/venue/environment context | Supporting Home Context; External |
| **Market Signal** | Market-class Evidence → Features; never Fact | Optional Market |
| **Environmental** | Weather/travel/fatigue Features | Optional External Conditions |
| **Meta** | Features that exist mainly to support consistency/honesty signalling (still not Rule findings) | Supporting / Optional |

Categories are catalogue labels. They do not create packages.

---

## 4. Feature ownership and lifecycle

### 4.1 Pipeline ownership

```text
Provider        → raw source captures
Evidence        → Facts (normalize, provenance, reliability)
Feature         → derived measurements (FeatureBundle)
Rule            → evaluate FeatureBundle
Projection      → probabilities from FeatureBundle + Rule findings
Scenario        → select worlds from Projection
Confidence      → trust over Projection (+ completeness/honesty)
Narrative       → explain Features / Rules / Scenarios
```

| Actor | May | Must not |
|---|---|---|
| Provider | Supply raw captures | Emit FeatureBundle |
| Evidence | Qualify and select Facts | Derive football ratings as Features |
| Feature (`@fas/feature`) | Deterministically derive Features from Evidence selection | Read Providers; evaluate Rules; compute 1X2; invent Evidence; read Projection |
| Rule | Read FeatureBundle | Read Evidence/Provider |
| Projection | Read FeatureBundle (+ Rule envelope, completeness signals) | Read raw Evidence |
| Scenario / Confidence / Narrative | Read sealed downstream packages | Recompute Features |

### 4.2 Feature lifecycle (conceptual)

| Phase | Meaning |
|---|---|
| **Declare** | Feature id + domain/tier/category entered in FeatureModelVersion catalogue |
| **Bind** | Feature-derivation policy binds Evidence types (and reliability constraints) to the Feature |
| **Extract** | Pure deterministic extraction for one MatchId Evidence selection |
| **Emit or Omit** | Emit Feature with provenance **or** omit under honest absence (never fake full strength) |
| **Bundle** | Assemble FeatureBundle with status, completeness, checksum, model version |
| **Consume** | Rules then Projection consume the sealed bundle |
| **Evaluate (post-match)** | A1 Feature Contribution metrics score model versions — no auto-activation |
| **Retire / Supersede** | New FeatureModelVersion omits or replaces Features; old sealed bundles remain immutable |

### 4.3 Derivation policy pins

Extraction runs under an exact **FeatureModelVersion** (and conceptual feature-policy version if split later). Identical Evidence selection + identical FeatureModelVersion ⇒ identical FeatureBundle (doc 17).

Orchestration may inject clock/ids only at the edge; Feature domain logic remains pure (A0).

---

## 5. FeatureBundle

FeatureBundle is the **only** Feature contract Rules and Projection consume.

### 5.1 Conceptual contents

| Element | Purpose |
|---|---|
| **MatchId** | Single-match identity; mixed matches forbidden |
| **Features[]** | Ordered or deterministically ordered Feature items |
| **featureModelVersion** | Pinned model identity |
| **FeatureBundle checksum** | Integrity over features + status + evidence refs + model version |
| **evidenceRefs** | Evidence ids selected as inputs (provenance) |
| **completeness** | Structured completeness signal aligned with A1.9 states (present/partial/missing/unknown/stale scopes) |
| **status** | Bundle completion state (below) |
| **degradation / limitation notes** | Why degraded/blocked; honest absence disclosures |

### 5.2 Feature item identity (conceptual)

Each Feature item includes:

| Element | Purpose |
|---|---|
| **feature identity** | Stable Feature id / name within the model |
| **feature version** | Immutable semantics version for that Feature id (when catalogue versions Features individually) |
| **value** | Derived measurement (type per Feature — not designed as schema here) |
| **sourceEvidenceId(s)** | Provenance to parent Evidence |
| **explanation** | Structured machine-usable text (not LLM prose) |
| **generatedAt** | Deterministic timestamp from Evidence collection policy edge |

No probabilities, recommendations, or narrative sections inside Feature items.

### 5.3 Bundle status

| Status | Meaning |
|---|---|
| **completed** / **completed_nonempty** | Required Primary Features present under model policy; usable for Rule + Projection |
| **degraded** | Runnable under policy but Supporting/Optional gaps or partial Evidence; limitations required |
| **blocked** | Cannot honestly produce required Primaries; Projection must not invent a distribution |

Status names may match existing runtime vocabulary; product meaning above is binding.

### 5.4 Feature completeness (bundle-level)

Completeness is **not** “count of Features emitted.” It reflects Evidence reliability scopes (A1.9) after derivation:

| Signal | Examples |
|---|---|
| Match minimum completeness | Identity + Form + Stats Primaries |
| Honesty annex completeness | Venue / Availability present vs unknown |
| Optional annex completeness | Market / H2H / Environmental |

Missing Availability Evidence ⇒ Availability Features omitted + completeness marks unknown/missing — **never** penalty zero as full strength (A0 / A0.5 / A1.9).

### 5.5 Dependencies recorded on the bundle

Conceptual dependency links (for audit and A1 cohorts):

- Evidence selection identity / checksums;  
- FeatureModelVersion;  
- Per-Feature Evidence refs;  
- Reliability acknowledgements if readiness allowed conflicted/stale inputs (do not clear honesty flags).

---

## 6. Feature dependency graph

```text
Provider (raw)
  → Evidence Facts  (A1.9 reliability)
  → FeatureBundle   (@fas/feature)
  → Rule Findings   (A1.8 hierarchy)
  → Projection      (A1.5 probabilities)
  → Scenario / Confidence / Narrative
```

### 6.1 Dependency kinds

| Dependency | Meaning |
|---|---|
| **Evidence → Feature** | Feature extractor may read only declared Evidence types for that Feature under FeatureModelVersion |
| **Feature → Feature** | Allowed only when declared in model (e.g. signed momentum from side momentums); no hidden cycles |
| **Feature → Rule** | Rules declare required Feature names; missing ⇒ INAPPLICABLE (A1.8) |
| **Feature → Projection** | Projection reads Primary (and policy-optional) Features; missing required ⇒ blocked/insufficient |
| **Forbidden: Feature → Projection readback** | Features never depend on probabilities |
| **Forbidden: Feature → Rule findings** | Features never consume Rule outputs in the same run |
| **Forbidden: Feature → Provider** | No SDK/raw bypass of Evidence |

### 6.2 Side and subject discipline

Home/Away Features are distinct identities. Cross-side aggregates (e.g. signed momentum) must declare both parents. Mixed MatchIds inside one bundle are invalid.

---

## 7. Feature versioning

| Identity | Meaning |
|---|---|
| **Feature id** | Stable logical name/concept across versions (e.g. product `recentFormHome`) |
| **Feature version** | Immutable semantics for thresholds/units/meaning of that id when individually versioned |
| **FeatureModelVersion** | Frozen set of Feature ids/versions + Evidence bindings + emission/omission policy (e.g. conceptual evolution from `feature.v2.a05.slice1`) |
| **FeatureBundle checksum** | Integrity of a concrete derivation result |

### 7.1 Change rules

| Change | Requires |
|---|---|
| New Feature / remove Feature / change Evidence binding / change honest-absence policy | New **FeatureModelVersion** |
| Change meaning of an existing Feature id | New **Feature version** and new **FeatureModelVersion** that pins it |
| Rename for product clarity | Prefer stable id + alias note; never silent id reuse across incompatible meanings |

### 7.2 Backward compatibility

- Sealed bundles remain immutable and readable under their original FeatureModelVersion.  
- Rules and Projection pin the FeatureModelVersion they were run against (A1 Prediction History).  
- Consumers must not assume “latest Features” exist on old bundles.  
- Optional Features may appear in newer models without breaking old Rule-sets that treat them as INAPPLICABLE when absent.  
- Removing a Primary Feature is a breaking model change — requires coordinated rule-set + projection policy pins.

### 7.3 Evaluation coupling (A1)

Feature Contribution metrics slice by Feature id + FeatureModelVersion (+ bundle status). No auto-promotion of a “winning” model into live runs.

---

## 8. Future expansion

New signals enter as Evidence (A1.9) → Feature under a new FeatureModelVersion → Rule hierarchy (A1.8) → Projection policy (A1.5). Scenario selection contract stays stable.

| Expansion | Domain / tier (expected) | Category | Honest absence | Notes |
|---|---|---|---|---|
| **xG** | Attack / Defense — Primary or Supporting upgrade of ratings | Derived Metric / Aggregate | Missing xG ⇒ do not fake; may degrade to shots/goals-only basis with limitation | Still a Feature, not a Projection engine |
| **Expected Lineup** | Lineup — Supporting/Primary when Evidence exists | Availability / Snapshot | Unknown ⇒ omit; Honesty Rules | Never invent Expected Lineup Facts |
| **Weather** | External Conditions — Optional | Environmental / Context | Omit if missing | |
| **Referee** | External Conditions or future Referee domain — Optional→Supporting | Context / Measurement | Omit if missing | |
| **Travel** | External Conditions — Optional | Environmental | Omit if missing | |
| **Fatigue** | External Conditions — Optional→Supporting | Derived Metric | Omit if missing | A0 deferred Motivation/Fitness |
| **Market** | Market — Optional | Market Signal | Omit if no ODDS | Never Fact; Rules channel none |
| **Betting Volume** | Market — Optional | Market Signal | Omit if missing | Never overrides Official/Statistical Features |

### 8.1 Expansion checklist

1. Evidence type trusted and cutoff-qualified (A1.9).  
2. Feature id/tier/domain/category declared.  
3. Honest omission vs degrade behavior defined.  
4. New **FeatureModelVersion** published.  
5. Rule-set updated only if Rules need the Feature (A1.8).  
6. Projection policy admits the Feature without Scenario contract change (A1.5).  
7. Catalog status updated in product tracking ([`docs/50_EVIDENCE_CATALOG.md`](../../50_EVIDENCE_CATALOG.md) for Evidence; Feature catalogue remains Feature-owned).  
8. No Feature reads Provider or Projection.

---

## 9. DDD ownership

### 9.1 Package home (unchanged)

| Concern | Package |
|---|---|
| Feature derivation, FeatureBundle, FeatureModelVersion | **`@fas/feature`** |
| Evidence Facts / selection | `@fas/evidence` (+ normalizer path) |
| Rule evaluation | `@fas/rule` → `@fas/rule-engine` |
| Projection / Scenario / Confidence | `@fas/analysis` |
| Narrative / Report | `@fas/report` |
| Providers | provider packages at the edge only |

### 9.2 Forbidden creations

```text
packages/feature-engine/          # unless later ADR — Freeze prefers @fas/feature
packages/feature-taxonomy-engine/
packages/football-feature-engine/
```

A0 already forbids creating `packages/feature-engine` without ADR. A1.10 does not authorize that ADR.

### 9.3 Folder intent (folders only)

```text
packages/feature/
  src/
    domain/        # Feature + FeatureBundle identities (conceptual)
    extraction/    # pure extractors
    policy/        # Evidence→Feature bindings / FeatureModelVersion catalogue (future coding home)
```

### 9.4 Alignment with docs 17 / 18

| Authority | A1.10 stance |
|---|---|
| `deterministic_report`: Evidence → Feature → Rules → Projection → Report | Affirmed |
| Features deterministic for identical Evidence selection + feature-model version | Affirmed |
| Feature values enter Rules only through declared contracts | Affirmed |
| Web/API must not recompute FeatureBundle | Affirmed |
| Analysis coordinates; Feature package stays framework-neutral | Affirmed |

---

## 10. Relationship to prior sprints

| Document | Relationship |
|---|---|
| **A0** | Feature Module purpose/ownership; A1.10 expands taxonomy/lifecycle/versioning |
| **A0.5** | MVP ≤10 Features remain a product subset of Primary/Supporting under this framework |
| **A1** | Feature Contribution / history bind to FeatureModelVersion + bundle checksum |
| **A1.5** | Projection consumes FeatureBundle only for measurements |
| **A1.8** | Rules depend on Feature names by hierarchy; INAPPLICABLE when omitted |
| **A1.9** | Evidence reliability drives honest omission, degradation, and completeness signals into FeatureBundle |

### 10.1 End-to-end chain

```text
Provider → Evidence (Facts, A1.9)
  → FeatureBundle (@fas/feature, this framework)
  → Rules (A1.8)
  → Projection (A1.5)
  → Scenario → Confidence → Narrative → Report
  → A1 Evaluation (post-match; no Feature rewrite)
```

---

## 11. Acceptance criteria (for a future Coding gate)

When a coding sprint implements this design (separate authorization), the system must:

1. Derive Features only inside `@fas/feature` from cutoff-qualified Evidence.  
2. Emit FeatureBundle with feature identity, model version, checksum, completeness signal, and status (`completed` / `degraded` / `blocked`).  
3. Omit Supporting Availability/Venue Features when Evidence is absent — never invent full strength.  
4. Ensure Rules and Projection consume FeatureBundle only (Projection never reads raw Evidence).  
5. Pin FeatureModelVersion on every sealed bundle and analysis history record.  
6. Classify Features by tier (Primary/Supporting/Optional), domain, and category in the model catalogue.  
7. Introduce no new package and no new Bible Engine; leave Bible and Architecture Freeze unchanged.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Feature taxonomy (tiers, domains, categories) | **Designed** |
| Feature ownership and lifecycle | **Designed** |
| FeatureBundle conceptual contract | **Designed** |
| Feature dependency graph | **Designed** |
| Feature versioning | **Designed** |
| Future expansion | **Designed** |
| DDD ownership (`@fas/feature`) | **Designed** |
| Acceptance criteria | **Designed** |
| Production code / formulas / schemas | **Out of scope** |
| Bible / Architecture / new packages | **Out of scope** |

---

## 12. References

- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md)
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md)
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md)
- [`docs/50_EVIDENCE_CATALOG.md`](../../50_EVIDENCE_CATALOG.md)
- [`docs/sprints/A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/sprints/A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md)
- [`docs/sprints/A1/A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md)
- [`docs/sprints/A1/A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](./A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md)
- [`docs/sprints/A1/A1_8_FOOTBALL_RULE_HIERARCHY.md`](./A1_8_FOOTBALL_RULE_HIERARCHY.md)
- [`docs/sprints/A1/A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md`](./A1_9_FOOTBALL_EVIDENCE_RELIABILITY.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A1.10 Football Feature Framework design. Design only — no implementation.*
