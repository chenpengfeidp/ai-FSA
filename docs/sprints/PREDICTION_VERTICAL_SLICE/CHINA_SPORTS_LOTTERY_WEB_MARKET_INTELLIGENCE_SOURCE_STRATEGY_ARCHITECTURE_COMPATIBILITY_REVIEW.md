# China Sports Lottery + Web Market Intelligence — Source Strategy / Architecture Compatibility Review

| Field | Value |
|---|---|
| Review type | Bounded planning / architecture compatibility (no implementation) |
| Date | 2026-09-13 |
| Track | `PREDICTION_VERTICAL_SLICE` |
| Architecture Freeze | **v0.3** (unchanged by this review) |
| Binding inputs | Human owner product clarification; `docs/PROJECT_STATE.md`; canonical FIP; PVS-3.3 audit |
| Production code changed | **No** |
| Final recommendation | **A. EXISTING ARCHITECTURE CAN SUPPORT CHINA SPORTS LOTTERY + WEB MARKET INTELLIGENCE WITH A BOUNDED ADDITIVE INPUT/EVIDENCE SPRINT** |

---

## 1. Current repository state

| Item | Status |
|---|---|
| `current_track` | `PREDICTION_VERTICAL_SLICE` |
| `current_stage` | `AUTHENTIC_PREMATCH_SEAL_CAPTURE_IMPLEMENTATION_COMPLETED` |
| `current_gate` | `AUTHENTIC_PREMATCH_SEAL_CAPTURE_REAL_ARTIFACT_VERIFICATION` |
| `authentic_prematch_seal` | `NOT_FOUND` |
| `authentic_prematch_seal_capture_capability` | `IMPLEMENTED` (`1effc56`) |
| `historical_evaluation_intake` | `C_BLOCKED` |
| `production_historical_intake_authorized` | `false` |
| `next_action` (documented) | `OBTAIN_API_FOOTBALL_CURRENT_SEASON_ENTITLEMENT_AND_RETRY_REAL_PREMATCH_CAPTURE_VERIFICATION` |
| Latest verification | `REAL_PREMATCH_CAPTURE_VERIFICATION.md` — Postgres path OK; blocked on **live API-Football upcoming catalog** |

Pipeline direction remains frozen:

```text
Provider → Evidence → Feature → Rule → Analysis → Report → Prompt → AI Provider
```

PRE_MATCH seal capture is implemented and **provider-agnostic** at the seal contract layer
(home/away/competition/season/kickoff from `MATCH_INFO`, cutoff-governed `evidenceSet`).

---

## 2. Product clarification (owner intent)

Production intent:

1. **Fixture selection** starts from the daily **China Sports Lottery football match list**
   (中国竞彩足球), supplied by the human or obtained through an approved intake path.
2. For each selected match, gather **freshest PRE_MATCH** market and football intelligence
   from **multiple public/approved sources** (not a single mandatory API-Football catalog).
3. Evidence spans markets (1X2, AH, O/U, BTTS, team totals, correct score as secondary),
   price movement, injuries/lineups, form/stats/xG where available, and **contextual**
   betting popularity / sentiment where legitimately sourced.
4. Data enters the **existing** Evidence → Feature → Rule → Projection pipeline.
5. Predictions are frozen with the **existing authentic PRE_MATCH seal** architecture.
6. Post-match Actual and Evaluation remain separate; **no retrospective reconstruction**.

This review treats that intent as **product direction**, not yet an authorized sprint.

---

## 3. Is API-Football mandatory?

**NO** — at architecture and canonical-protocol level.

