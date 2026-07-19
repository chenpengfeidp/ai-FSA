export type OddsProviderMethod = "http-live" | "recorded-snapshot";

/** Overlay fields merged into the provider match `odds` object before normalization. */
export interface PreMatch1x2OddsOverlay {
  readonly homeOdds: number;
  readonly drawOdds: number;
  readonly awayOdds: number;
  readonly observedAt: string;
  readonly providerSource: "the-odds-api";
  readonly providerSourceId: string;
  readonly providerMethod: OddsProviderMethod;
}

export interface OddsSnapshotSource {
  getPreMatch1x2(matchId: string): PreMatch1x2OddsOverlay | undefined;
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
