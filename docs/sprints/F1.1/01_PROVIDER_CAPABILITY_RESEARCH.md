# Sprint F1.1 — Provider Capability Research + Repository Gap Analysis

| Field | Value |
|---|---|
| Roadmap | [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) |
| Sprint id | **F1.1** |
| Document type | Sprint Planning Research (capability + gap only) |
| Status | Research complete — **does not authorize coding** |
| Baseline | Architecture Freeze **v0.2**; Health Check [`docs/36_PROJECT_HEALTH_CHECK.md`](../../36_PROJECT_HEALTH_CHECK.md) |
| Provider under study | API-Sports Football (**API-Football**) via existing F.1 host `https://v3.football.api-sports.io` |
| Explicitly excluded from this document | Coding, Architecture Design, new Engines, changes to existing implementation |

### Governance

Follows Project Governance Rule (product development phase):

- No new Architecture document.
- No new Engine.
- This research prepares implementation; next artifacts are thin Sprint Spec / then code + tests + validation.

### Research questions

1. What can API-Sports (Football Data Provider) **actually** supply for F1.1 themes?
2. What does the **current repository** already support?
3. What is still **missing** to complete Sprint F1.1?

---

## 0. Executive answers

| Question | Answer |
|---|---|
| Provider capability | API-Football exposes **all listed endpoint families on Free and Paid**. Differentiation is **daily quota + historical season depth**, not feature paywalls. Per-league **`coverage` flags** decide whether lineups/injuries/players/stats exist for a season. |
| Repository today | F.1 delivers **Fixture / Team Form (window 5) / Team Stats (shots-based) / H2H / Standings** → Evidence `MATCH_INFO` + `TEAM_FORM` + `STATISTICS` + `HEAD_TO_HEAD`. **No** production of `LINEUP` / `INJURY`. Referee/venue/coach/player objects are **dropped or never mapped**. |
| F1.1 gap | Need **availability (injury+suspension)**, **confirmed lineup when present**, **referee identity**, **richer recent form**, **explicit missing states**, plus **recorded cassettes** for CI. **Expected lineup has no provider endpoint** — must not invent. Deep player stats / coach knowledge / referee tendencies / advanced match stats belong later (F1.2 / K1 / etc.). |

---

## 1. Provider plan facts (API-Sports / API-Football)

Sources: API-Football pricing; official getting-started guide (endpoint walkthrough); F.1 gate (`VERTICAL_SLICE_F1_FOOTBALL_DATA_PROVIDER_SPEC.md`).

| Plan aspect | Free | Paid (Pro / Ultra / Mega …) |
|---|---|---|
| Endpoints | **All** endpoints | **All** endpoints |
| Competitions | All competitions (subject to season availability) | All competitions |
| Daily requests | **100 / day** | 7,500 → 150,000+ / day depending on tier |
| Historical seasons | **Recent seasons only** (exact archive depth is account/plan-limited) | **Deeper historical archive** |
| Feature gating | **Not** by endpoint name | Same |
| League truth | Always check `/leagues` → season **`coverage`** booleans before relying on lineups / injuries / players / fixture stats | Same |

**Implication for F1.1:** capability risk is **coverage + timing + quota**, not “lineups require Pro.”

**Existing FAS default league set** (F.1): K League 1, J1, Allsvenskan, Veikkausliiga, Eliteserien, Big Five, UCL, UEL. Coverage of injuries/lineups is **not guaranteed** for every league-season; must be verified per competition before claiming completeness.

---

## 2. Capability matrix (Provider)

Legend for “Leagues”: **Coverage-gated** = only when `/leagues` season `coverage.*` is true for that competition.

### 2.1 Player

| Field | Finding |
|---|---|
| Capability | Player |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** (quota-limited) |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Coverage-gated (`coverage.players`) |
| Historical | Season stats for available seasons; Free = shallow archive |
| Live | Profile `injured` flag updates with injury feed; not a live pitch feed |
| 对应 Endpoint | `GET /players`, `GET /players/squads`, topscorers/assists/cards helpers |
| 更新频率 | Squad/profile: daily-ish; season stats refresh with competition data |

