# Football Intelligence v2 — Domain Architecture

| Field | Value |
|---|---|
| Sprint | **DA** Football Intelligence v2 Domain Architecture |
| Date | 2026-07-23 |
| Document type | Architecture design (domain model only) |
| Authority (read-only) | `AGENTS.md` · `docs/PROJECT_STATE.md` · Architecture Freeze **v0.3** · `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md` · `docs/reviews/FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md` · A1 / A1.5 reports · B2 Coding Law · D0 Expansion Roadmap · B0 Mapping |
| Scope | Define hierarchical Football Intelligence domains for FI v2; organise future capabilities into coherent layers |
| Explicit exclusions | Production code · pipeline redesign · Prediction / Evaluation / Calibration / Freeze edits · new Engines · new packages |

---

## 1. Executive Summary

Football Intelligence MVP is complete. Provider boundaries are known (P0). The next phase maximises **prediction accuracy** by expanding Intelligence **inside** the frozen pipeline — not by inventing parallel systems.

This document defines the **long-term Football Intelligence v2 Domain Architecture**: four hierarchical layers that organise every future capability as coherent domains rather than disconnected features.

```text
L1 Club Intelligence
  → L2 Squad Intelligence
    → L3 Player Intelligence
      → L4 Match Intelligence  (includes completed MVP domains + future match-local expansions)
```

**Frozen runtime pipeline (unchanged):**

```text
Provider → Evidence → Feature → Rule → Confidence → Projection
  → Narrative → Report → Evaluation → Evaluation History
```

| Verdict | Statement |
|---|---|
| Architecture posture | **Expand domains; do not redesign pipeline** |
| Highest business-value start | **L1 Club Strength** (derived from existing Facts) |
| Hard deferrals | Expected Lineup · branded SPI · Transfermarkt-class finance · PSxG / shot maps (new provider) |
| Parallel trust track | **A2 Calibration** consumes Evaluation History; never auto-activates; never mutates sealed Prediction |
| Coding authorisation | This document alone does **not** authorize code; Wave coding sprints cite this + P0 + B2 |

---

## 2. Football Intelligence Domain Model

### 2.1 Design principles

| Principle | Meaning for FI v2 |
|---|---|
| **Domain ≠ Engine** | Domains are product/capability groupings. They live in existing packages (`@fas/evidence`, `@fas/feature`, `@fas/rule`, `@fas/analysis`, `@fas/report`). They are **not** new Engines. |
| **Hierarchy is epistemic, not a second pipeline** | L1–L3 describe persistent team/player knowledge; L4 binds that knowledge to a specific match. All still enter the same Evidence→…→Projection path. |
| **Evidence First** | No Feature without sealed Evidence (or honest absence). |
| **No Fabrication** | Missing Facts stay absent; derived Features must declare provenance as derived. |
| **Market is supporting** | Market domain remains findings-only (`channel: none`); never controls football softmax / Prediction. |
| **Evaluation independence** | Domains improve pre-match Intelligence; Evaluation / History measure sealed outcomes and must not be rewritten to flatter new Features. |

### 2.2 Domain layer definitions

| Layer | Name | Scope | Time horizon | Typical consumers |
|---|---|---|---|---|
| **L1** | Club Intelligence | Club / competition strength, history, manager, financial posture | Season / multi-season | Strength Features, league normalisation |
| **L2** | Squad Intelligence | Roster structure, depth, age/position balance, rotation pressure, injury depth | Season / weeks | Depth & rotation Features; availability aggregation |
| **L3** | Player Intelligence | Individual availability, form, quality, workload, GK | Match-week / rolling | Impact Features; key-absence Rules |
| **L4** | Match Intelligence | Fixture-local Facts and signals (venue, stats, xG, context, market, confirmed lineup, H2H) | Single match | Existing MVP + match-local expansions |

### 2.3 Relationship model

