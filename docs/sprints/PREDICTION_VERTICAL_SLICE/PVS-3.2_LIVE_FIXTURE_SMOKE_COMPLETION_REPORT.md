# PVS-3.2 — Live Fixture End-to-End Smoke Validation Completion Report

**Sprint id:** PVS-3.2  
**Roadmap:** `docs/40_PRODUCT_ROADMAP.md` (v0.2 baseline vertical-slice product phase; PVS-3.2 is an explicitly authorized validation follow-up)  
**Architecture Freeze:** v0.3  
**Validation date:** 2026-08-27  
**Final decision:** **LIVE SMOKE BLOCKED**  
**Production changes:** None  
**Model promotion:** None

---

## 1. Executive verdict

The production Nest application started successfully in live Football Data mode, and the
configured `API_FOOTBALL_KEY` was present, valid, active, and accepted by API-Football. The live
vertical slice still could not run because the account plan does not permit access to the current
2026 season.

Every configured league query returned zero fixtures and the provider error:

```text
Free plans do not have access to this season, try from 2022 to 2024.
```

`GET /api/matches/upcoming` consequently returned the existing recorded/fixture fallback board:

- `footballDataProviderMode`: `live`
- `scheduleSource`: `football-data`
- `usedRecordedFallback`: `true`
- 10 rows, all with past kickoffs
- API-Football rows used `providerMethod: recorded-snapshot`

No row qualified as a genuinely upcoming live fixture. Therefore no fixture was selected as the
live target and no successful live `POST /api/analyze` report exists.

An explicit fallback-row safety check returned `ok: false` / `IMPORT_FAILED` rather than a
prediction, and the Evidence repository remained empty for that match. Recorded data was not
silently presented as a successful live analysis.

**Final decision: LIVE SMOKE BLOCKED.**

---

## 2. Goal, inputs, outputs, and acceptance

### Goal

Validate one genuinely upcoming fixture through the production HTTP path:

```text
Live fixture discovery
  → live fixture resolution
  → live Evidence import
  → Features
  → Rules
  → Football State
  → Match Scripts
  → Unified Probability Matrix
  → Projection V2
  → Explainable Report
  → Workspace
```

### Inputs

- PVS-3.1 production Nest runtime fix
- `FOOTBALL_DATA_PROVIDER_MODE=live`
- `PROJECTION_POLICY_PIN=v2`
- `ODDS_PROVIDER_MODE=recorded`
- `DATABASE_CLIENT_MODE=stub`
- `EVIDENCE_REPOSITORY_MODE=memory`
- Locally provided `API_FOOTBALL_KEY` (never printed or stored in this report)

### Outputs

- Production startup evidence
- Sanitized API-Football credential/entitlement evidence
- Live catalog and fallback-provenance evidence
- Failed-analysis safety evidence
- Existing API and Workspace regression results
- This completion report

### Acceptance

**BLOCKED.** The prerequisite is now current-season API-Football plan access, not a missing or
invalid credential. No current live fixture could be discovered, so the required end-to-end live
analysis could not begin.

---

## 3. Provider configuration

| Provider / store | Configured mode | Runtime result |
|---|---|---|
| Football Data / API-Football | `live` | Credential accepted; 2026 season rejected by account plan |
| Match Center fallback | recorded + fixture seeds | Used explicitly; `usedRecordedFallback: true` |
| Odds | `recorded` | Configured as allowed; not reached for a successful analysis |
| Database client | `stub` | Active |
| Evidence repository | `memory` | Active; zero Evidence persisted by failed smoke |
| Projection policy | `v2` | Configured; no live report reached Projection |

The API key value was not logged, printed, committed, or written to any report.

---

## 4. HTTP startup result

Configuration:

```bash
PORT=3003 \
FOOTBALL_DATA_PROVIDER_MODE=live \
PROJECTION_POLICY_PIN=v2 \
ODDS_PROVIDER_MODE=recorded \
DATABASE_CLIENT_MODE=stub \
EVIDENCE_REPOSITORY_MODE=memory \
pnpm dev:api
```

Result: **PASS**

Observed:

```text
EvidenceModule dependencies initialized
Mapped {/api/analyze, POST} route
Mapped {/api/matches/upcoming, GET} route
Nest application successfully started
API listening on http://127.0.0.1:3003
```

The PVS-3.1 dependency-resolution blocker did not recur.

---

## 5. Credential and current-season entitlement result

A sanitized API-Football `/status` request returned:

- HTTP `200`
- no credential errors
- subscription active
- daily request limit visible

No account identity or key value was retained.

Direct sanitized fixture diagnostics used the same season/date range as the production source:

- season: `2026`
- from: `2026-08-27`
- to: `2026-08-30`
- leagues: `292, 98, 113, 244, 103, 39, 140, 135, 78, 61, 2, 3`

All 12 league requests returned HTTP `200`, zero fixtures, and the same plan error denying season
2026. This explains why the production board could not return live rows.

---

## 6. `GET /api/matches/upcoming`

Result: **HTTP success, live catalog unavailable, explicit fallback**

```text
ok: true
footballDataProviderMode: live
oddsProviderMode: recorded
scheduleSource: football-data
usedRecordedFallback: true
fixtureCount: 10
```

The returned rows were not eligible for the requested live target:

- API-Football-shaped rows were `providerMethod: recorded-snapshot`;
- fixture seed rows were `providerSource: fixture`;
- every kickoff was before the validation time;
- no row represented a currently upcoming live API-Football fixture.

### Required live fixture record

| Field | Result |
|---|---|
| Exact live fixture used | **None — no eligible live row returned** |
| matchId | **Not resolved live** |
| Home team | **Not selected** |
| Away team | **Not selected** |
| Competition | **Not selected** |
| Kickoff | **Not selected** |
| Schedule source | Intended `football-data`; board fell back explicitly |
| Provider source | Intended API-Football `http-live`; not obtained |

