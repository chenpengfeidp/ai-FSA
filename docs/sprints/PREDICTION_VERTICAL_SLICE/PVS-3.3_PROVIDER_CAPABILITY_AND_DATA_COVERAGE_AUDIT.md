# PVS-3.3 — Football Intelligence Provider Capability & Data Coverage Audit

**Sprint id:** PVS-3.3  
**Roadmap:** `docs/40_PRODUCT_ROADMAP.md` (v0.2 baseline vertical-slice product phase; PVS-3.3 is an explicitly authorized audit follow-up)  
**Architecture Freeze:** v0.3  
**Audit date:** 2026-08-27  
**Scope:** Repository and official-provider capability audit only  
**Production code changes:** None  
**Provider purchase / credential changes:** None  

---

## 1. Executive summary

The current deterministic production pipeline has a smaller hard provider dependency than the
broader Football Intelligence product vocabulary suggests.

The minimum non-blocked Projection V2 path needs:

1. fixture identity, teams, home/away orientation and kickoff (`MATCH_INFO`);
2. recent results and goals for/against for both teams (`TEAM_FORM`);
3. team-level statistics for both teams (`STATISTICS`);
4. deterministic derivation of the seven foundation Features used by Football State and
   Projection V2.

API-Football exposes the fixture, historical fixture, team-statistics and H2H products used by the
current adapter, and in principle can supply that core fact set. Standings, squads, injuries,
confirmed lineups, coaches and player season statistics can enrich the same path when the
competition-season and individual fixture actually contain them. They are optional under the
current honest-absence contract.

The Odds API can supply current bookmaker 1X2 and, where a bookmaker/sport exposes them, generic
spreads and totals. It cannot be treated as a football-facts provider. Its official API does not
document betting volume, public-money percentages, ticket percentages, sharp-money flags or a
labelled true opening price. Historical snapshots are a paid product and must not be confused
with guaranteed bookmaker opening odds.

Two separate operational limitations remain:

- the currently configured API-Football credential is valid, but its Free entitlement rejects the
  current 2026 season;
- the repository has no general `football:*` ↔ The Odds API event crosswalk, so its live odds
  primer only works for three demo catalog bindings rather than arbitrary live football fixtures.

Deep tactical concepts such as pressing, build-up chains, transition events, shot locations and
post-shot xG are neither required by the current Projection V2 implementation nor honestly
available from the integrated providers. They would require a specialty data source if later made
first-class provider facts. Approved tactical knowledge or analyst observations may instead enter
as separately governed external Evidence; an LLM statement must remain narrative/inference and
cannot substitute for a fact.

### Decision

## Option C — Providers are sufficient for the current pipeline, but market-intelligence requirements require an additional data acquisition layer.

This means:

- API-Football is sufficient in product capability for the current football-facts minimum, subject
  to paid/current-season entitlement and per-league/per-fixture coverage;
- The Odds API is sufficient for optional current 1X2 and partial spreads/totals, subject to event
  matching and bookmaker availability;
- current market-depth Features cannot be populated live from either documented integrated
  product alone;
- no third provider is required merely to execute the current Projection V2 algorithm;
- a different specialty provider is required only if deep tactical/shot-model facts or licensed
  public-money/volume data become mandatory product requirements.

---

## 2. Audit method and classification

This audit used:

- actual Provider ports, live adapters, mappers, normalizers and recorded cassettes;
- actual `EvidenceType`, Feature extraction, Rule evaluation, Football State, Match Script,
  Projection V2, Unified Matrix, confidence and report code;
- existing repository provider reviews and completion evidence;
- official API-Football and The Odds API public documentation only for vendor capability claims;
- PVS-3.2 runtime evidence for the current credential's 2026 entitlement.

Classification:

| Tag | Meaning |
|---|---|
| **A** | Provider Fact — returned by a provider and preserved with provenance |
| **B** | Deterministic derived Feature/finding — computed from Evidence, never claimed as vendor fact |
| **C** | External Market Evidence — bookmaker/market observation, not football truth |
| **D** | LLM/narrative-only information — inference text; never a deterministic input or Provider Fact |
| **E** | Currently unavailable — no honest implemented source |

Capability wording:

- **Endpoint** means an official endpoint exists.
- **Coverage** means a competition-season advertises the relevant category.
- **Entitlement** means the current credential may access that season/product.
- **Availability** means the requested fixture actually returned the field.
- None of those four conditions implies the other three.

---

## 3. Current pipeline data dependency map

