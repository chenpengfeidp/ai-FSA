# Player Intelligence MVP Scope Review

| Field | Value |
|---|---|
| Sprint | **Football Intelligence v2 — Wave 2** Player Intelligence MVP Scope Review |
| Date | 2026-07-24 |
| Document type | Design review (analysis only) |
| Authority (read-only) | `AGENTS.md` · `docs/PROJECT_STATE.md` · Architecture Freeze **v0.3** · `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md` · `docs/reviews/FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md` (P0) · `docs/architecture/FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md` (DA) · `docs/sprints/L1/L1B_CLUB_INTELLIGENCE_COMPLETION_REPORT.md` · `docs/sprints/B2/B2_FOOTBALL_INTELLIGENCE_CODING_SPECIFICATION.md` (B2 Coding Law) |
| Scope | Determine the highest-value **Player Intelligence** MVP implementable on existing providers |
| Explicit exclusions | Production code · architecture redesign · new Engines · new packages · DTO/schema changes · Prediction/Evaluation/Calibration mutation |

---

## 1. Executive Summary

Wave 1 (**L1 Club Intelligence**, `L1A`/`L1B`) is complete: club/league/form/manager strength Features and Rules are live in the football Projection channel. P0's Provider Capability Review already flagged **Player Impact** as **PARTIAL** — some player Facts exist in Evidence today (identity, availability, confirmed lineups), but the highest-leverage player signals (season goals/assists/minutes/rating) come from an API-Football endpoint (`/players`) that is **called nowhere in the codebase** (verified: only `/players/squads` is wired, via `mapApiFootballSquadResponse`).

**Verdict:** A **bounded** Player Intelligence MVP is achievable on the current `@fas/provider-football` stack without a new vendor, but it **must** be scoped narrowly to avoid the Free-tier quota blow-up P0 already warned about. The MVP should ingest season stats (goals, assists, minutes, starts, vendor rating) for a **small, deterministically-selected set of candidate key players per side** (not full squads), derive a simple weighted **player impact score**, and feed that into **position-weighted availability** and a new **key-player-absence** Rule pair. Everything else in this review (minutes/starts beyond that composite, goalkeeper depth, player-level recent form, captain, replacement difficulty) is **PARTIAL-to-expensive** and should be deferred to later Waves (mostly **L2 Squad Intelligence** or a **Wave 3+ Player depth** follow-on), consistent with the DA document's own L3 posture ("MVP = position-weighted availability + capped top contributors... never invent player xG... expected starting probability out of scope").

| Question | Answer |
|---|---|
| Can a Player Intelligence MVP proceed on current providers? | **Yes**, narrowly scoped |
| Highest-impact slice | **Position-weighted availability** + **key-player-absence** from season goals/assists/minutes/rating |
| Hard blocks | Player xG; Expected/probable starting XI; branded player ratings beyond vendor's own; full-squad player-stat ingest on Free tier |
| Must remain untouched | Prediction seals · Evaluation math · Calibration activation · softmax architecture |
| Architecture constraint | MVP stays inside `Provider → Evidence → Feature → Rule → Confidence → Projection → Report`; extends the existing `PLAYER` Evidence payload — does **not** invent a new Evidence type |

**Classification legend** (same as P0, applied per capability below)

| Class | Meaning |
|---|---|
| **READY** | Provider already supplies the fact; FAS can ingest without invention |
| **PARTIAL** | Provider supplies some of the signal; coverage/timing/depth/quota limits honesty or completeness |
| **DERIVABLE** | Computable deterministically from existing/ingestible Facts without a new vendor |
| **NEW PROVIDER REQUIRED** | Current vendors cannot honestly supply it |
| **NOT RECOMMENDED** | Epistemically unsafe, low prediction ROI, or invites fabrication under Freeze |

---

## 2. Provider Coverage

### 2.1 What is already wired (verified in code)