### 2.2 Lineup (confirmed)

| Field | Finding |
|---|---|
| Capability | Lineup (confirmed starting XI / bench / formation) |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Coverage-gated (`coverage.fixtures.lineups`) |
| Historical | Past fixtures often have lineups after the fact (sometimes only **24–72h after** kickoff for some competitions) |
| Live | Pre-match: typically **~20–75 minutes before KO** (league-dependent); not hours earlier |
| 对应 Endpoint | `GET /fixtures/lineups?fixture={id}` (also embedded when calling `GET /fixtures?id=` with includes in some flows) |
| 更新频率 | Poll near kickoff (~10–15 min) until present; rarely changes after official sheet |

### 2.3 Expected Lineup (probable / predicted XI)

| Field | Finding |
|---|---|
| Capability | Expected Lineup |
| Provider 是否支持 | **No dedicated product** |
| 免费版支持 | **No** |
| 付费版支持 | **No** |
| 支持哪些联赛 | N/A |
| Historical | N/A |
| Live | N/A |
| 对应 Endpoint | None. `/predictions` is API model forecast (winner / under-over / advice), **not** an XI. Do **not** treat as expected lineup. |
| 更新频率 | N/A |

**Product consequence:** F1.1 may show `lineupStatus=confirmed` when `/fixtures/lineups` returns data, or **explicit missing / not yet published**. “Expected / probable lineup” is **out of honest scope** unless a future provider or human source is approved.

### 2.4 Injury

| Field | Finding |
|---|---|
| Capability | Injury |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Coverage-gated (`coverage.injuries`) |
| Historical | Fixture-tied reports for past matches when retained; long-term person history via `/sidelined` |
| Live | Pre-match feed (not in-play medical telemetry) |
| 对应 Endpoint | `GET /injuries` (`fixture`, `team`, `league`+`season`, `player`, `date`) |
| 更新频率 | About **every 4 hours** |

### 2.5 Suspension

| Field | Finding |
|---|---|
| Capability | Suspension |
| Provider 是否支持 | **Yes** (same injuries feed; `type` = Suspension) |
| 免费版支持 | **Yes** |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Same as injuries coverage |
| Historical | `/sidelined` for person history; `/injuries` for fixture reports |
| Live | Same 4-hour injury/suspension feed |
| 对应 Endpoint | `GET /injuries` (filter/interpret `type` / `reason`); optional `GET /sidelined` for history |
| 更新频率 | ~4 hours (`/injuries`) |

### 2.6 Referee

| Field | Finding |
|---|---|
| Capability | Referee |
| Provider 是否支持 | **Partial** — **identity string on fixture**; **no** first-class referee tendency API |
| 免费版支持 | Name when published on fixture |
| 付费版支持 | Same |
| 支持哪些联赛 | Wherever fixtures include `fixture.referee` (often late / null for many leagues) |
| Historical | Can only approximate tendencies by scanning historical `/fixtures` referee fields (heavy quota; not a product endpoint) |
| Live | Appointment appears on fixture as officials publish (timing varies) |
| 对应 Endpoint | `GET /fixtures` / `GET /fixtures?id=` → `fixture.referee` |
| 更新频率 | With fixture metadata (not a dedicated cadence) |

### 2.7 Coach

| Field | Finding |
|---|---|
| Capability | Coach |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Broad; team current coach via `/coachs?team=` |
| Historical | Career history on `/coachs` |
| Live | Not live pitch data |
| 对应 Endpoint | `GET /coachs`; also coach block inside `/fixtures/lineups` |
| 更新频率 | About **daily** for `/coachs` |

### 2.8 Venue

| Field | Finding |
|---|---|
| Capability | Venue |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Nearly all fixtures include venue name/city; detail via `/venues` |
| Historical | Yes for past fixtures |
| Live | Static for a fixture unless venue change |
| 对应 Endpoint | Nested on `/fixtures`; `GET /venues`; also on `/teams` |
| 更新频率 | Rarely changes per fixture |

### 2.9 Recent Form

