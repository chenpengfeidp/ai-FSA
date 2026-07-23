# Football Intelligence v2 — Provider Capability Review

| Field | Value |
|---|---|
| Sprint | **P0** Football Intelligence v2 Provider Capability Review |
| Date | 2026-07-23 |
| Document type | Architecture / design review (analysis only) |
| Authority (read-only) | `AGENTS.md` · `docs/PROJECT_STATE.md` · Architecture Freeze **v0.3** · `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md` · A1 / A1.5 completion reports · B2 Coding Law · D0 Expansion Roadmap · `docs/sprints/F1.1/01_PROVIDER_CAPABILITY_RESEARCH.md` · F.1 provider gate |
| Scope | Review integrated providers; classify P1–P5 Intelligence domains; recommend FI v2 roadmap |
| Explicit exclusions | Production code · architecture redesign · new Engines · Prediction / Evaluation / Calibration mutation · public deploy / auth / Redis |

---

## 1. Executive Summary

The Football Intelligence Platform has a **stable frozen pipeline** (v0.3) and a completed Intelligence MVP across Foundation, Advanced Statistics, Expected Goals, Match Context, Market Intelligence (supporting), Prediction, Evaluation, and Evaluation History.

**Verdict:** Existing provider infrastructure can realistically power a **first FI v2 wave** focused on **Team Strength (derived)**, **Manager facts**, **Player Impact (thin)**, and **Confirmed Lineup consume** — without redesign and without new Engines. Several high-value domains (**Expected Lineup**, branded **ELO/SPI**, **PSxG / shot maps**, deep **tactical style**) are **not honestly obtainable** from current providers and must wait for a gated new provider or remain deferred.

| Question | Answer |
|---|---|
| Can FI v2 proceed on current providers? | **Yes**, for a bounded subset of P1 / P3 / confirmed-lineup work |
| Highest-impact next Intelligence work | **Team Strength from existing facts** (standings + form + stats → Features/Rules), then **Player Impact MVP**, then **Lineup Feature consume** |
| Hard blocks | Expected Lineup; Opta-grade PSxG/shot maps; Transfermarkt-class market value without legal gate |
| Must remain untouched this phase | Prediction seals · Evaluation math · Calibration activation (A2 remains a separate product sprint) |
| Architecture constraint | Every accepted domain **MUST** stay `Provider → Evidence → Feature → Rule → Confidence → Projection → Report` |

**Classification legend used below**

| Class | Meaning |
|---|---|
| **READY** | Provider already supplies facts; FAS can ingest (or already does) without invention |
| **PARTIAL** | Provider supplies some of the signal; coverage/timing/depth limits honesty |
| **DERIVABLE** | Can be computed deterministically from existing Facts without a new vendor product |
| **NEW PROVIDER REQUIRED** | Current vendors cannot honestly supply; needs Architecture Review Gate |
| **NOT RECOMMENDED** | Epistemically unsafe, licensing-hostile, or low prediction ROI under Freeze |

---

## 2. Current Provider Inventory

### 2.1 Integrated providers (repository)

| Package | Vendor / mode | Role in FAS | Epistemic class |
|---|---|---|---|
| `@fas/provider-football` | **API-Sports Football** (`https://v3.football.api-sports.io`, `x-apisports-key`); `recorded` / `live` / `fixture` | Primary football Facts path | Facts |
| `@fas/provider-odds` | **The Odds API** v4; `recorded` / `live` | Optional market overlay (1X2, spreads/AH, totals/O-U depth) | Market signals |
| `@fas/provider-fixture` | In-repo demo fixtures | Offline analyzable demo / fallback shells | Demo Facts + optional odds |
| `@fas/ai-provider` | Local deterministic narrative only | Narrative draft after Projection seal | Inference (not Facts) |

No SportMonks, StatsBomb, Understat, Transfermarkt, ClubElo, or FiveThirtyEight adapters exist. F.1 gate explicitly excluded parallel football-data providers until a later milestone.

