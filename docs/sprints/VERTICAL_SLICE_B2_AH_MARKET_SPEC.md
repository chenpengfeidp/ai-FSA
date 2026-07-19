# Vertical Slice B.2 — International 1X2 + Asian Handicap

## Goal

Extend the international The Odds API path so ODDS Evidence carries pre-match decimal 1X2 **and** one primary Asian handicap line/prices as market signals, visible in Workspace Evidence, without blending into model 1X2.

## Allowlist

- ODDS payload AH fields: `asianHandicapLine`, `asianHandicapHomeOdds`, `asianHandicapAwayOdds`
- `@fas/provider-odds` mapper/cassettes/live for `h2h` + `spreads`
- Features `asianHandicapLine`, `asianHandicapLean`
- Rules `MARKET_AH_LEAN_HOME` / `MARKET_AH_LEAN_AWAY` (`channel: "none"`)
- Projection limitation when AH lean conflicts with football directional lean (does not replace 1X2 cautious gate)
- Web feature/rule labels
- Docs: this note, doc 35 §5.5, `PROJECT_STATE`

## Exclusions

- 体彩 / 竞彩开售子集
- Totals (大小球), closing-line history
- 投资量分布 / 交易所成交量
- 战意 / NEWS motivation
- Replacing Match Center mock fixture list
- Changing Poisson / 1X2 blend / calibration ownership

## Acceptance

1. Recorded cassettes for mapped demo matches include `h2h` + `spreads`; overlay normalizes both.
2. 1X2-only ODDS still valid; partial AH fields fail normalization.
3. AH rules are inapplicable when AH features absent; never enter football softmax.
4. 1X2 market conflict → `cautious` unchanged; AH conflict adds limitation text only.
5. `pnpm validate` passes offline under `ODDS_PROVIDER_MODE=recorded`.

## Defaults

| Item | Value |
|---|---|
| Source shape | The Odds API |
| Preferred book | Pinnacle, else first with both markets |
| Runtime default | `recorded` (no API key) |
| Live | `markets=h2h,spreads` when key present |
