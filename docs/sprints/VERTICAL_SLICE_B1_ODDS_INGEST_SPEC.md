# Vertical Slice B.1 — Real Pre-Match 1X2 Odds Ingestion

## Goal

Ingest real-shaped pre-match decimal 1X2 odds into the existing `ODDS` Evidence contract so import/analyze can show non-fixture provenance, without changing projection ownership or blending market prices into model 1X2.

## Allowlist

- `@fas/provider-odds` port, The Odds API–style mapper, recorded cassettes, optional live `fetch`
- `CompositeMatchProvider` overlaying fixture match payloads with external odds
- Minimal ODDS normalizer provenance fields (`providerSource` / `providerSourceId` / `providerMethod`)
- API config: `ODDS_PROVIDER_MODE`, `THE_ODDS_API_KEY`, `THE_ODDS_API_BASE_URL`
- API wiring for recorded (default) / live / fixture modes
- Docs: this note, `PROJECT_STATE`, `docs/14_MONOREPO.md` package registration

## Exclusions

- Asian handicap / 水位 / closing-line history (B.2)
- Redis, BullMQ, pgvector
- Durable PostgreSQL odds tables
- npm odds SDKs
- OpenAI / wagering advice UI
- Changing Poisson, calibration, narrative, Feature, or Rule math

## Acceptance

1. Default `ODDS_PROVIDER_MODE=recorded` overlays demo matches from checked-in cassettes (offline).
2. Import/analyze for a mapped demo match yields `ODDS` with `source !== "fixture"`.
3. Market lean / conflict gate behavior unchanged for equivalent prices.
4. `pnpm validate` passes without network.
5. Live mode requires `THE_ODDS_API_KEY`; uses `fetch` only after an async prime step.

## Locked defaults

| Item | Value |
|---|---|
| Markets | Pre-match decimal 1X2 only |
| Source shape | The Odds API `h2h` |
| Default mode | `recorded` |
| Other evidence | Fixture-backed |
