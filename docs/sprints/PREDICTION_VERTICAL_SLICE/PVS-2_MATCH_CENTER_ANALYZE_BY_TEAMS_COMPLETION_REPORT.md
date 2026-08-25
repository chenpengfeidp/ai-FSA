# PVS-2 — Match Center Analyze-by-Teams UX & Live Fixture Smoke Path

**Sprint id:** PVS-2  
**Roadmap citation:** `docs/40_PRODUCT_ROADMAP.md` (product development phase)  
**Architecture Freeze:** v0.3  
**Completion date:** 2026-08-21  
**Prior sprint:** `docs/sprints/PREDICTION_VERTICAL_SLICE/PVS-1_PRODUCTION_PREDICTION_VERTICAL_SLICE_COMPLETION_REPORT.md`

---

## 1. Objective

Turn the PVS-1 production API vertical slice into a **usable end-user prediction workflow** in Workspace / Match Center:

```text
Home Team + Away Team + optional Date
  → POST /api/analyze (fixture discovery)
  → Evidence → Features → Rules → Football State → Match Scripts
  → Unified Probability Matrix → Explainable Report
```

No new Provider, Engine, projection algorithm, calibration promotion, or architecture redesign.

---

## 2. Existing PVS-1 capabilities reused

| Capability | Reuse |
|------------|-------|
| `POST /api/analyze` | Called directly from Workspace form; no frontend fixture resolution |
| `POST /api/analyze/match/:matchId` | Used after user selects an ambiguous fixture candidate |
| `PROJECTION_POLICY_PIN` default `"v2"` | Unchanged; production path remains V2 |
| `projection.v3.replay` parameter artifact | Unchanged; not promoted to calibration candidate1 |
| `analysisProvenance` + `fixtureResolution` | Surfaced in Workspace explainable report |
| `projectionFramework.unifiedMatrix.derived` | BTTS / O-U rendered via existing `MultiScriptProjectionSection` |
| `ExplainableMatchReport` + Workspace sections | Full intelligence path reused; no duplicate calculation |

---

## 3. UI changes

- **`AnalyzeByTeamsSection`** on Match Center (`/` dashboard), between hero and upcoming fixtures (`#analyze-by-teams`).
- Fields: **Home Team**, **Away Team**, optional **Date**, **Analyze Match** button.
- States: loading pipeline message, structured error panel, ambiguous candidate picker, success → Workspace navigation.
- **Home hero** primary CTA scrolls to analyze-by-teams; secondary CTA scrolls to upcoming fixtures.
- **`MatchDetailPage`** accepts fixtures resolved by team names even when absent from the upcoming board (via seeded React Query cache + `matchSummaryFromReport`).

**Files:** `apps/web/src/components/analyze-by-teams-section.tsx`, `apps/web/src/components/analysis-dashboard.tsx`, `apps/web/src/components/home-hero.tsx`, `apps/web/src/components/match-detail-page.tsx`, `apps/web/src/lib/match-from-report.ts`, `apps/web/src/copy/zh.ts`.

---

## 4. API integration

- **`analyzeByTeams()`** returns a discriminated `AnalyzeByTeamsResult` (`ok: true` report | `ok: false` failure) instead of throwing for fixture/policy errors — enables honest UX without parsing generic exceptions.
- **No breaking changes** to `POST /api/analyze` request/response contract; additive web-side types only (`FixtureDiscoveryCandidateDto`, `AnalyzeByTeamsResult`).
- On success, report + evidence are **seeded into React Query** before navigation so Workspace renders immediately without re-running analyze.

---

## 5. Fixture discovery UX

| Error | UX behavior |
|-------|-------------|
| `FIXTURE_NOT_FOUND` | Error panel with API message; no prediction fabricated |
| `FIXTURE_AMBIGUOUS` | Lists candidates (teams, kickoff, matchId, competition); user must select |
| User selects candidate | `POST /api/analyze/match/:matchId` — deterministic, no silent pick |
| `PROJECTION_POLICY_UNAVAILABLE` | Explicit policy-unavailable message |
| Provider / evidence / analysis failure | Generic analysis error message from API |
| Network failure | Network error message |

---

## 6. Error handling

- Never navigates to Workspace on fixture discovery failure.
- Never auto-selects among ambiguous fixtures.
- Never falls back to V1 or fabricated data in the UI layer.

---

## 7. Successful prediction flow

1. User enters teams (+ optional date) on Match Center.
2. Form calls `POST /api/analyze`.
3. On `200` + report, evidence is fetched and cache seeded.
4. User lands on `/matches/{matchId}` Workspace.
5. **Explainable report** shows: match header, 1X2, scorelines, goal range, BTTS, O/U, confidence, Football State, Match Scripts, Unified Matrix, reasoning, evidence, features, rules.

**Recorded demo path (no live credentials required):**

