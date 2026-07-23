import type {
  OddsSnapshotSource,
  PreMatchOddsOverlay,
} from "../domain/pre-match-odds.js";

export interface MatchLookup {
  getMatch(matchId: string): unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function serializeOddsOverlay(overlay: PreMatchOddsOverlay): unknown {
  return Object.freeze({
    homeOdds: overlay.homeOdds,
    drawOdds: overlay.drawOdds,
    awayOdds: overlay.awayOdds,
    observedAt: overlay.observedAt,
    providerSource: overlay.providerSource,
    providerSourceId: overlay.providerSourceId,
    providerMethod: overlay.providerMethod,
    ...(overlay.marketSource === undefined
      ? {}
      : { marketSource: overlay.marketSource }),
    ...(overlay.asianHandicapLine === undefined ||
    overlay.asianHandicapHomeOdds === undefined ||
    overlay.asianHandicapAwayOdds === undefined
      ? {}
      : {
          asianHandicapLine: overlay.asianHandicapLine,
          asianHandicapHomeOdds: overlay.asianHandicapHomeOdds,
          asianHandicapAwayOdds: overlay.asianHandicapAwayOdds,
        }),
    ...(overlay.overUnderLine === undefined ||
    overlay.overOdds === undefined ||
    overlay.underOdds === undefined
      ? {}
      : {
          overUnderLine: overlay.overUnderLine,
          overOdds: overlay.overOdds,
          underOdds: overlay.underOdds,
        }),
    ...(overlay.openingHomeOdds === undefined
      ? {}
      : { openingHomeOdds: overlay.openingHomeOdds }),
    ...(overlay.openingDrawOdds === undefined
      ? {}
      : { openingDrawOdds: overlay.openingDrawOdds }),
    ...(overlay.openingAwayOdds === undefined
      ? {}
      : { openingAwayOdds: overlay.openingAwayOdds }),
    ...(overlay.closingHomeOdds === undefined
      ? {}
      : { closingHomeOdds: overlay.closingHomeOdds }),
    ...(overlay.closingDrawOdds === undefined
      ? {}
      : { closingDrawOdds: overlay.closingDrawOdds }),
    ...(overlay.closingAwayOdds === undefined
      ? {}
      : { closingAwayOdds: overlay.closingAwayOdds }),
    ...(overlay.oddsMovementHome === undefined
      ? {}
      : { oddsMovementHome: overlay.oddsMovementHome }),
    ...(overlay.oddsMovementDraw === undefined
      ? {}
      : { oddsMovementDraw: overlay.oddsMovementDraw }),
    ...(overlay.oddsMovementAway === undefined
      ? {}
      : { oddsMovementAway: overlay.oddsMovementAway }),
    ...(overlay.asianHandicapOpeningLine === undefined
      ? {}
      : { asianHandicapOpeningLine: overlay.asianHandicapOpeningLine }),
    ...(overlay.asianHandicapOpeningHomeOdds === undefined
      ? {}
      : { asianHandicapOpeningHomeOdds: overlay.asianHandicapOpeningHomeOdds }),
    ...(overlay.asianHandicapOpeningAwayOdds === undefined
      ? {}
      : { asianHandicapOpeningAwayOdds: overlay.asianHandicapOpeningAwayOdds }),
    ...(overlay.handicapMovement === undefined
      ? {}
      : { handicapMovement: overlay.handicapMovement }),
    ...(overlay.overUnderOpeningLine === undefined
      ? {}
      : { overUnderOpeningLine: overlay.overUnderOpeningLine }),
    ...(overlay.overOpeningOdds === undefined
      ? {}
      : { overOpeningOdds: overlay.overOpeningOdds }),
    ...(overlay.underOpeningOdds === undefined
      ? {}
      : { underOpeningOdds: overlay.underOpeningOdds }),
    ...(overlay.overUnderLineMovement === undefined
      ? {}
      : { overUnderLineMovement: overlay.overUnderLineMovement }),
    ...(overlay.publicBettingHomePct === undefined
      ? {}
      : { publicBettingHomePct: overlay.publicBettingHomePct }),
    ...(overlay.publicBettingDrawPct === undefined
      ? {}
      : { publicBettingDrawPct: overlay.publicBettingDrawPct }),
    ...(overlay.publicBettingAwayPct === undefined
      ? {}
      : { publicBettingAwayPct: overlay.publicBettingAwayPct }),
    ...(overlay.bettingVolume === undefined
      ? {}
      : { bettingVolume: overlay.bettingVolume }),
    ...(overlay.sharpMoneyIndicator === undefined
      ? {}
      : { sharpMoneyIndicator: overlay.sharpMoneyIndicator }),
    ...(overlay.markets === undefined || overlay.markets.length === 0
      ? {}
      : { markets: overlay.markets }),
  });
}

/**
 * Wraps a fixture (or other) match provider and overlays external pre-match odds
 * when the odds source has a snapshot for the match id.
 */
export class CompositeMatchProvider implements MatchLookup {
  readonly #inner: MatchLookup;
  readonly #odds: OddsSnapshotSource;

  constructor(inner: MatchLookup, odds: OddsSnapshotSource) {
    this.#inner = inner;
    this.#odds = odds;
  }

  getMatch(matchId: string): unknown {
    const match = this.#inner.getMatch(matchId);

    if (match === undefined) {
      return undefined;
    }

    const overlay = this.#odds.getPreMatch1x2(matchId);

    if (overlay === undefined || !isRecord(match)) {
      return match;
    }

    return Object.freeze({
      ...match,
      odds: serializeOddsOverlay(overlay),
    });
  }
}