| Evidence | Endpoint used | Mapper | Coverage today |
|---|---|---|---|
| `PLAYER` | `GET /players/squads` | `map-api-football-squad.ts` | Identity only: `playerId`, `name`, `teamId`, `teamName`, `teamSide`, `position`, `number`, `nationality`, `photo`. **No stats.** |
| `INJURY` / `SUSPENSION` | `GET /injuries?fixture=` | `map-api-football-injuries.ts` | Player id/name, team, side, `kind` (injury/suspension), free-text `reason`. **Count-only** downstream — Feature (`availabilityPenalty*`) does not weight by position or player importance. |
| `LINEUP` | `GET /fixtures/lineups` | `map-api-football-lineups.ts` | **Confirmed only** (never expected/probable): formation, `startXI`, `substitutes`, coach name. Not yet consumed by any Feature/Rule (`feature-extractor.ts` has no `LINEUP` branch). |
| Manager | `GET /coachs?team=` | `map-api-football-coach.ts` | Name + start date → `managerTenureDays`; already wired into **L1B** `CLUB_INTELLIGENCE`. Not a Player-layer capability, listed for completeness. |

### 2.2 What API-Football exposes but FAS does not call (verified: no references anywhere in `packages/provider-football/src`)

| Endpoint | What it would add |
|---|---|
| `GET /players?id=&season=` | Single player, single request (no pagination): season aggregates per competition — `games.appearences/lineups/minutes/rating/captain/position`, `goals.total/assists/conceded/saves`, `cards.yellow/yellowred/red` |
| `GET /players?team=&season=` | Same shape for a full squad, but **paginated** (~20/page; a 25–30 player squad needs 2+ requests) |
| `GET /fixtures/players?fixture=` | Per-match player stats/ratings for one fixture — needed for sequenced player-level *recent form*, not season aggregates |
| `GET /players/topscorers` / `/topassists` / `/topcards` | League-wide leaderboards; a cheap way to corroborate "key player" status but is a per-league call, not per-match |
| `GET /sidelined?player=` | Historical absence spells — deeper injury-history context, not required for MVP |

### 2.3 Coverage/quota constraints that shape feasible scope (unchanged from P0)

- Free tier: **100 requests/day**; per-match enrich fan-out is already large (fixture, form, stats, H2H, venue, injuries, lineups, squads, coach ×2 sides).
- `/players?team=&season=` pagination makes **full-squad** ingest expensive (2+ requests × 2 sides × every analyzed match) — this is the quota trap P0 flagged for "Player Impact MVP."
- `/players?id=&season=` is **not paginated** — fetching a **small, bounded** set of named player ids (e.g. ≤6 per side) keeps the request count linear and predictable (≤12 extra requests per match).
- Season `rating` and advanced splits (tackles, duels) are **competition- and coverage-dependent**; Nordic/Asian leagues in FAS's default set (`DEFAULT_FOOTBALL_LEAGUE_IDS`) may return sparse or null ratings — must be honest absence, never backfilled.
- `games.captain` semantics in the vendor payload are not independently verified against FAS's default leagues; treat as **unverified until confirmed on a recorded cassette**, and do not condition a Rule on it without that verification.

---

## 3. Capability Matrix

Each row follows: **Provider support → Evidence feasibility → Feature feasibility → Rule feasibility → Prediction impact → Implementation complexity → Recommended priority.**

### 3.1 Player availability

| Dimension | Assessment |
|---|---|
| Provider support | **READY** — `/injuries?fixture=` already wired |
| Evidence feasibility | **READY** — `INJURY` / `SUSPENSION` Active today |
| Feature feasibility | **PARTIAL today → DERIVABLE enhancement** — `availabilityPenaltyHome/Away` exists but is **count-only** (injury count + suspension count); no position/role weighting |
| Rule feasibility | **READY** — `AVAILABILITY_HOME_HIT` / `AVAILABILITY_AWAY_HIT` / `*_UNKNOWN` exist; a position-weighted variant reuses the same pattern |
| Prediction impact | **High** — losing a starting striker or keeper is a materially different signal than losing a fringe squad player, and the current Feature cannot distinguish them |
| Implementation complexity | **S–M** — needs `PLAYER.position` (already captured) cross-referenced against `INJURY`/`SUSPENSION` `playerId`; no new provider call |
| Recommended priority | **Critical — MVP core** |

