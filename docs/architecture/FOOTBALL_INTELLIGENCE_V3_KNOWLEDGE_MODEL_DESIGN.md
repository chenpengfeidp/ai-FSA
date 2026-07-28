# Football Intelligence v3 — Knowledge Model Design

| Field | Value |
|---|---|
| Sprint id (working) | **V3-KM** Football Intelligence v3 Knowledge Model Design |
| Date | 2026-07-27 |
| Document type | **Design only** — analysis, domain proposals, priority/impact ranking, roadmap recommendation |
| Authority (read-only) | `AGENTS.md` · `docs/PROJECT_STATE.md` · Architecture Freeze **v0.3** · `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md` · `docs/architecture/FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md` (DA) · `docs/reviews/FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md` (P0) · `docs/sprints/O1/O1_FOOTBALL_INTELLIGENCE_CONTRIBUTION_COMPLETION_REPORT.md` · `docs/40_PRODUCT_ROADMAP.md` |
| Scope | Analyze existing Intelligence domains; propose deterministic v3 domains; design a Rule-combination scenario layer; produce priority/impact/roadmap/risk artifacts |
| Explicit exclusions | Production code · architecture redesign · new Engines · changes to `Provider` / `Evidence` / `Feature` / `Rule` packages · Prediction / Evaluation / Calibration / Validation / Contribution mutation |

---

## 0. Governance note (read before using this document)

This document is a **design artifact only**. No production code was written or modified to
produce it. It does **not** authorize any coding sprint by itself, exactly as `docs/architecture/
FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md` (DA) and `docs/reviews/
FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md` (P0) did not authorize code on their own.

Per `AGENTS.md`'s Project Governance Rule and `docs/40_PRODUCT_ROADMAP.md`:

- No new Architecture documents unless a real defect is found — this document does not amend
  or replace the DA hierarchy (L1–L4), the frozen pipeline, or the seven governed engines. It
  is an **extension proposal** inside the existing domain model, in the same spirit as DA/P0.
- No new Engine unless existing governed engines cannot satisfy the need — every proposal below
  is evaluated against whether it fits inside the existing `Feature → Rule → Analysis → Report`
  pipeline (Domain ≠ Engine, per DA §2.1) or genuinely requires the already-reserved but
  unactivated **Knowledge Engine** (roadmap Sprint **K1**). No proposal here invents an eighth
  engine.
- Every future **coding** sprint that acts on this design must cite `docs/40_PRODUCT_ROADMAP.md`
  and a Sprint id. None of the ids used in §8/§10 below (e.g. `T1`, `RF1`, `TX1`) exist in doc 40
  today — they are **proposed working names for human review**, not authorized ids. Starting
  code under one of these names without first adding it to doc 40 (or receiving an explicit
  task-level authorization, as M1A/O1/V1A did) would repeat the same roadmap-citation gap already
  on record for `V1A`/`O1` in `docs/PROJECT_STATE.md`.

---

## 1. Executive summary

The Football Intelligence MVP (Foundation → Advanced Statistics → Expected Goals → Match Context
→ Market) plus the L/P/M Wave tracks (Club, Player, Manager Intelligence) give FAS a wide but
still **fact-shallow** signal set: mostly team-level averages and season identity. What is
structurally missing is **football knowledge** — how teams actually play, how that interacts
with the opponent, and how a match's Rule findings compose into a coherent read of *what kind of
match this is*. That is the gap this design addresses.

**Core finding:** most of the highest-leverage next domains do **not** need a new provider or a
new engine. They can be built as deterministic Features/Rules on data FAS already fetches but
under-uses (`possession`, `corners`, goal-timing implicit in fixture data, referee identity
already on `MATCH_INFO`) or as a pure **combination layer** over already-sealed Rule findings
(zero new Evidence). A smaller set of genuinely new capabilities (pressing, true defensive shape,
true counter-attack rate, PSxG-class set-piece quality) confirm P0's prior finding: they are
**NEW PROVIDER REQUIRED** and should stay deferred rather than be faked with weak proxies.

**Explicit two-track distinction used throughout this document** (a key design decision):

| Track | What it is | Where it lives | Governance |
|---|---|---|---|
| **Derived-Deterministic** | Statistics computed from sealed Evidence FAS already has (e.g. rolling possession average → "possession-oriented" score) | Existing `@fas/feature` / `@fas/rule` pipeline, following the L1A→L1B / P1A→P1B / M1A pattern | No new Engine; ordinary Wave sprint |
| **Governed-Knowledge** | Judgment that cannot be honestly derived from current Facts alone (e.g. "Team X is a back-three counter-attacking side" as an analyst-approved label, true tactical style taxonomy, coach philosophy notes) | Reserved **Knowledge Engine** (roadmap **K1**) | Must wait for K1 activation; must never be faked as a "derived" Feature in the meantime |

Several of the domains named in the task brief (Team Style, Referee, Set-piece) have **both** a
thin Derived-Deterministic slice that can ship now and a richer Governed-Knowledge slice that
must wait for K1. This document is explicit about which is which for every domain, so no future
sprint is tempted to fabricate a style taxonomy the way `/predictions` was already correctly
rejected as a Fact source (P0 §5.3).

---

## 2. Method

Reviewed, in order: `AGENTS.md`, `docs/PROJECT_STATE.md`, Architecture Freeze v0.3, the v0.3
Freeze Review, the DA v2 Domain Architecture (L1–L4 hierarchy), the P0 Provider Capability Review
(READY / PARTIAL / DERIVABLE / NEW PROVIDER REQUIRED / NOT RECOMMENDED classification, reused
verbatim below), the O1 Contribution completion report and its domain-feature-family source
(`packages/statistics/src/contribution/domain-feature-families.ts`,
`packages/statistics/src/validation/feature-profile.ts`), the current Rule inventory
(`packages/rule/src/evaluation/rule-evaluator.ts`, 70 rules), the Evidence Catalog
(`docs/50_EVIDENCE_CATALOG.md`, 16 sealed Evidence types), and `docs/40_PRODUCT_ROADMAP.md`
(Sprint K1 Knowledge Engine / C1 Case Engine / S1 Statistics Engine descriptions). No code was
read as an implementation target — only as ground truth for "what already exists" so this design
does not re-propose work that is already shipped (an error the Schedule Pressure and Momentum
sections below specifically avoid; see §3 and §4.4/§4.5).