```text
API-Football / recorded football bundle
  → MATCH_INFO + TEAM_FORM(home/away) + STATISTICS(home/away)
  → optional H2H / Venue / xG / Context / Club / Player / Manager / Availability / Lineup

The Odds API / recorded market overlay
  → optional ODDS Evidence

Evidence
  → FeatureExtractor
  → RuleEvaluator
  → Football State                    (Features only)
  → Match Script activation           (Football State only; not Rules)
  → Projection V2 lambdas
  → per-script matrices
  → Unified Probability Matrix
  → 1X2 / scorelines / goal range / BTTS / O-U
  → Confidence / Explainable Report
```

### 3.1 Hard minimum

The current production implementation counts five required Evidence presences:

| Required Evidence | Count |
|---|---:|
| `MATCH_INFO` | 1 |
| home `TEAM_FORM` | 1 |
| away `TEAM_FORM` | 1 |
| home `STATISTICS` | 1 |
| away `STATISTICS` | 1 |

Those records must yield the seven blocking foundation Features:

- `attackRatingHome`, `attackRatingAway`
- `defenseRatingHome`, `defenseRatingAway`
- `momentumHome`, `momentumAway`
- `homeAdvantage`

`homeAdvantage` is currently a governed deterministic constant, not a live provider field.

If a foundation Feature is missing, `FootballStateProjectionInputs.blocked` becomes true and the
report cannot seal a successful deterministic projection. All deeper intelligence families are
optional and become neutral/absent with explicit limitations.

The analysis math treats `HEAD_TO_HEAD` as optional, but the current
`LiveApiSportsMatchCatalog.ensureMatchBundle()` adapter rejects a live enrichment when its mapped
H2H response is missing. This is an adapter-level operational gate beyond the five-Evidence
projection minimum.

### 3.2 Major Feature and Rule dependency families

| Evidence family | Major derived Features | Rule / downstream use |
|---|---|---|
| `MATCH_INFO` | team identities, kickoff, `homeAdvantage` | presence Rules; foundation Projection input |
| `TEAM_FORM` + `STATISTICS` | attack/defence ratings, momentum, form, scoring/conceding rates | core football Rules; blocking Football State / lambda inputs |
| `STATISTICS.advanced` | attack efficiency, possession, chance creation, discipline risk | advanced-stat Rules; optional attack/defence/control/risk contributions |
| `EXPECTED_GOALS` | xG attack/defence quality, dominance, finishing efficiency | xG Rules; optional lambda xG group |
| `MATCH_CONTEXT` | fatigue, schedule advantage, home stability, rotation pressure, knockout context | context Rules; optional pressure/risk/context lambda group |
| `CLUB_INTELLIGENCE` | points/goal-difference/attack/defence/league/club/form strength | club Rules; optional attack/defence/club-strength lambda groups |
| `PLAYER` | availability, key-player and squad scores, attack contribution, goalkeeper reliability | player Rules; optional attack/player-availability lambda groups |
| `INJURY` / `SUSPENSION` | availability penalties | availability Rules and optional suppressor group |
| `MANAGER_INTELLIGENCE` | tenure, experience, continuity, change risk, career stability | manager Rules; Football State pressure/risk only |
| `HEAD_TO_HEAD` | H2H lean/sample | Rules/confidence only; not a V2 lambda group |
| `VENUE` | fixed venue-advantage Feature when present | venue Rule; optional context lambda group |
| `ODDS` | implied probabilities, market/AH lean, consensus, movement, volatility, sharp support | market Rules use `channel: none`; confidence/recommendation only |
| `LINEUP` | no direct Feature family today | report/raw Evidence only |
| `WEATHER`, `NEWS`, `RANKING` | none | typed but unused |

### 3.3 Projection truth

- Football State aggregates Features only; it does not read Provider payloads, Evidence or Rules.
- Match Script activation consumes Football State dimensions/tags only.
- `activatingRules` and Football State `driverRuleNames` are empty in the current implementation.
- Rules do not change V2 lambdas, script weights or Unified Matrix cells.
- Rules contribute to projection confidence, contradiction checks, recommendation and
  explainability.
- Market Rules are findings-only and never enter football probability math.
- Scorelines, goal ranges, BTTS and O/U are all derived from the one merged matrix.

The requested phrase “rules consumed by Match Script” therefore maps to **none** in the current
production implementation.

---

## 4. Provider capability matrix

The required matrix preserves the requested columns. Classification tags appear in the first
column.