### 3.2 Minutes played

| Dimension | Assessment |
|---|---|
| Provider support | **PARTIAL** — `/players` `games.minutes` (season total per competition); not wired |
| Evidence feasibility | **PARTIAL** — comes free as part of the same `/players?id=` call used for goals/assists/rating (§6); no dedicated endpoint needed |
| Feature feasibility | **DERIVABLE** — minutes share (minutes ÷ team minutes available) is a deterministic ratio |
| Rule feasibility | **PARTIAL** — useful as a *weighting input* to key-player/impact Rules, not a standalone Rule |
| Prediction impact | **Medium** — mainly disambiguates "nominal starter" from "rotation player" when ranking contributors |
| Implementation complexity | **S** (bundled with §3.9/§3.12 ingest) |
| Recommended priority | **Medium — MVP supporting field, not a standalone deliverable** |

### 3.3 Starts

| Dimension | Assessment |
|---|---|
| Provider support | **PARTIAL** — `/players` `games.lineups` (season starts count); not wired |
| Evidence feasibility | **PARTIAL** — same call as minutes/goals/rating |
| Feature feasibility | **DERIVABLE** — start rate = lineups ÷ appearances |
| Rule feasibility | **PARTIAL** — supporting input, not standalone |
| Prediction impact | **Medium** — helps confirm a player is a genuine first-choice starter before weighting their absence heavily |
| Implementation complexity | **S** (bundled) |
| Recommended priority | **Medium — MVP supporting field** |

### 3.4 Goals

| Dimension | Assessment |
|---|---|
| Provider support | **READY** — `/players` `goals.total` (season, per competition) |
| Evidence feasibility | **PARTIAL → READY once wired** — single-player call, no pagination |
| Feature feasibility | **DERIVABLE** — goal contribution rate (goals ÷ appearances or ÷ 90-min equivalents) |
| Rule feasibility | **DERIVABLE** — feeds `KEY_PLAYER_ABSENCE_*` when a top scorer is in the current absence list |
| Prediction impact | **High** — "is the top scorer playing" is one of the strongest classical pre-match signals not yet captured |
| Implementation complexity | **S–M** |
| Recommended priority | **Critical — MVP core** |

### 3.5 Assists

| Dimension | Assessment |
|---|---|
| Provider support | **READY** — `/players` `goals.assists`, same call as goals |
| Evidence feasibility | **READY once wired** (zero marginal ingest cost over §3.4) |
| Feature feasibility | **DERIVABLE** — combine with goals into a single attacking-contribution composite |
| Rule feasibility | **DERIVABLE** — same `KEY_PLAYER_ABSENCE_*` pathway |
| Prediction impact | **Medium–High** — weaker alone than goals, strong as part of a combined score |
| Implementation complexity | **S** (bundled with §3.4) |
| Recommended priority | **High — MVP core (bundled with goals)** |

### 3.6 Cards

| Dimension | Assessment |
|---|---|
| Provider support | **READY** — `/players` `cards.yellow/yellowred/red` (season totals) |
| Evidence feasibility | **PARTIAL** — available from the same call, but downstream use is thin |
| Feature feasibility | **NOT RECOMMENDED as forward-looking signal** — a "discipline risk index" that tries to *predict* an upcoming suspension from accumulated cards would mean forecasting a future `SUSPENSION` Evidence before it is confirmed, which crosses into invention; team-level discipline is already covered by existing Advanced Statistics Rules (`DISCIPLINE_HOME_RISK` / `DISCIPLINE_AWAY_RISK`) |
| Rule feasibility | **NOT RECOMMENDED** for the same reason |
| Prediction impact | **Low** for anything honest; **negative** if misused to "predict" suspensions |
| Implementation complexity | S if only stored as a descriptive field; not applicable if a Rule is attempted |
| Recommended priority | **Low — defer / do not build a Rule on this** |

### 3.7 Recent form (player-level)