**Honesty constraint carried through this whole document:** O1's Football Intelligence
Contribution report exists precisely to measure domain value, but every domain in the current
sealed demo population is still **below its own qualification sample-size threshold**
(`MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE = 20`). There is therefore **no statistically qualified
measured ranking of domain value today** — O1 explicitly has no `bestDomain` / ranking /
causation field, by design. Every "prediction value" and "expected impact" judgment in this
document is **structural/expert estimation**, not a measured result, and is labelled as such
throughout. Turning these estimates into measured claims is exactly what O1 (and any future
qualified sample) is for.

---

## 3. Current system analysis

Domain-by-domain review of the nine live/near-live Intelligence domains. "Missing Features/Rules"
is scoped to what is realistically obtainable from **already-integrated** providers (API-Football,
The Odds API) per the P0 classification — items marked NEW PROVIDER REQUIRED are named but not
recommended for near-term work.

| Domain | Evidence | Features (count) | Rules (representative) | Prediction value (estimate) |
|---|---|---|---|---|
| Venue | `VENUE` | `venueAdvantage` (1) | `VENUE_SUPPORTS_HOME`, `VENUE_UNAVAILABLE`, `HOME_ADVANTAGE_MATERIAL` | Low–Medium |
| Availability | `INJURY`, `SUSPENSION` | `availabilityPenaltyHome/Away` (2) | `AVAILABILITY_HOME/AWAY_HIT`, `AVAILABILITY_HOME/AWAY_UNKNOWN` | Medium |
| Advanced Statistics | `STATISTICS.advanced` | attackEfficiency, possession, chanceCreation, disciplineRisk ×2 sides (8) | `ATTACK_EFFICIENCY_*`, `POSSESSION_*`, `CHANCE_CREATION_*`, `DISCIPLINE_*` | Medium–High |
| Expected Goals | `EXPECTED_GOALS` | xgAttackQuality, xgDefenseQuality, xgDominance, finishingEfficiency ×2 (7) | `XG_ATTACK_*`, `XG_DEFENSIVE_*`, `XG_DOMINANCE*` | High (when present) |
| Match Context | `MATCH_CONTEXT` | fatigueIndex, rotationPressure, scheduleAdvantage, knockoutContext, homeStability (7) | `REST_ADVANTAGE_*`, `FATIGUE_*`, `HOME_STABILITY`, `ROTATION_PRESSURE`, `KNOCKOUT_CONTEXT` | Medium |
| Club Intelligence | `CLUB_INTELLIGENCE` | clubStrength, attack/defense strength, goalDiff strength, leagueStrength, formStrength, managerStability, pointsPerMatch ×2 (18) | `CLUB_STRENGTH_EDGE*`, `LEAGUE_STRENGTH_EDGE*`, `FORM_STRENGTH_EDGE*`, `MANAGER_STABILITY*` | High (broadest strength signal) |
| Player Intelligence | `PLAYER` | playerAvailabilityImpact, keyPlayerAvailability, squadAvailabilityScore, playerAttackContribution, goalkeeperReliability ×2 (10) | `PLAYER_AVAILABILITY_EDGE_*`, `KEY_PLAYER_MISSING_*`, `PLAYER_ATTACK_EDGE_*`, `GOALKEEPER_EDGE_*` | Medium–High (when squad coverage exists) |
| Manager Intelligence | `MANAGER_INTELLIGENCE` | **none yet** (M1A is Evidence-only; M1B reserved) | **none yet** | Unrealized — identity/tenure captured but not consumed |
| Market Intelligence (supporting) | `ODDS` | marketLean, marketImplied*, AH line/lean, marketConsensus, steamMove, RLM, marketVolatility, sharpSupport (11) | `MARKET_LEAN_*`, `MARKET_AH_LEAN_*`, `MARKET_CONSENSUS`, `STEAM_MOVE`, `REVERSE_LINE_MOVEMENT`, `MARKET_VOLATILITY`, `SHARP_SUPPORT` (`channel: none`, findings-only) | High for explainability/conflict gating; **zero** direct 1X2 weight by design |

### 3.1 Venue

- **Missing football knowledge:** no distinction between "home advantage" as a generic constant
  and *this stadium's* actual character (altitude, pitch dimensions, travel distance for the away
  side, crowd capacity utilisation). API-Football's venue payload carries city/capacity/surface,
  which is fetched but not turned into a Feature beyond the single `venueAdvantage` flag.
