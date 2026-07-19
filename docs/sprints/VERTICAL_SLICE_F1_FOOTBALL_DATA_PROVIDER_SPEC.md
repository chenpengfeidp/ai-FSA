# Vertical Slice F.1 — Football Data Provider (facts ≠ odds)

## Status

**Approved and implementing.** Gate decisions locked 2026-07-19.

## Gate decisions

1. Primary Football Data provider: **API-Football**
2. Package name: **`@fas/provider-football`**
3. Host: **API-Sports official direct** (`https://v3.football.api-sports.io`, header `x-apisports-key`) — **not RapidAPI**
4. **xG does not block F.1** — F.1 ships Fixture / Form / Team Stats / H2H / Standings; true xG is **F.1.1**
5. **Domain-model gate:** Football Provider must **not** pass API-Football raw JSON into Evidence. Map to FAS Football Domain Model (`Fixture`, `TeamForm`, `TeamStats`, `H2H`, `Standings`, …) first, then enter Evidence Layer (provider-replaceable).

## Goal

Split **football fact data** from **market odds** so Match Center and analyzable evidence no longer depend on The Odds API for fixtures / form / statistics.

The Odds API remains an optional **Odds Layer** only (`@fas/provider-odds`). Football facts enter FAS through a dedicated Football Data provider adapter → domain model → Evidence → existing Feature / Rule / Analysis path.

## Problem (evidence)

- The Odds API free quota is easily exhausted (`OUT_OF_USAGE_CREDITS` / 429); live Match Center then falls back to recorded cassettes.
- Odds API is weak as a football-data source: no true shots/xG; form is rebuilt from a short scores window (`daysFrom≤3`); multi-league fan-out is credit-hostile.
- FAS domain already separates **facts** vs **market signals** (`docs/02_DOMAIN_MODEL.md`). Current C.1/C.2 path overloads one provider for both.

## Target architecture

```text
Football Data Provider          Odds Provider
(fixtures, form, stats, h2h…)   (The Odds API — 1X2 / AH only)
            \                         /
             ▼                       ▼
         FAS Domain Model        Odds overlay
             \                         /
              ▼                       ▼
                  Evidence Layer
                       │
            Feature → Rule → Analysis projection → Report
```

Match Center **primary list** comes from Football Data. Odds overlays are optional and never required for `analyzable`.

## Inclusions (F.1)

- Package `@fas/provider-football` with:
  - FAS Football Domain Model + mappers (vendor JSON → domain only);
  - `listUpcoming` → Match Center rows (`providerSource=api-football`);
  - `getMatch` / MatchLookup via domain bundle → Evidence-ready shape;
  - recorded fixtures under `packages/provider-football/fixtures/`;
  - live API-Sports adapter (`x-apisports-key`).
- Config (server-side only):
  - `FOOTBALL_DATA_PROVIDER_MODE=recorded|live|fixture`
  - `API_FOOTBALL_KEY` (required when live)
  - `API_FOOTBALL_BASE_URL` (default `https://v3.football.api-sports.io`)
  - Optional `FOOTBALL_DATA_LEAGUE_IDS` (comma-separated)
- API:
  - `GET /api/matches/upcoming` prefers Football Data when mode ≠ `fixture`;
  - Odds calendar becomes optional event-shell priming / overlay, not the sole schedule source.
- Evidence import for `football:*` uses Football Data form/stats/H2H (domain-mapped).
- `analyzable=true` when MATCH_INFO + TEAM_FORM×2 + STATISTICS×2 can be built from Football Data.
- Provenance: `api-football` + `http-live` | `recorded-snapshot`.
- Web: badges distinguish football-data vs odds schedule source.
- Tests: recorded offline board + analyzable path; no network in CI.
- Docs: `PROJECT_STATE.md`, `PROJECT_INDEX.md`, `.env.example`.

## Exclusions

- Parallel SportMonks / football-data.org / TheSportsDB adapters in F.1.
- Injury / lineup evidence kinds as first-class required inputs (may be Phase F.2).
- Guaranteed true xG on free tier (**F.1.1**).
- Redis / BullMQ / caching platform.
- Auth, public deployment, wagering advice.
- Replacing Rule / Analysis math.
- Automatic learning / Evaluation-qualified calibration.

## League scope (F.1 default)

Pinned in `packages/provider-football/src/catalog/default-league-ids.ts`:

- K League 1 (`292`), J1 League (`98`)
- Allsvenskan (`113`), Veikkausliiga (`244`), Eliteserien (`103`)
- Big five (`39`, `140`, `135`, `78`, `61`)
- UEFA CL (`2`), Europa League (`3`)

## Acceptance

1. With `FOOTBALL_DATA_PROVIDER_MODE=recorded`, Match Center shows cassette fixtures without The Odds API as schedule source.
2. A recorded `football:*` fixture is analyzable and `POST /api/analyze/match/:id` returns 200 with football-data provenance (not `scores-goals-proxy` unless explicit fallback).
3. With live + valid key + remaining quota, upcoming list can include configured leagues without Odds credits.
4. Odds-only failure no longer forces Match Center into August Odds cassettes when Football Data recorded/live succeeds.
5. `pnpm --filter @fas/provider-football test` and affected API/web tests pass offline.
6. No Prisma/Redis/auth scope creep.
7. No raw API-Football JSON reaches Evidence — only FAS domain / Evidence-ready shapes.

## Follow-on

- **F.1.1** — true xG fields when available from provider plan / alternate stats endpoint.

## Authority

- Domain epistemic split: `docs/02_DOMAIN_MODEL.md`
- Architecture / providers: `docs/04_ARCHITECTURE.md`, ADR-001
- Agent rules: no Redis/BullMQ without milestone
- Live delivery snapshot: `docs/PROJECT_STATE.md`
- Map: `docs/PROJECT_INDEX.md`