### 2.2 `@fas/provider-football` — live endpoints already called

Per `LiveApiSportsMatchCatalog` / `LiveApiSportsFootballSource`:

| Endpoint | Used for |
|---|---|
| `GET /fixtures` (league + date window) | Match Center upcoming board |
| `GET /fixtures?id=` | Fixture identity, venue, referee, FT score, competition meta |
| `GET /fixtures?team=&last=10` | Team form (+ home/away splits) + Match Context rest/congestion inputs |
| `GET /fixtures?team=&next=5` | Match Context days-until-next |
| `GET /teams/statistics` | Season team stats / shots basis |
| `GET /fixtures/statistics` | Advanced team stats + fixture `EXPECTED_GOALS` when labels present |
| `GET /fixtures/headtohead` | H2H sample |
| `GET /standings` | Competition table (domain model; thin Feature consume today) |
| `GET /players/squads` | Basic `PLAYER` identity (capped) |
| `GET /injuries?fixture=` | `INJURY` / `SUSPENSION` |
| `GET /fixtures/lineups` | Confirmed `LINEUP` (XI / bench / formation) |

**Not wired (but API-Football exposes):** `/players`, `/fixtures/players`, `/players/topscorers|topassists|topcards`, `/coachs`, `/sidelined`, `/fixtures/events`, `/predictions`, `/transfers`, `/trophies`, `/venues` detail, league `coverage` preflight as a first-class product check.

### 2.3 Competitions / refresh / history / live / quality / licensing

#### API-Football (facts)

| Dimension | Finding |
|---|---|
| **Competitions** | Default FAS set: K League 1, J1, Allsvenskan, Veikkausliiga, Eliteserien, Big Five, UCL, UEL (`DEFAULT_FOOTBALL_LEAGUE_IDS`). Vendor covers 1000+ competitions; FAS scopes via `FOOTBALL_DATA_LEAGUE_IDS`. |
| **Refresh** | Fixtures/events ~15s in-play; injuries ~4h; team stats ~twice daily; squads/coaches ~daily; confirmed lineups typically **20–75 min pre-KO** (league-dependent). |
| **Historical coverage** | Plan-dependent season depth; Free = shallow archive; Paid = deeper. Per-season **`coverage.*` flags** gate lineups/injuries/players/fixture stats. |
| **Live coverage** | Scores/events/player match stats supported by vendor; FAS pre-match path does **not** poll in-play feeds today. |
| **Data quality** | Strong for fixtures/form/standings/confirmed lineups. Advanced metrics and xG labels are **competition- and timing-dependent**. Empty HTTP 200 is common — must remain honest absence. |
| **Licensing** | Commercial API under API-Sports terms; Free = **100 req/day** (current enrich fan-out is already quota-hostile). Paid tiers unlock request volume/history, not endpoint names. Redistribute raw vendor payloads carefully; FAS maps to domain before Evidence. |

#### The Odds API (market)

| Dimension | Finding |
|---|---|
| **Endpoints used** | `/v4/sports/{sport}/odds`, `/events/{id}/odds` (h2h, spreads; totals when present), `/scores` |
| **Competitions** | Sport-key fan-out (`DEFAULT_MATCH_CENTER_SPORT_KEYS`: Big Five, Nordics/Asia selected, UEFA club comps) |
| **Refresh / credits** | Credit-costly fan-out; Free quota easily exhausted — recorded cassettes remain CI/default path |
| **Historical** | Weak for deep football history; scores window short |
| **Live** | Odds + scores; not a Facts substitute |
| **Quality / limits** | Good consensus 1X2/AH/O-U when books cover the event; **no** true shots/xG/lineups |
| **Licensing** | The Odds API commercial terms; display/usage restrictions apply to odds redistribution |

#### Fixture provider