Selecting FC Seoul, Rosenborg, or any other fallback/example row as the live target would have
fabricated success and was not done.

---

## 7. `POST /api/analyze`

The required POST using a genuinely upcoming live fixture was **not executable**, because no such
fixture was available from the catalog.

To verify degradation safety, one explicitly identified recorded fallback row was submitted:

```json
{
  "homeTeam": "FC Seoul",
  "awayTeam": "Ulsan Hyundai FC",
  "date": "2026-07-19"
}
```

This was a failure-path check, not the sprint's live target.

Observed production HTTP response:

```text
HTTP status: 200
ok: false
error.code: IMPORT_FAILED
error.message: Live football provider failed.
cause.code: INCOMPLETE_RESPONSE
```

The endpoint attempted live enrichment and did not emit a recorded prediction. A subsequent
`GET /api/evidence/match/football:100001` returned zero Evidence records.

Safety verdict:

- production Nest HTTP endpoint reached: **YES**
- fixture discovery against fallback board reached: **YES**
- live Evidence complete: **NO**
- prediction/report returned: **NO**
- silent recorded Evidence substitution: **NO**
- fabricated missing-data prediction: **NO**

---

## 8. Required V2 report fields

No successful live report was created. These fields must not be inferred from recorded evidence:

| Required field | Live smoke result |
|---|---|
| `analysisProvenance.projectionPolicyPin` | Not produced; runtime configured `v2` |
| `projectionFramework.parameterVersionLabel` | Not produced; governed production artifact remains `projection.v3.replay` |
| Football State | Not produced |
| Match Script | Not produced |
| Unified Probability Matrix | Not produced |
| 1X2 | Not produced |
| Top scorelines | Not produced |
| Goal range | Not produced |
| BTTS | Not produced |
| O/U | Not produced |
| Confidence | Not produced |
| Requested/resolved team provenance | No successful live resolution |
| Live fixture matchId/kickoff provenance | Not produced |
| Provider provenance | Live mode configured; current-season access denied |
| V1 fallback | None |

The production policy and parameter governance are unchanged, but configuration is not a
substitute for observing those fields in a successful live report.

---

## 9. Evidence domains and provenance

| Domain | Intended provider | Mode | Status |
|---|---|---|---|
| Fixture schedule | API-Football | live | **MISSING** — 2026 plan access denied |
| Match fixture | API-Football | live | **MISSING** |
| Team form / H2H | API-Football | live | **NOT REACHED for an eligible live fixture** |
| Statistics / xG | API-Football | live | **NOT REACHED** |
| Club / player / manager | API-Football | live | **NOT REACHED** |
| Injury / lineup | API-Football | live | **NOT REACHED** |
| Match context / venue | API-Football-derived | live | **NOT REACHED** |
| Odds | Odds provider | recorded | **CONFIGURED RECORDED; no successful live match to overlay** |

No Evidence timestamp, type, or source ID exists for a successful live run. The failed fallback
check persisted zero Evidence.

---

## 10. Workspace result

**Live Workspace rendering: BLOCKED.** There was no live report DTO to load or render.

The existing Workspace suite passed **10 files / 49 tests**, covering analyze-by-teams,
Football State, Match Scripts, Unified Matrix, BTTS/O-U, confidence, and provenance rendering
with controlled DTO fixtures. This proves component capability only; it is not live rendering
evidence.

---

## 11. Tests and validation evidence

| Validation | Result |
|---|---|
| Live-configured production API startup | **PASS** |
| Sanitized API-Football credential status | **PASS — valid and active** |
| Current-season entitlement | **BLOCKED — plan excludes 2026** |
| `GET /api/matches/upcoming` | **HTTP PASS; explicit recorded fallback** |
| Eligible genuinely upcoming live fixture | **NONE** |
| Fallback-row `POST /api/analyze` safety check | **PASS fail-closed — `IMPORT_FAILED`** |
| Evidence persisted after failed analyze | **0** |
| `@fas/api` regression suite | **PASS — 5 files passed, 1 skipped; 33 tests passed, 2 skipped** |
| `@fas/web` suite | **PASS — 10 files / 49 tests** |

No focused production test was added because no runtime behavior or contract changed.

---

## 12. Limitations and exact unblock requirement

1. The current API-Football account permits only historical seasons 2022–2024 and cannot return a
   genuinely upcoming 2026 fixture.
2. Obtain an API-Football plan/entitlement that includes the current season, then rerun this exact
   smoke using a dynamically returned fixture.
3. `GET /api/matches/upcoming` intentionally falls back to recorded data and exposes
   `usedRecordedFallback: true`; operators must reject those rows for live acceptance.
4. `POST /api/analyze` returns a typed `ok: false` failure with HTTP 200. Clients must inspect the
   discriminant rather than treating HTTP 200 alone as prediction success.
5. Live pre-match lineup, injury, xG, and other optional coverage remain unvalidated.

---

## 13. Governance confirmation

- Production `projectionPolicyPin` remains **`v2`**.
- Production parameter artifact remains **`projection.v3.replay`**.
- `projection.v3.calibration.candidate1` remains NON-DEFAULT / NOT PROMOTED.
- No P2K-CAL-3 work was performed.
- No λ, calibration, Match Script, Football State, Feature, Rule, Evidence, Evaluation History,
  Unified Probability Matrix, Provider architecture, or API contract was changed.
- No provider or intelligence domain was added.
- No production code or tests were changed.
- No API key or live provider payload was stored.

**Final decision: LIVE SMOKE BLOCKED.**

Stop after PVS-3.2. Do not start calibration, candidate promotion, or another sprint.
