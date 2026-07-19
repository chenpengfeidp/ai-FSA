# Vertical Slice C.2 — Scores-backed TEAM_FORM (+ goals-proxy STATISTICS)

## Goal

Use The Odds API scores feed to build real-shaped recent form so Match Center rows (including unmapped `odds:{eventId}`) can carry required football evidence and become analyzable when both sides have completed results in the scores window.

## Inclusions

- Recorded + live scores ingest for `soccer_epl` (`/v4/sports/{sport}/scores?daysFrom=3`);
- Derive `TEAM_FORM` (W/D/L, goals for/against, most-recent-first) per team from completed scores;
- Derive `STATISTICS` as an explicit **goals-implied proxy** (shots/xG fields set to mean goals for/against) with provenance `method=scores-goals-proxy` — Odds API does not provide shots/xG;
- Dynamic match shells for `odds:{eventId}` from the upcoming board cache;
- Overlay scores-backed form/stats onto fixture matches when available;
- Recompute `analyzable` when both sides have form window ≥ 1;
- Projection limitation text when goals-proxy STATISTICS is used;
- Optional Web: Match Detail / sidebar prefer upcoming board data when present.

## Exclusions

- True shots / xG provider feeds;
- Historical windows beyond Odds API `daysFrom` max (3) for live;
- HEAD_TO_HEAD from scores;
- PostgreSQL persistence;
- Multi-league scores fan-out beyond EPL in this slice;
- Calibration population (step 3).

## Acceptance

- Recorded mode: unmapped cassette event with both teams in scores cassette is `analyzable` and analyze returns 200 with form/stats provenance from `the-odds-api`;
- Live mode: scores prime uses at most one scores request per process warm-up path documented in `.env.example`;
- Mapped demos still analyze; goals-proxy limitation appears when proxy stats are used;
- Affected package tests pass.