| Field | Finding |
|---|---|
| Capability | Recent Form |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** |
| 付费版支持 | **Yes** (deeper history if needed) |
| 支持哪些联赛 | Any league with finished fixtures |
| Historical | `GET /fixtures?team=&last=N` / date ranges; Free season depth limits very old form |
| Live | Updates after match completion |
| 对应 Endpoint | `GET /fixtures?team={id}&last={n}`; standings `form` string (last 5 W/D/L) as a thin alternate |
| 更新频率 | After results finalize |

### 2.10 Player Statistics

| Field | Finding |
|---|---|
| Capability | Player Statistics |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** (pagination burns quota) |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Coverage-gated (`coverage.fixtures.statistics_players` / players) |
| Historical | Season aggregates via `/players`; per-match via `/fixtures/players` after/during match |
| Live | `/fixtures/players` updates ~every minute in-play |
| 对应 Endpoint | `GET /players`, `GET /fixtures/players` |
| 更新频率 | Season: ongoing; match: live minute-level |

### 2.11 Team Statistics

| Field | Finding |
|---|---|
| Capability | Team Statistics |
| Provider 是否支持 | **Yes** |
| 免费版支持 | **Yes** |
| 付费版支持 | **Yes** |
| 支持哪些联赛 | Coverage-gated for fixture stats; `/teams/statistics` widely available |
| Historical | Season aggregates; per-match `/fixtures/statistics` after kickoff / post-match |
| Live | Fixture stats during match (F1.2 theme more than F1.1) |
| 对应 Endpoint | `GET /teams/statistics`, `GET /fixtures/statistics` |
| 更新频率 | `/teams/statistics` ~twice daily; fixture stats during/after match |

### 2.12 Unavailable Data

| Field | Finding |
|---|---|
| Capability | Unavailable Data (honest empty) |
| Provider 是否支持 | **Yes** (empty `results` with HTTP 200; coverage false) |
| 免费版支持 | Same |
| 付费版支持 | Same |
| 支持哪些联赛 | Any |
| Historical / Live | Common for lineups far before KO; injuries when `coverage.injuries=false` |
| 对应 Endpoint | Behavioral across endpoints |
| 更新频率 | N/A — product must treat empty as **explicit absence**, not success silence |

### 2.13 Historical Support

| Field | Finding |
|---|---|
| Capability | Historical Support |
| Provider 是否支持 | **Yes**, depth plan-dependent |
| 免费版支持 | Recent seasons |
| 付费版支持 | Deeper archives |
| 支持哪些联赛 | Coverage-gated per season |
| Historical | Fixtures, H2H, lineups (post-match), injuries reports, player/team stats |
| Live | N/A |
| 对应 Endpoint | Same families with past `fixture` / `season` |
| 更新频率 | Static after match sealed |

### 2.14 Live Support

| Field | Finding |
|---|---|
| Capability | Live Support (in-play) |
| Provider 是否支持 | **Yes** for score/events/player match stats; **limited** for F1.1 pre-match themes |
| 免费版支持 | Yes but **100 req/day** makes live polling impractical |
| 付费版支持 | Practical for polling |
| 支持哪些联赛 | Coverage-gated |
| Historical | N/A |
| Live | `/fixtures?live=`, `/fixtures/events`, `/fixtures/players`; lineups are **pre-match**, not in-play XI churn |
| 对应 Endpoint | Fixtures live family |
| 更新频率 | Scores/events ~15s; player match stats ~1 min |

---

## 3. Repository status (current FAS)

Inventory is observational against Architecture Freeze v0.2 / F.1 delivery — **not** a redesign.

### 3.1 What F.1 already implements (facts path)

| Area | Status |
|---|---|
| Package | `@fas/provider-football` |
| Domain models | `FootballFixture`, `FootballTeamForm`, `FootballTeamStats`, `FootballH2H`, `FootballStandings`, `FootballMatchBundle` |
| Live endpoints used | `/fixtures` (list + by id), `/fixtures?team&last`, `/teams/statistics`, `/fixtures/headtohead`, `/standings` |
| Recorded mode | Cassette bundles (e.g. K League) for offline CI |
| Evidence produced | `MATCH_INFO`, `TEAM_FORM`×2, `STATISTICS`×2, `HEAD_TO_HEAD` |
| Analyze minimum | Still `MATCH_INFO` + both `TEAM_FORM` + both `STATISTICS` (backward compatible target for F1.1) |

