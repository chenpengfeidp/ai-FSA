# Rule Engine V2 — Deterministic Football Analysis Design

## Document Status

| Field | Value |
|---|---|
| Status | Design only — not implemented |
| Kind | Future engine design / planning artifact |
| Authority | Non-authoritative relative to `docs/00_PROJECT_BIBLE.md`, ADRs, and owning numbered contracts (`02`, `04`, `07`, `17`, etc.) |
| Implementation | Forbidden by this task; no code, API, schema, or UI changes are implied |
| Governance | This file does not amend, supersede, or authorize changes to governance documents |

This document designs a future deterministic Rule Engine V2 capable of producing reviewable, explainable football projections from Evidence → Feature → Rule → Projection. It does not change current V1 Rule Engine behavior described in [07_RULE_ENGINE](./07_RULE_ENGINE.md).

### Design principles preserved from FAS

- Evidence before intuition.
- Deterministic work stays deterministic; no LLM inside Rule Engine V2.
- Facts, market signals, findings, and inference remain epistemically separate.
- Every projection must be reproducible from sealed snapshot inputs, exact feature versions, exact rule versions, and an exact evaluator version.
- Invalid or incomplete states must not silently become confident projections.
- “Projection” here means a deterministic engine output (probabilities, scorelines, ranges, recommendation). It is not AI inference and is not a wagering instruction.

### Intended placement in the future pipeline

```text
Evidence (normalized, cutoff-qualified)
  → Feature extraction (pure, versioned)
  → Rule evaluation (pure, versioned, weighted)
  → Confidence model (pure, versioned)
  → Projection model (pure, versioned)
  → Explainability graph (immutable lineage)
  → Analysis / Report composition (consumes findings; does not recompute rules)
```

Rule Engine V2 owns feature derivation used by rules, rule evaluation, confidence composition for its own projections, and deterministic projection assembly. It does not own source collection, normalization quality policy, AI drafting, human publication, or Statistics release decisions.

---

## 1. Evidence Catalog

Evidence is a normalized, source-backed observation about a typed subject, valid or observed at a known time, carrying quality and provenance. The catalog below is the **target** set Rule Engine V2 should eventually support. Types marked *V1 seed* already appear in the current presentation/domain type surface; others are future expansions.

Reliability uses a qualitative scale for design:

| Level | Meaning |
|---|---|
| High | Official or highly structured feeds; low reinterpretation risk |
| Medium | Reputable aggregators; occasional lag or revision |
| Low | Editorial, rumor-prone, or highly lagging sources |
| Context-dependent | Reliability varies by provider and competition |

Update frequency is the design expectation for freshness policy, not a runtime SLA.

### 1.1 `MATCH_INFO` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Anchor fixture identity: teams, competition, kickoff, venue, status. |
| Source | Official competition/fixture feeds; trusted fixture providers. |
| Update frequency | On schedule change; otherwise stable until kickoff. |
| Reliability | High |
| Required fields | `matchId`, `homeTeamId`, `awayTeamId`, `competitionId`, `kickoffAt`, `venueId` (or equivalent), `status`, `observedAt`, provenance |

### 1.2 `TEAM_FORM` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Recent results and performance trend for each side. |
| Source | Official results + stats aggregators. |
| Update frequency | After each completed match; pre-match refresh daily. |
| Reliability | High–Medium |
| Required fields | `teamId`, `window` (e.g. last N), ordered results (`W/D/L` or points), optional goals for/against, `observedAt` |

### 1.3 `HEAD_TO_HEAD` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Historical meetings between the same pair (or comparable pair under alias policy). |
| Source | Historical results databases. |
| Update frequency | After each mutual fixture; otherwise static. |
| Reliability | High |
| Required fields | `homeTeamId`, `awayTeamId`, meeting list with dates/scores, sample size, competition scope, `observedAt` |

### 1.4 `LINEUP` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Expected or confirmed starting XI / formation. |
| Source | Club announcements, league apps, trusted lineup providers. |
| Update frequency | Frequent in last 24–48h; confirm near kickoff. |
| Reliability | Medium (expected) → High (confirmed) |
| Required fields | `teamId`, `lineupStatus` (`expected` \| `confirmed`), player IDs/roles, formation if available, `observedAt` |