| Intelligence requirement | Current pipeline consumer | Evidence type | Provider/source | API-Football | The Odds API | Existing repository support | Gap | Priority |
|---|---|---|---|---|---|---|---|---|
| **[A] Upcoming fixtures** | Match Center / fixture discovery | `MATCH_INFO` precursor | Football schedule | `/fixtures` endpoint; coverage and season entitlement required; current Free key rejects 2026 | Current `/odds` returns upcoming events with odds, not football facts authority | Live/recorded football list implemented; explicit fallback flag | Current-season entitlement; live rows may be empty | **P0 blocker for live smoke** |
| **[A] Fixture identity** | import / analyze | `MATCH_INFO` | API-Football fixture id | Supported by `/fixtures` | Has separate event id | `football:{fixtureId}` and `odds:{eventId}` identities implemented | No general cross-provider id bridge | **P0 integration** |
| **[A] Kickoff** | discovery, report, context | `MATCH_INFO` | fixture/event timestamp | Supported | Supported for market event | Mapped and normalized | Must reconcile provider timestamps/event identity | P0 |
| **[A] Competition** | discovery, team stats, report | `MATCH_INFO` | league/season | Supported when league-season exists | Supported as sport key/title | Mapped | Sport-key ↔ league-id crosswalk incomplete | P1 |
| **[A] Home/away orientation** | all side-specific Features | `MATCH_INFO` | fixture teams | Supported | Supported | Resolver preserves/swaps orientation explicitly | Cross-provider team-name matching absent | **P0** |
| **[A] Standings** | Club Intelligence | `CLUB_INTELLIGENCE` | `/standings` | Endpoint exists; needs league-season standings coverage | Unsupported | Live fetch + deterministic mapping implemented | Per-season/competition completeness | P1 |
| **[A] Recent form** | core ratings/momentum | `TEAM_FORM` | recent `/fixtures?team&last=10` | Endpoint source exists; current adapter requires mappable form | Scores only, short recent-results proxy | Live + recorded mapping implemented | API-Football form/H2H absence currently fails match enrichment | **P0 core** |
| **[A] Head-to-head** | H2H Rule/confidence only | `HEAD_TO_HEAD` | `/fixtures/headtohead` | Endpoint exists; actual sample may be empty | Unsupported | Live + recorded mapping implemented | Projection math is optional, but current live bundle adapter fails when mapped H2H is absent | **P0 adapter gate** |
| **[A] Goals for/against** | core ratings, scoring rates | `TEAM_FORM`, `STATISTICS` | historical fixtures/team stats | Supported | Scores can provide thin proxy only | Implemented | Odds scores lookback is not a season fact source | **P0 core** |
| **[A] Home/away performance** | form decomposition / club strength | `TEAM_FORM`, `CLUB_INTELLIGENCE` | fixtures + team stats/standings | Supported from fixture history/team aggregates where data exists | Unsupported beyond event odds | Deterministically split in mapper | Sparse samples / season access | P1 |
| **[A] Team statistics** | core and advanced Features | `STATISTICS` | `/teams/statistics` | Endpoint exists; season/league scoped | Unsupported as football fact | Live fetch/mapping implemented | Actual metric completeness varies | **P0 core** |
| **[A] xG/xGA** | xG Features and lambda group | `EXPECTED_GOALS` | fixture statistics labels | Possible only when fixture statistics expose xG; not guaranteed pre-match or by league | Unsupported | Mapper and recorded rich cassette implemented | Uniform live pre-match xG unavailable | P1 optional |
| **[A] Shot statistics** | advanced Features | `STATISTICS.advanced` | fixture/team statistics | Fixture statistics endpoint; generally match-time/post-match and coverage-gated | Unsupported | Mapper supports shots/SoT; rich cassette only | Pre-match fixture stats are commonly empty; historical aggregation needed | P1 |
| **[A] Defensive statistics** | defence/risk Features | `STATISTICS`, `PLAYER` | team/player stats | Goals against/cards plus covered player stats; no guaranteed pressure model | Unsupported | Partial mapping | Tackles/interceptions depth and uniformity not guaranteed | P2 |
| **[B] Strength indicators** | Club/core Features | derived from form/stats/standings | deterministic FAS Feature | No branded ELO/SPI fact | Market price is not a strength fact | Club/attack/defence/form strength implemented | External branded strength absent; self-ELO not implemented | P2 |
| **[A] Squad** | Player Intelligence | `PLAYER` | `/players/squads` | Endpoint exists; current-squad oriented | Unsupported | Live fetch/mapping, capped candidate coverage | Not a historical fixture squad guarantee | P1 |
| **[A] Injuries** | availability/player Features | `INJURY`, `PLAYER` | `/injuries` | Endpoint/coverage exists; actual fixture may be empty | Unsupported | Implemented | Completeness/severity not guaranteed | P1 |
| **[A] Suspensions** | availability/player Features | `SUSPENSION`, `PLAYER` | injury/availability response classification | Supported only when provider classifies returned absence | Unsupported | Implemented mapper classification | Dedicated completeness not guaranteed | P1 |
| **[A] Sidelined history** | potential availability history | none directly | `/sidelined` official product | Endpoint exists; not used by repository | Unsupported | Not implemented | Would need a separately gated Evidence mapping | P3 |
| **[A] Confirmed lineup** | raw report; Player enrichment | `LINEUP` | `/fixtures/lineups` | Coverage/timing gated; typically near kickoff; may remain absent | Unsupported | Implemented, honest absence | No expected XI; no direct Feature consume | P1 near kickoff |
| **[A] Player statistics** | Player Features | `PLAYER.seasonStats` | `/players` per candidate | Endpoint exists; season, pagination and coverage dependent | Unsupported | Implemented for capped candidates | Quota-heavy and incomplete squad breadth | P1 |
| **[B] Player impact** | Player Rules/lambda groups | `PLAYER` → Features | deterministic FAS scoring | No provider “impact” fact required | Unsupported | Availability/attack/GK derived Features implemented | Quality bounded by candidate and stat coverage | P1 |
| **[A] Transfers** | not currently consumed | none | `/transfers` | Endpoint exists; no completeness guarantee | Unsupported | Not implemented | Transfer does not prove current availability | P3 |
| **[A] Manager identity** | Manager Intelligence | `MANAGER_INTELLIGENCE` | `/coachs` + lineup coach | Endpoint exists; no dedicated coverage guarantee | Unsupported | Live fetch/mapping implemented | May be absent or stale relative to match day | P1 |
| **[B] Manager tenure** | pressure/risk Features | `MANAGER_INTELLIGENCE` | derived from appointment/career facts | Career/team facts may support it | Unsupported | Implemented | Appointment/career completeness varies | P2 |
| **[B] Manager experience** | Manager Rules/confidence | `MANAGER_INTELLIGENCE` | derived from age/career history | Partial inputs possible | Unsupported | Implemented | Not a provider quality rating | P2 |
| **[B] Manager continuity** | Football State pressure/risk | `MANAGER_INTELLIGENCE` | derived from tenure/change facts | Partial inputs possible | Unsupported | Implemented | Honest omission when facts absent | P2 |
| **[A] Managerial changes** | change-risk Feature | `MANAGER_INTELLIGENCE` | coach career/current team | Partial support; no guaranteed transaction log | Unsupported | Derived from current mapped facts | Complete change chronology not guaranteed | P2 |
| **[A] Possession** | control/attack Features | `STATISTICS.advanced` | fixture statistics | Endpoint may expose possession when covered/played | Unsupported | Implemented | Not known for a future unplayed fixture; use historical aggregation | P1 |
| **[A] Shots / shots on target** | attack/chance Features | `STATISTICS.advanced` | fixture/team statistics | Supported where fixture stats coverage exists | Unsupported | Implemented | Same pre-match timing limitation | P1 |
| **[A] Formation** | report/lineup context | `LINEUP` | confirmed lineup | Supported only when lineup published | Unsupported | Mapped and displayed | No expected formation; not a direct current Feature | P2 |
| **[A] Lineup structure** | report; Player status enrichment | `LINEUP`, `PLAYER` | confirmed XI/bench/grid | Partial, timing-gated | Unsupported | Implemented raw Evidence | No deterministic lineup-structure Feature | P2 |
| **[B] Style indicators** | no dedicated current consumer | derived proxy only | possession/shots/form | No official style taxonomy used | Unsupported | Football State gives coarse state, not a provider style label | True style facts unavailable | P3 / future |
| **[E] Pressing indicators** | none | none | specialty event data | No PPDA/pressure product used | Unsupported | Not implemented | Different deep-stats provider required if mandatory | P3 / future |
| **[B] Schedule congestion** | Match Context | `MATCH_CONTEXT` | deterministic from fixture history/next schedule | Required fixture data available when entitled | Scores history too short for authority | Implemented | Sparse schedule responses reduce completeness | P1 |
| **[B] Rest days** | fatigue/context Features | `MATCH_CONTEXT` | deterministic from fixture timestamps | Derivable from fixture history | Not an appropriate facts source | Implemented | Needs preceding fixture coverage | P1 |
| **[B] Competition importance** | knockout context only | `MATCH_CONTEXT` | deterministic competition metadata | Cup/round/leg/aggregate may be available | Unsupported | Knockout/leg/aggregate context implemented | No general “importance score”; must not invent one | P2 |
| **[A/B] Home/away context** | foundation and context | `MATCH_INFO`, `MATCH_CONTEXT` | fixture fact → deterministic Feature | Supported | Event orientation only | Implemented | None for core path | **P0 core** |
| **[A] Weather** | no current consumer | `WEATHER` | external weather provider | Not an implemented API-Football source | Unsupported | Typed unused | Different weather source required only if product activates it | Deferred |
| **[A] Referee identity** | report metadata only | `MATCH_INFO.referee` | fixture response | Nullable fixture field; no dedicated referee catalog guarantee | Unsupported | Mapped when present | No referee Feature/Rule; tendencies unavailable | Deferred |
| **[C] 1X2 odds** | market Features/Rules/confidence | `ODDS` | bookmaker prices | API-Football odds endpoint exists but is not integrated and retains shallow history | `h2h` supports soccer draw | Recorded/live Odds mapper supports it | Arbitrary live football event binding missing | P1 optional |
| **[C] Asian handicap** | AH Features/Rules | `ODDS` | bookmaker line/prices | Possible provider odds product, not integrated | Generic `spreads`; complete soccer Asian coverage not guaranteed | Mapper treats spread as AH; live request uses spreads | Quarter-line/Asian-book coverage not guaranteed | P2 optional |
| **[C] Totals** | market Evidence/report | `ODDS` | bookmaker O/U | Possible provider odds product, not integrated | `totals` documented but mainly US-sport/book availability | Mapper supports totals if payload supplies them | Live event request currently asks only `h2h,spreads` | P2 optional |
| **[C] Bookmaker coverage** | market source/provenance | `ODDS` | regions/bookmakers | Bookmaker catalog exists in odds product | Regions `us/us2/uk/eu/au`, explicit bookmakers | Preferred bookmaker mapping implemented | No guarantee selected book quotes target event/market | P2 |
| **[C] Opening odds** | movement Features | `ODDS` optional depth | historical/self-captured observation | API-Football only shallow recent odds history | No labelled opening field; paid snapshots can approximate earliest captured | Recorded `fas_market_depth` only | True opening not guaranteed; live acquisition absent | **P1 market gap** |
| **[C] Current odds** | market lean/consensus | `ODDS` | current bookmaker snapshot | Endpoint exists but not integrated | Supported | Live/recorded mapper implemented for demo bindings | General event crosswalk absent | P1 |
| **[C/B] Odds movement** | steam/RLM/volatility Features | `ODDS` | multiple timestamped market observations → deterministic delta | No durable archive; last-seven-day API-Football odds limit | Paid historical snapshots or self-capture | Computation implemented only when opening/current values supplied | Acquisition/storage pipeline absent | **P1 market gap** |
| **[B] Market consensus** | Market Rules/confidence | `ODDS` | derived across available prices/markets | Odds possible | Multiple bookmakers possible | Feature exists, but current mapper selects a preferred bookmaker path | True multi-book aggregation incomplete | P2 |
| **[E/C] Betting volume** | sharp-support Feature when supplied | `ODDS` optional depth | licensed market-data source | Not documented | Not documented; bet limit is not wagered volume | Recorded extension field only | Additional licensed acquisition source required | **P1 market gap** |
| **[E/C] Betting percentage / public money** | RLM/sharp Features when supplied | `ODDS` optional depth | licensed market-data source | Not documented | Not documented | Recorded extension fields only | Additional licensed acquisition source required | **P1 market gap** |
| **[B] Bookmaker margin** | no current direct consumer | derived from 1X2 prices | deterministic overround calculation | Inputs possible | Inputs possible | Implied probabilities exist; explicit margin Feature not implemented | Derivable without a new provider | P3 |
| **[B] Football State inputs** | Football State | Features | all Evidence families above | Indirect via facts | Market excluded from state | Six dimensions implemented | Optional domains neutral when absent | **P0 core** |
| **[B] Rules consumed by Match Script** | none | none | none | Not applicable | Not applicable | Explicitly empty `activatingRules` | Requested dependency does not exist | Informational |
| **[B] Projection V2 foundation inputs** | lambda builder | core Features | `TEAM_FORM` + `STATISTICS` + constant home advantage | Core facts available when entitled | Unsupported | Implemented | Missing core Features blocks projection | **P0 core** |
| **[B] Projection V2 optional groups** | lambda builder | Features from xG/club/player/context/advanced stats | optional football facts | Partial and coverage-gated | Unsupported | Implemented neutral absence | Richness varies by league/fixture | P1 |
| **[B] Unified Matrix inputs** | per-script Poisson + merge | lambdas and Match Script weights | deterministic only | No matrix fact | No matrix fact | Implemented | No provider gap once lambdas exist | **P0 core** |
| **[D] Tactical narrative** | narrative/report | sealed Evidence/Rules only | local deterministic narrative | Must not invent | Must not invent | Local inference adapter only | Cannot upgrade missing facts to certainty | Governance |

