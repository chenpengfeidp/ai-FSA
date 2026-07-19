export type OddsProviderMethod = "http-live" | "recorded-snapshot";

/** Overlay fields merged into the provider match `odds` object before normalization. */
export interface PreMatchOddsOverlay {
  readonly homeOdds: number;
  readonly drawOdds: number;
  readonly awayOdds: number;
  readonly observedAt: string;
  readonly providerSource: "the-odds-api";
  readonly providerSourceId: string;
  readonly providerMethod: OddsProviderMethod;
  readonly asianHandicapLine?: number;
  readonly asianHandicapHomeOdds?: number;
  readonly asianHandicapAwayOdds?: number;
}

/** @deprecated Alias retained for B.1 call sites; prefer PreMatchOddsOverlay. */
export type PreMatch1x2OddsOverlay = PreMatchOddsOverlay;

export interface OddsSnapshotSource {
  getPreMatch1x2(matchId: string): PreMatchOddsOverlay | undefined;
}

/** Optional async warm-up for live sources before a sync MatchProvider lookup. */
export interface OddsSnapshotPrimer {
  ensurePreMatch1x2(matchId: string): Promise<void>;
}

export class NoopOddsSnapshotPrimer implements OddsSnapshotPrimer {
  async ensurePreMatch1x2(_matchId: string): Promise<void> {
    return;
  }
}
