# A0.5 — Football Intelligence MVP (Implementation Planning)

| Field | Value |
|---|---|
| Sprint id | **A0.5** |
| Document type | Implementation Planning (design only) |
| Parent planning | [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](./A0_FOOTBALL_INTELLIGENCE_PLANNING.md) |
| Roadmap citation | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Governing | Bible; Architecture Freeze **v0.2**; docs 17 / 18 / 03 |
| Facts baseline | [`docs/sprints/F1.1/`](../F1.1/) |
| Status | Planning complete — **does not authorize coding** |
| Explicitly excluded | Production code; DTO/Entity/Repository designs; Provider work; Architecture / Bible edits; edits to other docs |

---

## 0. Goal

Make FAS capable of analysing **one football match** end-to-end with Football Intelligence:

```text
Existing Match
  → existing Evidence
  → Feature → Rule → Scenario → Confidence → Narrative
  → Match Analysis Report
```

**Acceptance fixture (product):** IFK Mariehamn vs FC Lahti (Veikkausliiga; within FAS football league set).

**Hard constraints:**

- Start from an **existing Match** and **existing Evidence** (import path already exists).
- Not another Provider / Entity / Repository / DTO design sprint.
- Deterministic reasoning must work **without LLM**.
- LLM (if present later) may **only rewrite** structured Narrative — never invent Facts or decide winners/scores/probabilities.
- No new Bible Engine. Modules map to A0 ownership (`@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report`).

### Non-goals

- Completing remaining F1.1 Facts (Lineup / Referee) — consume what Evidence already has; degrade honestly when missing.
- xG / advanced match stats (F1.2 / F1.3).
- Knowledge / Case / Review Engines.
- Market-as-truth scenarios.
- Expected Lineup.

---

## 1. Complete execution pipeline

```text
Match
  ↓
Evidence
  ↓
Workspace
  ↓
Feature
  ↓
Rule
  ↓
Scenario
  ↓
Confidence
  ↓
Narrative
  ↓
Report
```

| Stage | What it does in MVP | Owner |
|---|---|---|
| **Match** | Existing match identity already imported / resolvable (e.g. `football:{fixtureId}` for Mariehamn–Lahti). | Match + Provider import path (unchanged) |
| **Evidence** | Cutoff-qualified Facts already in store: MATCH_INFO, TEAM_FORM×2, STATISTICS×2, optional H2H, ODDS, VENUE, INJURY, SUSPENSION, PLAYER. | Evidence |
| **Workspace** | Human-readable Fact surfaces (existing F1.1 sections). MVP analysis may run without UI open; Workspace remains review surface for Facts. | `apps/web` |
| **Feature** | Derive ≤10 MVP Features from Evidence (honest absence). | `@fas/feature` |
| **Rule** | Evaluate ~15–25 MVP Rules on Features only → findings. | `@fas/rule` |
| **Scenario** | Emit exactly three scenarios from projection policy + Rule channels. | `@fas/analysis` |
| **Confidence** | Emit Prediction Confidence, Upset Risk, Evidence Completeness, Rule Agreement. | `@fas/analysis` |
| **Narrative** | Build structured WHY sections mapped to Rule findings (local template; no LLM required). | `@fas/report` |
| **Report** | Seal complete Match Analysis Report for API / UI. | `@fas/report` + Analysis orchestration |

Orchestration remains Analysis application use-case style (doc 17 `deterministic_report` profile specialization). Transport is one API command (§7).

---

## 2. Feature MVP (maximum 10)

Exactly **10** first Features. No dozens.

| # | Feature | Input Evidence (when present) | Output (conceptual) | Owner |
|---|---|---|---|---|
| 1 | **HomeAdvantage** | MATCH_INFO (home side) | Bounded home edge score | `@fas/feature` |
| 2 | **VenueAdvantage** | VENUE (+ MATCH_INFO) | Venue-backed home context score; **omitted/unavailable** if no VENUE | `@fas/feature` |
| 3 | **AvailabilityPenaltyHome** | INJURY / SUSPENSION (home) | Penalty magnitude; **unavailable** if no absence Evidence (not “0 = full strength”) | `@fas/feature` |
| 4 | **AvailabilityPenaltyAway** | INJURY / SUSPENSION (away) | Same for away | `@fas/feature` |
| 5 | **RecentFormHome** | TEAM_FORM home | Window form score | `@fas/feature` |
| 6 | **RecentFormAway** | TEAM_FORM away | Window form score | `@fas/feature` |
| 7 | **AttackStrengthHome** | STATISTICS (+ form support) home | Attack rating | `@fas/feature` |
| 8 | **AttackStrengthAway** | STATISTICS (+ form support) away | Attack rating | `@fas/feature` |
| 9 | **DefenseStabilityHome** | STATISTICS (+ form GF/GA) home | Defense stability rating | `@fas/feature` |
| 10 | **Momentum** | TEAM_FORM both (trajectory) | Signed momentum lean (home+/away+) | `@fas/feature` |