---

## 5. API-Football assessment

### 5.1 Official product capability

Official documentation lists products used or relevant to the repository:

- `/fixtures`
- `/fixtures/headtohead`
- `/fixtures/statistics`
- `/fixtures/players`
- `/fixtures/lineups`
- `/teams/statistics`
- `/standings`
- `/players`
- `/players/squads`
- `/injuries`
- `/sidelined`
- `/coachs`
- `/transfers`
- `/odds`

This endpoint inventory is not a coverage guarantee. API-Football exposes season-level coverage
flags through league data for standings, players, injuries, odds and fixture-level events,
lineups, statistics and player statistics. The official coverage page warns that detailed
coverage can vary by season or fixture.

### 5.2 Actual repository usage

The live football adapter currently calls:

- fixture list by league, season and date window;
- fixture by id;
- home/away last 10 and next 5 fixtures;
- home/away team season statistics;
- H2H;
- standings;
- home/away squads;
- fixture injuries;
- fixture confirmed lineups;
- fixture statistics;
- home/away coaches;
- capped per-player season statistics.

It does not currently call API-Football odds, sidelined, transfers, fixture-player statistics,
events or a coverage-preflight endpoint.

### 5.3 Limitations

1. **Current credential:** valid and active, but the Free plan rejects season 2026 and directs the
   caller to 2022–2024. Endpoint existence therefore does not unblock current live analysis.