```text
                    ┌─────────────────────────┐
                    │  L1 Club Intelligence   │
                    │  strength · league ·    │
                    │  manager · history      │
                    └───────────┬─────────────┘
                                │ constrains
                    ┌───────────▼─────────────┐
                    │  L2 Squad Intelligence  │
                    │  depth · balance ·      │
                    │  rotation · injury pool │
                    └───────────┬─────────────┘
                                │ composed of
                    ┌───────────▼─────────────┐
                    │ L3 Player Intelligence  │
                    │ availability · impact · │
                    │ form · quality · GK     │
                    └───────────┬─────────────┘
                                │ instantiated in
                    ┌───────────▼─────────────┐
                    │ L4 Match Intelligence   │
                    │ venue · stats · xG ·    │
                    │ context · market · XI   │
                    └───────────┬─────────────┘
                                │
         Evidence → Feature → Rule → Confidence → Projection → Report
                                │
                     Evaluation → Evaluation History
```

L1–L3 Features may be computed from Evidence collected at match import time (standings, squads, injuries, coach, player season stats). They do **not** require a separate Knowledge Engine for FI v2.

### 2.4 Status vocabulary

| Status | Meaning |
|---|---|
| **Completed** | Evidence→…→Report path delivered for MVP scope |
| **Needs enhancement** | Partial path exists; FI v2 deepens Features/Rules/Confidence/Projection consume |
| **Future expansion** | Domain planned; blocked on provider honesty, licensing, or lower-priority ROI |
| **Deferred / Not recommended** | P0 forbids or low honesty under current providers |

---

## 3. Layer Architecture

### 3.1 L1 — Club Intelligence

**Purpose:** Represent durable club- and competition-level strength so Projection λ / 1X2 reflect relative quality, not only short form noise.

| Capability | Purpose | Evidence | Features (indicative) | Rules (indicative) | Confidence impact | Projection impact | Provider dependency | Expected prediction impact | Complexity | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| Club strength | Core relative quality | `TEAM_FORM`, `STATISTICS`, `EXPECTED_GOALS`, standings-backed Facts (via MATCH/standings provenance) | `clubStrengthHome/Away`, deepen `attackRating*` / `defenseRating*` | `CLUB_STRENGTH_HOME/AWAY_EDGE` | Completeness of strength inputs | **Direct** λ adjust via football channels | API-Football (existing) | **Critical** | M | **Critical** |
| League strength | Cross-competition normalisation | Competition meta + population tables | `leagueStrengthIndex` | Optional scaling Rules / Projection scaling Factors | Cap when league sample thin | Medium (cross-league only) | Existing + Evaluation populations | High (multi-league) | L | **High** |
| Historical performance | Longer-horizon club quality | Historical fixtures / H2H / standings history | `clubHistoricalIndex`, self-ELO Feature (derived) | `HISTORICAL_EDGE` | Sample-size caps | Medium–High | API-Football history (plan depth) | High | L | **High** |
| Manager | Regime / identity | New/extended Evidence from `/coachs` (+ lineup coach) | `managerTenureDays`, `managerPresent` | `MANAGER_REGIME_*` (findings or weak channel) | Limitation if unknown | Low–Medium | API-Football `/coachs` (unwired) | Medium | S–M | **High** |
| Financial strength | Money as proxy for quality | Market-value Evidence | `squadMarketValueIndex` | Findings-only if ever allowed | High misuse risk | Unclear | **New provider + legal** | Low / unclear | XL | **Low** (deferred) |
| Squad investment | Transfer / wage posture | Transfer Evidence | `netSpendIndex` | Findings-only | Same | Low | Transfers endpoint / new provider | Low | L | **Low** (deferred) |

**L1 implementation posture:** Start with **Club strength** + thin **Historical** (including optional self-ELO as **derived Feature**, never labelled vendor Fact). Defer finance/investment until gated.

---

### 3.2 L2 — Squad Intelligence

**Purpose:** Capture roster structure and resilience — whether the club can absorb absences and rotate without collapse.

