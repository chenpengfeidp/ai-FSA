# A1.9 — Football Evidence Reliability Framework (Design)

| Field | Value |
|---|---|
| Sprint id | **A1.9** |
| Document type | Design / Planning only |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](../A0/A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Intelligence MVP | [`A0_5_FOOTBALL_INTELLIGENCE_MVP.md`](../A0/A0_5_FOOTBALL_INTELLIGENCE_MVP.md) |
| Evaluation design | [`A1_FOOTBALL_INTELLIGENCE_EVALUATION.md`](./A1_FOOTBALL_INTELLIGENCE_EVALUATION.md) |
| Projection design | [`A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md`](./A1_5_FOOTBALL_PROJECTION_FRAMEWORK.md) |
| Rule hierarchy | [`A1_8_FOOTBALL_RULE_HIERARCHY.md`](./A1_8_FOOTBALL_RULE_HIERARCHY.md) |
| Evidence catalog (status) | [`docs/50_EVIDENCE_CATALOG.md`](../../50_EVIDENCE_CATALOG.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 |
| Pipeline authority | [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md) |
| Backend authority | [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md) |
| Status | Design complete — **does not authorize coding** |
| Explicitly excluded | Production code; formulas; DTO/database schemas; implementation edits; Bible / Architecture Freeze edits; new packages; new Bible Engines; other doc edits |

---

## 0. Goal

Design the **canonical Evidence Reliability Framework** for Football Intelligence: how Evidence is classified by trust class, prioritized across sources, judged for completeness and freshness, and handled under conflict — so Feature / Rule / Projection never launder weak or contradictory inputs into false certainty.

```text
Provider (raw source captures)
  → Evidence (normalize + provenance + quality + conflicts + cutoff selection)
  → FeatureBundle
  → Rule Findings
  → Projection → Scenario → Confidence → Narrative → Report
```

**Hard constraints:**

- Design only. No production code. No implementation edits.
- No new Bible Engine. No new packages.
- Evidence owns eligibility and selection semantics; Analysis seals snapshots (doc 17 / 18).
- **Projection never reads raw Evidence** (A1.5) — only Features (+ Rule findings and structured completeness signals).
- Market signals are never Facts. AI output is never Fact.
- Honesty-first: missing / unknown / conflicted / stale states remain distinct (doc 17).
- No formulas. No DTO/database schemas.

### Non-goals

- Redesigning Provider adapters or adding new Provider SDKs.
- Feature/Rule/Projection formulas or schemas.
- Replacing [`docs/50_EVIDENCE_CATALOG.md`](../../50_EVIDENCE_CATALOG.md) delivery status tracking.
- Post-match outcome Evidence Evaluation metrics (A1) beyond reliability inputs.
- Authentication, public deployment, or commercialization.

---

## 1. Problem statement

Football Intelligence already depends on Evidence (MATCH_INFO, TEAM_FORM, STATISTICS, VENUE, INJURY/SUSPENSION, optional ODDS, …). Reliability issues still need a single hierarchy:

- Official fixture identity vs scraped rumor;
- Statistical windows vs market odds;
- Weather/referee when present vs inventing them;
- AI narrative text vs sealed Facts;
- Derived/composed surfaces (e.g. Availability Summary) vs sealed Evidence types.

Without a reliability framework, Feature extractors may treat absence as “full strength,” Rules may PASS on conflicted inputs, and Confidence may claim High when Evidence is stale or market-only.

A1.9 freezes **taxonomy, ownership, precedence, completeness, freshness, conflict, and expansion** for Evidence reliability — without changing package ownership.

---

## 2. Evidence taxonomy

Reliability taxonomy is a **trust class** over Evidence (and closely related surfaces). It is orthogonal to Evidence **type** (MATCH_INFO, ODDS, …) and to Feature names.

### 2.1 Trust classes

| Trust class | Meaning | Epistemic stance | May feed Feature / Rule / Projection? |
|---|---|---|---|
| **Official** | Fixture/competition identity and outcomes from designated official or primary football-data registry sources under Provider contract | **Fact** (when normalized and qualified) | Yes — primary football Facts |
| **Statistical** | Team/player performance windows, form, shots/stats family measurements from designated statistical sources | **Fact** (measurement), not a forecast | Yes — primary football Features |
| **Market** | Odds, lines, volumes, steam — time-dependent market state | **Market signal**, never Fact or outcome truth | Optional Features/Rules with `channel: none` (A1.8 P3); never sole Projection truth |
| **Environmental** | Weather, pitch, travel context, similar external conditions when Evidence exists | **Fact** only if directly supported by source; else absent | Yes when present; honest absence otherwise |
| **AI-generated** | LLM/narrative/provider AI drafts, paraphrases, suggested text | **Inference / untrusted candidate** | Never as Fact input to Feature/Rule/Projection; Narrative rewrite only over sealed spine |
| **Derived** | Composed or second-order surfaces built from sealed Evidence (or Feature outputs exposed as analysis inputs), not a raw Provider observation | **Derived**, not independent Fact | Feature/Rule may consume only when identity and provenance of parents are sealed; must not masquerade as Official |

### 2.2 Illustrative mapping (not an ingest mandate)

| Surface / type family | Typical trust class |
|---|---|
| MATCH_INFO, competition identity, verified FT result | Official |
| TEAM_FORM, STATISTICS, HEAD_TO_HEAD, PLAYER (basic) | Statistical (Official when source is registry-primary) |
| VENUE | Official / Environmental (venue identity vs weather — keep distinct) |
| INJURY, SUSPENSION | Official or Statistical per source designation — never invented |
| ODDS, Asian handicap, betting volume | Market |
| Weather, travel distance | Environmental |
| Narrative draft, LLM rewrite | AI-generated |
| Availability Summary (composed), FeatureBundle, ScenarioSet | Derived (not sealed Evidence types unless explicitly promoted) |

### 2.3 Class rules (binding)

1. A single Evidence item has **one primary trust class** at normalization time.  
2. Market class items cannot be relabeled Official by Feature code.  
3. AI-generated content cannot be written into Evidence as Fact.  
4. Derived surfaces must cite parent Evidence/Feature identities.  
5. Post-match **outcome** Evidence is Official (or verified Official lineage) and must never enter pre-match Feature/Rule/Projection (doc 17).

---

## 3. Evidence ownership

| Stage | Owns | Must not |
|---|---|---|
| **Provider** (football-data / scores / odds adapters) | Raw source captures at the edge; provider-specific mapping into intake shape | Normalize FAS Evidence; seal Analysis snapshots; compute Features/Rules/probabilities |
| **Evidence** (`@fas/evidence` + normalizer path) | Normalization, provenance, quality state, conflicts, freshness/validity, cutoff-qualified selection | Invent Facts; call Projection; treat AI drafts as Facts; silently omit conflicted items |
| **Feature** (`@fas/feature`) | Consume sealed/cutoff-qualified Evidence → FeatureBundle | Read Provider SDKs; evaluate Rules; compute 1X2 |
| **Rule** (`@fas/rule`) | Consume Features → findings | Read raw Evidence payloads or Provider JSON |
| **Projection** (`@fas/analysis`) | Consume FeatureBundle + Rule findings (+ structured completeness signals) → Probability Distribution | **Read raw Evidence**; invent missing Facts |
| **Scenario / Confidence** | Consume Projection (+ honesty/completeness signals) | Bypass Evidence reliability by inventing inputs |
| **Narrative / Report** | Explain sealed package; optional AI rewrite of spine only | Manufacture Evidence |

### 3.1 Ownership sentences (binding)

1. **Provider owns raw facts** (source captures) at the boundary.  
2. **Evidence owns normalization and provenance** — and eligibility/selection under cutoff.  
3. **Feature consumes Evidence** — never Provider SDK objects.  
4. **Rule consumes Feature** — never raw Evidence.  
5. **Projection never reads raw Evidence** — A1.5 remains authoritative.

### 3.2 Analysis vs Evidence (doc 18)

- Evidence returns an immutable selection result with provenance, quality, versions, conflicts, and checksums.  
- Analysis seals the snapshot/report lineage and cannot renormalize or silently filter Evidence.  
- Evidence cannot publish a complete analysis snapshot.

---

## 4. Evidence priority strategy

### 4.1 Source precedence (conceptual)

When multiple sources speak to the same subject/metric for the same MatchId under the same cutoff:

| Precedence band | Sources (illustrative) | Use |
|---|---|---|
| **P0 — Designated Official** | Pinned primary football registry / competition official feeds for identity and verified results | Win conflicts for Official subjects |
| **P1 — Designated Statistical** | Pinned statistical providers for form/stats windows | Win conflicts for Statistical subjects when Official silent |
| **P2 — Secondary corroboration** | Alternate providers used for fill / corroboration only | May fill gaps; cannot silently override P0/P1 without conflict record |
| **P3 — Market** | Odds / volume providers | Market class only; never override Official/Statistical Facts |
| **P4 — Environmental annex** | Weather/travel providers when enabled | Environmental class; honest absence if missing |
| **Untrusted / non-designated** | Unpinned scrapers, social rumor, anonymous dumps | Not production Facts; reject or quarantine |

Exact provider pins belong to Provider registry / readiness policy versions — not redesigned here.

### 4.2 Trusted vs untrusted

| Label | Meaning |
|---|---|
| **Trusted (designated)** | Provider id registered with declared capabilities and trust class; allowed into production Evidence selection under policy |
| **Untrusted** | Not designated; AI-generated; unknown provenance; failed integrity checks |
| **Conditional** | Trusted for some capabilities (e.g. odds) but not for Official fixture identity |

Untrusted inputs never become Feature football Facts. Conditional Market inputs remain Market class.

### 4.3 Conflict resolution (summary — detail in §7)

1. Record conflict explicitly — do not average Facts into a fake consensus.  
2. Apply trust-class + precedence band.  
3. If still unresolved → selection marks conflicted / blocked / acknowledgement-required (doc 17 readiness).  
4. Acknowledgement does **not** upgrade quality.  
5. Market never “resolves” Official disputes.

### 4.4 Provenance requirements (minimum conceptual fields)

Every normalized Evidence item used by Football Intelligence must carry:

| Provenance element | Purpose |
|---|---|
| Provider / source identity | Who supplied it |
| Source record / capture identity | Raw lineage |
| Trust class | Official / Statistical / Market / Environmental / AI-generated / Derived |
| Observed / event time meaning | Temporal semantics |
| Normalizer version | Reproducible normalization |
| Quality state | fresh/stale/conflicted/rejected/… as applicable |
| Checksum | Integrity |
| MatchId / subject identity | Anchoring |

Missing provenance ⇒ item is not Feature-eligible.

---

## 5. Evidence completeness

Completeness is a **structured reliability signal** (feeds Confidence / Projection limitations; A0.5 Evidence Completeness; A1.5 Projection inputs). It is not a Feature value inventing “0 = full squad.”

### 5.1 Completeness states

| State | Meaning | Feature / Rule consequence (product) |
|---|---|---|
| **Present** | Required Evidence type for the subject exists, qualified at cutoff, usable | Feature may emit; Rule may PASS/FAIL |
| **Partial** | Some fields/window elements exist but declared incomplete under policy | Feature may degrade; Rule often INAPPLICABLE or dampened via honesty/limitation |
| **Missing** | No Evidence of that type for the subject at cutoff | No Feature invention; Supporting Honesty/Limitation Rules may PASS (A1.8) |
| **Unknown** | System cannot assert presence or absence with integrity (e.g. provider capability not implemented, selection failed without empty-success) | Stronger than Missing for certainty bans — cannot claim “no absences” |
| **Stale** | Evidence exists but fails freshness/validity at cutoff | Not Feature-eligible as fresh Fact; readiness may block or acknowledge |

### 5.2 Completeness scopes

| Scope | Examples |
|---|---|
| **Match minimum** | MATCH_INFO + home/away TEAM_FORM + home/away STATISTICS (F.1 / A0.5 minimum) |
| **Honesty annex** | VENUE; INJURY/SUSPENSION (absence ⇒ UNKNOWN honesty, not full strength) |
| **Optional annex** | H2H, ODDS, Weather, Referee, Lineup |
| **Derived surfaces** | Availability Summary composed only from INJURY+SUSPENSION parents |

### 5.3 Honesty-first completeness rules

1. Missing Availability Evidence ⇒ AvailabilityPenalty Feature omitted + AVAILABILITY_*_UNKNOWN Rule path — **not** penalty 0 as full strength (A0 / A0.5).  
2. Missing VENUE ⇒ no VenueAdvantage Feature + VENUE_UNAVAILABLE limitation path.  
3. Partial STATISTICS ⇒ FeatureBundle may be `degraded`; Projection limitations must disclose.  
4. Unknown provider capability ≠ empty success.  
5. Completeness scores/signals remain structured inputs — this document does not define formulas.

---

## 6. Evidence freshness policy

### 6.1 Temporal identities

| Identity | Meaning |
|---|---|
| **observedAt / eventTime** (conceptual) | When the world was observed / when the football event applies — eligibility uses these at cutoff, **not** retrieval time (doc 17) |
| **collectedAt** | When FAS captured the source record |
| **cutoffAt** | Analysis readiness cutoff; standard v1 requires `cutoffAt < kickoffAt` |
| **Snapshot / selection identity** | Immutable Evidence selection checksum + versions sealed into analysis/report lineage |
| **Validity window** | Policy-declared period during which an item remains eligible |

### 6.2 Cutoff discipline

- Eligibility is evaluated at **cutoff**, never at “now” inside Feature/Rule/Projection.  
- Late-arriving pre-cutoff records do not mutate an existing sealed snapshot; they require new lineage (doc 17).  
- Provider generation after cutoff cannot introduce post-cutoff observations into a sealed pre-match package.

### 6.3 Snapshot identity and immutability

| Rule | Meaning |
|---|---|
| Selection immutability | Cutoff-qualified selection result is immutable for a sealed analysis/report |
| No silent refresh | Background re-fetch does not rewrite sealed Evidence identities inside a sealed report |
| Supersession | Corrections create new Evidence versions / new selection lineage — not in-place mutation |
| Derived immutability | FeatureBundle / Rule / Projection checksums bind to Evidence selection identity |

### 6.4 Stale vs fresh (product)

| Label | Meaning |
|---|---|
| **Fresh** | Within validity at cutoff under pinned freshness policy |
| **Stale** | Outside validity; distinct state — not silently treated as Missing |
| **Rejected** | Failed integrity/quality gates |
| **Superseded** | Replaced by a newer Evidence version in later lineage |

Stale Official identity may still matter for audit but is not a fresh Feature input unless policy explicitly allows with limitations.

---

## 7. Evidence conflict handling

### 7.1 Conflict types

| Type | Meaning |
|---|---|
| **Contradictory providers** | Two designated sources disagree on the same subject/metric at cutoff |
| **Duplicate providers** | Same logical observation ingested twice (same or equivalent payload) |
| **Cross-class contradiction** | Market signal disagrees with Official/Statistical Fact |
| **Unresolved conflict** | Precedence cannot choose a single Fact without violating honesty |
| **Temporal conflict** | Newer observation vs sealed snapshot (must not mutate seal) |

### 7.2 Handling strategy

| Situation | Strategy |
|---|---|
| **Duplicates** | Dedupe by provenance/source identity policy; keep one sealed item; record duplicate suppression in diagnostics — do not double-count Features |
| **Contradictory Official/Statistical** | Emit conflict record; prefer higher precedence band; if material → readiness block or acknowledgement; Feature must not average values |
| **Market vs Football Fact** | No Fact override; Market may exist in parallel as Market class; Projection/Confidence may record contradiction limitation (A0.5 / A1.5) |
| **Unresolved** | Mark conflicted; block Feature emission for that subject **or** emit degraded path with explicit limitation — never quiet pick |
| **AI vs Fact** | AI never wins; AI text discarded as Evidence Fact |

### 7.3 Honesty-first policy (binding)

1. Prefer **explicit uncertainty** over a polished wrong Fact.  
2. Prefer **block / Cautious / degraded** over invented consensus.  
3. Prefer **retaining conflict records** for Review/Evaluation over deleting inconvenient sources.  
4. Supporting Honesty Rules (A1.8) must remain available when Features cannot be honestly derived.  
5. Acknowledgement of conflict does not clear the conflict flag for Confidence “Very High.”

### 7.4 Downstream effects

| Consumer | On material Evidence conflict |
|---|---|
| Feature | Omit or degrade affected Features; never silent merge |
| Rule | INAPPLICABLE / Honesty PASS / Limitation — not fake FAIL on missing merged Fact |
| Projection | Limitations + possible block/insufficient per policy |
| Confidence | Completeness/agreement penalties; band caps |
| Narrative | Must disclose conflict/limitation — no orphan certainty claims |

---

## 8. Future expansion

New Evidence families inherit trust class + precedence + completeness + freshness + conflict rules. They enter Feature → Rule → Projection only through sealed Evidence (A1.5 / A1.8).

| Expansion | Trust class | Precedence stance | Completeness if absent | Notes |
|---|---|---|---|---|
| **Odds** | Market | P3 Market; never overrides Official | Optional annex; Missing ≠ football lean | Channel-none Rules only until policy says otherwise |
| **Weather** | Environmental | P4 annex | Missing → no Weather Feature; Limitation honesty | Do not invent clear skies |
| **Referee** | Official or Statistical (source-dependent) | Below fixture Official for identity; own subject conflicts | Missing → no Referee Features/Rules | Wait for Evidence readiness |
| **Travel** | Environmental / Statistical | Annex | Missing → omit Feature | |
| **xG** | Statistical | Under Statistical precedence for performance metrics | Missing/Partial → degrade Attack/Defense basis; do not fake xG | Not a Projection-owned bypass |
| **Expected Lineup** | Official/Statistical when source supports; else absent | Must not invent Expected Lineup | Unknown/Missing → Honesty Rules; no full-strength claim | Distinct from confirmed lineup if both exist |
| **Market Intelligence** (volume, steam, openers) | Market | P3; untrusted if undesignated | Optional | Never Fact; Evaluation may study as signal later |

### 8.1 Expansion checklist

1. Provider capability designated and trust-classed.  
2. Normalizer emits provenance + quality + temporal fields.  
3. Completeness state defined for present/partial/missing/unknown/stale.  
4. Conflict subjects declared (what “same subject” means).  
5. Feature honest-absence behavior defined.  
6. Rule hierarchy tier/channel assigned (A1.8).  
7. Projection policy version admits the Feature — Scenario unchanged (A1.5).  
8. No AI-generated Fact path.

---

## 9. DDD ownership

### 9.1 Package map (unchanged)

| Concern | Package / module home |
|---|---|
| Football-data / odds / scores Provider adapters | `@fas/provider-football`, related provider packages (edge only) |
| Evidence domain, registry, quality, selection | `@fas/evidence` |
| Normalization | `@fas/evidence-normalizer` (existing path) |
| Feature derivation | `@fas/feature` |
| Rule evaluation | `@fas/rule` → `@fas/rule-engine` |
| Projection / Scenario / Confidence | `@fas/analysis` |
| Narrative / Report | `@fas/report` (+ `@fas/ai-provider` for untrusted rewrite only) |
| Persistence | `@fas/database` |
| Transport | `apps/api` |

### 9.2 Forbidden creations

```text
packages/evidence-reliability-engine/
packages/trust-engine/
packages/evidence-priority-engine/
```

Reliability is a **policy/catalogue concern inside Evidence (+ readiness policy)**, not an eighth Bible Engine.

### 9.3 Alignment with docs 17 / 18

| Authority | A1.9 stance |
|---|---|
| Evidence selects; Analysis seals | Affirmed |
| Cutoff uses observed/validity time, not retrieval time | Affirmed |
| Missing/stale/conflicted/rejected/superseded are distinct | Affirmed |
| Critical conflict/stale may block readiness | Affirmed |
| Football Providers ≠ AI Gateway | Affirmed |
| AI output untrusted | Affirmed (AI-generated class) |
| Projection not Statistics population metrics | Affirmed; reliability ≠ calibration |

### 9.4 Dependency direction

```text
Provider adapters
  → Evidence intake / normalize / conflict / select
      → Feature
          → Rule
              → Projection (no raw Evidence)
                  → Scenario / Confidence
                      → Report / Narrative
```

---

## 10. Relationship to prior sprints

| Document | Relationship |
|---|---|
| **A0** | Intelligence starts from existing Evidence; A1.9 defines reliability so new Facts do not silently become Features |
| **A0.5** | Completeness + Availability/Venue honesty become formal completeness/freshness/conflict states |
| **A1** | Evaluation/history can slice by Evidence selection identity, trust class, and conflict acknowledgements |
| **A1.5** | Projection consumes Features/completeness signals only — reinforced here |
| **A1.8** | Honesty/Gate/Market Signal Rules are the Rule-side mirror of Evidence reliability states |

### 10.1 End-to-end chain

```text
Provider raw captures
  → Evidence (taxonomy + precedence + completeness + freshness + conflicts)
  → Features (honest absence)
  → Rules (A1.8 hierarchy)
  → Projection (A1.5)
  → Scenario / Confidence / Narrative / Report
  → A1 post-match Evaluation (does not rewrite sealed Evidence)
```

---

## 11. Acceptance criteria (for a future Coding gate)

When a coding sprint implements this design (separate authorization), the system must:

1. Label production Evidence with a primary trust class (Official / Statistical / Market / Environmental / AI-generated / Derived).  
2. Enforce Provider → Evidence → Feature → Rule → Projection ownership; Projection must not read raw Evidence.  
3. Apply source precedence and record conflicts instead of silent merges.  
4. Expose completeness states: present / partial / missing / unknown / stale for intelligence-critical scopes.  
5. Enforce cutoff freshness and sealed selection immutability.  
6. Keep Market and AI-generated classes from overriding Official/Statistical Facts.  
7. Introduce no new package and no new Bible Engine.

### Design-sprint deliverable checklist (this document)

| Deliverable | Status |
|---|---|
| Evidence taxonomy | **Designed** |
| Evidence ownership | **Designed** |
| Evidence priority strategy | **Designed** |
| Evidence completeness | **Designed** |
| Evidence freshness policy | **Designed** |
| Evidence conflict handling | **Designed** |
| Future expansion | **Designed** |
| DDD ownership | **Designed** |
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
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)

---

*End of A1.9 Football Evidence Reliability Framework design. Design only — no implementation.*