2. **No season override:** upcoming fixture queries use the current UTC year as season.
3. **Coverage variance:** lineup, player, injury, odds and fixture-stat categories vary by
   competition-season and fixture.
4. **Pre-match timing:** fixture statistics and confirmed lineups are commonly unavailable for an
   unplayed fixture; their absence is not a provider failure.
5. **xG:** only mapped when fixture-stat labels actually include xG; it is not uniformly available
   and must never be estimated from shot counts.
6. **Player cost/quota:** one match enrichment fans out across many endpoints plus capped player
   requests; 100 requests/day is insufficient for broad live sampling.
7. **Odds history:** official documentation describes only recent odds retrieval, not a durable
   market-history source.
8. **No deep tactical event model:** no implemented provider facts for PPDA, pressure chains,
   progressive build-up, shot coordinates or post-shot xG.

---

## 6. The Odds API assessment

### 6.1 Official product capability

The official V4 guide documents:

- current/upcoming event odds;
- `h2h`, with a draw outcome for soccer;
- generic `spreads`;
- generic `totals`;
- bookmaker regions `us`, `us2`, `uk`, `eu`, `au`;
- explicit bookmaker selection;
- event-specific odds;
- scores with a short completed-event lookback;
- paid historical snapshots.

The guide states that spreads and totals are mainly available for US sports/bookmakers. Their
existence must not be interpreted as complete soccer Asian handicap/total coverage.