| Capability | Purpose | Evidence | Features | Rules | Confidence | Projection | Provider | Impact | Complexity | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| Squad depth | Quality beyond XI | `PLAYER` (+ future player stats), `LINEUP`, absences | `squadDepthHome/Away` | `SQUAD_DEPTH_EDGE` | Cap when squad thin | Medium | Squads + player stats | Medium | M | **High** |
| Age profile | Aging / peak squad shape | `PLAYER` ages when present | `squadAgeMean`, `squadAgeSkew` | Optional findings | Low | Low | Squads | Low | S | **Medium** |
| Position balance | Structural holes | Positions on squad/lineup | `positionBalanceScore` | `POSITION_IMBALANCE_*` | Medium | Medium | Squads / LINEUP | Medium | M | **Medium** |
| Rotation | Minutes load / congestion interaction | Match Context + player minutes | `rotationPressure*` (exists thin), deepen | Rotation / fatigue Rules | Medium | Medium | Context + `/fixtures/players` | Medium | M–L | **High** |
| Injury depth | Bench quality under absences | `INJURY`/`SUSPENSION` + depth | `injuryDepthPenalty*` | Extends availability Rules | High when many absences | Medium–High | Injuries (existing) | High | M | **High** |
| Transfer activity | Recent churn instability | Transfers Evidence | `transferChurnIndex` | Findings | Low | Low | `/transfers` or new provider | Low | M | **Low** |

**L2 posture:** Prefer depth + injury-depth + rotation after L1 Club Strength and L3 availability weights. Avoid inventing “depth ratings” without player measurement Facts.

---

### 3.3 L3 — Player Intelligence

**Purpose:** Attribute match outcomes to individual availability, form, and quality — especially key absences and GK.

| Capability | Purpose | Evidence | Features | Rules | Confidence | Projection | Provider | Impact | Complexity | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| Player availability | Who cannot play | `INJURY`, `SUSPENSION` | `availabilityPenalty*` (exists), position-weighted variants | Availability Rules | Caps when unknown | Medium | `/injuries` (Active) | High | S–M | **Critical** |
| Player impact | Key contributor strength | Player season/match stats Evidence | `keyAttackerImpact*`, `keyDefenderImpact*` | `KEY_PLAYER_ABSENCE_*` | Completeness of player stats | Medium–High | `/players`, `/fixtures/players` (unwired) | High | M–L | **Critical** |
| Player form | Short-run individual form | Sequenced match player stats | `playerFormIndex*` | Form edge Rules | Sample caps | Medium | Player match stats | Medium | M | **High** |
| Player quality | Durable individual level | Season aggregates | `playerQualityIndex*` | Quality edge | Coverage caps | Medium | `/players` | Medium | M | **High** |
| Player workload | Fatigue / overuse | Minutes Evidence | `playerWorkload*` | Workload / rotation Rules | Medium | Medium | `/fixtures/players` history | Medium | L | **Medium** |
| Goalkeeper intelligence | Shot-stopping / clean-sheet drivers | GK stats / saves | `gkQuality*`, team `saves` advanced | `GK_QUALITY_EDGE` | Medium | Medium | Player stats + team advanced | Medium | M | **High** |

**L3 posture:** MVP = position-weighted availability + capped top contributors. **Never** invent player xG from team xG. Expected starting probability remains **out of scope** without a new Fact source (P0).

---

### 3.4 L4 — Match Intelligence

**Purpose:** Bind L1–L3 knowledge to a specific fixture; host all match-local Facts and supporting market signals.

#### 3.4.1 Review of completed MVP domains