| Evidence | Conclusion |
|---|---|
| FIP `fip.analysis-protocol.v1` | **Provider binding: Provider-agnostic**; “No vendor is mandatory at protocol level.” Official sites are External Evidence until an approved adapter maps to canonical Evidence. |
| Project Bible / pipeline | Facts, market signals, and inference remain separate; providers are adapters inward. |
| PVS-3.3 | API-Football is **sufficient** for the *current* football-facts minimum in the integrated adapter, not **necessary** for Projection V2 math. **Option C**: market-depth and multi-source acquisition need an **additional data acquisition layer**, not a paid API-Football plan by default. |
| `REAL_PREMATCH_CAPTURE_VERIFICATION` | Blocker was **Match Center schedule / entitlement** for *that verification recipe* (`GET /api/matches/upcoming` + live Football Data), not a seal-schema requirement for API-Football ids. |
| Implementation today | `@fas/provider-football` is the **default Match Center schedule + football-facts** implementation (`recorded` \| `live` \| `fixture`). It is a **composition choice**, not an Architecture Freeze invariant. |

**YES** only as a **current default implementation** for Match Center and recorded CI cassettes until a lottery-first schedule adapter and multi-source football-fact adapters exist.

---

## 4. Existing provider architecture

| Package / surface | Role |
|---|---|
| `@fas/provider-football` | Football Data domain model → Evidence (fixture, form, stats, H2H, injuries, lineups, etc.) |
| `@fas/provider-odds` | Market layer (The Odds API); optional overlay; not football truth |
| `@fas/provider-fixture` | Demo / test fixture bundles |
| `@fas/evidence-import` + `@fas/evidence-normalizer` | Untrusted → canonical Evidence |
| `@fas/evidence` | `EvidenceType`, provenance, `collectedAt` / `eventTime` |
| `@fas/application` | `ImportMatchUseCase` — `MatchProvider` + importer |
| `@fas/analysis` | `AnalyzeMatchUseCase` — import, query, feature, rule, projection |
| `@fas/report` | `GenerateMatchReportUseCase` + auto PRE_MATCH seal when postgres repo wired |
| `apps/api` | Composition root; `FOOTBALL_DATA_PROVIDER_MODE`, `ODDS_PROVIDER_MODE`, persistence modes |

Match resolution today:

- `POST /api/analyze` — home/away (+ optional date)
- `POST /api/analyze/match/:matchId`
- `GET /api/matches/upcoming` — **Football Data–centric** board (with explicit recorded fallback metadata)

---

## 5. Proposed China Sports Lottery fixture path (planning only)

**Target workflow (no code):**

```text
Daily lottery list intake (human or approved fetcher)
  → canonical LotteryFixture record (issue date, match number, teams, competition, kickoff TZ)
  → deterministic MatchId + MATCH_INFO Evidence (fixture authority = lottery intake, not API-Football)
  → parallel / sequenced source adapters (web + market) → Evidence import
  → existing AnalyzeMatchUseCase (cutoff-governed)
  → AnalysisResult → seal → Report
```

**Intake options (future sprint must pick one, not all):**

| Option | Description | Fits freeze? |
|---|---|---|
| **A. Operator manifest** | Human uploads/pastes daily 竞彩 list (JSON/CSV); API validates and registers fixtures | Yes — transport + validation at API boundary |
| **B. Approved fetcher adapter** | Single governed collector for official lottery publication pages/API | Yes — new provider adapter; licensing/retention ADR if needed |
| **C. Hybrid** | Human confirms machine-extracted list | Yes — strongest for identity disputes |

**Match Center** should gain a **lottery schedule source** distinct from `football-data` recorded fallback, with explicit `scheduleSource` / `fixtureAuthority` metadata (FIP: no silent live claims).

---

## 6. Fixture identity authority

Authentic PRE_MATCH seal (`AUTHENTIC_PREMATCH_SEAL_CAPTURE_STORAGE_AUTHORITY_PLANNING_GATE.md`) requires **exact** identity on the seal, sourced from **`MATCH_INFO`** at analysis time — **not** API-Football specifically.

### Planning requirements (deterministic, not implemented)

