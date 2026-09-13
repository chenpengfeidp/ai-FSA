# China Sports Lottery Fixture Authority + Multi-Source PRE_MATCH Evidence — Implementation Gate

| Field | Value |
|---|---|
| Gate type | Planning / implementation authorization (no code) |
| Date | 2026-09-13 |
| Track | `PREDICTION_VERTICAL_SLICE` |
| Proposed Sprint id | **PVS-4** (requires Roadmap amendment — see §4) |
| Roadmap | `docs/40_PRODUCT_ROADMAP.md` (amendment proposed, not applied) |
| Architecture Freeze | **v0.3** (unchanged) |
| Binding inputs | Human owner product approval; `CHINA_SPORTS_LOTTERY_WEB_MARKET_INTELLIGENCE_SOURCE_STRATEGY_ARCHITECTURE_COMPATIBILITY_REVIEW.md` |
| Production code changed in this gate | **No** |
| Implementation authorization | **A. READY FOR BOUNDED IMPLEMENTATION** |

---

## 0. Human product decision (accepted)

The human owner **approves**:

- China Sports Lottery (中国竞彩足球) as the **primary user-facing fixture-selection** source.
- **API-Football optional**, not mandatory fixture authority.
- Multi-source PRE_MATCH football + market Evidence as the production input strategy.
- Preserved frozen analysis / authentic PRE_MATCH seal architecture.
- Historical Evaluation Intake **remains blocked**.

This gate **authorizes a future bounded implementation sprint** only after human
review of this document. It does **not** start coding.

---

## 1. Repository state before reconciliation

```yaml
current_track: PREDICTION_VERTICAL_SLICE
current_stage: AUTHENTIC_PREMATCH_SEAL_CAPTURE_IMPLEMENTATION_COMPLETED
current_gate: AUTHENTIC_PREMATCH_SEAL_CAPTURE_REAL_ARTIFACT_VERIFICATION
next_action: OBTAIN_API_FOOTBALL_CURRENT_SEASON_ENTITLEMENT_AND_RETRY_REAL_PREMATCH_CAPTURE_VERIFICATION
next_production_capability: REAL_PREMATCH_CLASS_A_SEAL_CAPTURE_VERIFICATION
authentic_prematch_seal: NOT_FOUND
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
```

**Stale element:** `next_action` assumed API-Football upcoming catalog as the
only path to Class A verification. Superseded by owner intent + compatibility
review (2026-09-13).

**Still valid:** seal capture capability implemented; verification **pending**
a product-aligned fixture + evidence path; Postgres durable path demonstrated
(`REAL_PREMATCH_CAPTURE_VERIFICATION.md` retry).

---

## 2. State reconciliation result

### 2.1 Semantically correct values (applied in `PROJECT_STATE.md`)

| Field | Value | Rationale |
|---|---|---|
| `current_track` | `PREDICTION_VERTICAL_SLICE` | Unchanged |
| `current_stage` | `CHINA_LOTTERY_MULTI_SOURCE_PREMATCH_PLANNING_GATE_COMPLETED` | Mirrors `*_PLANNING_GATE_COMPLETED` pattern from authentic seal gate |
| `current_gate` | `CHINA_LOTTERY_FIXTURE_AUTHORITY_IMPLEMENTATION_AUTHORIZATION` | Mirrors `*_IMPLEMENTATION_AUTHORIZATION` pattern |
| `next_action` | `HUMAN_REVIEW_OF_CHINA_LOTTERY_FIXTURE_AUTHORITY_IMPLEMENTATION_GATE` | Human must accept gate before PVS-4 coding |
| `next_production_capability` | `PVS_4_CHINA_LOTTERY_FIXTURE_AND_MULTI_SOURCE_PREMATCH_EVIDENCE` | Bounded sprint deliverable |

### 2.2 Unchanged (mandatory)

```yaml
authentic_prematch_seal: NOT_FOUND
authentic_prematch_seal_capture_capability: IMPLEMENTED
authentic_seal_plus_verified_real_world_actual: NOT_FOUND
historical_evaluation_intake: C_BLOCKED
production_historical_intake_authorized: false
controlled_prematch_fixture: IMPLEMENTED_AND_VALIDATED
controlled_fixture_classification: B_CONTROLLED_SYNTHETIC
```