| Domain | Status | What exists | Needs enhancement | Future expansion |
|---|---|---|---|---|
| Venue | **Completed** (identity) | `VENUE` Evidence; `venueAdvantage` / home advantage Features | Home/away form coupling; travel distance only if geo Facts appear | Pitch/weather interaction (`WEATHER`) |
| Statistics | **Completed** + advanced | Team + advanced STATISTICS; Feature/Rule consume (F1.2) | Season vs fixture scope clarity; coverage limitations | Set-piece / PPDA when measured |
| Expected Goals | **Completed** (Evidence + consume) | `EXPECTED_GOALS`; xG Features/Rules/Projection path (F1.3) | Broader live season windows; finishing Features polish | Player xG; shot maps; PSxG (**new provider**) |
| Match Context | **Completed** | Rest, congestion, travel posture, knockout (I1) | Stronger Projection weights; travel km if Facts | Weather / multi-competition density |
| Market | **Completed** (supporting) | ODDS depth; market Features/Rules `channel: none` (I2) | Consensus/steam polish as findings | Kelly / sharp-public heat (**Low**, gated) |
| Form / H2H / Match info | **Completed** | Foundation path | Club-strength integration (L1) | — |
| Confirmed Lineup | **Needs enhancement** | `LINEUP` Evidence exists | Feature/Rule/Confidence/Projection consume | Formation trends across fixtures |
| Expected Lineup | **Deferred / Not recommended** | — | — | New provider / human only |
| Referee | **Needs enhancement** | Identity on fixture | Tendency only if Facts honest (quota-hostile) | Dedicated referee model (**Low**) |
| Availability (match) | **Needs enhancement** | Injury/suspension Evidence; thin Features | Role weights (L3) | Severity taxonomy |
| Advanced shot / PSxG | **Future expansion** | Team chance quality partial via xG | — | Specialty provider |
| Tactical style | **Future expansion** | Possession partial | — | Pressing/style provider |

#### 3.4.2 L4 capability table (match-local)

| Capability | Purpose | Evidence | Features | Rules | Confidence | Projection | Provider | Impact | Complexity | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| Confirmed lineup consume | Use published XI/formation | `LINEUP` | `lineupConfirmed`, `formationHome/Away` | `LINEUP_CONFIRMED_*`, formation mismatch findings | High near KO | Medium near KO | `/fixtures/lineups` | Medium | M | **High** |
| H2H | Pairing history | `HEAD_TO_HEAD` | `h2hLean`, sample | H2H Rules (exist) | Sample caps | Low–Medium | Existing | Medium | — | **Medium** (done; polish) |
| Market conflict | Football vs market tension | `ODDS` | Market Features (exist) | Findings-only (exist) | Conflict caps | **None** (no softmax) | Odds API | Explainability | — | **Medium** (polish) |
| Shot quality (team) | Chance vs finish | `EXPECTED_GOALS` + form | `finishingEfficiency*` (exist) | XG / finishing Rules | xG completeness | Medium–High | Partial xG coverage | High when present | S–M | **High** |
| Shot map / PSxG | Event-level chance | Specialty Evidence | Shot Features | Specialty Rules | High if present | High post-match / research | **New provider** | High (blocked) | XL | **Low** now |
| Weather | Conditions | `WEATHER` | Weather Features | Optional | Caps | Low | Unused typed | Low | M | **Low** |

---

## 4. Capability Matrix

Business-value classification across layers (not technical dependency order).

| ID | Capability | Layer | Class | Business value | Provider posture (P0) |
|---|---|---|---|---|---|
| C1 | Club strength (derived) | L1 | Needs enhancement | **Critical** | DERIVABLE |
| C2 | Position-weighted availability | L3 | Needs enhancement | **Critical** | READY Facts / Feature gap |
| C3 | Player impact MVP | L3 | Future → Wave 3 | **Critical** | PARTIAL (unwired endpoints) |
| C4 | League strength normalisation | L1 | Future | **High** | DERIVABLE (population) |
| C5 | Historical / self-ELO index | L1 | Future | **High** | DERIVABLE |
| C6 | Manager + tenure | L1 | Future | **High** | READY endpoint unwired |
| C7 | Confirmed lineup consume | L4 | Needs enhancement | **High** | PARTIAL (Evidence done) |
| C8 | Squad depth + injury depth | L2 | Future | **High** | PARTIAL |
| C9 | Rotation / workload deepen | L2/L3 | Needs enhancement | **High** | PARTIAL |
| C10 | GK intelligence | L3 | Future | **High** | PARTIAL |
| C11 | Shot quality polish (team xG) | L4 | Needs enhancement | **High** | PARTIAL coverage |
| C12 | Age / position balance | L2 | Future | **Medium** | PARTIAL |
| C13 | H2H / market polish | L4 | Needs enhancement | **Medium** | READY |
| C14 | Referee tendencies | L4 | Future | **Low** | Quota-hostile |
| C15 | Financial / investment | L1 | Deferred | **Low** | NEW PROVIDER + legal |
| C16 | Expected Lineup | L3/L4 | Not recommended | **Low** (negative if forced) | No Fact source |
| C17 | PSxG / shot maps | L4 | Deferred | **Low** until provider | NEW PROVIDER |
| C18 | Pressing / style taxonomy | L4 | Deferred | **Medium** later | NEW PROVIDER |