- **Missing deterministic Features:** travel-distance-derived away-fatigue index (needs venue
  lat/long ↔ away team's home city, a pure geometry function — DERIVABLE, no new provider);
  altitude adjustment (thin coverage; PARTIAL).
- **Missing Rules:** none beyond existing three; the gap is upstream (Features), not Rules.
- **Expected impact of closing gaps:** Low–Medium — venue effects are real but small relative to
  team strength; not a priority relative to other domains below.

### 3.2 Availability

- **Missing football knowledge:** availability is currently **count-based**, not
  **role-weighted** — losing a backup full-back and losing the top scorer both move
  `availabilityPenalty` by a similar amount today. P0 §5.1 already names this gap
  ("Injury severity / role weights").
- **Missing deterministic Features:** position-weighted / minutes-weighted availability penalty
  (needs `PLAYER.seasonStats` minutes + position, which P1A already ingests — DERIVABLE, no new
  Evidence).
- **Missing Rules:** a `KEY_ABSENCE_ROLE_WEIGHTED` rule distinct from the existing count-based
  `AVAILABILITY_*_HIT` rules.
- **Expected impact:** Medium — likely the single cheapest accuracy improvement available today,
  since it upgrades an existing Feature rather than requiring new Evidence.

### 3.3 Advanced Statistics

- **Missing football knowledge:** the eight existing Features are per-match snapshots of the
  fixture under analysis (via `STATISTICS.advanced`), not **rolling season profiles**. There is
  no "this team has averaged 58% possession over its last 10 matches" signal — only single-match
  or simple form-window numbers feed today's pipeline.
- **Missing deterministic Features:** rolling multi-match averages/variance for possession,
  shots, corners, cards (DERIVABLE from already-fetched `STATISTICS` history; this is also the
  exact data **Team Style Intelligence** in §4.1 needs — recommend building both together).
- **Missing Rules:** consistency/variance-based rules (e.g. a team whose possession swings wildly
  match-to-match is a different prediction problem than one with a stable profile) — none exist
  today.
- **Expected impact:** Medium–High — this is the direct data foundation for §4.1/§4.2 below.

### 3.4 Expected Goals

- **Missing football knowledge:** xG is team-aggregate only; there is no shot **quality mix**
  (headers vs open play vs set piece vs penalty) even though this would meaningfully change how
  "lucky" vs "sustainable" a scoreline looks. P0 classifies shot-location/PSxG as **NEW PROVIDER
  REQUIRED** (§3.5 in P0) — not recommended near-term.
  - Set-piece xG contribution specifically is not tagged; see §4.6 Set-piece Intelligence for a
    weak, honestly-labelled proxy that does not require a new vendor.
- **Missing deterministic Features:** none beyond what F1.3B already extracts; the domain is
  provider-timing-limited (xG labels intermittent), not Feature-logic-limited.
- **Missing Rules:** none additional recommended; existing five xG rules already cover
  attack/defense/dominance.
- **Expected impact:** already High when present; the ceiling is provider coverage, not FAS logic.

### 3.5 Match Context

- **Missing football knowledge:** rest/rotation/knockout context is per-match; there is no
  **cumulative fixture congestion across competitions** (e.g. a team playing Thursday Europa
  League + Sunday league + midweek cup is a materially different fatigue profile than one playing
  a single weekly fixture, even if "days since last match" looks similar).
- **Missing deterministic Features:** a multi-competition congestion index over a trailing
  N-day window (needs the same `/fixtures?team=&last=` data already fetched for `TEAM_FORM`,
  widened to count matches across all competitions, not just the analyzed one — DERIVABLE).
- **Missing Rules:** `FIXTURE_CONGESTION_HOME/AWAY` distinct from existing `FATIGUE_*` (single
  most-recent-gap based).
- **Expected impact:** Medium. **Design note:** this is the same underlying idea as the "Schedule
  Pressure Intelligence" domain named in the task brief — see §4.4, which recommends this be
  built as an **extension of Match Context (I1B)**, not a new domain, to avoid Feature/Rule
  duplication.

### 3.6 Club Intelligence

- **Missing football knowledge:** club strength is within-league only; there is no
  cross-league strength normalisation (a mid-table Big-Five side and a title-chasing side in a
  smaller league can have similar raw `pointsPerMatch` but very different true strength). P0 §3.1
  already flags this ("League Strength — DERIVABLE (thin) / NEW PROVIDER (rich)").
- **Missing deterministic Features:** a self-computed cross-league strength index (self-ELO
  style, per P0 §5.2 "Prefer self-ELO Feature before new vendor") built from historical
  cross-competition results (UCL/UEL matches connect leagues) — DERIVABLE but data- and
  compute-heavy; a genuinely large future undertaking, not scoped further here.
- **Missing Rules:** none immediate; the gap is a Feature-quality ceiling, not a missing Rule.
- **Expected impact:** High if built, but High implementation difficulty — flagged for awareness,
  not proposed as a v3 domain below (out of proportion to this design's scope).

### 3.7 Player Intelligence

- **Missing football knowledge:** player contribution Features are capped-candidate, season-stat
  based; there is no positional **role fit** (e.g. a suspended ball-playing centre-back matters
  more against a high-press opponent than against a deep-block one — this is exactly what
  §4.2 Tactical Matchup Intelligence is for).
- **Missing deterministic Features:** none additional recommended standalone; the highest-value
  next step is **combining** Player Intelligence with Tactical Matchup (§4.2), not extending
  Player Intelligence Features in isolation.
- **Missing Rules:** none additional recommended standalone.
- **Expected impact:** Medium standalone; High as an input to Tactical Matchup.

### 3.8 Manager Intelligence

- **Missing football knowledge:** M1A captured identity/tenure/previous-clubs facts but consumes
  none of them — `managerStabilityHome/Away` (an existing Club Intelligence Feature) is a proxy
  for "different manager than last snapshot," not the richer M1A tenure/appointment-date facts.
- **Missing deterministic Features:** `managerTenureFeature` (days since appointment, from M1A's
  `appointmentDate`), `newManagerBounceFeature` (tenure below a threshold, a well-known football
  phenomenon — "new manager bounce" — DERIVABLE from M1A Evidence alone).
- **Missing Rules:** `NEW_MANAGER_BOUNCE_HOME/AWAY`, `MANAGER_TENURE_EDGE_HOME/AWAY`.
- **Expected impact:** Medium — this is **already the next authorized sprint (M1B)** per
  `docs/PROJECT_STATE.md`; not re-scoped here, only cross-referenced so this document does not
  duplicate it.

### 3.9 Market Intelligence (supporting)

- **Missing football knowledge:** market signals are single-bookmaker-path today (P0 §4.2:
  "not a multi-book fan-out"); consensus/steam/sharp Features are directionally useful but thin.
- **Missing deterministic Features / Rules:** none proposed here — Market Intelligence is
  **frozen as findings-only, `channel: none`** by the ratified Freeze v0.3 dual-input boundary
  (§6.3 of the Freeze Review); this document does **not** propose changing that.
- **Expected impact:** N/A for this design (frozen boundary, correctly out of scope).

---

## 4. Proposed new Intelligence domains

Ten domains were named in the task brief. Each is evaluated below. Four (**Schedule Pressure**,
**Momentum**, **Defensive Shape**'s naive form, and full **Pressing**/**Transition**) turned out
to substantially overlap existing Features or require a provider FAS does not have — those
findings are stated plainly rather than hidden to preserve the ten-domain framing.

### 4.1 Team Style Intelligence

| Field | Value |
|---|---|
| Purpose | Give every club a persistent, versioned **statistical style profile** (possession orientation, directness, chance-creation shape, defensive line proxy) so later domains (Tactical Matchup, Confidence) can reason about *how* a team plays, not only *how strong* it is |
| Required Evidence | **None new.** Rolling window over already-sealed `STATISTICS` (+ `STATISTICS.advanced` when present) and `EXPECTED_GOALS` across a team's last N matches (N configurable, e.g. 10) |
| Deterministic Features | `possessionOrientationHome/Away` (rolling avg possession %), `directnessIndexHome/Away` (shots per possession-adjusted unit, or long-ball proxy from available fields), `chanceCreationVolumeHome/Away` (rolling chanceCreation), `styleConsistencyHome/Away` (variance of the above — how stable the profile is) |
| Rules | `STYLE_MISMATCH_POSSESSION_HOME/AWAY` (large possession-orientation gap vs opponent), `STYLE_UNSTABLE_HOME/AWAY` (high variance → lower confidence in the profile itself) |
| Expected impact | Medium–High — this is the statistical foundation multiple other domains (4.2, and future work) depend on |
| Dependencies | Advanced Statistics history (already fetched per match, needs to be retained/aggregated across matches — a **rolling-window aggregation capability**, which is new plumbing even though no new Evidence type is needed) |
| Implementation difficulty | **M** — no new provider, but requires a multi-match aggregation step that does not exist yet (today's Features are single-fixture or thin form-window based) |
| Estimated prediction value | Medium–High (structural estimate; unmeasured) |
| Track | **Derived-Deterministic** for the statistical profile above. A qualitative style **label** (e.g. "possession-based," "counter-attacking") is **Governed-Knowledge** (K1) — do not invent a label from thresholds; report the numeric profile and let a human-approved K1 entry supply the label later |

### 4.2 Tactical Matchup Intelligence

| Field | Value |
|---|---|
| Purpose | Combine **both** teams' Team Style profiles (§4.1) into a match-local mismatch signal — e.g. a low-possession, high-directness side facing a high-possession, high-line side is a different prediction problem than two similar-style sides |
| Required Evidence | None new beyond §4.1's Team Style Features (this domain is a pure **Feature combination**, computed at L4 Match Intelligence time from two L1/L2-level Team Style profiles) |
| Deterministic Features | `styleMismatchIndex` (single match-local scalar from the two sides' profiles), `possessionBattleProjection` (which side is statistically likely to dominate the ball based on both profiles, not just one side's average) |
| Rules | `TACTICAL_MISMATCH_HOME/AWAY_EDGE`, `POSSESSION_BATTLE_HOME/AWAY_FAVORED` |
| Expected impact | Medium — genuinely new information (a *relative*, not additive, signal) but its accuracy ceiling is bounded by how good the underlying Team Style profiles are |
| Dependencies | **Hard dependency on §4.1** (Team Style Intelligence) — cannot be built first |
| Implementation difficulty | **M** — combination logic is straightforward once inputs exist; most of the cost is already paid by §4.1 |
| Estimated prediction value | Medium (structural estimate; unmeasured) |
| Track | **Derived-Deterministic** for the numeric mismatch index. True tactical-matchup narrative (e.g. "this favours a low block and counter") is **Governed-Knowledge** (K1) |

### 4.3 Referee Intelligence

| Field | Value |
|---|---|
| Purpose | Turn the referee identity FAS **already captures** (`MATCH_INFO.referee`, per `docs/50_EVIDENCE_CATALOG.md`) into a persistent, self-computed tendency profile (cards/match, penalties/match, home-win-rate-under-referee) — the same Evidence→Feature shape already proven by M1A Manager Intelligence |
| Required Evidence | A new sealed Evidence type, e.g. `REFEREE_INTELLIGENCE` (identity + self-computed career aggregate + this-match assignment), following the **exact M1A pattern**: persistent identity + match-day confirmation. Career aggregate is **self-computed from FAS's own historical `MATCH_INFO` + `STATISTICS` + `MATCH_RESULT` records where that referee officiated** — not a vendor "referee stats" product (API-Football does not expose one) |
| Deterministic Features | `refereeCardRateHome/Away context` (a single referee-level scalar, not home/away-split — cardRate, penaltyRate), `refereeHomeBias` (historical home-win-rate delta under this referee vs league baseline) |
| Rules | `REFEREE_HIGH_CARD_RATE`, `REFEREE_HOME_BIAS_MATERIAL` (both `channel: none` initially — recommend **findings-only**, matching the Market Intelligence pattern, until enough qualified sample exists to trust a directional football-channel weight) |
| Expected impact | Low–Medium — real but second-order effect; primary value is explainability ("this referee cards heavily," a genuinely useful analyst fact) more than probability shift |
| Dependencies | Requires building a **referee-indexed historical aggregation** capability (new plumbing, same category of work as §4.1's rolling-window aggregation) *and* enough matches-per-referee sample before any tendency is shown (apply the same `qualified: false` honesty pattern O1 already uses for small samples) |
| Implementation difficulty | **M–H** — self-aggregation infrastructure + Free-tier quota risk (P0 §4.3: "Free tier 100 req/day") if history must be backfilled via live calls; cheaper if built from data FAS is already recording going forward (no backfill) |
| Estimated prediction value | Low–Medium (structural estimate; unmeasured) |
| Track | **Derived-Deterministic** — self-computed statistics only; never claim a "biased referee" narrative beyond the measured, sample-size-qualified delta |

### 4.4 Schedule Pressure Intelligence

| Field | Value |
|---|---|
| Purpose | As named in the task brief, this would model fixture congestion / travel burden |
| Finding | **This substantially already exists** as I1B Match Context (`fatigueIndex`, `rotationPressure`, `scheduleAdvantage`, `knockoutContext`, `homeStability`). Recommend **not** creating a parallel domain |
| Required Evidence | None new — reuse `MATCH_CONTEXT` |
| Deterministic Features | **Extend**, don't duplicate: add the multi-competition congestion index described in §3.5 as a new Match Context Feature, not a new domain's Feature |
| Rules | Add `FIXTURE_CONGESTION_HOME/AWAY` to the existing Match Context rule family |
| Expected impact | Medium (same estimate as §3.5) |
| Dependencies | I1B (already shipped) |
| Implementation difficulty | **S–M** — smaller than a new domain because Evidence/Feature/Rule wiring for Match Context already exists; only the congestion calculation itself is new |
| Estimated prediction value | Medium |
| Track | **Derived-Deterministic**, as an I1-family extension |

### 4.5 Momentum Intelligence

| Field | Value |
|---|---|
| Purpose | As named in the task brief, this would model recent-form trend beyond simple averages |
| Finding | **Partially already exists**: Foundation already has a `momentum` Feature and `MOMENTUM_HOME`/`MOMENTUM_AWAY` Rules (v0.3 Freeze Review §3.2: "Foundation | attack/defense ratings, momentum, form, …"). Recommend **enhancing**, not duplicating |
| Required Evidence | None new — reuse `TEAM_FORM` |
| Deterministic Features | Enhance existing `momentum` into a multi-window trend (e.g. slope across last-3/last-5/last-10 points-per-match, not a single-window snapshot) |
| Rules | Enhance existing `MOMENTUM_HOME/AWAY` thresholding, or add `MOMENTUM_ACCELERATING_HOME/AWAY` for trend direction distinct from trend level |
| Expected impact | Low–Medium — refinement of an existing signal, not a new one |
| Dependencies | Foundation (already shipped) |
| Implementation difficulty | **S** — smallest item in this document; pure Feature-formula change behind an existing Evidence/Rule wiring |
| Estimated prediction value | Low–Medium |
| Track | **Derived-Deterministic**, as a Foundation-family enhancement |

### 4.6 Set-piece Intelligence

| Field | Value |
|---|---|
| Purpose | Model set-piece (corner/free-kick) threat and vulnerability as a distinct goal-scoring channel from open play |
| Required Evidence | **No new Evidence type strictly required for a thin MVP** — `STATISTICS.advanced.corners` is already fetched. True set-piece **goal attribution** (which goals came from a corner/free-kick) needs shot/goal-source tagging that P0 §3.5 already classifies **NEW PROVIDER REQUIRED** (API-Football's `/fixtures/events` gives goal minute/scorer, not goal *type*) |
| Deterministic Features | Thin MVP only: `setPieceOpportunityVolumeHome/Away` (rolling corners-per-match, an **opportunity proxy**, not a goal-source measurement) |
| Rules | `SET_PIECE_VOLUME_EDGE_HOME/AWAY` — must carry an explicit limitation that this measures *opportunity volume*, not *set-piece scoring rate* |
| Expected impact | Low for the honest thin MVP (corners are a weak proxy for set-piece goals); would be Medium–High for the full version, which is blocked on a new provider |
| Dependencies | Advanced Statistics (already shipped) for the thin MVP; a shot/event-tagging vendor for the full version |
| Implementation difficulty | **S** (thin MVP) / **NEW PROVIDER REQUIRED** (full version — do not attempt without an Architecture Review Gate per P0 §6) |
| Estimated prediction value | Low (thin MVP, honestly labelled) |
| Track | **Derived-Deterministic** for the thin MVP; the full attribution model is out of scope until a provider gate |

### 4.7 Defensive Shape Intelligence

| Field | Value |
|---|---|
| Purpose | As named in the task brief, this would model defensive line height, block compactness, formation shape |
| Required Evidence | Confirmed **formation string** already exists via `LINEUP` (P0 §3.2: "Formation — PARTIAL — Confirmed via `/fixtures/lineups`"); true shape metrics (defensive line height, compactness) are **NOT** in API-Football and are classified NEW PROVIDER REQUIRED (specialty tracking-data vendors) |
| Deterministic Features | Thin, already-flagged prerequisite (not new to this document): consume the confirmed formation **family** (e.g. back-four vs back-three) as a Feature — this is P0's already-identified gap ("Confirmed LINEUP under-consumed," P0 §5.1), not a new domain |
| Rules | `FORMATION_FAMILY_MISMATCH_HOME/AWAY` (thin) |
| Expected impact | Low for the thin formation-family version (available only near kickoff, per existing `LINEUP` timing limitation); the true defensive-shape version would be Medium–High but is provider-blocked |
| Dependencies | `LINEUP` (already shipped, under-consumed) |
| Implementation difficulty | **S** (thin formation-family Feature) / **NEW PROVIDER REQUIRED** (true shape metrics) |
| Estimated prediction value | Low (thin) |
| Track | **Derived-Deterministic** for formation family only; true defensive shape is out of scope pending a provider gate — do **not** infer "high line" or "compact block" from formation string alone (that would be exactly the kind of fabrication `AGENTS.md` forbids) |

### 4.8 Pressing Intelligence

| Field | Value |
|---|---|
| Purpose | As named in the task brief, this would model pressing intensity (PPDA-style) |
| Finding | **NEW PROVIDER REQUIRED**, confirmed by P0 §3.4 verbatim ("PPDA / pressure index not in current stack"). No honest deterministic proxy exists in currently-integrated providers |
| Required Evidence | None obtainable today |
| Deterministic Features | None recommended — any attempt from possession/tackles alone would be a **weak, misleading proxy** dressed as a real metric, which this design explicitly declines to propose |
| Rules | None |
| Expected impact | Unknown until a provider gate is evaluated |
| Dependencies | A specialty stats vendor (P0 §6, item N1) |
| Implementation difficulty | **NEW PROVIDER REQUIRED** |
| Estimated prediction value | N/A — do not build |
| Track | **Deferred.** Revisit only after an Architecture Review Gate for a deeper stats provider, per P0 §6/§11 |

### 4.9 Transition Intelligence

| Field | Value |
|---|---|
| Purpose | As named in the task brief, this would model counter-attack tendency and speed of transition |
| Finding | **True counter-attack rate is NEW PROVIDER REQUIRED** (P0 §3.4: "No counter-attack rate Fact"). However, a **goal-timing profile** is genuinely DERIVABLE today from data FAS already has access to but does not ingest: P0 §5.1 names `/fixtures/events` as an unused endpoint ("Goals/cards chronology only — not shot maps") |
| Required Evidence | A thin new Evidence surface for goal-minute chronology (or an extension of `MATCH_RESULT`/`STATISTICS` with a goal-timeline array), sourced from `/fixtures/events` (not currently wired) |
| Deterministic Features | `fastStartRateHome/Away` (rolling rate of scoring/conceding in the first 15 minutes, from historical goal-timing), `lateGoalRateHome/Away` (last-15-minute scoring/conceding rate) — both are **timing profiles**, explicitly not "transition speed" or "counter-attack quality," which are not measurable from this data |
| Rules | `FAST_START_TENDENCY_HOME/AWAY`, `LATE_GOAL_TENDENCY_HOME/AWAY` |
| Expected impact | Low–Medium — a real, honestly-scoped signal, clearly weaker than the "transition/counter-attack" framing in the task brief implies |
| Dependencies | New provider **endpoint** wiring (`/fixtures/events`), not a new **vendor** — same provider, unused capability, per P0 §5.1 |
| Implementation difficulty | **M** — new Evidence type/normalizer work, but no new vendor integration or Architecture Review Gate needed |
| Estimated prediction value | Low–Medium (structural estimate; unmeasured) |
| Track | **Derived-Deterministic**, explicitly renamed in scope to "goal-timing profile" — recommend the domain **not** be marketed as "Transition Intelligence" in any future sprint name, to avoid over-claiming what is actually measured |

### 4.10 Scenario Intelligence

See dedicated §5 (Scenario design is large enough to warrant its own section, including a
required naming-collision fix with the existing scoreline `ScenarioSet`).

---

## 5. Scenario design (Rule-combination layer)

### 5.1 Naming collision — must be resolved before any coding sprint

`@fas/analysis` already has a `ScenarioSet` type (`scenario.mvp.a05` policy version,
`buildScenarioSet(projection)`) that produces **mostLikely / secondLikely / upset scorelines**
from the Poisson probability distribution — a purely quantitative construct, already consumed by
Confidence and Evaluation (`ScenarioHitMetrics`). The task brief's "Scenario Intelligence"
(qualitative tags like "Early home pressure," "Low scoring tactical game") is a **completely
different concept** that happens to share the English word "scenario."

**Recommendation:** name the new construct something distinct — e.g. **Match Tactical Tags** or
**Rule Scenario Tags** — never "Scenario Engine" or "ScenarioSet." This avoids confusing two
already-shipped and newly-proposed concepts that would otherwise collide in code search, Report
copy, and future onboarding. The rest of this section uses **Match Tactical Tags**.

### 5.2 What it is

A **pure, deterministic combination function** over already-sealed `RuleResult[]` (ruleName,
status, channel, score, weight — all already exist per `packages/rule/src/domain/rule-result.ts`).
It requires **zero new Evidence** and **zero new Features** — it is a decision-table read of
Rule findings that already exist by the time Confidence runs.

```text
RuleResult[] (already sealed, same input Confidence already consumes)
        ↓ (pure function; no new Evidence; no Provider access; no AI)
   Tag Rule Table  →  MatchTacticalTag[] (id, label, triggeringRuleNames[], confidence)
        ↓ (attached overlay; never mutates Projection/Confidence numbers)
   AnalysisReport.tacticalTags  →  Workspace / Report narrative section
```

### 5.3 Mechanism (no machine learning)

A **fixed, versioned decision table** (`tacticalTags.v1`), analogous in spirit to how
`RuleEvaluator` itself is a fixed table of threshold checks. Each tag is defined as a boolean
combination of specific Rule statuses/channels — for example:

| Tag | Trigger condition (illustrative) |
|---|---|
| **Early home pressure** | `HOME_ADVANTAGE_MATERIAL` PASS **and** `HOME_ATTACK_EDGE` PASS **and** `FATIGUE_AWAY` PASS |
| **Low scoring tactical game** | `DEFENSE_HOME_STABLE` PASS **and** `DEFENSE_AWAY_STABLE` PASS **and** `XG_DOMINANCE`/`XG_DOMINANCE_AWAY` both FAIL/INAPPLICABLE (no clear xG edge) |
| **Counter-attack opportunity** | `POSSESSION_AWAY_EDGE` PASS (away concedes possession) **and** `XG_ATTACK_HOME_EDGE` PASS (home converts efficiently) |
| **Late comeback risk** | `DISCIPLINE_HOME_RISK`/`DISCIPLINE_AWAY_RISK` PASS **and** `ROTATION_PRESSURE` PASS (fatigue-driven late fragility) |
| **Set-piece dominance** | (once §4.6 ships) `SET_PIECE_VOLUME_EDGE_HOME` PASS **and** `CHANCE_CREATION_HOME_EDGE` PASS |
| **High-card match** | `DISCIPLINE_HOME_RISK` PASS **and** `DISCIPLINE_AWAY_RISK` PASS (both sides carry risk) |

Every tag definition ships with (a) the exact Rule names it reads, (b) a version id, and (c) a
`confidence` derived only from how many of its constituent Rules are PASS vs the total checked
(never a re-derived probability). Missing/INAPPLICABLE constituent Rules mean the tag is either
omitted or shown with an explicit "partial evidence" flag — never silently assumed true.

### 5.4 Governance fit

- **Not a new Engine.** It is a pure function inside `@fas/rule` or a new thin module in
  `@fas/analysis`, reading only already-exported `RuleResult[]` — the same posture DA §2.1
  requires ("Domain ≠ Engine... They live in existing packages").
- **Never touches Projection.** Tags are attached to `AnalysisReport` as a display/narrative
  overlay only, exactly like O1's `contribution` and V1A's `validation` overlays — they must not
  feed back into λ, softmax, or Confidence scoring. This preserves the Freeze v0.3 dual-input
  boundary untouched.
- **Reviewable and reproducible**, same as every other governed table in FAS: pin a version
  (`tacticalTags.v1`), and a sealed match's tags are always reproducible from its sealed
  `RuleResult[]`.

### 5.5 Expected impact and difficulty

| Field | Value |
|---|---|
| Expected impact | Medium for explainability/analyst trust; **zero** direct probability impact by design (narrative-only) |
| Dependencies | None beyond already-sealed Rule findings — can ship **before** any of §4.1–4.9 |
| Implementation difficulty | **Low** — the cheapest, lowest-risk item in this entire document |
| Estimated prediction value | N/A (explicitly narrative, not a probability input) — but highest **leverage-per-risk** of everything proposed here |

---

## 6. Domain priority matrix

Ranked by **(prediction/explainability value) ÷ (implementation difficulty + provider risk)** —
a structural judgment call, not a measured result (see §2 honesty constraint).

| Rank | Domain | Provider class (P0 legend) | Implementation difficulty | New Evidence needed? | Priority driver |
|---|---|---|---|---|---|
| 1 | **Match Tactical Tags** (§5) | DERIVABLE (Rule-combination only) | Low | No | Zero new Evidence, zero pipeline risk, immediate explainability gain |
| 2 | **Availability role-weighting** (§3.2) | DERIVABLE | Low | No | Upgrades an existing Feature; already-flagged P0 gap |
| 3 | **Momentum enhancement** (§4.5) | DERIVABLE | Low (S) | No | Cheap refinement of an existing signal |
| 4 | **Schedule Pressure / congestion extension** (§4.4) | DERIVABLE | Low–Medium (S–M) | No | Extends already-shipped I1B; avoids domain duplication |
| 5 | **M1B Manager Intelligence Feature/Rule** (§3.8) | DERIVABLE | Medium | No (M1A already shipped) | Already-authorized next sprint; not re-scoped here |
| 6 | **Team Style Intelligence** (§4.1) | DERIVABLE | Medium | No (aggregation plumbing only) | Foundation for §4.2 and future style work |
| 7 | **Transition (goal-timing profile)** (§4.9) | DERIVABLE (unused endpoint) | Medium | Yes (thin) | Unused provider capability already available |
| 8 | **Tactical Matchup Intelligence** (§4.2) | DERIVABLE | Medium | No | High-value combination, but hard-blocked on #6 |
| 9 | **Formation-family consume** (§4.7 thin slice) | PARTIAL (existing `LINEUP`) | Low–Medium (S) | No | Already-flagged P0 gap; timing-limited value |
| 10 | **Set-piece opportunity volume (thin)** (§4.6) | DERIVABLE (weak proxy) | Low–Medium (S) | No | Cheap but low-value; ship only if capacity allows |
| 11 | **Referee Intelligence** (§4.3) | DERIVABLE (self-computed) | Medium–High | Yes | Real value, but aggregation cost + quota risk |
| 12 | **Cross-league Club strength index** (§3.6) | DERIVABLE (self-ELO style) | High | No | High value, but large scope — needs its own future design pass |
| — | Defensive Shape (true), Pressing, full Set-piece attribution, full Transition | NEW PROVIDER REQUIRED | — | — | **Deferred** — no honest path without a new vendor + Architecture Review Gate |
| — | Team Style / Tactical labels (qualitative) | Governed-Knowledge | — | — | **Deferred to K1** — do not fabricate |

---

## 7. Expected prediction impact ranking

Same honesty caveat as §2/§6: this is a structural estimate, not a measured result.

| Tier | Domains | Rationale |
|---|---|---|
| **High leverage, low risk** | Match Tactical Tags (§5), Availability role-weighting (§3.2) | No new Evidence, no provider risk, directly upgrades explainability or an existing weak Feature |
| **Medium leverage, low–medium risk** | Momentum enhancement, Schedule Pressure extension, Team Style Intelligence, M1B (already authorized) | Build on shipped Evidence; moderate new plumbing |
| **Medium leverage, medium risk** | Tactical Matchup Intelligence, Transition (goal-timing) | Real new signal, but dependent on prerequisite work or new (same-vendor) endpoint wiring |
| **Low–medium leverage, medium–high risk** | Referee Intelligence, Formation-family, Set-piece (thin) | Real but second-order signals; cost may exceed value at current sample sizes |
| **Unknown / provider-blocked** | Pressing, Defensive Shape (true), full Set-piece attribution, full Transition, cross-league Club strength | No honest path today; do not build until a provider gate or a large dedicated design pass |
| **Explicitly not football-signal impact** | Any qualitative style/tactical **label** | Belongs to K1 Knowledge Engine; will never appear in this ranking as a Derived-Deterministic item |

**Cross-check against O1:** none of the above can be *proven* until it accumulates a qualified
sample under O1's existing Contribution measurement (`sampleSize ≥ 20` per domain) — this ranking
should be treated as the **build order hypothesis**, with O1/A1 as the eventual falsification
mechanism, exactly as the whole A1→A2→V1A→O1 trust track already does for existing domains.

---

## 8. Implementation roadmap (design-level; not authorized)

Phased, respecting the dependency chain identified above (§4.2 needs §4.1; Governed-Knowledge
items wait for K1). Every phase below still needs its own doc 40 Sprint id before coding starts
(see §0).

```text
Phase 0 (no dependency, can start immediately once authorized)
  └─ Match Tactical Tags (§5)                — zero new Evidence, Rule-combination only
  └─ Availability role-weighting (§3.2)      — extends existing Feature
  └─ Momentum enhancement (§4.5)             — extends existing Feature
  └─ M1B (already authorized, unrelated to this design)

Phase 1 (extends already-shipped Evidence; small plumbing)
  └─ Schedule Pressure / congestion extension (§4.4) — extends I1B
  └─ Formation-family consume, thin (§4.7)   — extends already-shipped LINEUP

Phase 2 (new aggregation plumbing; still no new vendor)
  └─ Team Style Intelligence (§4.1)          — rolling-window aggregation capability
  └─ Transition / goal-timing profile (§4.9) — wires already-integrated but unused /fixtures/events

Phase 3 (depends on Phase 2)
  └─ Tactical Matchup Intelligence (§4.2)    — hard dependency on Team Style (§4.1)

Phase 4 (new Evidence type, M1A-style pattern; higher cost)
  └─ Referee Intelligence (§4.3)             — self-computed aggregation + quota planning

Phase 5 (large, standalone design effort — not detailed further here)
  └─ Cross-league Club strength index (§3.6) — deserves its own future design document

Deferred indefinitely (provider-gated)
  └─ Pressing Intelligence (§4.8)
  └─ Defensive Shape Intelligence, true form (§4.7)
  └─ Set-piece full attribution (§4.6 beyond thin MVP)
  └─ Transition, true counter-attack rate (§4.9 beyond goal-timing)

Deferred to K1 (Knowledge Engine activation, roadmap-gated)
  └─ Any qualitative style/tactical/coach-philosophy label
```

**Relationship to `docs/40_PRODUCT_ROADMAP.md`:** Phases 0–4 above are all **Derived-Deterministic**
work that extends the existing L1–L4 domain model (DA) — they do **not** require K1/C1/S1/R1 to be
activated first, the same way L1A/P1A/M1A did not. The Governed-Knowledge items in Phase "Deferred
to K1" are, by contrast, a preview and partial refinement of **K1's own product description**
in doc 40 ("league characteristics, playing style descriptors, coach profiles/tendencies,
tactical pattern library") — this document does not compete with K1, it narrows what K1 will
eventually need to curate once activated.

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Naming collision**: new qualitative "scenario" concept vs existing quantitative `ScenarioSet` | High if unaddressed | Use "Match Tactical Tags" (§5.1), never "Scenario Engine"/"ScenarioSet" for the new concept |
| **Fabricating style/tactical labels** as if derived, when they are really judgment | High (epistemic) | Enforce the Derived-Deterministic vs Governed-Knowledge split (§1) in every future sprint's acceptance criteria |
| **Over-claiming weak proxies** (e.g. corners as "set-piece intelligence," goal-timing as "transition intelligence") | Medium | Name Features/Rules/sprints for what they actually measure (§4.6, §4.9 already renamed internally) |
| **Quota exhaustion** self-computing Referee/Team Style aggregates via live backfill on Free tier (100 req/day, per P0 §4.3) | Medium–High | Build aggregates going forward from data FAS already records, not via bulk historical backfill; use recorded cassettes for CI |
| **Confidence/Projection contamination**: any new domain accidentally entering the football softmax channel without a Freeze-review-equivalent decision | High (architectural) | Every new Rule above defaults `channel: none` until a dedicated review explicitly assigns `home+`/`away+`, mirroring how Market Intelligence stayed findings-only |
| **Domain proliferation without measurement**: shipping many thin domains before any can be O1-qualified | Medium | Sequence Phase 0 items first specifically because they are cheap enough to reach `sampleSize ≥ 20` fastest; treat O1 as the real arbiter, not this document |
| **Cross-league strength index (§3.6) scope creep** | Medium | Explicitly excluded from Phase 0–4; flagged for its own future design pass rather than folded into this one |
| **Roadmap citation gap** (this design itself is not a doc 40 id) | Medium (governance) | §0 already states this plainly; recommend adding this design's resulting Sprint ids to doc 40 before Phase 0 coding starts |

---

## 10. Recommended coding sequence

Ordered, respecting §8's dependency phases and §6/§7's priority ranking. Each line is a
**proposed** Sprint, not an authorized one (see §0).

1. **(proposed) TT1** — Match Tactical Tags (§5): pure Rule-combination overlay, zero new
   Evidence, Report/Workspace narrative section only.
2. **(proposed) AV1B** — Availability role-weighting (§3.2): upgrade `availabilityPenalty*`
   using already-ingested `PLAYER.seasonStats` position/minutes.
3. **(proposed) FD1** — Momentum enhancement (§4.5): multi-window trend Feature/Rule refinement.
4. **M1B** — already authorized next sprint (Manager Intelligence Feature/Rule/Confidence/
   Projection); unaffected by this design, listed here only for sequencing clarity.
5. **(proposed) CTX1B** — Schedule Pressure / congestion extension (§4.4) of I1B Match Context.
6. **(proposed) LU1B** — Formation-family thin consume (§4.7) of already-shipped `LINEUP`.
7. **(proposed) TS1** — Team Style Intelligence Evidence/Feature/Rule (§4.1), following the
   L1A→L1B two-step Evidence-then-consume pattern.
8. **(proposed) TX1** — Transition / goal-timing profile (§4.9): wire `/fixtures/events`,
   new thin Evidence, Feature/Rule consume.
9. **(proposed) TM1** — Tactical Matchup Intelligence (§4.2), after TS1 ships.
10. **(proposed) RF1A / RF1B** — Referee Intelligence, Evidence-then-consume, M1A-style split
    (RF1A Evidence only, RF1B Feature/Rule/Confidence/Projection), given its higher cost.
11. **(deferred, own future design pass)** Cross-league Club strength index (§3.6).
12. **(deferred, provider-gated)** Pressing, true Defensive Shape, full Set-piece attribution,
    true Transition — do not schedule until an Architecture Review Gate for a new stats provider.
13. **(deferred, roadmap-gated)** Any Governed-Knowledge style/tactical label work — waits for K1.

Before step 1 can start as real code: add the relevant proposed ids to `docs/40_PRODUCT_ROADMAP.md`
(or obtain the same kind of explicit, fully-specified task-level authorization that M1A/O1/V1A
used), per §0.

---

## 11. Must-nots (recap, unchanged by this document)

- No production code, API, schema, or package change was made to produce this document.
- No new Engine is proposed; every Derived-Deterministic item stays inside the existing
  `Feature → Rule → Analysis → Report` pipeline; every Governed-Knowledge item is explicitly
  deferred to the already-reserved K1 Knowledge Engine rather than faked now.
- No change to Architecture Freeze v0.3, the ratified dual-input Projection boundary, or the
  Market Intelligence findings-only (`channel: none`) posture.
- No new domain here claims measured prediction impact — every ranking is a structural estimate,
  explicitly falsifiable only by the existing A1/A2/V1A/O1 trust track once real samples exist.

---

## Sign-off

| Item | Status |
|---|---|
| Football Intelligence v3 Knowledge Model Design | **Complete** |
| Production code changes | **None** |
| Architecture changes | **None** |
| New Engines proposed | **None** |
| Next step | Human review of §8/§10 proposed Sprint ids; add selected ids to `docs/40_PRODUCT_ROADMAP.md` (or issue explicit task-level authorization) before any coding sprint starts |

---

*End of Football Intelligence v3 — Knowledge Model Design.*