### 2.3 Downstream gate (documentary, not second `current_gate`)

**`AUTHENTIC_PREMATCH_SEAL_CAPTURE_REAL_ARTIFACT_VERIFICATION`** remains open.
It is **re-entered only after** PVS-4 completes and a bounded verification run
uses the **product-aligned Class A recipe** (§11). No API-Football catalog
prerequisite.

---

## 3. API-Football status

**Optional / supplemental** — not mandatory for fixture authority or architecture.

May continue to supply football facts when configured (`FOOTBALL_DATA_PROVIDER_MODE`
recorded/live) **after** lottery `MATCH_INFO` exists. Must not be required for
`matchId` minting or schedule board primary source in the PVS-4 path.

---

## 4. Roadmap governance

### 4.1 Compatibility result

**B. Explicit Roadmap amendment required before implementation.**

`docs/40_PRODUCT_ROADMAP.md` lists F1.x / A1 / K1 / C1 / … but does **not**
name PVS track sprints. Repository practice (PVS-1…PVS-3.3, FIP) already runs
Prediction Vertical Slice work via `PROJECT_STATE` + sprint reports citing doc 40
as phase authority.

PVS-4 is **not** substitutable for F1.1–F1.3 (different product intent: lottery
schedule authority + intake). It is **additive** product development on the
baseline vertical slice (fixtures + analyze path).

### 4.2 Minimal proposed amendment (human applies to doc 40)

Insert after baseline section (or under a new **Prediction Vertical Slice (PVS)** subsection):

```markdown
## Sprint PVS-4 — China Sports Lottery fixture authority + multi-source PRE_MATCH Evidence

### Goal

Enable production analyze from **China Sports Lottery** daily fixture selection
and **governed multi-source** PRE_MATCH Evidence (football facts + core markets)
without API-Football as mandatory schedule authority.

### Scope (bounded)

- Operator/manifest lottery fixture intake → canonical `MATCH_INFO`
- Governed Evidence import for CORE + 1X2 / AH / O/U (V1)
- Existing AnalyzeMatchUseCase + authentic PRE_MATCH seal path unchanged
- Recorded CI cassettes; no Historical Intake; no generic web scraping framework

### Out of scope

- Historical Evaluation Intake; Projection/Rule/Calibration changes; new Engine;
  public sentiment; multi-book consensus engine; API-Football subscription as gate

### Acceptance

1. Analyze succeeds on recorded PVS-4 cassette without API-Football fixture authority.
2. Seal capture path exercisable when `EVIDENCE_REPOSITORY_MODE=postgres`.
3. Sprint report cites **PVS-4** and this gate document.

### Dependencies

- Baseline v0.2 vertical slice; authentic PRE_MATCH seal capability (`1effc56`).
```

**Do not broaden** F1.1 scope or v1.0 claim with this amendment.

---

## 5. Bounded sprint — PVS-4 (single future implementation)

### 5.1 Sprint id

**PVS-4**

### 5.2 Goal

Minimum path:

```text
Governed China Sports Lottery fixture manifest
  → canonical matchId + MATCH_INFO (fixtureAuthority = lottery)
  → governed multi-source PRE_MATCH Evidence (CORE + 1X2/AH/O/U)
  → ImportMatchUseCase / Evidence store
  → AnalyzeMatchUseCase (existing cutoff contract)
  → GenerateMatchReportUseCase + optional postgres seal
```

### 5.3 Explicit exclusions (V1)

- Generic HTML scrapers / unconstrained crawlers
- Correct score market as primary input
- Social / fan sentiment ingestion
- Public betting % / sharp / steam (deferred)
- Multi-bookmaker consensus engine
- Closing-line history automation
- Historical Evaluation Intake
- Class A artifact fabrication
- New governed Engine
- New numbered architecture document

---

## 6. V1 fixture authority contract (frozen for implementation)

### 6.1 Manifest envelope