---

## 5. Evidence Catalogue (FI v2 domain view)

This complements `docs/50_EVIDENCE_CATALOG.md`. It does **not** invent Evidence types unless already typed or explicitly planned as payload extension of an existing type.

| Evidence | Layer affinity | FI v2 status | Notes |
|---|---|---|---|
| `MATCH_INFO` | L4 | Active | Fixture identity, kickoff, referee string |
| `VENUE` | L4 | Active | |
| `TEAM_FORM` | L1 / L4 | Active | Club form + splits |
| `STATISTICS` | L1 / L4 | Active + advanced | |
| `EXPECTED_GOALS` | L1 / L4 | Active | Honest absence when labels missing |
| `MATCH_CONTEXT` | L4 | Active | Rest / congestion / knockout |
| `HEAD_TO_HEAD` | L4 | Active | |
| `PLAYER` | L2 / L3 | Active (identity) | Expand stats via payload / subject STATISTICS — prefer reuse over new Engine types |
| `INJURY` / `SUSPENSION` | L2 / L3 / L4 | Active | |
| `LINEUP` | L2 / L3 / L4 | Active Evidence; Feature under-consumed | Confirmed only |
| `ODDS` | L4 (supporting) | Active | Market |
| `MATCH_RESULT` | Evaluation only | Active | **Never** Feature/Projection input |
| Standings Facts | L1 | Domain fetched; Evidence surface thin | FI v2 should seal standings-derived Facts into Evidence/Feature provenance honestly |
| Coach / Manager | L1 | **Planned** | Prefer extend existing types or registry-backed Evidence payload; no new Engine |
| `WEATHER` | L4 | Typed unused | Low priority |
| `NEWS` / `RANKING` | — | Typed unused | Not recommended as Facts without reliability gate |
| Player season/match stats | L3 | **Planned ingest** | Map into Evidence without fabricating xG |
| Transfers / market value | L1 / L2 | Deferred | Licensing |

---

## 6. Feature Catalogue (FI v2 domain view)

### 6.1 Existing Features (anchor — do not rename casually)

Illustrative current names (pins evolve per Compatibility Profile):  
`attackRatingHome/Away`, `defenseRatingHome/Away`, `momentum*`, `recentForm*`, `homeAdvantage`, `venueAdvantage`, `availabilityPenalty*`, `h2hLean`, `xgAttackQuality*`, `xgDefenseQuality*`, `xgDominance`, `finishingEfficiency*`, `fatigueIndex*`, `scheduleAdvantage`, `homeStability`, `rotationPressure*`, `knockoutContext`, market Features (`marketLean`, `marketConsensus`, …).

### 6.2 Planned Features by layer (indicative names)

| Layer | Planned Feature families | Channel class |
|---|---|---|
| L1 | `clubStrength*`, `leagueStrengthIndex`, `clubHistoricalIndex` / `selfElo*`, `managerTenureDays` | Football (except finance → findings/defer) |
| L2 | `squadDepth*`, `injuryDepthPenalty*`, `positionBalanceScore`, `squadAgeMean` | Football |
| L3 | `keyAttackerImpact*`, `keyDefenderImpact*`, `playerFormIndex*`, `playerWorkload*`, `gkQuality*`, weighted `availabilityPenalty*` | Football |
| L4 | `lineupConfirmed`, `formation*`, shot-quality polish, weather (later) | Football; market stays findings |

**Rules for Feature design (B2):** deterministic; cite `sourceEvidenceId`; omit when Evidence absent; never read `MATCH_RESULT` pre-match; never treat market Features as football Facts.

---

## 7. Rule Catalogue (FI v2 domain view)

### 7.1 Existing Rule families (anchor)

Presence, attack/form/defense/momentum, venue, availability, H2H, advanced stats / xG edges, Match Context stability/fatigue, market findings-only (`channel: none`). Policy pin evolves (`rule.mvp.*`).