| Dimension | Finding |
|---|---|
| **Role** | Deterministic offline demo bundles |
| **Limits** | Not a live intelligence source |

### 2.4 Evidence already produced from providers (post-MVP)

| Evidence | Provider path | Notes |
|---|---|---|
| `MATCH_INFO` | Football fixtures | + venue / referee when present |
| `TEAM_FORM` | `/fixtures?team&last` | Home/away / short windows |
| `STATISTICS` (+ advanced) | `/teams/statistics`, `/fixtures/statistics` | |
| `EXPECTED_GOALS` | Fixture statistics xG labels when present | Season rolling windows often absent live |
| `MATCH_CONTEXT` | Schedule-derived | Rest / congestion / travel posture / knockout meta |
| `HEAD_TO_HEAD` | `/fixtures/headtohead` | |
| `VENUE` | Fixture venue | |
| `PLAYER` | `/players/squads` | Identity only |
| `INJURY` / `SUSPENSION` | `/injuries` | |
| `LINEUP` | `/fixtures/lineups` | **Confirmed only** |
| `ODDS` | The Odds API | Market; findings-only downstream |
| `MATCH_RESULT` | FT score on finished fixtures | Evaluation only — not Projection input |

Typed unused / not Facts-backed: `WEATHER`, `NEWS`, `RANKING` (no honest product source in current providers).

---

## 3. Capability Matrix (P1–P5)

### 3.1 P1 — Team Strength Intelligence

| Capability | Class | Reason |
|---|---|---|
| Team Rating (FAS internal) | **DERIVABLE** | Attack/defense Features already exist; can deepen from form + standings + advanced stats + xG without new vendor |
| Club Rating (branded) | **PARTIAL** | No branded club rating in API-Football; standings rank is a thin proxy only |
| ELO | **NEW PROVIDER REQUIRED** *or* **DERIVABLE** | No ClubElo/SPI endpoint today. Self-compute ELO from finished fixtures is allowed if treated as **Feature derivation** with provenance, not as vendor Fact |
| SPI | **NEW PROVIDER REQUIRED** | FiveThirtyEight-class SPI not in API-Football / Odds API |
| League Strength | **DERIVABLE** (thin) / **NEW PROVIDER** (rich) | Cross-league normalization needs careful population design; standings alone are within-league |
| Squad Market Value | **NEW PROVIDER REQUIRED** | Transfermarkt-class data; licensing risk — **NOT RECOMMENDED** without legal gate |
| Squad Depth | **PARTIAL** | Squads + injuries/suspensions exist; minutes/rotation load needs `/fixtures/players` history |
| Manager | **READY** (provider) / **PARTIAL** (FAS) | `/coachs` + lineup coach block available; **not wired** into Evidence today |
| Manager Tenure | **PARTIAL** | `/coachs` career history can support tenure Features if mapped honestly |
| Club Historical Performance | **PARTIAL** | Historical fixtures/H2H/standings available; depth plan-limited |

**Domain class (overall): PARTIAL → first wave DERIVABLE on current stack.**

### 3.2 P2 — Expected Lineup Intelligence

| Capability | Class | Reason |
|---|---|---|
| Expected Starting XI | **NOT RECOMMENDED** (current providers) | No dedicated Fact endpoint. `/predictions` is vendor **forecast**, not XI — mapping it would breach epistemic split (confirmed in F1.1 research) |
| Formation | **PARTIAL** | Confirmed formation via `/fixtures/lineups` when published; not “expected” |
| Bench | **READY** | Confirmed substitutes when lineup published |
| Starting probability | **NEW PROVIDER REQUIRED** | No probability-of-start feed |
| Player availability | **READY** | Injuries/suspensions already Evidence |
| Tactical changes | **NOT RECOMMENDED** | Would require news/inference or post-hoc events; not pre-match Facts |

**Domain class (overall): NOT RECOMMENDED for Expected Lineup; PARTIAL/READY for Confirmed Lineup deepen.**