### 1.5 `INJURY` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Availability and injury/suspension constraints. |
| Source | Club medicals, league reports, trusted injury feeds. |
| Update frequency | Multiple times daily near match day. |
| Reliability | Medium |
| Required fields | `teamId`, player identity, status (`out` \| `doubtful` \| `available`), severity/role impact class if known, `observedAt` |

### 1.6 `ODDS` *(V1 seed)* — market signal

| Field | Design |
|---|---|
| Purpose | Market state for 1X2 and optionally totals/score markets. Treated as **market signal**, never ground truth. |
| Source | Bookmaker APIs / odds aggregators. |
| Update frequency | Near-continuous pre-match; snapshot at analysis cutoff. |
| Reliability | Medium (provider-dependent) |
| Required fields | `matchId`, market type, selection prices, bookmaker set or consensus method id, `observedAt`, currency/odds format |

### 1.7 `STATISTICS` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Team/player statistical aggregates (shots, xG history, possession, etc.). |
| Source | Stats providers, league data partners. |
| Update frequency | After matches; rolling windows refreshed daily. |
| Reliability | Medium–High |
| Required fields | `subjectId` (team/player), metric keys, window, values, units, `observedAt` |

### 1.8 `RANKING` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Competition table / ranking position and nearby context. |
| Source | Official league tables. |
| Update frequency | After each matchday. |
| Reliability | High |
| Required fields | `teamId`, `competitionId`, position, points, games played, `observedAt` |

### 1.9 `WEATHER` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Environmental conditions at venue around kickoff. |
| Source | Weather APIs keyed to venue coordinates. |
| Update frequency | Hourly approaching kickoff. |
| Reliability | Medium |
| Required fields | `venueId`, temperature, precipitation probability/intensity, wind, forecast horizon, `observedAt` |

### 1.10 `NEWS` *(V1 seed)*

| Field | Design |
|---|---|
| Purpose | Structured news signals (manager quotes, travel notes) after normalization; raw prose never enters rules. |
| Source | News APIs / editorial feeds via strict normalizers. |
| Update frequency | Continuous; eligibility by `observedAt` ≤ cutoff. |
| Reliability | Low–Medium |
| Required fields | `subjectIds`, normalized event type, polarity/impact class (closed enum), source quality, `observedAt` |

### 1.11 `REST_DAYS` *(future)*

| Field | Design |
|---|---|
| Purpose | Days since last competitive match for each team. |
| Source | Fixture calendar + results. |
| Update frequency | After each team match. |
| Reliability | High |
| Required fields | `teamId`, `lastMatchAt`, `restDays`, competition filter flags, `observedAt` |

### 1.12 `TRAVEL` *(future)*

| Field | Design |
|---|---|
| Purpose | Distance/time traveled and congestion for away (and sometimes home) side. |
| Source | Venue geo + fixture schedule. |
| Update frequency | On fixture finalize / venue change. |
| Reliability | Medium–High |
| Required fields | `teamId`, origin/destination, distanceKm, travelHours estimate method, midweek flag, `observedAt` |

### 1.13 `HOME_AWAY_SPLITS` *(future)*

| Field | Design |
|---|---|
| Purpose | Home/away performance differential over a window. |
| Source | Results + venue classification. |
| Update frequency | After each match. |
| Reliability | High |
| Required fields | `teamId`, home/away windows, GF/GA or points rates, sample sizes, `observedAt` |

### 1.14 `EXPECTED_GOALS_HISTORY` *(future)*

| Field | Design |
|---|---|
| Purpose | Historical xG for/against used as feature inputs (not a live in-play xG stream). |
| Source | Stats providers with xG models. |
| Update frequency | After matches. |
| Reliability | Medium (model-dependent; must pin provider model id) |
| Required fields | `teamId`, xG for/against rates, window, provider model version, `observedAt` |

### 1.15 `MARKET_MOVEMENT` *(future)* — market signal

| Field | Design |
|---|---|
| Purpose | Odds drift between open and cutoff. |
| Source | Odds time series. |
| Update frequency | Continuous pre-match. |
| Reliability | Medium |
| Required fields | `matchId`, open snapshot, cutoff snapshot, movement metrics, bookmaker scope, `observedAt` |

### 1.16 `REFEREE` *(future)*