| Field | Required | Notes |
|---|---|---|
| `schemaVersion` | yes | `lottery-fixture-manifest.v1` |
| `salesIssueId` | yes | Official lottery sales period id (string; e.g. `20260913`) |
| `manifestCollectedAt` | yes | ISO-8601 when operator/system accepted manifest |
| `sourceReference` | recommended | URL or document id of official list (no secrets) |
| `matches[]` | yes | One or more fixtures |

### 6.2 Per-match required fields

| Field | Required | Notes |
|---|---|---|
| `lotteryMatchCode` | yes | Official match number on the daily list (string) |
| `homeTeam` | yes | Display name as on lottery list (authoritative orientation) |
| `awayTeam` | yes | Display name as on lottery list |
| `competitionId` | yes | Stable FAS id (e.g. `csl:39` or mapped code table version) |
| `competitionName` | yes | Human-readable |
| `season` | yes | Sports season string (e.g. `2026`) |
| `kickoff` | yes | ISO-8601 with `Z` or numeric offset |
| `timezone` | yes | IANA name used when converting from local publish time (e.g. `Asia/Shanghai`) |
| `scheduleSource` | yes | constant `china-sports-lottery` for V1 |
| `fixtureAuthority` | yes | constant `lottery-official-list` for V1 |
| `collectedAt` | yes | Per-row intake instant ≤ later `analysisCutoff` |

Optional: `teamAliasHints[]` for source matching only (must not override seal names).

### 6.3 Deterministic `matchId`

```text
matchId = "lottery:csl:" + salesIssueId + ":" + lotteryMatchCode
```

- Namespace `lottery:csl:` is reserved; must not collide with `football:*` or demo ids.
- **Home/away swap** → different lottery list row / code → different id; if same code with swapped names → **`FIXTURE_ORIENTATION_CONFLICT`** fail-closed.

### 6.4 Alias mapping

- Alias table versioned (`teamAliasMapVersion` on manifest or global config).
- Aliases used only to **match supplemental Evidence sources** to the lottery fixture.
- Seal and `MATCH_INFO` use **lottery strings** exactly.

### 6.5 Duplicates

- Unique key: `(salesIssueId, lotteryMatchCode)`.
- Duplicate in one manifest → **`DUPLICATE_LOTTERY_FIXTURE`** fail-closed.
- Soft duplicate: same teams + kickoff within 30 minutes under different codes → **`AMBIGUOUS_LOTTERY_FIXTURE`** (reject until operator resolves).

### 6.6 Reschedule

- Kickoff change **before first seal**: update manifest row with `fixtureRevision` integer + new `kickoff`; same `matchId` allowed **only if** `lotteryMatchCode` unchanged and revision monotonic.
- After a Class A seal exists: reschedule handling is **out of PVS-4** (admission/replay gates).

### 6.7 Kickoff conflicts

| Situation | Behavior |
|---|---|
| Lottery kickoff vs supplemental source kickoff | **Lottery wins**; supplemental mismatch → `MATCH_CONTEXT` or import warning Evidence, analyze continues if CORE satisfied |
| Two supplemental sources disagree on kickoff | Retain both as separate Evidence rows; **no silent merge**; Feature layer does not invent kickoff |
| Missing kickoff | **`FIXTURE_IDENTITY_INCOMPLETE`** fail-closed |

### 6.8 Failure codes (API / import)

`DUPLICATE_LOTTERY_FIXTURE`, `AMBIGUOUS_LOTTERY_FIXTURE`, `FIXTURE_ORIENTATION_CONFLICT`, `FIXTURE_IDENTITY_INCOMPLETE`, `INVALID_LOTTERY_MANIFEST`, `LOTTERY_MANIFEST_SCHEMA_UNSUPPORTED`, `KICKOFF_NOT_IN_FUTURE` (analyze-time), `EVIDENCE_AFTER_CUTOFF`, `POST_MATCH_EVIDENCE` (existing).

---

## 7. V1 Evidence scope

### 7.1 In scope