### 3.3 P3 — Player Impact Intelligence

| Capability | Class | Reason |
|---|---|---|
| Player Rating | **PARTIAL** | `/fixtures/players` ratings (post/during match); season ratings via `/players` — **not wired** |
| Player Form | **DERIVABLE** | From sequenced match player stats once ingested |
| Player xG | **NEW PROVIDER REQUIRED** (typical) | Team fixture xG ≠ player xG; API-Football player payloads are not a reliable player-xG product |
| Assists | **READY** (provider) | `/players` / top assists helpers; not FAS Features yet |
| Defensive contribution | **PARTIAL** | Tackles/interceptions etc. when player stats coverage true |
| Goalkeeper metrics | **PARTIAL** | Saves appear in team advanced stats; richer GK needs player stats |
| Injury impact | **PARTIAL** | Counts exist; position-weighted / severity impact needs richer absence + role Features |

**Domain class (overall): PARTIAL — high leverage if limited to provider-measured player season/match stats + availability.**

### 3.4 P4 — Tactical Matchup Intelligence

| Capability | Class | Reason |
|---|---|---|
| Playing Style | **NEW PROVIDER REQUIRED** / weak **DERIVABLE** | No style taxonomy in API-Football; proxies from possession/attacks are weak and must be labelled derived |
| Pressing | **NEW PROVIDER REQUIRED** | PPDA / pressure index not in current stack (SportMonks-style products exist commercially) |
| Possession profile | **READY** | Advanced `possessionPct` already mapped when present |
| Counter attack | **NOT RECOMMENDED** (invent) / **NEW PROVIDER** | No counter-attack rate Fact |
| Build-up | **NEW PROVIDER REQUIRED** | Progressive passes / build-up chains absent |
| Formation trends | **PARTIAL** | Sequence confirmed formations across fixtures (quota-heavy); not expected formations |

**Domain class (overall): PARTIAL for possession/formation history; NEW PROVIDER for true tactical style.**

### 3.5 P5 — Advanced Shot Intelligence

| Capability | Class | Reason |
|---|---|---|
| Shot map | **NEW PROVIDER REQUIRED** | API-Football `/fixtures/events` lacks Opta/StatsBomb-grade shot coordinates product FAS can trust |
| Shot locations | **NEW PROVIDER REQUIRED** | Same |
| PSxG | **NEW PROVIDER REQUIRED** | Not available from API-Football / Odds API |
| Shot quality | **PARTIAL** / **DERIVABLE** | Team xG + shots/SoT already support coarse finishing Features when xG present (F1.3 path) |
| Goalkeeper PSxG | **NEW PROVIDER REQUIRED** | Specialty event model |

**Domain class (overall): PARTIAL for team-level chance quality; NEW PROVIDER for maps/PSxG.**

---

## 4. Provider Coverage Analysis

### 4.1 What existing providers can already support for FI v2

| Theme | Support level | Notes |
|---|---|---|
| Strength from standings/form/stats/xG | High | Mostly Feature/Rule work; standings already fetched |
| Manager / tenure facts | Medium | Endpoint exists; Evidence mapping missing |
| Confirmed lineup / formation / bench | High (timing-gated) | Evidence exists; Feature/Rule/Projection consume still thin |
| Availability | High (coverage-gated) | Already Active Evidence |
| Player season/match stats | Medium | Endpoints exist; pagination + quota risk |
| Possession / advanced team shape | Medium | Already in STATISTICS.advanced when present |
| Market conflict context | High (supporting) | I2 complete; keep findings-only |

### 4.2 Coverage gaps that look like “missing Intelligence” but are provider limits

1. **Expected Lineup** — product desire ≠ Fact availability.
2. **Branded ELO/SPI** — not in API-Football.
3. **Squad market value** — separate commercial data product + licensing.
4. **PSxG / shot maps** — event-model providers.
5. **Pressing / style taxonomies** — specialty stats vendors.
6. **Uniform xG across all default leagues** — fixture `expected_goals` is intermittent; season windows often absent live (F1.3A honesty).