Official historical documentation states:

- featured-market snapshots from 2020-06-06 at 10-minute intervals;
- five-minute snapshots from September 2022;
- additional-market snapshots from 2023-05-03;
- historical endpoints are paid-only;
- availability begins when a sport, bookmaker or market was added;
- a requested timestamp returns the closest snapshot at or before that time.

### 6.2 Actual repository usage

- upcoming board: one call per sport key, region `eu`, market `h2h`;
- scores: per-sport recent scores;
- event odds: regions `eu,uk`, markets `h2h,spreads`;
- totals are supported by the mapper but not requested by the live event-odds adapter;
- live event odds resolve only through the three-entry `DEMO_ODDS_CATALOG`;
- historical APIs are not implemented;
- live payloads do not contain the repository-only `fas_market_depth` extension.

### 6.3 Unsupported or non-guaranteed requirements

- no documented betting volume/handle;
- no documented public-money or ticket percentages;
- no documented sharp-money indicator;
- no labelled true bookmaker opening price;
- no guarantee of complete Asian handicap, Asian totals, quarter lines or Asian bookmakers;
- no guarantee every bookmaker quotes every event or market;
- historical snapshots require paid entitlement and are not necessarily the true opening tick.

---

## 7. Existing repository capability

### 7.1 Implemented and provider-backed

- Football schedule, identity, kickoff, competition and orientation
- Recent form, goals for/against, H2H and team season stats
- Standings-derived Club Intelligence
- Squad and capped player season statistics
- Injuries/suspensions and confirmed lineups
- Coach/Manager Intelligence
- Fixture-stat advanced metrics and xG when present
- Deterministic rest/congestion/knockout Match Context
- Optional 1X2/spread/totals market mapping
- Full Evidence → Feature → Rule → Football State → Match Script → Unified Matrix chain

### 7.2 Recorded-only richness

The recorded football catalog contains four bundles. `football:100001` is the only broadly rich
bundle, including advanced statistics, expected-goals windows, Match Context, Manager
Intelligence, availability and lineups. Sparse cassettes do not prove those fields are consistently
available live.

The recorded odds fixtures contain a non-vendor `fas_market_depth` extension with opening/closing
snapshots, public percentages, volume and sharp indicator. The live mapper explicitly treats
those fields as absent because official live The Odds API responses do not supply the extension.