| Layer | Evidence types | Notes |
|---|---|---|
| **CORE** | `MATCH_INFO`, `TEAM_FORM` (home+away), `STATISTICS` (home+away) | Required for `AnalyzeMatchUseCase` happy path |
| **MARKET** | `ODDS` with 1X2, Asian Handicap, Over/Under | Via existing I2A/B.2 payload shapes; may be multiple rows per book/source |

### 7.2 Deferred (V1)

- BTTS **market** lines (Projection still outputs BTTS from matrix)
- Correct score odds
- Sentiment / NEWS automation
- Public betting %, volume, sharp
- Multi-book consensus features beyond retaining multiple `ODDS` rows
- Opening/closing lifecycle automation (may include **single** `current` snapshot per market in manifest)

### 7.3 Optional V1 (if zero cost)

`INJURY` / `LINEUP` when present in structured supplemental bundle — not required for sprint acceptance if CORE satisfied.

---

## 8. Source strategy (V1)

**Decision: C — Hybrid, manifest-first**

| Layer | Strategy | Authority |
|---|---|---|
| **Fixture** | **A** — Governed operator manifest (JSON file upload or API POST) | `fixtureAuthority=lottery-official-list` |
| **CORE football facts** | **A** — Structured fields in **companion evidence bundle** in same manifest submission (operator attested from approved public stats sources) | `providerId` per source row; `quality` unverified unless verified pipeline exists |
| **Markets** | **A** — Structured 1X2/AH/O/U in companion bundle (operator transcribed from official lottery / licensed book pages) | `category=market`; not football truth |
| **API-Football** | **Optional B** — `recorded` or `live` **only** to enrich CORE when `footballCrosswalk` provided in manifest | Must not mint `matchId`; supplemental only |

### 8.1 Per-source rules

- **Provenance:** every Evidence row: `source`, `sourceId`, `providerId`, `collectedAt`, `eventTime`, `provenance.method`.
- **Freshness:** `collectedAt` set at import to manifest/bundle intake time (≤ `analysisCutoff`).
- **Fail-closed:** missing CORE → analyze `IMPORT_FAILED` / existing error codes; no synthetic form/stats.
- **Legal/ToS:** V1 **does not** automate lottery or bookmaker site scraping; operator/manifest attestation + reference URL only. Automated fetchers require a **separate compliance gate**.

---

## 9. Multi-source conflict policy (V1 minimum)

| Conflict | Policy |
|---|---|
| Kickoff (lottery vs other) | Lottery wins; others retained with mismatch flag in payload |
| Team names | Lottery wins for `MATCH_INFO`; aliases for matching only |
| Competition | Lottery manifest wins |
| Market prices (multiple books) | **Multiple `ODDS` Evidence rows**; Features use existing single-bundle extractors — **first eligible row per policy** documented in sprint spec OR explicit primary `bookmakerKey` on manifest; **no silent average** in V1 unless `marketPrimaryBook` set on manifest |
| Stale market (`collectedAt` > cutoff) | Reject at analyze (`EVIDENCE_AFTER_CUTOFF`) |
| Stale market (old `eventTime` but `collectedAt` OK) | Allowed with `freshness: stale` |

---

## 10. Analysis cutoff / seal compatibility

Verified against current code contracts:

- `AnalyzeMatchUseCase` requires `analysisTime` / `analysisCutoff` equal; audits `evidenceSet` for `collectedAt > cutoff` and `MATCH_RESULT`.
- `GenerateMatchReportUseCase` freezes clock, passes cutoff to analyze, captures seal before report when postgres repo wired.
- PVS-4 **must** stamp import `collectedAt` from manifest intake (not later `Date.now()` in domain).

New path **must not** weaken Class A lifecycle. Synthetic/demo/class B paths remain ineligible.

---

## 11. Class A verification recipe (replaces API-Football catalog assumption)

### 11.1 Obsolete assumption

~~Real Class A requires live API-Football `GET /api/matches/upcoming`.~~ **Withdrawn** for product governance.

### 11.2 Product-aligned PASS conditions (future verification run)

All required for **candidate** Class A (admission still separate):