| Dimension | Assessment |
|---|---|
| Provider support | **PARTIAL** — requires `/fixtures/players?fixture=` per historical fixture to sequence per-match ratings; no season "recent form" field exists |
| Evidence feasibility | **PARTIAL** — quota-heavy: one call per historical fixture per player of interest |
| Feature feasibility | **DERIVABLE** once sequenced, but redundant with season `rating` (§3.9) at MVP granularity |
| Rule feasibility | **PARTIAL** |
| Prediction impact | **Medium** — real signal, but season rating already captures most of it cheaply |
| Implementation complexity | **L** — pagination/fan-out risk P0 already flagged for `/fixtures/players` |
| Recommended priority | **Low for MVP — defer to a dedicated Wave 3+ Player Form follow-on** |

### 3.8 Goalkeeper statistics

| Dimension | Assessment |
|---|---|
| Provider support | **PARTIAL** — team-level `saves` already exists in `STATISTICS.advanced`; player-level GK stats (`goals.saves`, `goals.conceded`) available via `/players?id=` for a goalkeeper id |
| Evidence feasibility | **PARTIAL** — requires reliably identifying the *starting* goalkeeper before kickoff, which is itself timing-gated on `LINEUP` (confirmed only, 20–75 min pre-KO); before that, only the squad-listed primary GK is a heuristic, not a confirmed Fact |
| Feature feasibility | **DERIVABLE** once a GK id is known, but the honesty of "starting GK" pre-lineup is weaker than other MVP items |
| Rule feasibility | **DERIVABLE** (`GK_QUALITY_EDGE`) but should be explicitly labelled "primary/likely goalkeeper," not "starting" |
| Prediction impact | **Medium–High in principle**, undermined by the pre-lineup identification caveat |
| Implementation complexity | **M** |
| Recommended priority | **Medium — good Wave 3/4 candidate once Confirmed Lineup consume (Wave 2) lands; out of this MVP** |

### 3.9 Player rating (provider-supported)

| Dimension | Assessment |
|---|---|
| Provider support | **PARTIAL** — `/players` `games.rating` is a real vendor-computed average rating per competition/season; it is the vendor's own model output, not a raw Fact like a goal count, and coverage is competition-dependent |
| Evidence feasibility | **PARTIAL** — same single-player call as goals/assists/minutes; must be labelled "vendor rating," honest-absent where null |
| Feature feasibility | **DERIVABLE** — `playerQualityIndex` from rating when present |
| Rule feasibility | **DERIVABLE** — supporting input to `KEY_PLAYER_ABSENCE_*` / impact score, not a Rule on its own |
| Prediction impact | **Medium** — useful corroborating signal where present; frequently sparse in FAS's Nordic/Asian default leagues |
| Implementation complexity | **S** (bundled with §3.4/§3.5 ingest — zero marginal call cost) |
| Recommended priority | **High — MVP core (bundled), but never the sole basis for a Rule given coverage gaps** |

### 3.10 Position

| Dimension | Assessment |
|---|---|
| Provider support | **READY** — already captured today in `PLAYER` payload (`position` field from `/players/squads`) |
| Evidence feasibility | **READY** — Active today |
| Feature feasibility | **READY as an enabling input** — needed to classify GK/DF/MF/FW for availability weighting and impact scoring; not a Feature in its own right |
| Rule feasibility | Not a standalone Rule; a precondition for §3.1 and §3.12/§3.13 |
| Prediction impact | **Enabling** — without it, position-weighted availability and key-player identification cannot be built honestly |
| Implementation complexity | **S** — data already exists, only new consumption logic needed |
| Recommended priority | **Critical — MVP prerequisite (no new ingest required)** |

### 3.11 Captain