| Concern | Requirement |
|---|---|
| **matchId** | Stable, deterministic, namespaced (e.g. `lottery:csl:{salesDate}:{serial}` or `football:lottery:csl:…`). Must not collide with `football:{apiFixtureId}` or demo ids. Documented allocation registry. |
| **home / away** | Lottery list orientation is authoritative; reversal = **different** identity. Seal strings must match `MATCH_INFO`. |
| **competition** | Map lottery competition code → FAS `competitionId` + display name; version the mapping table. |
| **season** | Explicit sports season string (may differ from calendar year); required on seal. |
| **kickoff** | ISO-8601 with timezone (`Z` or offset); lottery local time converted once, stored canonically. |
| **Reschedule** | New kickoff → new analysis identity decision: either same `matchId` with governed `MATCH_INFO` version + fail-closed if kickoff drift vs seal, or new id — **must be explicit in intake contract** (recommend: same business key + `fixtureRevision` Evidence, fail-closed on seal mismatch). |
| **Naming aliases** | Team alias table (CN/EN/traditional) for **matching sources**, not for mutating seal names after lock. |
| **Duplicate detection** | Unique key on `(salesDate, lotterySerial)` and soft match on `(home, away, kickoff window)` → `AMBIGUOUS_FIXTURE` (mirror existing analyze ambiguity patterns). |

`createMatchId` (`@fas/match`) accepts opaque string ids; **authority** is which adapter mints them and what `MATCH_INFO` contains.

---

## 7. Market Evidence mapping

Legend: **A** supported today · **B** additive Evidence/normalizer/adapter · **C** contextual only · **D** must not enter deterministic Projection

| Category | Status | Notes |
|---|---|---|
| **1X2** | **A** | `ODDS` payload; Features `marketLean`, `impliedProbabilities`; Rules `MARKET_LEAN_*` |
| **Asian Handicap** | **A** | B.2 path: `asianHandicapLine`, lean features; AH rules (`channel: "none"`) |
| **Over/Under** | **A/B** | I2A `markets[]` / totals in normalizer; Feature path partial — verify coverage for lottery book lines |
| **BTTS** | **B** | Projection outputs BTTS from matrix; dedicated **market** BTTS odds → extend `ODDS` / `markets[]` if sources provide |
| **Team Total** | **B** | Not first-class market type in catalog; additive `markets[]` entry + normalizer |
| **Correct score** | **C/D** | Matrix produces scorelines; **book correct-score prices** → secondary `ODDS`/`markets[]` (**C**), not football facts; do not drive core softmax |
| **Odds movement** | **A/B** | Opening/current/closing in fixture normalizer + Features `steamMove`, `reverseLineMovement` when **provider-supplied** |
| **Bookmaker / consensus** | **B** | Multiple `ODDS` rows per match; Feature `marketConsensus` exists — needs **explicit** multi-book policy |
| **Opening / current / closing** | **A** (recorded depth) / **B** (live web) | I2A: live API often lacks history; web snapshots must be **new Evidence rows**, not overwrites |
| **Injuries** | **A** | `INJURY` Evidence when football adapter supplies |
| **Lineup** | **A** | `LINEUP` |
| **Form** | **A** | `TEAM_FORM` — **CORE** for analyze path |
| **Home/away statistics** | **A** | `STATISTICS` — **CORE** |
| **xG / shots** | **A/B** | `EXPECTED_GOALS` / `STATISTICS` when source maps honestly; else absent |
| **Betting popularity** | **B/C** | Payload fields `publicBettingHomePct` etc. in I2A; Features only when present — **C** for Projection core |
| **Media / fan sentiment** | **C/D** | `NEWS` / category `sentiment` — **narrative/context**; **D** for Rule/Projection unless promoted via governed Feature sprint |

**CORE analyze gate (code):** `AnalyzeMatchUseCase` counts five foundations — `MATCH_INFO`, home/away `TEAM_FORM`, home/away `STATISTICS`. Lottery-first product **must** still satisfy these via **some** football-fact adapters (web or API), or analysis **fail-closes** — by design.

---

## 8. Multi-source provenance strategy

### Existing Evidence provenance (use first)

`Evidence` already carries:

- `providerId`, `source`, `sourceId`, `type`
- `collectedAt`, `eventTime`, `timestamp`
- `freshness`, `confidence`, `quality`
- `provenance.collector`, `provenance.method`, `provenance.providerId`, `provenance.category`

`ODDS` / I2A payloads add market-specific fields (`observedAt`, `marketSource`, `markets[]`, movement fields).

### Minimum additive contract (planning)

Only add fields when normalizer cannot express:

| Planned field | Need |
|---|---|
| `sourceUrl` | **B** — recommended in `payload` or provenance extension for web snapshots (audit) |
| `sourceType` | **B** — e.g. `lottery_official`, `bookmaker_web`, `stats_portal` (enum in normalizer) |
| `marketTimestamp` | **A** — map to `eventTime` / `observedAt` |
| `sourceAuthority` | **A** at seal layer for Class A seals only; per-Evidence use `providerId` + `quality` |
| `normalizedValue` | **A** — canonical payload after normalizer |

Do **not** duplicate `sourceAuthority` semantics from PRE_MATCH seal onto every Evidence row unless catalog requires it.

---

## 9. Opening / current / closing snapshot strategy

**Principle:** Evidence is **append-only** at the domain level; Postgres Evidence persistence stores records (P.2). **Never overwrite** a prior snapshot in place.

| Phase | Representation |
|---|---|
| **OPENING** | New `ODDS` Evidence (or `markets[]` row) with `opening*` fields or `phase: "opening"` in payload; `collectedAt` = intake time |
| **CURRENT** | New Evidence row per observation cycle; `collectedAt` ≤ `analysisCutoff` |
| **CLOSING / near-kickoff** | Final row before cutoff; label in payload |

**analysisCutoff:** At analyze, only Evidence with `collectedAt <= analysisCutoff` may appear in `evidenceSet`. Movement Features require **both** endpoints provider-supplied (existing I2A rule). Line movement **across** snapshots becomes visible to Features by **querying multiple Evidence rows** for the same match — may require Evidence query enhancements (FIP-2 P1: cutoff-aware queries — not yet runtime).

---

## 10. Source conflict handling (deterministic plan)

**No silent winner.**

| Conflict type | Planned handling |
|---|---|
| **1X2 / AH / O/U prices** | Multiple `ODDS` Evidence rows (per book/source); Feature `marketConsensus` / median policy **versioned** in Feature layer; emit **Rule findings** or `MATCH_CONTEXT` disagreement notes — not silent overwrite |
| **Kickoff** | Lottery intake authority > secondary sources; mismatch → `FIXTURE_IDENTITY_CONFLICT` fail-closed |
| **Injuries / lineup** | Prefer freshest `collectedAt` ≤ cutoff per source tier; conflicting player status → `INJURY`/`LINEUP` both retained; Rule **conflict** finding |
| **Team names** | Alias resolution at intake only; seal uses lottery strings |
| **Missing tier-1 source** | Fail-closed or explicit `ok: false` with limitation — no invented consensus |

Document **source priority table** in sprint spec (e.g. lottery official > licensed book scrape > aggregator).

---

## 11. Sentiment / public betting treatment

| Signal | Recommended class | Projection | Rule | Narrative |
|---|---|---|---|---|
| Public betting % | **2 — secondary Feature** when in `ODDS` payload | **No** direct softmax input | Optional lean / caution rules | Explain in report |
| Bookmaker popularity | **2/C** | No | Caution only | Yes |
| Media sentiment | **3 — narrative** via `NEWS` / prompt context | **D** | **D** | Yes, labeled inference |
| Fan / social sentiment | **4 — excluded** from deterministic path unless governed adapter + **C** at best | **D** | **D** | Optional disclaimer only |

**Risk:** Noisy sentiment dominating market facts violates Bible § separate facts/market/inference. Existing `sharpSupport` / `reverseLineMovement` already require explicit fields — keep that discipline.

---

## 12. PRE_MATCH seal compatibility

**Yes — no seal-schema or pipeline-order change required.**

Required lifecycle remains satisfiable:

```text
analysisTime === analysisCutoff < kickoff
∀ e ∈ evidenceSet: e.collectedAt ≤ analysisCutoff
sealedAt ≥ analysisTime ∧ sealedAt < kickoff
durable postgres insert → Class A candidate (admission separate)
```

Seal identity fields come from **`MATCH_INFO`** produced under lottery fixture authority. Multi-source web/market data affects **Evidence composition**, not seal hash algorithms.

**Class A verification recipe must change:** stop using “live API-Football upcoming catalog” as the **only** authorized path to a real fixture. Replace with **lottery-selected fixture + governed multi-source PRE_MATCH run** once adapters exist.

---

## 13. Files / packages likely affected (future implementation)

| Area | Likely touch |
|---|---|
| New or extended **schedule provider** | `@fas/provider-fixture` extension **or** new `@fas/provider-*` adapter (sprint-gated) |
| Lottery intake API | `apps/api` controllers, DTOs, composition |
| Evidence import | `@fas/evidence-import`, `@fas/evidence-normalizer` |
| Web/market collectors | New adapters (ports inward); **not** domain imports of HTTP |
| Match board | `apps/api/src/upcoming-matches*.ts`, metadata (`scheduleSource`, `fixtureAuthority`) |
| Config | `@fas/config` — modes for lottery schedule vs football-data |
| Tests | Recorded cassettes for lottery row + multi-source bundle |
| Docs | Sprint spec/report under `PREDICTION_VERTICAL_SLICE`; optional `docs/50_EVIDENCE_CATALOG.md` additive entries |
| Verification | `REAL_PREMATCH_CAPTURE_VERIFICATION.md` successor runbook |

---

## 14. Files / packages that MUST NOT change (without separate gates)

| Area | Reason |
|---|---|
| PRE_MATCH seal hash / canonical JSON | Class A integrity |
| `prematch-prediction-seal.v1` classification rules | Admission contract |
| Projection V2 core mathematics | Calibration governance |
| Historical Evaluation Intake | `C_BLOCKED` |
| Rule thresholds / promotion | R1B / calibration gates |
| Architecture Freeze documents | No defect cited |
| FIP canonical protocol text | Use FIP-2 Px for runtime gaps, not ad-hoc edits |

---

## 15. FIP changes required?

**No canonical FIP rewrite** for this product clarification.

FIP already states provider-agnostic operation and external Evidence rules.

**Future (authorized) FIP-2 P1/P3** work may tighten:

- cutoff-aware Evidence queries for multi-snapshot markets;
- transport fields for `analysisTime` / timezone;
- conformance for lottery schedule metadata.

Those are **enforcement** gaps, not conflicts with owner intent.

---

## 16. Roadmap changes required?

**Yes — human reconciliation recommended**, not silent edit.

`docs/40_PRODUCT_ROADMAP.md` does not yet name **China Sports Lottery schedule authority** or **multi-source web acquisition**. Add a **bounded sprint** (e.g. PVS-4 or D-track intake) via normal roadmap amendment after this review.

This review **does not** modify doc 40.

---

## 17. Governance conflict analysis

| Layer | Documented state | Product intent | Architecture |
|---|---|---|---|
| **Next action** | Buy API-Football season → retry verification | Lottery-first fixture; multi-source web | Providers optional; verification recipe was Football-Data-centric |
| **Conflict?** | **Yes — procedural**, not structural | Owner rejects API-Football **purchase for verification alone** | Architecture supports alternate fixture authority |
| **Seal gate** | `NOT_FOUND` | Still need **one** real Class A capture | Seal path OK; **fixture/evidence source** must change |
| **Intake** | `C_BLOCKED` | Evaluation later | Unchanged |

**Conclusion:** Conflict is **PROJECT_STATE next_action** and **verification acceptance criteria**, not Architecture Freeze violation.

---

## 18. Proposed PROJECT_STATE reconciliation (for human approval)