| Field | Design |
|---|---|
| Purpose | Referee assignment and historical card/penalty tendencies (bounded, non-causal). |
| Source | League appointments + historical match officials data. |
| Update frequency | When appointment published; history after matches. |
| Reliability | Medium |
| Required fields | `refereeId`, match assignment, tendency metrics with sample size, `observedAt` |

### 1.17 `MOTIVATION_CONTEXT` *(future)*

| Field | Design |
|---|---|
| Purpose | Structured motivation flags (title race, relegation, rotation risk, cup priority) from table + calendar rules — not narrative AI. |
| Source | Derived from `RANKING` + fixture importance rules; optional club rotation signals. |
| Update frequency | Matchday / table update. |
| Reliability | Context-dependent |
| Required fields | `teamId`, closed `motivationFlags[]`, supporting table/fixture refs, `observedAt` |

### 1.18 Evidence quality gates for V2

An evidence item is eligible for Feature/Rule inputs only when:

1. `observedAt` ≤ analysis cutoff;
2. quality is not `rejected`;
3. freshness policy for its type is satisfied or an explicit acknowledgement is recorded;
4. required fields validate under the evidence-type schema version;
5. conflicts are resolved or surfaced (unresolved material conflict blocks dependent features).

Missing evidence does not invent defaults that imply presence. Features declare missing-input semantics explicitly.

---

## 2. Feature Catalog

Features are pure, versioned, typed derivations from eligible Evidence. They contain no LLM calls and emit both a numeric (or structured) value and a human-readable explanation fragment.

**Convention**

- Range is the declared output domain after clamping/normalization.
- Calculation is algorithmic intent; exact formulas are pinned by `featureVersion`.
- Unless noted, team features are computed for home and away separately, then optionally composed into match-level features.

### 2.1 `AttackRating`

| Field | Design |
|---|---|
| Inputs | `STATISTICS` (shots, xG for, big chances), `TEAM_FORM` (goals for), optional `EXPECTED_GOALS_HISTORY` |
| Calculation | Weighted blend of recent attacking output vs competition baseline; shrink toward mean when sample size is low. |
| Range | `[0, 100]` |
| Explanation | “Attack rating {value} from {window} attacking metrics vs league baseline; sample={n}.” |

### 2.2 `DefenseRating`

| Field | Design |
|---|---|
| Inputs | `STATISTICS` (shots against, xG against), `TEAM_FORM` (goals against), optional `EXPECTED_GOALS_HISTORY` |
| Calculation | Inverse of conceded threat vs baseline; higher is stronger defense. |
| Range | `[0, 100]` |
| Explanation | “Defense rating {value} from conceded-threat metrics; sample={n}.” |

### 2.3 `Momentum`

| Field | Design |
|---|---|
| Inputs | `TEAM_FORM` (recency-weighted results), optional recent `STATISTICS` deltas |
| Calculation | Exponentially weighted form score; recent matches dominate. |
| Range | `[-1, 1]` (negative = cold, positive = hot) |
| Explanation | “Momentum {value} from recency-weighted last {n} results.” |

### 2.4 `HomeAdvantage`

| Field | Design |
|---|---|
| Inputs | `HOME_AWAY_SPLITS`, `MATCH_INFO` (venue/home designation), competition baseline |
| Calculation | Home points/xG differential vs away baseline, competition-adjusted. |
| Range | `[0, 1]` strength applied to home side |
| Explanation | “Home advantage {value} from home/away splits (n={n}) and competition baseline.” |

### 2.5 `TravelFatigue`

| Field | Design |
|---|---|
| Inputs | `TRAVEL`, optional congestion flags from fixture calendar |
| Calculation | Monotone mapping from distance/hours + midweek density into fatigue score. |
| Range | `[0, 1]` (0 = negligible, 1 = severe) |
| Explanation | “Travel fatigue {value} from {distanceKm} km / {hours} h and schedule density.” |

### 2.6 `RestAdvantage`

| Field | Design |
|---|---|
| Inputs | `REST_DAYS` for both teams |
| Calculation | Signed rest differential with diminishing returns beyond an optimal band (e.g. 6–8 days). |
| Range | `[-1, 1]` (positive favors home) |
| Explanation | “Rest advantage {value}: home rest {h}d vs away rest {a}d.” |

### 2.7 `ExpectedGoals`