### 7.2 Planned Rule families by layer

| Layer | Planned Rules | Channel |
|---|---|---|
| L1 | `CLUB_STRENGTH_*_EDGE`, optional `HISTORICAL_*_EDGE`, weak `MANAGER_REGIME_*` | `home+` / `away+` (manager may start as `none`) |
| L2 | `SQUAD_DEPTH_*`, `INJURY_DEPTH_*`, `POSITION_IMBALANCE_*` | Football channels or `none` until calibrated |
| L3 | `KEY_PLAYER_ABSENCE_*`, `GK_QUALITY_*`, weighted availability | Football |
| L4 | `LINEUP_CONFIRMED_*`, formation mismatch findings | Prefer findings until Evaluation supports channelled use |
| Market | Keep / polish consensus & conflict | **`none` only** |

**Hard rule:** Rules consume **Features only**. Confidence consumes Rule outcomes + Evidence completeness — never raw provider JSON.

---

## 8. Prediction Impact Analysis

| Layer | If fully realised (honestly) | Near-term realistic uplift | Risk if rushed |
|---|---|---|---|
| **L1 Club** | Largest durable uplift to λ / 1X2 | **High** via club strength from existing Facts | Overfitting standings; false SPI labels |
| **L2 Squad** | Improves absence/rotation robustness | Medium after L1/L3 | Invented depth scores |
| **L3 Player** | High variance games (star missing) | **High** for availability weights; Medium for stats MVP | Quota burn; player-xG invention |
| **L4 Match** | Context already strong; lineup near KO | Medium polish; High only with new shot provider | Expected Lineup fabrication |
| **Market (L4 supporting)** | Explainability / conflict | Not Prediction control | Softmax leakage |
| **Calibration (parallel)** | Probability trust | High for Brier/reliability | Auto-activation |

**Business-value ordering (accuracy):** L1 Club Strength → L3 weighted availability / player impact → L4 lineup consume → L2 depth → deferred specialty providers.

---

## 9. Implementation Roadmap

Organised by **business value**, aligned with P0 Waves. Each Wave remains a coding sprint under B2; this document is design authority for domain placement only.

```text
DA     Domain Architecture (this document)
P0     Provider Capability Review (done)
  │
  ├─ Wave 1  L1 Club Strength Intelligence          Critical
  ├─ Wave 2  L1 Manager + L4 Confirmed Lineup       High
  ├─ Wave 3  L3 Player Impact MVP + weighted avail  Critical/High
  ├─ Wave 4  L2 Squad Depth / Injury Depth          High
  ├─ Wave 5  L1 Historical / self-ELO + league norm High
  ├─ Wave 6  L3/L4 GK + shot-quality polish         High/Medium
  ├─ Gate    New provider (stats / PSxG) if needed  Medium later
  └─ Parallel A2 Calibration (trust track)          Critical for trust, not signal
```

### 9.1 Wave definitions

| Wave | Domains | Critical path deliverables | Explicit non-goals |
|---|---|---|---|
| **W1** | L1 Club Strength | Features/Rules/Confidence/Projection consume of standings+form+stats+xG strength; Report explainability | Finance, SPI brand, Calibration edits |
| **W2** | L1 Manager + L4 Lineup | `/coachs` → Evidence; lineup Feature/Rule/Confidence | Expected XI |
| **W3** | L3 Player | Capped player stats Evidence; impact + weighted availability Features/Rules | Player xG invention; Free-tier pagination storms |
| **W4** | L2 Squad | Depth + injury-depth Features from squad/absence Facts | Transfermarkt values |
| **W5** | L1 History / League | self-ELO Feature (derived) + league strength index with Evaluation slices | External SPI vendor required |
| **W6** | L3/L4 polish | GK Features; finishing/xG polish | Shot maps/PSxG |
| **Gate** | Provider | SportMonks-class / event model only after Evaluation ceiling | Scrapers |
| **A2** | Trust | Calibration artifacts from Evaluation History | Auto-activation; Projection rewrite |

### 9.2 Priority rollup