### Intentionally deferred (not in MVP 10)

Motivation, Fitness/Fatigue as separate Features, MarketConfidence as Feature (market may remain Rule channel-none signal later), Player-level Features.

### Feature contracts (product, not DTO)

- **Input:** Evidence selection for one MatchId.  
- **Output:** FeatureBundle (version id + checksum + degradation notes).  
- **Honest absence:** Missing VENUE / INJURY does not invent neutral “full strength.” Bundle may be `degraded`; Projection policy decides block vs continue (MVP: continue with limitations if F.1 minimum MATCH_INFO+FORM+STATS present).

---

## 3. Rule MVP (~15–25)

Enough Rules for a **first working lean** — not a full Rule Library.

### 3.1 Classification and catalogue (22 rules)

| Class | Rule id (conceptual) | Intent | Priority |
|---|---|---|---|
| **Presence** | `MATCH_TEAMS_PRESENT` | Both sides identifiable | P0 (gate) |
| **Presence** | `KICKOFF_PRESENT` | Kickoff known | P0 (gate) |
| **Form** | `FORM_HOME_SUPERIOR` | RecentFormHome ≫ Away | P1 |
| **Form** | `FORM_AWAY_SUPERIOR` | RecentFormAway ≫ Home | P1 |
| **Form** | `FORM_NEAR_PARITY` | Forms close → dampen extreme lean | P2 |
| **Attack** | `ATTACK_HOME_EDGE` | AttackStrengthHome edge | P1 |
| **Attack** | `ATTACK_AWAY_EDGE` | AttackStrengthAway edge | P1 |
| **Defense** | `DEFENSE_HOME_STABLE` | DefenseStabilityHome strong | P1 |
| **Defense** | `DEFENSE_AWAY_STABLE` | DefenseStabilityAway strong | P1 |
| **Defense** | `DEFENSE_HOME_FRAGILE` | Home defense weak vs Away attack | P1 |
| **Defense** | `DEFENSE_AWAY_FRAGILE` | Away defense weak vs Home attack | P1 |
| **Momentum** | `MOMENTUM_HOME` | Momentum favors home | P1 |
| **Momentum** | `MOMENTUM_AWAY` | Momentum favors away | P1 |
| **Home / Venue** | `HOME_ADVANTAGE_MATERIAL` | HomeAdvantage above threshold | P1 |
| **Home / Venue** | `VENUE_SUPPORTS_HOME` | VenueAdvantage available and supportive | P2 |
| **Home / Venue** | `VENUE_UNAVAILABLE` | No VENUE Evidence → limitation finding (INAPPLICABLE/info) | P2 |
| **Availability** | `AVAILABILITY_HOME_HIT` | AvailabilityPenaltyHome material | P1 |
| **Availability** | `AVAILABILITY_AWAY_HIT` | AvailabilityPenaltyAway material | P1 |
| **Availability** | `AVAILABILITY_HOME_UNKNOWN` | Penalty feature unavailable — do not claim full squad | P0 (honesty) |
| **Availability** | `AVAILABILITY_AWAY_UNKNOWN` | Same away | P0 (honesty) |
| **Consistency** | `SIGNALS_ALIGNED_HOME` | Form+Attack+Momentum agree home | P2 |
| **Consistency** | `SIGNALS_ALIGNED_AWAY` | Form+Attack+Momentum agree away | P2 |

Count: **22** (within 15–25).

Reuse / evolve today’s slice-1 names where they already exist (`HOME_ATTACK_EDGE`, `MOMENTUM_*`, …); MVP may rename for clarity in product language while preserving evaluator ownership in `@fas/rule`.

### 3.2 Priority

| Priority | Meaning |
|---|---|
| **P0** | Honesty / presence gates — block or force Cautious if violated |
| **P1** | Primary football lean drivers (channels into Projection) |
| **P2** | Amplifiers / dampeners / venue nuance |

### 3.3 Conflict