```yaml
# PROPOSED — not applied by this review
next_action: AUTHORIZE_CHINA_LOTTERY_FIXTURE_AUTHORITY_AND_MULTI_SOURCE_PREMATCH_EVIDENCE_PLANNING_GATE
next_production_capability: LOTTERY_SCHEDULE_INTAKE_PLUS_WEB_MARKET_EVIDENCE_ADAPTERS
current_gate: AUTHENTIC_PREMATCH_SEAL_CAPTURE_REAL_ARTIFACT_VERIFICATION  # unchanged until new candidate exists
authentic_prematch_seal: NOT_FOUND  # unchanged
historical_evaluation_intake: C_BLOCKED  # unchanged
```

Deprecate as **primary** product path:

- `OBTAIN_API_FOOTBALL_CURRENT_SEASON_ENTITLEMENT_AND_RETRY_REAL_PREMATCH_CAPTURE_VERIFICATION`

Retain API-Football as **optional** football-facts adapter in operator docs, not gate-critical.

**Real Class A verification** (when rerun) should cite:

- lottery (or operator) fixture authority;
- durable Postgres (demonstrated 2026-09-13);
- explicit non-fallback schedule metadata;
- no `MATCH_RESULT` / Actual leakage.

---

## 19. Risks / blockers

| Risk | Severity |
|---|---|
| **Legal / ToS** of lottery sites, bookmaker pages, scrapers | High — needs compliance review before fetcher sprint |
| **CORE football facts** without API-Football | Medium — must source `TEAM_FORM`/`STATISTICS` honestly or fail-closed |
| **Identity errors** (CN team names) | High for seal integrity |
| **Scraping fragility** | Medium — recorded regression + operator fallback |
| **Multi-source without conflict policy** | High — silent consensus forbidden |
| **FIP runtime gaps** (cutoff query) | Medium for movement near cutoff |
| **Purchasing API-Football** | **Not required** for architecture; optional enrichment |

---

## 20. Recommended next Gate

**CHINA SPORTS LOTTERY FIXTURE AUTHORITY + MULTI-SOURCE PRE_MATCH EVIDENCE — PLANNING / IMPLEMENTATION GATE**

Scope of gate document (future):

1. Fixture intake contract + deterministic `matchId`
2. Minimum source set for CORE analyze
3. Market snapshot + conflict policy
4. Licensing / retention
5. Updated **Class A verification recipe** (lottery-first)
6. Explicit exclusion of Historical Intake

**Not** “purchase API-Football plan” as gate prerequisite.

---

## 21. Future implementation boundary

**In scope (when authorized):**

- Lottery schedule intake + Match Center source metadata
- Adapters → canonical Evidence (market + football facts)
- API surfaces to analyze lottery-selected matches
- Tests + recorded bundles
- Retry Class A verification under new recipe

**Out of scope:**

- Historical Evaluation Intake
- Projection / Calibration / Rule math changes
- New Engine
- Retrospective reconstruction
- Encoding manual calibration hypotheses (§11 owner list) as production rules

---

## 22. Explicit NOT to implement yet

- Production scrapers without legal review
- `production_historical_intake_authorized = true`
- New numbered architecture document (unless defect found)
- FIP canonical rewrite
- Roadmap edit without human approval
- API-Football subscription as verification bypass
- Sentiment-driven Projection changes
- Correct-score market driving core 1X2 softmax
- Backfill / synthetic Class A seals

---

## Final recommendation

**A. EXISTING ARCHITECTURE CAN SUPPORT CHINA SPORTS LOTTERY + WEB MARKET INTELLIGENCE WITH A BOUNDED ADDITIVE INPUT/EVIDENCE SPRINT**

The frozen pipeline, Evidence model, analyze orchestration, and PRE_MATCH seal
architecture already separate fixture authority, facts, market signals, and
inference. API-Football is an optional integrated adapter, not a structural
requirement. The owner’s workflow requires **additive schedule authority +
multi-source acquisition adapters + governance updates to verification and
PROJECT_STATE next_action**, not an Architecture Freeze change.