| Dimension | Assessment |
|---|---|
| Provider support | **PARTIAL** — `games.captain` appears in `/players` season statistics and (separately) lineup entries may tag a captain; exact semantics for FAS's default leagues are **not verified** |
| Evidence feasibility | **PARTIAL**, and timing-gated on Confirmed Lineup for the match-specific captain |
| Feature feasibility | **NOT RECOMMENDED for MVP** — thin standalone signal (captaincy is largely a leadership/narrative marker, not a strong statistical predictor on its own) and the underlying flag is unverified |
| Rule feasibility | **NOT RECOMMENDED** until the flag's meaning is confirmed against a recorded cassette |
| Prediction impact | **Low** |
| Implementation complexity | S to record, but low value for the cost of verification |
| Recommended priority | **Low — defer; at most a descriptive field surfaced alongside Confirmed Lineup consume (Wave 2), never a Rule input** |

### 3.12 Key player identification

| Dimension | Assessment |
|---|---|
| Provider support | **DERIVABLE** from §3.4/§3.5/§3.9/§3.2/§3.3 once ingested — no dedicated endpoint |
| Evidence feasibility | **DERIVABLE** — a deterministic ranking over the season-stats Evidence for a capped candidate set (§6) |
| Feature feasibility | **DERIVABLE** — e.g. `keyAttackerImpactHome/Away`, `keyDefenderImpactHome/Away` as a fixed-weight composite of goal contribution rate, minutes/start share, and rating (when present) |
| Rule feasibility | **DERIVABLE** — `KEY_PLAYER_ABSENCE_HOME` / `_AWAY`: PASS when a top-ranked contributor (by the composite) appears in the current `INJURY`/`SUSPENSION` list |
| Prediction impact | **Critical** — this is the single highest-value new Player capability: it converts "a player is injured" into "a *material* player is injured" |
| Implementation complexity | **M** — requires the capped ingest (§6) plus a simple, documented, non-ML weighting formula |
| Recommended priority | **Critical — MVP core** |

### 3.13 Player impact estimation

| Dimension | Assessment |
|---|---|
| Provider support | **DERIVABLE** — same inputs as §3.12; this is the generalization of "key player" into a continuous score rather than a threshold |
| Evidence feasibility | **DERIVABLE** |
| Feature feasibility | **DERIVABLE** — a bounded [0,100] `playerImpactScore` per candidate player, never described as a probability or as "player xG" |
| Rule feasibility | **DERIVABLE** — the impact score is what §3.12's Rule thresholds against; must stay a **fixed deterministic formula**, not a fitted/learned model (B2 §8.4/§9.3: Features/Rules must be deterministic, no ML) |
| Prediction impact | **High** — same underlying driver as key-player identification, expressed continuously for Confidence/limitations text |
| Implementation complexity | **M** |
| Recommended priority | **Critical — MVP core (same deliverable as §3.12, expressed as a score rather than a boolean)** |

### 3.14 Replacement difficulty

| Dimension | Assessment |
|---|---|
| Provider support | **DERIVABLE in principle, NEW-PROVIDER-EFFORT in practice** — requires comparing an absent player's impact score against the *next-best same-position teammate*, which means ingesting stats for the **whole squad per position**, not just the capped candidate set |
| Evidence feasibility | **PARTIAL** — would require the paginated `/players?team=&season=` full-squad pull P0 already flagged as quota-hostile |
| Feature feasibility | **DERIVABLE but out of MVP budget** — `replacementGapHome/Away` is a reasonable *future* Feature |
| Rule feasibility | **DERIVABLE but out of MVP budget** |
| Prediction impact | **Medium** — real signal (a deep squad absorbs a star absence better than a thin one) but this is fundamentally an **L2 Squad Depth** question (already scoped in the Domain Architecture as `squadDepthHome/Away` / `SQUAD_DEPTH_EDGE`), not an L3 Player-only capability |
| Implementation complexity | **L** — full-squad quota cost |
| Recommended priority | **Deferred — belongs to a future L2 Squad Intelligence sprint, not this Player Intelligence MVP** |

---

## 4. MVP Scope

The recommended Player Intelligence MVP is the **intersection of "Critical" rows above that share a single, quota-bounded ingest path**:

1. **Position-weighted availability** (§3.1, using data already in Evidence — `PLAYER.position` × `INJURY`/`SUSPENSION`)
2. **Key player identification + player impact estimation** (§3.12/§3.13), fed by a **capped season-stats ingest** covering:
   - Goals (§3.4)
   - Assists (§3.5)
   - Minutes / starts as supporting weighting fields (§3.2/§3.3)
   - Vendor rating, honest-absent where uncovered (§3.9)

**Explicit MVP boundary:** ingest is limited to a **small, deterministically-selected candidate set per side** (recommended ≤6 players: all forwards/attacking midfielders on the squad plus the primary listed goalkeeper), fetched via the **non-paginated** `GET /players?id=&season=` call — never the paginated full-squad endpoint. This keeps the added request count to roughly ≤12 per analyzed match (≤6 per side), consistent with P0's quota-safety guidance ("cap players; paid tier; recorded cassettes; no Free-tier live polling loops").

**Explicitly out of MVP scope** (see §5): full-squad ingest, goalkeeper depth beyond the primary listed GK, player-level recent form sequencing, cards/discipline forecasting, captain, replacement difficulty.

---

## 5. Deferred Capabilities

| Capability | Reason deferred | Suggested future home |
|---|---|---|
| Minutes/starts as standalone Features/Rules | Low standalone value beyond weighting inputs already covered in MVP | Fold into MVP composite; no dedicated Wave needed |
| Cards / discipline forecasting | Risks forecasting a not-yet-confirmed `SUSPENSION`; team-level discipline Rules already exist | Not recommended at all under current honesty rules |
| Player-level recent form | Requires per-fixture `/fixtures/players` sequencing; quota-heavy; redundant with season rating at MVP grain | Wave 3+ Player Form follow-on, after MVP proves Evaluation uplift |
| Goalkeeper statistics (dedicated) | Pre-lineup "starting GK" is a heuristic, not confirmed; best done after Confirmed Lineup consume | Wave 3/4, sequenced after Wave 2 (Confirmed Lineup) |
| Captain | Thin signal; underlying vendor flag semantics unverified | At most a descriptive field with Wave 2 Confirmed Lineup; never a Rule |
| Replacement difficulty | Requires full-squad ingest (quota-hostile); conceptually an L2 Squad Depth capability | Future **L2 Squad Intelligence** sprint (`squadDepthHome/Away`, `SQUAD_DEPTH_EDGE`) |
| Player xG | No honest per-player xG product from current providers (P0 §3.3) | Not recommended without a new provider gate |
| Expected/probable starting XI | No Fact endpoint; `/predictions` is vendor forecast, not a Fact | Not recommended (reaffirmed from P0 §3.2 / §5.3) |

---

## 6. Recommended Evidence

**No new Evidence type.** Per the Domain Architecture's own guidance ("Expand stats via payload / subject STATISTICS — prefer reuse over new Engine types"), extend the **existing** `PLAYER` Evidence payload with **optional** season-stat fields, populated only for the capped candidate set:

| Field | Source | Honesty rule |
|---|---|---|
| `seasonAppearances` | `games.appearences` | Omit if provider returns null |
| `seasonStarts` | `games.lineups` | Omit if null |
| `seasonMinutes` | `games.minutes` | Omit if null |
| `seasonRating` | `games.rating` | Omit if null or non-numeric string; never averaged/estimated by FAS |
| `seasonGoals` | `goals.total` | Omit if null; default to 0 only when the provider explicitly returns `0`, never on missing key |
| `seasonAssists` | `goals.assists` | Same rule as goals |
| `isPrimaryGoalkeeper` | Derived from squad `position === "Goalkeeper"` and (when available) lineup appearance count | Descriptive flag only — never claims "starting" pre-lineup |

Existing identity-only `PLAYER` records (for players outside the capped candidate set) are **unchanged** — this is additive, not a payload redesign, and remains backward compatible with the current `player-evidence.spec.ts` identity-only shape.

**Provider mapping work implied (for the next Coding Sprint, not this review):** a new mapper analogous to `map-api-football-squad.ts` that calls `GET /players?id=&season=` for the capped candidate ids and merges the optional fields onto the corresponding `PLAYER` record; honest-absence (skip the field) when the provider omits it.