- Opposing P1 findings (e.g. FORM_HOME_SUPERIOR vs AVAILABILITY_HOME_HIT) **both remain** — Projection applies net channel; Confidence raises Upset Risk / lowers Confidence.
- Market Rules (if added later) stay `channel: none` and never override football Findings as Facts.
- `*_UNKNOWN` availability findings never convert into “no absences.”

### 3.4 Extensibility

- New Rules append with new versioned rule-set id; MVP freezes set `rule-set.mvp.a05`.
- Lineup / Referee Rules wait for Evidence (post–F1.1E/F).
- No AI-authored Rule conditions.

---

## 4. Scenario MVP (exactly three)

Projection policy produces a distribution; MVP **always surfaces exactly three** product scenarios:

| Slot | Name | Includes |
|---|---|---|
| 1 | **Most Likely** | Winner (Home / Draw / Away), Score (e.g. 2–1), Goals (homeGoals, awayGoals), Probability |
| 2 | **Second Likely** | Same fields |
| 3 | **Upset** | Contrarian world vs Most Likely lean (opposite side win, or draw if lean is a side win), with Score / Goals / Probability |

### Selection rules (product)

1. Rank scoreline (or 1X2-collapsed worlds) by probability.  
2. Most Likely = top world.  
3. Second Likely = next distinct world (different winner or score).  
4. Upset = highest-probability world that **contradicts** Most Likely winner (if Most Likely is Draw, Upset = higher of Home/Away win worlds).  
5. Probabilities are deterministic projection outputs; residual mass disclosed in Report appendix if top-3 do not sum to ~100%.

### Inputs / outputs

- **Input:** FeatureBundle + RuleEvaluationEnvelope + pinned projection policy.  
- **Output:** ScenarioSet `{ mostLikely, secondLikely, upset }` + checksum.  
- **Owner:** `@fas/analysis`.

---

## 5. Confidence MVP

### 5.1 Signals

| Signal | Meaning |
|---|---|
| **Prediction Confidence** | 0–100 + band (Low / Medium / High / Very High) |
| **Upset Risk** | 0–100% — chance the Upset world is live relative to Most Likely concentration |
| **Evidence Completeness** | 0–100 — share of MVP-critical Evidence types present (FORM, STATS, VENUE, AVAILABILITY known vs unknown) |
| **Rule Agreement** | 0–100 — net alignment of P1 channels (home vs away) minus contradiction penalty |

### 5.2 Scoring strategy (conceptual)

```text
PredictionConfidence ≈
  0.35 * EvidenceCompleteness
+ 0.35 * RuleAgreement
+ 0.30 * ScenarioConcentration   # Most Likely probability mass
− ContradictionPenalty           # opposing P1 PASSes / market conflict if any
```

```text
UpsetRisk ≈
  f( Upset.probability , 1 - ScenarioConcentration , AvailabilityUnknown flags )
```

- Availability UNKNOWN findings **cap** Confidence (cannot claim Very High).  
- Missing VENUE lowers Completeness mildly; missing FORM/STATS blocks analysis (existing F.1 minimum).  
- No LLM in scoring.  
- Future A1/A2 calibrate bands — MVP uses pinned heuristic policy `confidence.mvp.a05`.

**Owner:** `@fas/analysis`.

---

## 6. Narrative MVP

### 6.1 Report sections

| Section | Content | Must map to |
|---|---|---|
| **Overview** | Match identity + one-sentence lean | Most Likely + Prediction Confidence |
| **Key Factors** | 3–5 bullets | PASS P1 Rules (cite rule id + supporting Feature names) |
| **Strength Comparison** | Attack / Defense / Form home vs away | AttackStrength*, DefenseStability*, RecentForm* Features + related Rules |
| **Risk Analysis** | What can go wrong | Upset scenario + Availability/Venue UNKNOWN or HIT Rules + Upset Risk |
| **Prediction** | Winner lean in plain language | Most Likely.winner + RuleAgreement |
| **Recommended Score** | Primary scoreline | Most Likely.score / goals |

Optional appendix: Second Likely, full Rule table, Evidence completeness notes.

### 6.2 Paragraph → Rule mapping (hard rule)

Every explanatory claim in Narrative must cite at least one of:

- a Rule finding id, or  
- a Feature name present in the sealed FeatureBundle, or  
- an Evidence id already in the snapshot.

**LLM must never invent Facts.** MVP ships a **local structured Narrative builder** (templates). Optional LLM rewrite is post-MVP and may only paraphrase the sealed spine.