```http
POST /api/analyze
{ "homeTeam": "FC Seoul", "awayTeam": "Ulsan Hyundai FC" }
→ football:100001 → full V2 explainable report
```

---

## 8. Provenance

Workspace surfaces (existing sections, now reachable via analyze-by-teams):

- `analysisProvenance.projectionPolicyPin` (`v2`)
- `analysisProvenance.fixtureResolution` (requested vs resolved teams, matchId, kickoff, schedule source)
- `footballState.policyVersion`
- `projectionFramework.frameworkVersion` / parameter labels via multi-script section
- `projection.v3.replay` remains the production parameter pin (via API report payload; not promoted)

---

## 9. Live fixture smoke procedure

### Prerequisites

```bash
# Required for Football Data live schedule + evidence
export FOOTBALL_DATA_PROVIDER_MODE=live
export API_FOOTBALL_KEY=<your-api-sports-key>

# Optional odds layer (unchanged from repo baseline)
export ODDS_PROVIDER_MODE=recorded   # or live + THE_ODDS_API_KEY

# Production V2 pin (default)
export PROJECTION_POLICY_PIN=v2
```

Start API + web:

```bash
pnpm dev:api   # port 3001 (or configured)
pnpm dev:web   # port 3000
```

### Smoke steps

1. Open `http://localhost:3000/#analyze-by-teams`.
2. Enter an **upcoming real fixture** visible in Match Center live catalog (example when available: **Rosenborg** vs **Fredrikstad** — do not hard-code if no longer upcoming; pick any live-board fixture).
3. Optionally set kickoff date to disambiguate.
4. Click **分析比赛**.
5. Verify fixture resolution card shows resolved `matchId` + `projectionPolicyPin: v2`.
6. Verify prediction hero + unified matrix BTTS/O-U + Football State + Match Scripts sections populate.
7. Confirm `analysisProvenance.fixtureResolution.scheduleSource` reflects live football-data path.

### Without credentials

- **Do not fake a successful live run.**
- Use recorded path instead:

```bash
export FOOTBALL_DATA_PROVIDER_MODE=recorded
curl -s -X POST http://localhost:3001/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"homeTeam":"FC Seoul","awayTeam":"Ulsan Hyundai FC"}' | jq '.analysisProvenance, .projectionFramework.unifiedMatrix.derived'
```

Deterministic coverage remains in `apps/api/test/pvs-1-production-vertical-slice.spec.ts` and `apps/web/test/analyze-by-teams-form.spec.tsx`.

---

## 10. Test results

| Suite | Result |
|-------|--------|
| `apps/web/test/analyze-by-teams-form.spec.tsx` | **PASS** — form render, success navigation, loading, not-found, ambiguous selection, policy error, V2 report BTTS/O-U + provenance |
| `apps/web/test/analysis-dashboard.spec.tsx` | **PASS** — analyze-by-teams section visible on landing |
| `apps/web/test/match-detail.spec.tsx` | **PASS** — unknown match does not trigger analyze when not seeded |
| All `apps/web` tests (49) | **PASS** |

**Not re-run in this sprint:** full monorepo `pnpm test` turbo matrix when blocked by known PostgreSQL/Prisma parallel worker issue (`apps/api/test/evidence-postgres-persistence.spec.ts`) — same limitation as PVS-1 report.

---

## 11. Quality gates

| Command | Result |
|---------|--------|
| `pnpm quality` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm build` | **PASS** |
| `pnpm --filter @fas/web test` | **PASS** (49/49) |

---

## 12. Limitations

- Workspace match header still prefers Match Center board metadata; off-board live fixtures rely on `fixtureResolution` provenance until board refresh.
- Ambiguous resolution requires user click → `POST /api/analyze/match/:matchId` (no date-only re-query auto-resolve in UI).
- Live smoke requires valid `API_FOOTBALL_KEY` and an upcoming fixture in the live catalog; offseason leagues may return `FIXTURE_NOT_FOUND`.
- Full monorepo parallel test gate may still fail on pre-existing DB infra — not modified in PVS-2.

---

## 13. Next recommended sprint

**PVS-3 (recommended):** Live fixture end-to-end validation with credentials in CI/staging smoke job; optional board refresh after analyze-by-teams so off-catalog fixtures appear in sidebar without provenance fallback.

**Not authorized without explicit gate:** P2K-CAL-3, `projection.v3.calibration.candidate1` promotion, Candidate C promotion, new Provider/Engine.

---

## Governance confirmation

- Production projection pin: **`projectionPolicyPin = "v2"`**
- Production parameter artifact: **`projection.v3.replay`**
- **No** promotion of `projection.v3.calibration.candidate1`
- **No** changes to sealed Evaluation History, calibration definitions, or projection parameter production pin
- **No** P2K-CAL-3 work in PVS-2