### 4.3 Operational constraints (prediction accuracy program)

| Constraint | Impact |
|---|---|
| Free tier 100 req/day | Blocks dense player-history / formation-trend polling |
| Per-match enrich fan-out already large | New endpoints need batching, caching policy, or paid tier — **not** Redis platform unless separately gated |
| League `coverage` variance | Nordic/Asian leagues may lack lineups/injuries/player stats for some seasons |
| Odds credits | Must not re-center Match Center on Odds for Facts |

---

## 5. Capability Gap Analysis

### 5.1 Gaps inside current providers (implementation debt, not architecture)

| Gap | Layer | Why it matters for accuracy |
|---|---|---|
| Standings under-consumed | Feature → Rule → Projection | Table strength / goal difference unused as explicit strength Features |
| `/coachs` unwired | Provider → Evidence | Manager identity/tenure missing from explainable chain |
| `/players` / `/fixtures/players` unwired | Provider → Evidence → Feature | No player-level attack/defense contribution |
| Confirmed `LINEUP` under-consumed | Feature → Rule → Confidence | Formation/XI confirmation not yet a strong Projection input |
| Injury severity / role weights | Feature | Count-only availability understates key absences |
| League `coverage` preflight | Provider ops → Confidence | Missing coverage should raise limitations, not silent thinness |
| `/fixtures/events` unused | Evidence (future) | Goals/cards chronology only — **not** shot maps |

### 5.2 Gaps requiring new providers (Architecture Review Gate)

| Gap | Candidate class | Gate notes |
|---|---|---|
| Reliable multi-league xG depth / pressure | SportMonks-like commercial stats | B2: new provider SDK needs A4-style gate |
| Shot locations / PSxG | StatsBomb / Opta-class | High cost; narrow competitions often |
| ClubElo feed | ClubElo or self-ELO | Prefer **self-ELO Feature** before new vendor |
| Market values | Transfermarkt-class | Licensing — default **NOT RECOMMENDED** for private V1 |
| Expected XI probabilities | Specialist lineup vendors / human curation | Do not misuse `/predictions` |

### 5.3 Explicit “do not invent” list (reaffirmed)

- Expected / probable XI from news, heuristics, or `/predictions`
- PSxG / shot maps from shots totals alone
- SPI/ELO labelled as vendor Facts when computed internally (label as **derived Features**)
- Market odds as football strength Facts
- Player xG from team xG split heuristics without provenance

---

## 6. Recommended New Providers (if needed)

Only after a dedicated Architecture Review Gate (B2 §1.8 / A4 posture). Prefer exhausting DERIVABLE/READY work first.

| Priority | Provider class | Would unlock | Recommendation |
|---|---|---|---|
| **N1** | Deeper football stats API (e.g. SportMonks-class) | Broader xG, pressure/style metrics | **Consider after** Team Strength + Player Impact MVP prove Evaluation uplift |
| **N2** | Event/shot model (StatsBomb open or commercial) | Shot maps, PSxG | **Research spike only** for private review competitions |
| **N3** | ClubElo (or none — self-ELO) | External ELO | Prefer **DERIVABLE self-ELO** first |
| **N4** | Transfermarkt-class | Squad value / depth money | **NOT RECOMMENDED** until licensing reviewed |
| **N5** | Expected-lineup specialist | Probable XI | Optional; never required for Projection |

**Not recommended as providers:** scrapers against FBref/Understat ToS; treating The Odds API as a Facts source; treating API-Football `/predictions` as Intelligence Facts.

---

## 7. Recommended Football Intelligence v2 Roadmap

Stay inside Freeze v0.3 and B2. Expand depth, do not redesign.