### 3.2 Per-capability repository matrix

#### Player

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** (no player domain object / ingest) |
| Evidence 是否存在 | Type enum has no dedicated `PLAYER`; player facts would ride on `LINEUP` / `INJURY` / `STATISTICS` payloads |
| Feature 是否存在 | **No** player features |
| Rule 是否存在 | **No** |
| Report 是否存在 | **No** player section |
| UI 是否存在 | **No** |

#### Lineup

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** ingest/mapping |
| Evidence 是否存在 | **Type exists** (`LINEUP`) — **never populated** by Football Data path |
| Feature 是否存在 | **No** |
| Rule 是否存在 | **No** |
| Report 是否存在 | Label only if evidence appears (`explainable-report` map) |
| UI 是否存在 | Timeline label only; **no** lineup panel |

#### Expected Lineup

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** |
| Evidence / Feature / Rule / Report / UI | **No** (and provider cannot supply) |

#### Injury

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** ingest/mapping |
| Evidence 是否存在 | **Type exists** (`INJURY`) — **never populated** |
| Feature 是否存在 | **No** |
| Rule 是否存在 | **No** (V2 seed design mentions absence features; not implemented) |
| Report / UI | Labels only; no availability section |

#### Suspension

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** (would share injury/availability feed) |
| Evidence | Same as Injury (`INJURY` type can carry suspension reasons — unused) |
| Feature / Rule / Report / UI | **No** |

#### Referee

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** — fixture mapper **discards** `fixture.referee` |
| Evidence 是否存在 | **No** `REFEREE` evidence type in code (design doc marks future) |
| Feature / Rule / Report / UI | **No** |

#### Coach

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** |
| Evidence / Feature / Rule / Report / UI | **No** (Knowledge-style coach profiles are roadmap **K1**, not F1.1) |

#### Venue

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **Partial** — API returns venue; FAS fixture mapper **does not keep** it; `MATCH_INFO` payload is only home/away/kickoff |
| Evidence | `MATCH_INFO` exists but **without** venue fields |
| Feature | Only home/away/kickoff |
| Rule / Report / UI | No venue surface |

#### Recent Form

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **Yes (thin)** — window **5**, W/D/L + GF/GA arrays |
| Evidence | `TEAM_FORM` **yes** |
| Feature | Momentum / attack-defense from form+stats **yes** |
| Rule | `rule:momentum-home|away:v1` **yes** |
| Report / UI | Form appears via features/evidence timeline; **not** a rich form narrative section |

#### Player Statistics

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **No** |
| Evidence | Could use `STATISTICS` with player subject — **not done** |
| Feature / Rule / Report / UI | **No** |

#### Team Statistics

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **Yes (F.1 scope)** — season shots-based via `/teams/statistics`; xG usually zero; advanced match stats deferred to **F1.2** |
| Evidence | `STATISTICS` **yes** |
| Feature / Rule | Used in projection path |
| Report / UI | Via analysis surfaces, not advanced-stats panels |

#### Unavailable Data

| Layer | Status |
|---|---|
| Repository 是否已经支持 | **Partial** — projection limitations exist for proxy stats; **no** first-class “lineup missing / injury coverage false” product states for F1.1 themes |
| Evidence | Empty success risk if future ingest swallows empties — must forbid |
| UI | Needs explicit missing states per F1.1 acceptance |

#### Historical / Live support (repo)

| Layer | Status |
|---|---|
| Historical | Recorded cassettes + live historical fetches for form/H2H; **no** historical lineup/injury cassettes |
| Live | Live fixtures/list + enrich catalog; **no** lineup/injury live fetch; Free quota already strained by current enrich fan-out (~7 calls/match) |

---

## 4. Gap analysis (for Sprint F1.1)

Framed as **capability gaps** (what must exist product-wise). Not an architecture redesign.