### 7.3 Implementation gaps

- general API-Football fixture ↔ The Odds API event matching;
- live odds fetch for arbitrary live Match Center fixtures;
- live totals request;
- historical market-snapshot acquisition and retention;
- multi-book consensus aggregation;
- coverage preflight and explicit entitlement error classification;
- Weather source, referee tendencies, NEWS and RANKING ingest;
- deep tactical/shot-event provider.

These are gaps, not permission to invent data.

---

## 8. Missing data requirements

### 8.1 Missing but not required by current Projection V2

- expected/probable lineup and starting probability;
- pressing/PPDA;
- build-up and transition event chains;
- shot coordinates and shot maps;
- post-shot xG / goalkeeper PSxG;
- branded ELO/SPI;
- squad market value;
- weather and referee tendencies;
- betting volume/public money;
- true opening market tick.

### 8.2 Deterministically derivable from existing Evidence

- attack/defence/form/club-strength indicators;
- home/away performance splits;
- rest days, congestion and schedule advantage;
- manager tenure/continuity/change-risk indicators when appointment/career facts exist;
- player availability/attack/GK contribution when player facts exist;
- coarse style states from possession/shots/form, labelled as derived rather than tactical fact;
- bookmaker overround/margin from complete 1X2 prices;
- odds movement from separately timestamped observations;
- self-ELO from governed historical results, if later authorized as a Feature and never labelled a
  provider Fact.

### 8.3 Better treated as external Evidence

- human-confirmed expected lineup or training-ground availability;
- licensed scouting/tactical observations;
- governed team-style descriptors;
- competition/match importance judgements beyond objective knockout metadata;
- public-money/volume data from a licensed market-data source;
- weather from a dedicated weather provider;
- referee tendencies from a governed historical referee dataset.

LLM-generated descriptions may summarize sealed Evidence but remain **D: narrative/inference**.
They cannot create any of these facts.

---

## 9. Minimum viable provider combination

### 9.1 Core real pre-match Projection V2

**Minimum vendor product: API-Football alone**, with:

- entitlement to the target current season;
- target competition fixture/history/team-stat coverage;
- enough request quota for fixture enrichment;
- actual non-empty form, H2H and team-stat responses.

Market Evidence is optional in the current model. A successful core report does not require The
Odds API, confirmed lineup, injury data, xG, manager facts or deep tactical data.

### 9.2 Current football + supporting market path

**API-Football + The Odds API**, plus a deterministic event-identity matching/acquisition layer,
is the minimum combination for:

- current football facts;
- optional current 1X2;
- partial spreads and totals where bookmakers actually provide them.

The repository does not yet provide the general crosswalk, so vendor capability is ahead of
current live integration.

### 9.3 Full declared Market Intelligence depth

API-Football + The Odds API is insufficient for:

- provider-labelled opening/closing values;
- betting volume;
- public-money/ticket percentages;
- provider-supplied sharp-money indicators.

Movement can be built by capturing timestamped current odds or using paid historical snapshots.
Volume/public-money/sharp fields need an additional licensed market-data acquisition source or
must remain absent.

---

## 10. Recommended future provider strategy

1. **Do not purchase a broad third provider merely to run the current pipeline.**
2. Treat API-Football current-season entitlement as the immediate operational gate for football
   facts, not proof of deep per-fixture coverage.
3. Before any purchase, request or inspect target league-season coverage flags and test a small
   representative fixture set for form, team stats, standings, injuries, lineups, players and xG.
4. Keep The Odds API optional and supporting-only.
5. Fixing arbitrary fixture/event matching is a repository integration decision, not a reason to
   buy another vendor.
6. Prefer first-party timestamped odds capture for movement if licensing/retention terms permit;
   do not call the earliest captured snapshot a true opening price.
7. Add a licensed market-depth source only if public-money/volume is an approved product
   requirement with measurable value.
8. Consider a specialty deep-statistics provider only if Evaluation demonstrates that missing
   tactical/shot-model facts materially limit the product.
9. Reject scraping, `/predictions` substitution and LLM-created facts.

---

## 11. Cost and credential dependency map

| Capability | Credential / plan dependency | Current state |
|---|---|---|
| Recorded development/tests | None | Available now |
| API-Football endpoint/schema exploration | Existing key and Free quota | Available for entitled historical seasons |
| 2026 live fixtures/facts | API-Football current-season entitlement | **Blocked** |
| Dense per-match player enrichment | API-Football quota sufficient for fan-out | Free 100/day is operationally restrictive |
| Current The Odds API market snapshots | The Odds API key + request credits | Adapter exists; arbitrary live event binding does not |
| Historical The Odds API snapshots | Paid historical plan + higher credit usage | Not purchased / not implemented |
| Public-money/volume/sharp data | Separate licensed data entitlement | Unavailable |
| Deep tactical events / shot models | Specialty provider entitlement | Unavailable and not required by current pipeline |