```text
FI-v2 Wave 0   P0 Provider Capability Review          ← this document
FI-v2 Wave 1   Team Strength Intelligence (derived)   ← highest ROI / no new vendor
FI-v2 Wave 2   Manager + Confirmed Lineup consume
FI-v2 Wave 3   Player Impact MVP (measured stats only)
FI-v2 Wave 4   Optional provider gate (stats depth / ELO policy)
Parallel       A2 Calibration (doc 40) — consumes Evaluation History;
               does not replace FI-v2 signal work; do not auto-activate
```

### Wave 1 — Team Strength Intelligence (recommended next FI coding sprint)

| Field | Value |
|---|---|
| Goal | Turn standings + form + advanced stats + xG into explicit strength Features/Rules |
| Provider work | Minimal (standings already fetched); optional coverage flags |
| Pipeline | Evidence (existing) → Feature → Rule → Confidence → Projection → Report |
| Avoid | Branded SPI claims; Transfermarkt values; Calibration edits |

### Wave 2 — Manager + Confirmed Lineup consume

| Field | Value |
|---|---|
| Goal | Map `/coachs` (+ lineup coach) to Evidence; Feature/Rule consume of confirmed formation/XI presence |
| Avoid | Expected Lineup; inventing tactical change narratives |

### Wave 3 — Player Impact MVP

| Field | Value |
|---|---|
| Goal | Ingest capped season/match player stats for key contributors; position-weighted availability Features |
| Avoid | Player xG invention; pagination explosions on Free tier |

### Wave 4 — Provider gate (only if Evaluation shows ceiling)

| Field | Value |
|---|---|
| Goal | Decide SportMonks-class depth and/or self-ELO policy vs external ELO |
| Avoid | Premature multi-provider complexity |

---

## 8. Implementation Priority

Ordered for **prediction accuracy uplift per unit risk**, under current providers:

| Order | Item | Class | Depends on | Est. complexity |
|---|---|---|---|---|
| **1** | Team Strength Features/Rules from standings/form/stats/xG | DERIVABLE | Existing Evidence | M |
| **2** | Confidence limitations from league `coverage` / missing strength inputs | PARTIAL | Wave 1 | S |
| **3** | Manager Evidence (`/coachs`) + tenure Feature | READY→PARTIAL | Wave 1 optional | S–M |
| **4** | Confirmed Lineup Feature/Rule/Confidence consume | PARTIAL | LINEUP Evidence (done) | M |
| **5** | Player Impact MVP (`/players` capped) | PARTIAL | Paid quota recommended | M–L |
| **6** | Position-weighted injury/suspension impact | PARTIAL | Player roles + availability | M |
| **7** | Self-ELO / strength index (derived Feature) | DERIVABLE | Historical fixtures population | L |
| **8** | New stats provider gate | NEW PROVIDER | Evaluation evidence of ceiling | Gate + L |
| **D** | Expected Lineup product | NOT RECOMMENDED now | New provider/human | — |
| **D** | PSxG / shot maps | NEW PROVIDER | Specialty vendor | — |
| **D** | Squad market value | NOT RECOMMENDED | Legal + vendor | — |

**Product sequencing note:** `PROJECT_STATE` previously listed **A2 Calibration** as next authorized product work. This review does **not** cancel A2. Recommended program shape:

1. Keep **A2** as the governed probability-trust track (Evaluation History → calibration artifacts; human activation only).
2. Authorize **FI-v2 Wave 1 (Team Strength)** as the next **Football Intelligence coding** sprint when the goal is raw predictive signal uplift.
3. Measure both with A1/A1.5 — do not mutate Evaluation to “make” new Features look good.

---

## 9. Expected Prediction Impact