| Field | Design |
|---|---|
| Inputs | `AttackRating`, `DefenseRating` (opponent), `HomeAdvantage`, optional `EXPECTED_GOALS_HISTORY` |
| Calculation | Pairwise expected goals for home and away: attack vs opposing defense, home adjustment, mean reversion. |
| Range | Home/Away λ in `[0.05, 5.0]` each |
| Explanation | “Expected goals H={λh}, A={λa} from attack/defense and home adjustment.” |

### 2.8 `OddsConsensus`

| Field | Design |
|---|---|
| Inputs | `ODDS` (and optional `MARKET_MOVEMENT`) |
| Calculation | Remove outliers, convert prices to implied probabilities, normalize over 1X2 (overround removal). Market signal only. |
| Range | Probabilities in `[0, 1]` summing to 1 for 1X2 |
| Explanation | “Odds consensus H/D/A = {pH}/{pD}/{pA} from {k} books at cutoff (market signal).” |

### 2.9 `AvailabilityImpact`

| Field | Design |
|---|---|
| Inputs | `INJURY`, `LINEUP`, player role importance weights (governed table) |
| Calculation | Sum role-weighted absences; confirmed lineups override doubtful injuries when present. |
| Range | Team impact `[0, 1]` |
| Explanation | “Availability impact {value}: missing weight {w} from {count} material absences ({status}).” |

### 2.10 `TablePressure`

| Field | Design |
|---|---|
| Inputs | `RANKING`, `MOTIVATION_CONTEXT` |
| Calculation | Map table position + motivation flags to pressure/incentive score. |
| Range | `[-1, 1]` |
| Explanation | “Table pressure {value} from position {pos} and flags {flags}.” |

### 2.11 `WeatherImpact`

| Field | Design |
|---|---|
| Inputs | `WEATHER` |
| Calculation | Penalty to open/expansive styles under high wind/precipitation; mostly reduces total goals expectation. |
| Range | Total-goals modifier `[0.7, 1.1]` |
| Explanation | “Weather impact factor {value} from precip={p}, wind={w}.” |

### 2.12 `H2HLean`

| Field | Design |
|---|---|
| Inputs | `HEAD_TO_HEAD` |
| Calculation | Shrinkage estimator of historical edge; near 0 when sample is small. |
| Range | `[-1, 1]` (positive favors home) |
| Explanation | “H2H lean {value} from {n} meetings (shrunken).” |

### 2.13 `MarketDivergence`

| Field | Design |
|---|---|
| Inputs | `OddsConsensus`, model-implied 1X2 before market blend |
| Calculation | Signed divergence between model prior and market consensus per outcome. |
| Range | Per-outcome `[-1, 1]` |
| Explanation | “Market divergence on {outcome}: model {pm} vs market {pk}.” |

### 2.14 Feature contract requirements

Every feature version must declare:

- input evidence types and minimum quality;
- missing-input behavior (`inapplicable` vs neutral default with explicit penalty);
- numeric precision and clamp policy;
- explanation template with bound variables;
- checksum of configuration (weights, windows, baselines).

---

## 3. Rule Catalog

Rules are deterministic predicates + weighted findings over Features (and only Features/declared constants — never raw provider payloads). Each matched rule emits a finding that adjusts projection channels.

**Weight** is a design-time relative influence in `[0, 1]` before normalization across applicable matched rules. Exact activation still requires governed sample/confidence metadata as in V1 Rule governance concepts.

**Affected projections** use these channels:

- `1X2` — home/draw/away probabilities  
- `scorelines` — discrete score distribution  
- `goalRange` — total-goals buckets  
- `recommendation` — ordered advisory stance derived from projections + confidence  

### 3.1 `HOME_ATTACK_EDGE`

| Field | Design |
|---|---|
| Inputs | `AttackRating_home`, `DefenseRating_away` |
| Evaluation logic | Match if `AttackRating_home - DefenseRating_away ≥ τ_attack`. |
| Weight | 0.70 |
| Explanation | “Home attack exceeds away defense by {delta} (≥ {τ}).” |
| Affected projections | `1X2` (↑ home), `scorelines` (↑ home-scoring lines), `goalRange` (↑ higher totals if away defense weak) |

### 3.2 `AWAY_ATTACK_EDGE`

