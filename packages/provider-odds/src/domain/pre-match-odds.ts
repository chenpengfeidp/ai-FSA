import type {
  MarketDepthSnapshot,
  MarketEvidenceRecord,
} from "./market-evidence.js";

export type {
  MarketDepthSnapshot,
  MarketEvidenceRecord,
  MarketSelection,
  MarketType,
} from "./market-evidence.js";

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
  /** Bookmaker / market source key when known. */
  readonly marketSource?: string;
  readonly asianHandicapLine?: number;
  readonly asianHandicapHomeOdds?: number;
  readonly asianHandicapAwayOdds?: number;
  readonly overUnderLine?: number;
  readonly overOdds?: number;
  readonly underOdds?: number;
  readonly openingHomeOdds?: number;
  readonly openingDrawOdds?: number;
  readonly openingAwayOdds?: number;
  readonly closingHomeOdds?: number;
  readonly closingDrawOdds?: number;
  readonly closingAwayOdds?: number;
  /** current − opening when both supplied. */
  readonly oddsMovementHome?: number;
  readonly oddsMovementDraw?: number;
  readonly oddsMovementAway?: number;
  readonly asianHandicapOpeningLine?: number;
  readonly asianHandicapOpeningHomeOdds?: number;
  readonly asianHandicapOpeningAwayOdds?: number;
  readonly handicapMovement?: number;
  readonly overUnderOpeningLine?: number;
  readonly overOpeningOdds?: number;
  readonly underOpeningOdds?: number;
  readonly overUnderLineMovement?: number;
  readonly publicBettingHomePct?: number;
  readonly publicBettingDrawPct?: number;
  readonly publicBettingAwayPct?: number;
  readonly bettingVolume?: number;
  /** Provider-supplied sharp indicator only — never inferred. */
  readonly sharpMoneyIndicator?: boolean | string;
  /** Canonical per-selection Market Evidence rows. */
  readonly markets?: readonly MarketEvidenceRecord[];
  /** Optional recorded depth snapshots (opening/closing) when provider supplies them. */
  readonly openingSnapshot?: MarketDepthSnapshot;
  readonly closingSnapshot?: MarketDepthSnapshot;
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