---

## 7. Recommended Features

All Features are derived exclusively from `PLAYER` Evidence (extended per §6) and existing `INJURY`/`SUSPENSION` Evidence — never from raw provider JSON, per B2 §8.

| Feature | Inputs | Range / notes |
|---|---|---|
| `positionWeightedAvailabilityHome` / `Away` | `PLAYER.position` × `INJURY`/`SUSPENSION` for that side | Deepens existing `availabilityPenalty*`; a goalkeeper or forward absence weighs more than a fringe squad player absence; omitted when no absences exist (same as today) |
| `keyAttackerImpactHome` / `Away` | `seasonGoals`, `seasonAssists`, `seasonMinutes`/`seasonStarts`, `seasonRating` (when present) for forward/attacking-mid candidates | [0,100] composite; fixed deterministic weights (documented in the eventual Coding Sprint, not invented per-call); omitted when no candidate has sufficient season-stats coverage |
| `keyPlayerAbsenceImpactHome` / `Away` | `keyAttackerImpact*` (or GK-equivalent) intersected with current `INJURY`/`SUSPENSION` list | [0,100]; 0 when no key candidate is absent; omitted (not zero) when key-player Features themselves are absent due to missing season stats |
| `gkQualityIndexHome` / `Away` *(optional, only if MVP is extended to include the primary GK)* | `seasonRating`, `goals.saves`/`goals.conceded` for the squad-listed primary goalkeeper | [0,100]; explicitly labelled "primary/likely," never "starting," pre-lineup |

Every Feature must reference its originating `PLAYER` (and, where relevant, `INJURY`/`SUSPENSION`) Evidence ids, consistent with L1B's pattern. If season-stats coverage is missing for all candidates on a side, the Feature is **omitted**, not zero-filled.

---

## 8. Recommended Rules

Rules consume the Features in §7 only — never `PLAYER`/`INJURY`/`SUSPENSION` Evidence or provider JSON directly, per B2 §9.

| Rule | Channel | Required Features | Notes |
|---|---|---|---|
| `KEY_PLAYER_ABSENCE_HOME` | `away+` | `keyPlayerAbsenceImpactHome` | A material home-side absence is evidence *for* the away side, mirroring the existing `AVAILABILITY_HOME_HIT` → `away+` pattern |
| `KEY_PLAYER_ABSENCE_AWAY` | `home+` | `keyPlayerAbsenceImpactAway` | Mirror of the above |
| `POSITION_WEIGHTED_AVAILABILITY_HOME` / `_AWAY` | `away+` / `home+` | `positionWeightedAvailabilityHome/Away` | Deepens (does not replace) the existing `AVAILABILITY_*_HIT` Rules; both can coexist during a transition, or the existing Rules can be re-pointed at the deepened Feature in the eventual Coding Sprint — a redesign decision for that sprint, not this review |
| `GK_QUALITY_EDGE` *(optional, MVP-extended)* | `home+` | `gkQualityIndexHome`, `gkQualityIndexAway` | Only if the MVP is extended to include GK; otherwise deferred per §5 |

All new Rules follow the existing PASS/FAIL/INAPPLICABLE framework — `INAPPLICABLE` whenever the underlying Features are absent (no season-stats coverage), never fabricated as FAIL.

**Confidence impact (for the eventual Coding Sprint):** add `PLAYER` season-stats coverage to `evidenceCompleteness`; add the new Rule names to `P1_CHANNEL_RULES`; add a limitation string when key-player candidates lack season-stats coverage. **Projection impact:** add the new Rule names to `footballChannelRules`, exactly like every prior Wave — no softmax change.

---

## 9. Prediction ROI

