import type { OddsSnapshotSource } from "../domain/pre-match-1x2.js";

export interface MatchLookup {
  getMatch(matchId: string): unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Wraps a fixture (or other) match provider and overlays external pre-match 1X2 odds
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
      odds: Object.freeze({
        homeOdds: overlay.homeOdds,
        drawOdds: overlay.drawOdds,
        awayOdds: overlay.awayOdds,
        observedAt: overlay.observedAt,
        providerSource: overlay.providerSource,
        providerSourceId: overlay.providerSourceId,
        providerMethod: overlay.providerMethod,
      }),
    });
  }
}