| Field | Design |
|---|---|
| Inputs | `AttackRating_away`, `DefenseRating_home` |
| Evaluation logic | Match if `AttackRating_away - DefenseRating_home ≥ τ_attack`. |
| Weight | 0.70 |
| Explanation | “Away attack exceeds home defense by {delta}.” |
| Affected projections | `1X2` (↑ away), `scorelines`, `goalRange` |

### 3.3 `MOMENTUM_HOME`

| Field | Design |
|---|---|
| Inputs | `Momentum_home`, `Momentum_away` |
| Evaluation logic | Match if `Momentum_home - Momentum_away ≥ τ_mom`. |
| Weight | 0.45 |
| Explanation | “Home momentum lead {delta} over away.” |
| Affected projections | `1X2` (↑ home), mild `scorelines` |

### 3.4 `MOMENTUM_AWAY`

| Field | Design |
|---|---|
| Inputs | `Momentum_home`, `Momentum_away` |
| Evaluation logic | Match if `Momentum_away - Momentum_home ≥ τ_mom`. |
| Weight | 0.45 |
| Explanation | “Away momentum lead {delta} over home.” |
| Affected projections | `1X2` (↑ away) |

### 3.5 `HOME_ADVANTAGE_MATERIAL`

| Field | Design |
|---|---|
| Inputs | `HomeAdvantage` |
| Evaluation logic | Match if `HomeAdvantage ≥ τ_home`. |
| Weight | 0.55 |
| Explanation | “Material home advantage {value}.” |
| Affected projections | `1X2` (↑ home / ↓ away), `scorelines` |

### 3.6 `REST_ADVANTAGE_HOME`

| Field | Design |
|---|---|
| Inputs | `RestAdvantage` |
| Evaluation logic | Match if `RestAdvantage ≥ τ_rest`. |
| Weight | 0.40 |
| Explanation | “Home rest advantage {value}.” |
| Affected projections | `1X2` (↑ home) |

### 3.7 `REST_ADVANTAGE_AWAY`

| Field | Design |
|---|---|
| Inputs | `RestAdvantage` |
| Evaluation logic | Match if `RestAdvantage ≤ -τ_rest`. |
| Weight | 0.40 |
| Explanation | “Away rest advantage {value}.” |
| Affected projections | `1X2` (↑ away) |

### 3.8 `TRAVEL_FATIGUE_AWAY`

| Field | Design |
|---|---|
| Inputs | `TravelFatigue_away` |
| Evaluation logic | Match if `TravelFatigue_away ≥ τ_travel`. |
| Weight | 0.35 |
| Explanation | “Elevated away travel fatigue {value}.” |
| Affected projections | `1X2` (↑ home), `goalRange` (slight ↓ totals) |

### 3.9 `AVAILABILITY_HIT_HOME`

| Field | Design |
|---|---|
| Inputs | `AvailabilityImpact_home` |
| Evaluation logic | Match if impact ≥ τ_avail. |
| Weight | 0.60 |
| Explanation | “Home availability hit {value} from absences.” |
| Affected projections | `1X2` (↓ home), `scorelines`, `recommendation` caution |

### 3.10 `AVAILABILITY_HIT_AWAY`

| Field | Design |
|---|---|
| Inputs | `AvailabilityImpact_away` |
| Evaluation logic | Match if impact ≥ τ_avail. |
| Weight | 0.60 |
| Explanation | “Away availability hit {value}.” |
| Affected projections | `1X2` (↓ away) |

### 3.11 `XG_HOME_SUPERIOR`

| Field | Design |
|---|---|
| Inputs | `ExpectedGoals` (λh, λa) |
| Evaluation logic | Match if `λh - λa ≥ τ_xg`. |
| Weight | 0.80 |
| Explanation | “Expected goals favor home ({λh} vs {λa}).” |
| Affected projections | `1X2`, `scorelines`, `goalRange`, `recommendation` |

### 3.12 `XG_AWAY_SUPERIOR`

| Field | Design |
|---|---|
| Inputs | `ExpectedGoals` |
| Evaluation logic | Match if `λa - λh ≥ τ_xg`. |
| Weight | 0.80 |
| Explanation | “Expected goals favor away ({λa} vs {λh}).” |
| Affected projections | `1X2`, `scorelines`, `goalRange`, `recommendation` |

### 3.13 `LOW_SCORING_ENVIRONMENT`