**Owner:** `@fas/report` (planner) ; optional later `@fas/prompt` + `@fas/ai-provider` for rewrite only.

---

## 7. API (one endpoint only)

Design only — no code, no DTO schemas.

```text
POST /api/v1/match-analysis
```

| | |
|---|---|
| **Input** | `MatchId` (existing match) |
| **Behavior** | Ensure Evidence present (re-use import if already required by current analyze path) → Feature → Rule → Scenario → Confidence → Narrative → seal Report |
| **Output** | Complete Match Analysis Report (Overview, Key Factors, Strength Comparison, Risk Analysis, Prediction, Recommended Score, Scenario trio, Confidence block, Rule/Feature appendix as needed) |
| **Errors** | Explicit: match not found; evidence insufficient; feature/rule/projection blocked — never empty success |
| **LLM** | Not required for success |

Note: Existing `POST /api/analyze/match/:matchId` may later alias or migrate; MVP design target is this single v1 analysis command. No additional endpoints in A0.5 scope.

---

## 8. Folder design (folders only)

Recommend ownership homes. **Folders only — no new file list.**

```text
packages/feature/
  src/
    extraction/
    policy/

packages/rule/
  src/
    evaluation/
    library/
      mvp/

packages/analysis/
  src/
    projection/
    scenario/
    confidence/
    application/

packages/report/
  src/
    narrative/
      mvp/
    builder/

apps/api/
  src/
    (transport composition for match-analysis only)

apps/web/
  src/
    (presentation of sealed analysis report — optional for MVP API acceptance)
```

Do **not** add:

```text
packages/feature-engine/
packages/scenario-engine/
packages/confidence-engine/
packages/narrative-engine/
```

---

## 9. Acceptance criteria

After A0.5 MVP is implemented (future Coding gate), the project must:

1. Analyse **IFK Mariehamn vs FC Lahti** (or the FAS MatchId for that fixture) via `POST /api/v1/match-analysis`.  
2. Consume **existing Evidence** for that match (import/football path already available for Veikkausliiga).  
3. Produce sealed Report including: FeatureBundle summary, Rule findings, **Most Likely / Second Likely / Upset**, Confidence + Upset Risk + Completeness + Agreement, Narrative sections (§6).  
4. Run **without any LLM reasoning** (local Narrative only).  
5. Never invent Availability / Venue Facts; UNKNOWN findings appear when Evidence absent.  
6. Leave Feature/Rule/Projection ownership inside existing packages; no new Bible Engine; no new Provider.  
7. Provide executable validation evidence (tests or recorded demo) for the Mariehamn–Lahti path.

### Demo checklist

| Check | Pass |
|---|---|
| Match resolves | Yes |
| Evidence minimum present | MATCH_INFO + FORM + STATS |
| Features ≤10 derived | Yes |
| Rules evaluate | ≥1 P1 PASS or explicit Cautious |
| Three scenarios | Most Likely / Second Likely / Upset |
| Confidence block | All four signals |
| Narrative cites Rules | No orphan claims |
| LLM off | Success |

---

## 10. Deliverables of this planning sprint

| Deliverable | Status |
|---|---|
| This document `A0_5_FOOTBALL_INTELLIGENCE_MVP.md` | **Done (planning)** |
| Production code | **Out of scope** |
| Architecture / Bible / other doc edits | **Out of scope** |

Coding requires a separate authorization gate after review of this MVP plan.

---

## 11. References

- [`A0_FOOTBALL_INTELLIGENCE_PLANNING.md`](./A0_FOOTBALL_INTELLIGENCE_PLANNING.md)
- [`docs/00_PROJECT_BIBLE.md`](../../00_PROJECT_BIBLE.md)
- [`docs/17_ANALYSIS_PIPELINE.md`](../../17_ANALYSIS_PIPELINE.md)
- [`docs/18_BACKEND_ARCHITECTURE.md`](../../18_BACKEND_ARCHITECTURE.md)
- [`docs/20_IMPLEMENTATION_PLAN.md`](../../20_IMPLEMENTATION_PLAN.md)
- [`docs/21_ARCHITECTURE_SIGNOFF.md`](../../21_ARCHITECTURE_SIGNOFF.md)
- [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md)
- [`docs/sprints/F1.1/F1.1_REVIEW.md`](../F1.1/F1.1_REVIEW.md)
- [`docs/50_EVIDENCE_CATALOG.md`](../../50_EVIDENCE_CATALOG.md)

---

*End of A0.5 Football Intelligence MVP Planning. Design only — no implementation.*