| Item | Expected impact if done honestly | Confidence in estimate | Cost (requests / complexity) |
|---|---|---|---|
| Position-weighted availability | **Medium–High** — turns an already-Active but blunt Feature into a materially better one, at near-zero marginal cost | High | Very low (no new provider call) |
| Key player identification + impact estimation | **High** — closest analogue to "is the star player playing," a classical strong pre-match signal that FAS currently cannot express at all | Medium-high | Low–Medium (≤12 extra requests/match, capped candidate set) |
| Vendor player rating (bundled) | **Medium** — corroborating signal where covered; sparse in Nordic/Asian default leagues | Medium (coverage-gated) | Zero marginal (same call as goals/assists) |
| Goalkeeper statistics (if extended) | **Medium–High in principle**, discounted by pre-lineup identification uncertainty | Medium | Low (same call pattern) |
| Deferred items (§5) | Individually **Low-to-Medium**, several carry **quota or invention risk** that outweighs near-term uplift | Varies | Medium–High (pagination, sequencing, or full-squad ingest) |

**Net assessment:** the MVP as scoped in §4 is the best available **impact-per-request** trade on current providers — it reuses P0's own "Player Impact MVP" framing (Wave 3 in P0's roadmap / W3 in the DA roadmap) but narrows it further to the single highest-leverage slice (key-player absence + position-weighted availability) rather than attempting player form, GK depth, or replacement difficulty in the same sprint.

---

## 10. Final Recommendation

1. **Adopt this review's MVP scope** (§4) as the authorized Player Intelligence coding boundary for the next Football Intelligence coding sprint — do **not** expand it opportunistically to goalkeeper depth, player form, captain, or replacement difficulty in the same sprint.
2. **Extend the existing `PLAYER` Evidence payload** (§6) rather than inventing a new Evidence type or Engine.
3. **Cap ingest** to ≤6 candidate players per side via the non-paginated `GET /players?id=&season=` call — never the paginated full-squad endpoint — to stay inside Free-tier quota discipline.
4. **Build exactly two Feature families and their Rules**: position-weighted availability, and key-player identification/impact — both consuming Features only, both `INAPPLICABLE`-safe when season-stats coverage is missing.
5. **Defer** minutes/starts-as-standalone, cards/discipline forecasting, player-level recent form, dedicated goalkeeper depth, captain, and replacement difficulty (§5) — replacement difficulty in particular should be re-scoped as a future **L2 Squad Intelligence** sprint rather than folded into Player Intelligence.
6. **Keep Prediction, Evaluation, and Calibration untouched** — measure the MVP's uplift only through the existing A1/A1.5 Evaluation History path, exactly as every prior Wave has done.
7. **Do not treat this review as coding authorization by itself** — per B2 §24/§25, an explicit human/sprint authorization citing this review is still required to begin the coding sprint.

**Acceptance checklist**

- [x] Review completed
- [x] Capability matrix (14 capabilities, Provider/Evidence/Feature/Rule/Impact/Complexity/Priority)
- [x] MVP scope defined and bounded
- [x] Deferred capabilities enumerated with reasoning and future home
- [x] Recommended Evidence, Features, Rules specified (design-level, not code)
- [x] Prediction ROI assessed
- [x] No production code
- [x] No architecture redesign

---

## References

- `docs/reviews/FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md` (P0)
- `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md`
- `docs/architecture/FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md` (DA)
- `docs/sprints/L1/L1A_CLUB_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md`
- `docs/sprints/L1/L1B_CLUB_INTELLIGENCE_COMPLETION_REPORT.md`
- `docs/sprints/B2/B2_FOOTBALL_INTELLIGENCE_CODING_SPECIFICATION.md`
- `docs/50_EVIDENCE_CATALOG.md`
- `packages/provider-football/src/mapper/map-api-football-squad.ts`
- `packages/provider-football/src/mapper/map-api-football-injuries.ts`
- `packages/provider-football/src/mapper/map-api-football-lineups.ts`
- `packages/provider-football/src/mapper/map-api-football-coach.ts`
- `packages/feature/src/extraction/feature-extractor.ts`
- `packages/evidence/src/domain/evidence.ts`
- `packages/evidence-normalizer/test/player-evidence.spec.ts`
- `packages/evidence-normalizer/test/availability-evidence.spec.ts`

---

*End of Player Intelligence MVP Scope Review.*