| Field | Design |
|---|---|
| Inputs | `ExpectedGoals`, `WeatherImpact`, both `DefenseRating` |
| Evaluation logic | Match if `λh + λa ≤ τ_low` or weather factor ≤ τ_wx_low with strong defenses. |
| Weight | 0.50 |
| Explanation | “Low-scoring environment: totals λ={sum}, weather={wx}.” |
| Affected projections | `goalRange` (↑ 0–1 / 2–3), `scorelines` (↑ 0–0, 1–0, 0–1, 1–1) |

### 3.14 `HIGH_SCORING_ENVIRONMENT`

| Field | Design |
|---|---|
| Inputs | `ExpectedGoals`, both `AttackRating` |
| Evaluation logic | Match if `λh + λa ≥ τ_high`. |
| Weight | 0.50 |
| Explanation | “High-scoring environment: totals λ={sum}.” |
| Affected projections | `goalRange` (↑ 4+), open scorelines |

### 3.15 `MARKET_AGREES_HOME`

| Field | Design |
|---|---|
| Inputs | `OddsConsensus`, model interim home probability |
| Evaluation logic | Match if market home prob and model home prob both ≥ τ_mkt and same ranking. |
| Weight | 0.30 |
| Explanation | “Market signal agrees with model lean to home.” |
| Affected projections | Confidence uplift only (does not create facts); mild `1X2` stabilization |

### 3.16 `MARKET_CONFLICTS_MODEL`

| Field | Design |
|---|---|
| Inputs | `MarketDivergence` |
| Evaluation logic | Match if max absolute divergence ≥ τ_div. |
| Weight | 0.55 |
| Explanation | “Material market–model conflict on {outcome} ({div}).” |
| Affected projections | Confidence penalty; `recommendation` more cautious; does not auto-adopt market |

### 3.17 `H2H_SUPPORTS_HOME`

| Field | Design |
|---|---|
| Inputs | `H2HLean`, sample size |
| Evaluation logic | Match if lean ≥ τ_h2h and n ≥ n_min. |
| Weight | 0.25 |
| Explanation | “H2H lean supports home ({lean}, n={n}).” |
| Affected projections | Mild `1X2` |

### 3.18 `INSUFFICIENT_EVIDENCE_GUARD`

| Field | Design |
|---|---|
| Inputs | Evidence completeness vector (see §4) |
| Evaluation logic | Match if completeness < τ_complete. |
| Weight | 1.00 (guard) |
| Explanation | “Evidence completeness {c} below threshold; projection confidence capped.” |
| Affected projections | Forces confidence cap; may mark recommendation `insufficient_evidence` |

### 3.19 Rule evaluation output (V2)

For each rule version against a sealed snapshot:

- status: `matched` \| `not_matched` \| `inapplicable` \| `error`
- weight used (after applicability)
- signed channel deltas (or structured findings)
- condition-level explanation
- input feature IDs + versions + checksums

No rule may call an AI provider or read undeclared inputs.

---

## 4. Confidence Model

Confidence in Rule Engine V2 is a **projection confidence** in `[0, 1]` attached to the deterministic projection bundle. It is not AI self-confidence, not source quality alone, and not Statistics Engine intervals (though Statistics may later calibrate it).

### 4.1 Components

#### 4.1.1 Rule agreement (`A`)

Measure whether matched rules push the same 1X2 direction.

1. Map each matched rule’s net 1X2 influence to a vote vector `(h, d, a)`.
2. Compute agreement as the share of total absolute weight aligned with the eventual top outcome, minus conflict mass.

Design formula (illustrative):

```text
A = clamp01( alignedWeight / max(totalWeight, ε) - conflictPenaltyTerm )
```

High agreement → confidence up. Split home/away findings → confidence down.

#### 4.1.2 Evidence completeness (`C`)

Define a required evidence set for a competition tier (example core set):

`MATCH_INFO`, `TEAM_FORM` (both), `STATISTICS` (both), `ODDS`, plus situational: `INJURY`/`LINEUP` near kickoff, `REST_DAYS`, `TRAVEL` for away.

```text
C = weightedPresent / weightedRequired
```

Missing critical types weigh more than missing optional types. Stale-but-acknowledged evidence may count partially (e.g. 0.5) under pinned policy.

#### 4.1.3 Feature strength (`S`)

How far key features sit from neutral/uncertain bands:

- strong `|Momentum|`, clear `ExpectedGoals` gap, high `|RestAdvantage|`, etc. increase `S`;
- features near zero or backed by tiny samples decrease `S`.

```text
S = average( strength_i * sampleFactor_i ) over key features
```

#### 4.1.4 Contradiction penalty (`X`)

Accumulate contradictions such as:

- home attack edge matched **and** away attack edge matched with similar weight;
- model lean vs market conflict rule matched;
- availability hit on the favored side;
- H2H lean opposite to xG lean with adequate samples.

```text
X = clamp01( Σ contradictionSeverity_j )
```

### 4.2 Composition

```text
confidenceRaw = wA*A + wC*C + wS*S
confidence    = clamp01( confidenceRaw * (1 - wX*X) )
```

Suggested initial weights (design defaults, governable):

| Weight | Value |
|---|---|
| `wA` | 0.35 |
| `wC` | 0.30 |
| `wS` | 0.35 |
| `wX` | 0.50 |

### 4.3 Caps and floors

| Condition | Effect |
|---|---|
| `INSUFFICIENT_EVIDENCE_GUARD` matched | `confidence ≤ 0.40` |
| Any rule evaluation `error` in required set | fail projection bundle (no silent confidence) |
| Only market features available | `confidence ≤ 0.35` and mark uncertainty “market-only” |
| Full core evidence + high agreement + low contradiction | allow up to `0.95` (never claim certainty `1.0` in V2 design) |

### 4.4 Confidence explanation

Emit a structured breakdown:

- component scores `A`, `C`, `S`, `X`;
- top supporting rules;
- top contradicting rules;
- missing evidence types;
- final clamp reasons.

---

## 5. Prediction Model (Deterministic Projections)

Naming note: this section uses “prediction” only as the product label for **deterministic projection outputs**. Epistemically these remain engine projections, not facts and not AI inference.

### 5.1 Base rates and model prior

1. Start from competition baseline 1X2 and Poisson totals (pinned by competition season table).
2. Adjust expected goals `(λh, λa)` from Feature `ExpectedGoals` and matched rule deltas.
3. Apply weather/total modifiers from matched environment rules.

### 5.2 Home Win % / Draw % / Away Win %

**Primary path (design):** independent Poisson (or bivariate Poisson with pinned correlation) score matrix from `(λh, λa)`:

```text
P(H=i, A=j) = f_poisson(i | λh) * f_poisson(j | λa) * corr(i,j)
P(Home) = Σ_{i>j} P(i,j)
P(Draw) = Σ_{i=j} P(i,j)
P(Away) = Σ_{i<j} P(i,j)
```

**Rule deltas:** convert matched rule channel findings into logit-space adjustments on `(PHome, PDraw, PAway)`, then renormalize.

**Market blend (optional, governed):**

```text
P_final = (1 - α)*P_model + α*P_oddsConsensus
```

`α` shrinks toward 0 when market evidence is missing/stale or `MARKET_CONFLICTS_MODEL` is severe **and** evidence completeness is high (trust model more). `α` grows when model evidence is thin. Market never overwrites facts; it only blends probabilities.

### 5.3 Top 3 Scorelines

1. Enumerate scoreline probabilities from the score matrix up to a max goals cap (e.g. 0–6).
2. Rank by probability.
3. Emit top 3 with probabilities and cumulative coverage.
4. If cumulative coverage of top 3 `< τ_cover`, attach uncertainty “scoreline mass is dispersed.”

No invented “most likely score” without matrix support.

### 5.4 Goal Range

Map total goals `T = H + A` into buckets, e.g.:

| Bucket | Definition |
|---|---|
| `0-1` | `P(T ≤ 1)` |
| `2-3` | `P(2 ≤ T ≤ 3)` |
| `4+` | `P(T ≥ 4)` |

Select recommended bucket as argmax; include runner-up and margin. Environment rules may reweight buckets before argmax, but must remain deterministic and explained.

### 5.5 Recommendation

Recommendation is a closed enum derived from projections + confidence, never free text from an LLM inside the engine:

| Code | When |
|---|---|
| `lean_home` | Home is top 1X2 and margin ≥ τ_margin and confidence ≥ τ_conf |
| `lean_away` | Symmetric for away |
| `lean_draw` | Draw top with margin/confidence gates |
| `low_scoring` | Goal range `0-1` or `2-3` strongly preferred with totals lean |
| `high_scoring` | Goal range `4+` strongly preferred |
| `cautious` | Margins thin or confidence mid |
| `insufficient_evidence` | Completeness guard or confidence floor breach |

