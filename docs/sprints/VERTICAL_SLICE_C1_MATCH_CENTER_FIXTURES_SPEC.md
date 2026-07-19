# Vertical Slice C.1 — Match Center Upcoming Fixtures

## Goal

Replace the hardcoded Match Center list with an Odds API–shaped upcoming-fixtures feed so the private demo can show real international schedule rows, while keeping offline CI on recorded cassettes.

## Inclusions

- `GET /api/matches/upcoming` returns a merged board:
  - upcoming events from `@fas/provider-odds` (recorded cassette by default; live when `ODDS_PROVIDER_MODE=live`);
  - remaining fixture-backed demo matches that are not already represented by a catalog event mapping;
- catalog `eventId → matchId` mapping marks rows as `analyzable: true` when full fixture evidence exists;
- unmapped Odds events appear with `id = odds:{eventId}` and `analyzable: false`;
- Web Match Center loads the board from the API; Analyze is disabled when not analyzable;
- default sport for the Odds list in this slice: `soccer_epl` (one credit per live list call).

## Exclusions

- Real TEAM_FORM / STATISTICS / HEAD_TO_HEAD ingestion (next product step);
- Multi-league live fan-out beyond the recorded cassette / single live sport key;
- Durable PostgreSQL persistence of fixtures;
- Analyzing unmapped `odds:*` match ids;
- Redis, BullMQ, auth, public deployment.

## Acceptance

- Recorded mode: API returns upcoming rows without network; at least one catalog-mapped analyzable EPL row and fixture demos remain analyzable;
- Live mode (local `.env`): board can refresh from The Odds API for `soccer_epl`;
- Web dashboard renders API board; Analyze on analyzable rows still reaches `/matches/{id}/session`;
- `pnpm --filter @fas/provider-odds test`, API/web tests covering the new path, and affected typecheck pass.