No purchase, credential creation, rotation or disclosure occurred in PVS-3.3.

---

## 12. Work possible without paid credentials

- all recorded Provider → Evidence → report development and regression tests;
- Evidence/Feature/Rule/Football State/Match Script/Projection V2 audits;
- deterministic Feature work from existing recorded Evidence;
- honest-absence behavior and provenance tests;
- cross-provider identity matching design/test using recorded fixtures;
- bookmaker margin computation from recorded complete odds;
- timestamped market-observation storage design using recorded snapshots;
- coverage/error classification tests with mocked provider responses;
- Workspace/report improvements that only render existing sealed data.

Work that must wait for paid/live entitlement:

- genuine 2026 API-Football end-to-end smoke;
- empirical 2026 league/fixture coverage measurement;
- current real-fixture player/lineup/injury/xG completeness;
- paid The Odds API historical snapshot validation;
- any licensed public-money/volume feed validation;
- any specialty tactical/shot-model provider validation.

---

## 13. Acceptance and governance

| Criterion | Result |
|---|---|
| Grounded in actual repository implementation | **PASS** |
| Major Feature/Rule families mapped to Evidence/source | **PASS** |
| API-Football current-season limitation documented | **PASS** |
| The Odds API assessed separately | **PASS** |
| No paid subscription required or purchased | **PASS** |
| No production code modified | **PASS** |
| No prediction/calibration/candidate behavior changed | **PASS** |
| Project state/index update | **PASS** |

Production remains:

- `projectionPolicyPin = "v2"`
- parameter artifact `projection.v3.replay`
- calibration candidate1 NON-DEFAULT / NOT PROMOTED

No λ tuning, P2K-CAL-3, Evaluation History mutation, Provider implementation, Engine, architecture
redesign or credential change was performed.

---

## 14. Recommended next sprint

Recommended only after explicit human authorization:

**PVS-3.4 — Current-Season Provider Coverage Probe & Commercial Decision Gate**

Proposed scope:

- no provider purchase inside the sprint;
- define target competitions and required coverage thresholds;
- obtain a human decision on current-season API-Football entitlement;
- if entitlement is supplied, measure actual per-fixture availability across a small representative
  live sample;
- separately validate The Odds API event matching and market presence without making market data a
  core Projection dependency;
- retain honest absence and stop before any algorithm/calibration work.

Do not automatically start PVS-3.4.

---

## 15. Official and repository references

Official sources:

- API-Football V3 documentation: <https://www.api-football.com/documentation-v3>
- API-Football coverage: <https://www.api-football.com/coverage>
- API-Football pricing/plan scope: <https://www.api-football.com/pricing>
- API-Football terms: <https://www.api-football.com/terms>
- The Odds API V4 guide: <https://the-odds-api.com/liveapi/guides/v4/>
- The Odds API sports/competitions: <https://the-odds-api.com/sports-odds-data/sports-apis.html>
- The Odds API bookmakers/regions: <https://the-odds-api.com/sports-odds-data/bookmaker-apis.html>
- The Odds API markets: <https://the-odds-api.com/sports-odds-data/betting-markets.html>
- The Odds API historical data: <https://the-odds-api.com/historical-odds-data/>

Primary repository anchors:

- `packages/evidence/src/domain/evidence.ts`
- `packages/evidence-normalizer/src/fixture/fixture-evidence-set-normalizer.ts`
- `packages/feature/src/extraction/feature-extractor.ts`
- `packages/rule/src/evaluation/rule-evaluator.ts`
- `packages/analysis/src/projection-v2/football-state/compute-football-state.ts`
- `packages/analysis/src/projection-v2/match-script/match-script-generator.ts`
- `packages/analysis/src/projection-v2/lambda/lambda-feature-groups.ts`
- `packages/analysis/src/projection-v2/compute-projection-v2.ts`
- `packages/analysis/src/projection-v2/unified-matrix/derive-matrix-predictions.ts`
- `packages/provider-football/src/live/live-api-sports-football-source.ts`
- `packages/provider-football/src/live/live-api-sports-match-catalog.ts`
- `packages/provider-odds/src/live/live-the-odds-api-upcoming-fixtures-source.ts`
- `packages/provider-odds/src/live/live-the-odds-api-odds-source.ts`
- `packages/provider-odds/src/mapper/map-the-odds-api-h2h.ts`
- `docs/reviews/FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md`
- `docs/sprints/PREDICTION_VERTICAL_SLICE/PVS-3.2_LIVE_FIXTURE_SMOKE_COMPLETION_REPORT.md`

---

**Final verdict: Option C.**