### 还缺哪些对象（product / domain concepts）

| Object | Need for F1.1 |
|---|---|
| Availability report (injury + suspension per side) | **Must** |
| Confirmed lineup (XI, bench optional, formation, status) | **Must** when provider has data |
| Lineup absence state (`not_published` / `coverage_unavailable`) | **Must** |
| Referee identity (name string + observedAt) | **Must** when published |
| Venue identity (name/city) | **Should** |
| Coach name on match context | **Could** (from lineup or `/coachs`) |
| Richer recent form (e.g. last 5 + last 10, optional home/away split) | **Must** (roadmap “richer recent form”) |
| Player season/match deep stats | **Won't** (later) |
| Expected / probable XI | **Won't** (provider cannot) |
| Referee card/penalty tendency model | **Won't** (no endpoint; quota-hostile) |
| Knowledge Engine coach/style profiles | **Won't** → **K1** |

### 需要新增哪些 DTO（contract shapes — names indicative）

- Availability / injury-suspension rows (player id/name, team, type, reason, observedAt)
- Lineup side (status confirmed|missing, formation?, starters[], bench?)
- Match context enrichment: referee?, venue?
- Form enrichment fields (window sizes, optional split flags) — extend existing form shape carefully
- Explicit gap/limitation codes for missing coverage

*(Exact TypeScript layouts belong in a later thin Spec / implementation — not designed here.)*

### 需要新增哪些 Provider Mapping

| Mapping | Purpose |
|---|---|
| `/injuries?fixture=` → availability domain | Injury + suspension |
| `/fixtures/lineups` → lineup domain | Confirmed XI |
| `/fixtures` referee + venue fields → fixture enrichment | Identity context |
| Optional `/coachs` or lineup coach → coach name | Could |
| Form: `last=10` (and/or dual windows) → richer `TEAM_FORM` | Recent form |
| Coverage check via `/leagues` (or recorded coverage flags) | Unavailable Data honesty |

**Do not map** `/predictions` into lineup. **Do not** invent expected XI.

### 需要新增哪些 Repository / persistence concerns

- F1.1 can stay on **existing Evidence repository ports** (in-memory / optional postgres Evidence) — **no new Engine DB**.
- Need **recorded football fixtures** that include availability + lineup + referee/venue samples for offline CI.
- Optional: cache/coverage snapshot to avoid burning Free-tier calls (product/ops concern; not Redis platform).

### 需要新增哪些 Evidence

| Evidence | Action |
|---|---|
| `INJURY` | **Populate** (include suspensions in payload semantics) |
| `LINEUP` | **Populate** when confirmed; otherwise emit explicit missing limitation / non-evidence gap state per Spec |
| `TEAM_FORM` | **Enrich** (richer windows) — reuse type |
| `MATCH_INFO` | **Enrich** with venue/referee when available — reuse type preferred over new `REFEREE` kind in MVP |
| `STATISTICS` (player) | **Defer** |
| New `REFEREE` type | **Defer** unless Spec proves MATCH_INFO insufficient |

### 需要新增哪些 Feature

| Feature theme | F1.1 MVP |
|---|---|
| Availability / key absences (count or flagged roles — still factual) | **Should** if it stays non-inferential |
| Lineup confirmed boolean / formation string | **Should** for report citation |
| Referee name / venue name | **Could** as display features |
| Projection-changing absence weights | **Won't** unless tiny optional finding — prefer **not** blocking analyze |

Roadmap acceptance: deterministic projection **still runs** on current minimum evidence.

### 哪些 Rule 可以直接复用

| Rule | Reuse |
|---|---|
| Momentum home/away (`rule:momentum-*`) | **Yes** — benefits from richer form |
| Attack/defense rating path driven by form+stats features | **Yes** |
| New “absence impact” rules | **Defer** — not required for F1.1 acceptance (facts first) |

### 哪些 Report / UI 可以直接复用