| Domain | Expected impact if done honestly | Confidence in estimate |
|---|---|---|
| Team Strength (Wave 1) | **High** — directly feeds λ / 1X2 via attack-defense ratings and rule channels | Medium-high |
| Manager / tenure | **Low–Medium** — explainability + occasional regime shifts | Medium |
| Confirmed Lineup consume | **Medium** near KO; **Low** far from KO (absence common) | High |
| Player Impact MVP | **Medium** when star absences/form matter; quota-limited breadth | Medium |
| Expected Lineup (if forced now) | **Negative** (epistemic debt / false confidence) | High |
| PSxG / shot maps | **High** for post-match learning; **Low** for pre-match until provider exists | High |
| Market value | **Unclear / misuse risk** | Low |
| Calibration (A2, parallel) | **High for probability trust**, not new football signal | High |

---

## 10. Technical Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Quota blow-ups from `/players` pagination | High | Cap players; paid tier; recorded cassettes; no Free-tier live polling loops |
| Treating vendor `/predictions` as Facts | Critical | Category firewall (already documented); tests forbid mapping |
| Labelling derived ELO as provider Fact | High | Feature provenance + limitations text |
| Coverage variance mistaken for model failure | Medium | Confidence limitations + Evaluation slices by competition |
| Dual-input Projection complexity growth | Medium | Keep Market findings-only; strength Features stay football channel |
| New provider SDK without gate | High | B2 forbids; require Architecture Review |
| Touching Calibration/Evaluation “to help” new Features | High | Out of scope; measure via sealed Evaluation History only |
| Scrapers / ToS-violating sources | Critical | Reject; commercial API or open licensed data only |

### Architecture review (pipeline integrity)

Every recommended Wave **can** follow the frozen path:

```text
Provider → Evidence → Feature → Rule → Confidence → Projection → Narrative → Report
```

No recommended capability may:

- write Projection from provider JSON directly;
- let Market Features enter football softmax;
- invent Expected Lineup / PSxG / SPI Facts;
- bypass Evidence for “temporary” Features;
- auto-activate calibration from new Intelligence.

---

## 11. Final Recommendation

1. **Close this review as PASS** for planning: providers are understood; FI v2 can start without architecture redesign.
2. **Authorize FI-v2 Wave 1 — Team Strength Intelligence** as the highest-impact next Football Intelligence coding sprint on **existing** API-Football Facts (standings/form/stats/xG → Feature → Rule → Confidence → Projection → Report).
3. **Keep Expected Lineup, PSxG/shot maps, SPI, and market-value domains deferred** (NEW PROVIDER or NOT RECOMMENDED).
4. **Keep A2 Calibration** on the product trust track in parallel or immediately after Wave 1 baseline pins; do not merge Calibration into Provider work.
5. **Revisit a new stats provider** only after Evaluation History shows a measurable ceiling under current Facts.

**Acceptance checklist**

- [x] Review completed
- [x] Capability matrix (P1–P5)
- [x] Provider gap analysis
- [x] Recommended FI v2 roadmap
- [x] Recommended implementation order
- [x] No production code
- [x] No architecture redesign

---

## References

- `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md`
- `docs/sprints/A1/A1_PREDICTION_EVALUATION_COMPLETION_REPORT.md`
- `docs/sprints/A1/A1.5_EVALUATION_PLATFORM_FOUNDATION_COMPLETION_REPORT.md`
- `docs/sprints/B2/B2_FOOTBALL_INTELLIGENCE_CODING_SPECIFICATION.md`
- `docs/sprints/D0/D0_FOOTBALL_INTELLIGENCE_EXPANSION_ROADMAP.md`
- `docs/sprints/F1.1/01_PROVIDER_CAPABILITY_RESEARCH.md`
- `docs/sprints/VERTICAL_SLICE_F1_FOOTBALL_DATA_PROVIDER_SPEC.md`
- `docs/50_EVIDENCE_CATALOG.md`
- `packages/provider-football/src/live/live-api-sports-match-catalog.ts`
- `packages/provider-odds/src/catalog/match-center-sport-keys.ts`

---

*End of Football Intelligence v2 Provider Capability Review.*