1. **Fixture:** Real upcoming China Sports Lottery fixture from governed manifest (`scheduleSource=china-sports-lottery`, `fixtureAuthority=lottery-official-list`); `analysisTime < kickoff`.
2. **Identity:** `matchId` per §6.3; seal `homeTeam`/`awayTeam`/`competitionId`/`season`/`kickoff` match `MATCH_INFO`.
3. **Evidence:** Real PRE_MATCH CORE + market Evidence; `max(collectedAt) ≤ analysisCutoff`; `MATCH_RESULT count = 0`; no Actual leakage.
4. **Path:** Production `POST /api/analyze/match/:matchId` (or lottery-specific endpoint that delegates to same use case) — **not** direct seal helper calls.
5. **Persistence:** `EVIDENCE_REPOSITORY_MODE=postgres`, migration applied, durable seal row, reload/read-back, hash verification per `REAL_PREMATCH_CAPTURE_VERIFICATION.md` / implementation review.
6. **No misclassification:** not `usedRecordedFallback` for fixture authority; not Class B fixture; not memory-only seal repo.
7. **API-Football:** not used as fixture authority (may supplement facts).

---

## 12. Future file / package boundary

| Location | Class | Notes |
|---|---|---|
| `packages/application/src/import-match-use-case.ts` | MODIFY | Optional lottery bundle import path |
| `packages/evidence-import/` | MODIFY | Lottery + bundle importers |
| `packages/evidence-normalizer/` | MODIFY | Manifest + structured CORE/market normalization |
| `packages/evidence/` | TEST ONLY / minimal | Only if new `EvidenceType` required (prefer extend `ODDS` payload) |
| `packages/match/` | TEST ONLY | Document `lottery:csl:` id convention |
| `apps/api/src/` (controllers, factories, DTOs) | MODIFY | Manifest intake, lottery board, wiring |
| `apps/api/src/upcoming-matches*.ts` | MODIFY | Lottery schedule source metadata |
| `apps/api/src/evidence.module.ts` | MODIFY | Composition only |
| `packages/config/` | MODIFY | Modes: `LOTTERY_SCHEDULE_MODE` or manifest path config |
| `packages/provider-football/` | TEST ONLY / optional hook | Supplemental facts only |
| `packages/provider-odds/` | TEST ONLY | Reuse mappers where manifest maps to same shapes |
| `packages/analysis/` | MUST NOT TOUCH | Except tests |
| `packages/feature/` | MUST NOT TOUCH | Unless additive normalizer-only mapping needs export (avoid) |
| `packages/rule/` | MUST NOT TOUCH | |
| `packages/analysis/src/projection-v2/` | MUST NOT TOUCH | |
| `packages/statistics/` seal hash | MUST NOT TOUCH | |
| `packages/report/` use cases | MUST NOT TOUCH | Seal hook already exists |
| Historical Intake packages | MUST NOT TOUCH | |
| `docs/protocols/FOOTBALL_INTELLIGENCE_ANALYSIS_PROTOCOL.md` | MUST NOT TOUCH | |
| Architecture Freeze docs | MUST NOT TOUCH | |
| **New package** | **BLOCKED in PVS-4** | Extend existing packages; ADR if package split later |

Recorded assets:

| Location | Class |
|---|---|
| `packages/*/test/fixtures/` or `test/cassettes/pvs-4/` | ADD |
| `docs/sprints/PREDICTION_VERTICAL_SLICE/PVS-4_*` | ADD (completion report after sprint) |
| `REAL_PREMATCH_CAPTURE_VERIFICATION.md` | MODIFY (verification runbook addendum after PVS-4) |

---

## 13. Acceptance test matrix (future implementation)