| Surface | Reuse |
|---|---|
| Evidence timeline type labels (`INJURY`, `LINEUP`, `TEAM_FORM`) | **Yes** |
| Explainable report shell / limitations list | **Yes** — extend limitations text |
| Match Center list | **Reuse** — detail/context enrichment is the F1.1 surface |
| Dedicated lineup pitch diagram / injury management UI polish | **Could** — MVP can be structured lists |

---

## 5. Implementation complexity (indicative)

| Capability slice | Complexity | Why |
|---|---|---|
| Injury + Suspension → Evidence + missing states | **M** | New mapping + cassette + UI/report citation |
| Confirmed Lineup → Evidence + missing states | **M** | Timing/coverage variance; recorded fixtures mandatory |
| Referee + Venue on MATCH_INFO | **S** | Fields already on provider fixture; mapper drop today |
| Richer Recent Form (5→5+10 / splits) | **S–M** | Mostly extend existing form path; watch quota (`last=N`) |
| Coach name only | **S** | Easy if tied to lineup response |
| Player season stats / squad analytics | **L** | Pagination + product surface + not needed for F1.1 acceptance |
| Expected Lineup | **—** | Provider cannot; inventing would be epistemic violation |
| Referee tendencies | **XL** | No API; historical scrape; governance/noise risk |
| Live pre-match polling platform for lineups | **L** | Free tier hostile; needs paid + job design (out of F1.1 MVP) |

**Sprint F1.1 overall (aligned with roadmap):** **M**, 2–3 weeks if MVP is scoped below.

---

## 6. MoSCoW

### Must

- Fixture-scoped **Injury + Suspension** availability facts (when coverage allows).
- **Confirmed Lineup** facts when `/fixtures/lineups` returns data.
- **Explicit missing / incomplete** states when lineup or injuries are absent (never silent empty success).
- **Referee identity** when fixture publishes a referee string.
- **Richer Recent Form** beyond today’s single thin window-5 presentation (at least dual window or expanded window with provenance).
- **Recorded** offline fixtures covering happy-path + missing-path for CI.
- Backward-compatible analyze: still works with only F.1 minimum evidence.
- Sprint artifacts cite roadmap **F1.1**.

### Should

- **Venue** name/city on match context.
- Report / Workspace sections that **cite** availability + lineup + referee + form (structured, reviewable).
- Lightweight **features** for “lineup confirmed”, “availability rows present”, without changing projection math.
- League **coverage** awareness (do not claim injuries for leagues with `coverage.injuries=false`).

### Could

- Coach name from lineup / `/coachs`.
- Bench list + formation diagram polish.
- Squad roster snapshot (`/players/squads`) for context only.
- Home/away form splits if cheap from existing fixture history.

### Won't (this Sprint)

- **Expected / probable lineup** (no provider support — do not fake).
- **Player deep statistics** / player ratings as analysis core (**later**).
- **Advanced match statistics** shots-on-target/possession/corners (**F1.2**).
- **xG / shot map** (**F1.3**).
- **Referee tendency engine** or card models.
- **Knowledge Engine** coach/tactical profiles (**K1**).
- **Case / Statistics / Review engines** activation.
- New Architecture documents or new Engines.
- Redis / BullMQ live polling platform.
- Making LINEUP/INJURY **required** for `analyzable` / projection.

---

## 7. Sprint F1.1 MVP Scope

### Phase-1 capabilities that **should** be implemented

1. **Availability (Injury + Suspension)** from `/injuries?fixture=` → domain → `INJURY` evidence (both types in one availability concept).  
2. **Confirmed Lineup** from `/fixtures/lineups` → domain → `LINEUP` evidence when present.  
3. **Missing-state honesty** for lineup/injuries (coverage false, too early, empty response).  
4. **Referee (+ Should: Venue)** enrichment on match context / `MATCH_INFO`.  
5. **Richer Recent Form** (expand windows / presentation; keep evidence-backed).  
6. **Report + UI citation surfaces** for the above (lists + limitations).  
7. **Recorded cassettes** for CI (present + absent variants).  
8. Preserve F.1 analyze path when new signals missing.

### Capabilities Provider supports but **should defer**