Each recommendation carries:

- primary code;
- supporting projection pointers (1X2, scorelines, goal range);
- confidence;
- explicit limitations list.

Recommendation is analytical guidance for review, not betting advice.

### 5.6 Output bundle

A V2 projection bundle includes:

- `pHome`, `pDraw`, `pAway` (+ method version);
- `topScorelines[3]`;
- `goalRange` distribution + recommended bucket;
- `recommendation`;
- `confidence` + breakdown;
- checksums of features, rules, evaluator, and inputs.

---

## 6. Explainability

Every projection field must be traceable through a directed lineage graph stored with the bundle.

### 6.1 Required chain

```text
Evidence item(s)
  → Feature value(s)
  → Rule evaluation(s) / finding(s)
  → Projection field (e.g. pHome, scoreline 1-0, goalRange 2-3, recommendation)
```

No projection node may exist without at least one upstream path, except declared baselines (competition prior), which are themselves versioned artifacts with identity and checksum.

### 6.2 Trace record shape (design)

For each projection atom (example: `pHome`):

| Field | Content |
|---|---|
| `projectionKey` | Stable key, e.g. `1x2.home` |
| `value` | Emitted value |
| `baselineRefs` | Competition prior version |
| `featureRefs` | Feature IDs, versions, values, explanations |
| `ruleRefs` | Rule evaluation IDs, statuses, weights, explanations |
| `confidenceRefs` | Components `A/C/S/X` contributing to attachment |
| `excludedEvidence` | Eligible-but-unused or inapplicable items with reasons |
| `checksum` | Hash over the closed supporting set |

### 6.3 UI / report expectations (non-implementation)

Presentation layers should be able to render:

1. Why this home win % — top features and matched rules.  
2. Why this scoreline ranks in top 3 — λ inputs + matrix rank.  
3. Why confidence is mid/low — missing evidence and contradictions.  
4. Why recommendation is `cautious` — margin and confidence gates.

Clicking a rule shows condition inputs; clicking a feature shows evidence IDs; clicking evidence shows provenance. That navigation is a consumer concern; the engine must emit the graph.

### 6.4 Non-negotiable explainability invariants

1. No black-box residual that changes rankings without a recorded term.  
2. Market blend weight `α` is visible when used.  
3. Inapplicable rules appear in the audit trail, not only matched rules.  
4. Re-running the same sealed snapshot + versions must reproduce identical projections and traces.  
5. AI-generated prose may narrate the trace later, but cannot invent missing edges.

### 6.5 Example lineage (illustrative)

```text
Evidence TEAM_FORM(home), STATISTICS(home) 
  → Feature AttackRating_home = 72
Evidence STATISTICS(away), TEAM_FORM(away)
  → Feature DefenseRating_away = 48
  → Rule HOME_ATTACK_EDGE matched (weight 0.70)
Evidence EXPECTED_GOALS_HISTORY + ratings
  → Feature ExpectedGoals (λh=1.55, λa=1.05)
  → Rule XG_HOME_SUPERIOR matched (weight 0.80)
  → Projection pHome = 0.47, top scoreline 1-0, recommendation lean_home
  → Confidence 0.66 (A=0.71, C=0.80, S=0.64, X=0.18)
```

---

## 7. Out of Scope for This Design Document

- Implementing packages, schemas, APIs, or UI.
- Changing [07_RULE_ENGINE](./07_RULE_ENGINE.md) authority or V1 evaluator semantics.
- Amending ADRs, project bible, workflow, or sprint governance.
- Provider selection, commercial odds licensing, or live in-play engine.
- Automatic rule activation from learning candidates.
- Treating projections as betting tips or guaranteed outcomes.

## 8. Suggested Future Adoption Path (non-binding)

1. Freeze Evidence type schemas for the core set.  
2. Implement Feature library as pure functions with golden tests.  
3. Port Rule catalog into governed rule versions under existing lifecycle ideas.  
4. Ship Confidence + Projection as a versioned evaluator behind an explicit analysis contract.  
5. Require explainability graph persistence before enabling human publication of V2 projections.

Each step requires its own implementation authorization; this document alone is not an implementation gate.