| Priority | Capabilities |
|---|---|
| **Critical** | Club strength (W1); position-weighted availability; player impact MVP; A2 trust track (parallel) |
| **High** | Manager; confirmed lineup consume; squad/injury depth; rotation; GK; league/historical strength; team shot-quality polish |
| **Medium** | Age/position balance; H2H/market polish; later style provider |
| **Low** | Finance/investment; referee tendencies; weather; Expected Lineup; PSxG until provider; Kelly heat |

---

## 10. Technical Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Treating domains as new Engines/packages | High | B0/B2 mapping: domains expand existing packages only |
| Pipeline bypass (“temporary Feature from JSON”) | Critical | Evidence First; dependency-cruiser + review |
| Market controlling Prediction | Critical | Market Rules remain `channel: none` |
| Fabricating Expected Lineup / PSxG / finance | Critical | P0 do-not-invent list; coding Law tests |
| Labelling self-ELO as vendor Fact | High | Feature provenance = derived |
| Quota collapse on player endpoints | High | Caps, paid tier, cassettes |
| Evaluation contamination | High | Sealed Evaluation History immutable; measure don’t mutate |
| Over-wide Wave 1 scope | Medium | W1 = Club Strength only |
| Governance conflict vs “no new Architecture docs” | Medium | This doc is **authorized domain architecture** after P0 capability gap; it does **not** amend Freeze v0.3 |

---

## 11. Architecture Validation

| Requirement | Status | Evidence in this design |
|---|---|---|
| Evidence First | **PASS** | Every capability names Evidence before Features |
| No Fabrication | **PASS** | Deferred Expected Lineup, PSxG, finance; honest absence |
| Deterministic Features | **PASS** | All planned Features are pure functions of Evidence |
| Rules consume Features only | **PASS** | Rule catalogue forbids provider JSON |
| Confidence never bypasses Rules | **PASS** | Confidence uses completeness + Rule outcomes only |
| Market never controls Prediction | **PASS** | Market stays L4 supporting / `channel: none` |
| Evaluation remains independent | **PASS** | `MATCH_RESULT` / Evaluation / History outside Feature→Projection; A2 parallel |
| No pipeline redesign | **PASS** | Same Provider→…→Evaluation History chain |
| No Freeze / Calibration mutation in this sprint | **PASS** | Design-only deliverable |

```text
Validation summary: PASS — Domain Architecture is Freeze-compatible.
```

---

## 12. Final Recommendation

1. **Adopt this Domain Architecture** as the FI v2 organising model (L1 Club → L2 Squad → L3 Player → L4 Match).
2. **Authorize coding to begin at Wave 1 — L1 Club Strength Intelligence**, using existing API-Football Facts only.
3. **Sequence Waves 2–4** for Manager/Lineup, Player Impact, Squad Depth before any new provider gate.
4. **Keep A2 Calibration** as the parallel probability-trust track; do not merge into Wave 1.
5. **Do not schedule** Expected Lineup, Transfermarkt finance, or PSxG/shot maps until a Provider Architecture Gate after Evaluation shows a ceiling.

**Acceptance checklist**

- [x] Domain Architecture completed
- [x] Layer model completed (L1–L4)
- [x] Capability matrix completed
- [x] Future roadmap completed (business-value ordered)
- [x] Architecture validation completed
- [x] No production code
- [x] No architecture redesign

---

## References

- `docs/reviews/FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md`
- `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md`
- `docs/sprints/B0/B0_FOOTBALL_INTELLIGENCE_ARCHITECTURE_MAPPING.md`
- `docs/sprints/B2/B2_FOOTBALL_INTELLIGENCE_CODING_SPECIFICATION.md`
- `docs/sprints/D0/D0_FOOTBALL_INTELLIGENCE_EXPANSION_ROADMAP.md`
- `docs/sprints/A1/A1_PREDICTION_EVALUATION_COMPLETION_REPORT.md`
- `docs/sprints/A1/A1.5_EVALUATION_PLATFORM_FOUNDATION_COMPLETION_REPORT.md`
- `docs/50_EVIDENCE_CATALOG.md`
- `docs/02_DOMAIN_MODEL.md`

---

*End of Football Intelligence v2 Domain Architecture.*