| Capability | Defer to | Reason |
|---|---|---|
| Expected Lineup | Never via API-Football alone | No endpoint; inventing breaks epistemic rules |
| Player season / match stats depth | Post-F1.1 or analytics later | Quota + surface size; not in F1.1 acceptance |
| `/sidelined` career injury history | Later enrichment | Nice-to-have durability narrative |
| Coach career / tactical knowledge | **K1** | Knowledge Engine slot |
| Fixture advanced team stats (corners, possession, …) | **F1.2** | Roadmap ownership |
| True xG / shot maps | **F1.3** | Roadmap ownership |
| Live in-play polling of lineups/events | Paid ops / later | Free 100/day; not needed for private MVP demo with recorded |
| Referee tendency statistics | Later research | No dedicated API |

---

## 8. Sprint F1.1 风险

### Provider 限制

- Lineups often **unavailable until ~30–75 minutes** before kickoff; some leagues only post-match.
- Injuries feed can be **stale (~4h)** or incomplete vs club reality.
- Referee field frequently **null** until late.
- Empty HTTP 200 is normal — easy to mis-handle as “no injuries” vs “unknown.”

### 免费版限制

- **100 requests/day**: current enrich already uses multiple calls per match; adding injuries + lineups + coverage checks will **exhaust Free quickly**.
- MVP must prioritize **recorded mode** for demos/CI; live is optional smoke only.
- Pagination on `/players` is especially hostile — another reason to Won't player stats now.

### 联赛覆盖限制

- `coverage.lineups` / `coverage.injuries` / `coverage.players` vary by league-season.
- Default FAS league set mixes Big Five and Nordic/Asian leagues — **uneven** F1.1 completeness.
- Product copy must say “when available for this competition,” not global completeness.

### Historical 数据限制

- Free plan **shallow seasons** — historical lineup/injury cassettes should be **recorded snapshots**, not live deep history jobs.
- Some historical lineups appear only days after the match.

### Live 数据限制

- Live lineup polling near kickoff is **ops-heavy** and Free-tier impractical.
- F1.1 acceptance should be provable on **recorded + optional live smoke**, not continuous live lineup tracking.

### Epistemic / product risks

- Temptation to synthesize **expected lineups** from news or `/predictions` — **forbidden** in F1.1.
- Treating absence of `/injuries` rows as “full squad healthy” without coverage check — **misleading**.
- Letting new signals become **hard dependencies** of projection — would break backward compatibility.

---

## 9. Sprint F1.1 推荐实施顺序

```text
1) Freeze MVP MoSCoW in a thin Sprint Spec (cite doc 40 / F1.1)
2) Recorded cassette design: availability + lineup + referee/venue + form-rich + missing variants
3) Provider mappings (injuries, lineups, fixture referee/venue) → Football domain only
4) Evidence population (INJURY, LINEUP) + MATCH_INFO/TEAM_FORM enrichment
5) Explicit missing / limitations propagation into analyze + report
6) UI/report citation sections (lists first, polish later)
7) Offline tests + validate; optional live smoke on one covered league
8) Completion report with acceptance evidence
```

**Do not** start with player statistics, expected lineup, or referee tendency models.

**Do not** open Architecture documents or new Engines for this Sprint.

---

## 10. Traceability

| Artifact | Role |
|---|---|
| [`docs/40_PRODUCT_ROADMAP.md`](../../40_PRODUCT_ROADMAP.md) § Sprint F1.1 | Product authority for goals / acceptance |
| [`docs/36_PROJECT_HEALTH_CHECK.md`](../../36_PROJECT_HEALTH_CHECK.md) | Freeze / health baseline |
| `docs/sprints/VERTICAL_SLICE_F1_FOOTBALL_DATA_PROVIDER_SPEC.md` | F.1 provider gate (facts ≠ odds); excluded injury/lineup as required then |
| This file | Capability research + gap + MVP scope — **planning only** |

### Next authorized planning step (still non-coding unless gated)

Thin **Sprint F1.1 Specification** (inputs / outputs / acceptance / recorded fixtures plan) → human gate → then implementation code + tests + validation.

---

*End of Sprint F1.1 Capability Research. No code or architecture changes authorized by this document alone.*