| Id | Test |
|---|---|
| T01 | Valid lottery manifest → deterministic `matchId` + `MATCH_INFO` |
| T02 | Home/away swap on same code → `FIXTURE_ORIENTATION_CONFLICT` |
| T03 | Duplicate `(salesIssueId, lotteryMatchCode)` rejected |
| T04 | Team alias resolves supplemental row only; seal names unchanged |
| T05 | Kickoff timezone normalization to canonical ISO |
| T06 | Supplemental kickoff conflict: lottery authority preserved; fail-closed if CORE kickoff missing |
| T07 | `fixtureRevision` monotonic reschedule before seal |
| T08 | Valid 1X2 `ODDS` import |
| T09 | Valid AH `ODDS` import |
| T10 | Valid O/U `ODDS` import |
| T11 | Stale `collectedAt` after cutoff rejected at analyze |
| T12 | Two market sources → two Evidence rows persisted |
| T13 | Market price conflict: no silent overwrite; documented primary book behavior |
| T14 | Missing CORE → analyze fail-closed |
| T15 | `EVIDENCE_AFTER_CUTOFF` on injected late Evidence |
| T16 | `MATCH_RESULT` in set → `POST_MATCH_EVIDENCE` |
| T17 | Class B / demo fixture cannot produce Class A classification |
| T18 | Recorded football-data **schedule fallback** cannot satisfy lottery Class A recipe |
| T19 | E2E analyze `ok: true` on PVS-4 recorded cassette |
| T20 | Postgres seal insert on successful analyze (integration) |
| T21 | Seal reload/read-back identical |
| T22 | `sealIdentityHash` / `contentSha256` independent verification |
| T23 | Fixture authority works with **no** API-Football schedule |
| T24 | Optional API-Football supplemental CORE when crosswalk present |
| T25 | Historical Intake endpoints/flags remain blocked / unauthorized |

---

## 14. Implementation authorization

**A. READY FOR BOUNDED CHINA SPORTS LOTTERY FIXTURE AUTHORITY + MULTI-SOURCE PRE_MATCH EVIDENCE IMPLEMENTATION**

**Approved future scope (PVS-4 only):**

- Manifest schema `lottery-fixture-manifest.v1` + validation
- Lottery match board / intake API
- Companion structured CORE + 1X2/AH/O/U Evidence import
- Wiring to existing `AnalyzeMatchUseCase` + seal path
- Recorded cassettes + tests T01–T25
- Operator documentation for manifest submission

**Unresolved blockers:** none at architecture/governance level. **Roadmap amendment** and **human gate sign-off** are procedural prerequisites.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Operator manifest errors | Strict validation + fail-closed |
| Legal exposure from future scrapers | Defer automation; compliance gate |
| CORE facts quality without API-Football | Honest `quality` + limitations; optional supplemental adapter |
| Match Center dual-source confusion | Explicit `scheduleSource` / `fixtureAuthority` metadata |
| Premature Class A claim | Verification recipe §11; admission gate unchanged |

---

## 16. Proposed PROJECT_STATE handoff (synchronized by this gate)

```yaml
current_track: PREDICTION_VERTICAL_SLICE
current_stage: CHINA_LOTTERY_MULTI_SOURCE_PREMATCH_PLANNING_GATE_COMPLETED
current_gate: CHINA_LOTTERY_FIXTURE_AUTHORITY_IMPLEMENTATION_AUTHORIZATION
historical_evaluation_intake: C_BLOCKED
authentic_prematch_seal: NOT_FOUND
authentic_prematch_seal_capture_capability: IMPLEMENTED
authentic_seal_plus_verified_real_world_actual: NOT_FOUND
production_historical_intake_authorized: false
next_action: HUMAN_REVIEW_OF_CHINA_LOTTERY_FIXTURE_AUTHORITY_IMPLEMENTATION_GATE
next_production_capability: PVS_4_CHINA_LOTTERY_FIXTURE_AND_MULTI_SOURCE_PREMATCH_EVIDENCE
```

After human approval: `next_action` → `EXECUTE_PVS_4_IMPLEMENTATION` (convention).

---

## 17. Next implementation MUST NOT

- Implement Historical Evaluation Intake
- Set `authentic_prematch_seal=FOUND` without verification + admission
- Purchase or require API-Football plan for fixture authority
- Build generic web scraping framework
- Modify Projection V2 / Rule math / Calibration / Validation
- Change seal hash semantics or Class A classification rules
- Add a governed Engine or numbered architecture document
- Silently edit `docs/40_PRODUCT_ROADMAP.md`
- Promote Class B fixtures to Class A

---

## 18. Stop

Gate complete. **No production code.** Awaiting human review, Roadmap amendment, then PVS-4 implementation sprint.
