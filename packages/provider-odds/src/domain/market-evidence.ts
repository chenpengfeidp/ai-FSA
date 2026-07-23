/**
 * Canonical Market Evidence records (I2A).
 * Every value is optional and present only when the provider supplies it.
 * Never invent opening/closing, movement, public %, volume, or sharp indicators.
 */

export type MarketType = "asian_handicap" | "european_1x2" | "over_under";

export type MarketSelection =
  | "asian_away"
  | "asian_home"
  | "away"
  | "draw"
  | "home"
  | "over"
  | "under";

/**
 * One selection within one market type.
 * Opening / current / closing / movement are independent optional facts.
 */
export type MarketEvidenceRecord = Readonly<{
  marketType: MarketType;
  selection: MarketSelection;
  /** AH or O/U line when applicable (current line unless noted). */
  line?: number;
  openingValue?: number;
  currentValue?: number;
  closingValue?: number;
  /** currentValue − openingValue when both are provider-supplied. */
  movement?: number;
  /** Current line − opening line when both lines are provider-supplied. */
  lineMovement?: number;
  observedAt: string;
  /** Bookmaker / market source key when supplied. */
  marketSource?: string;
}>;

export type MarketDepthSnapshot = Readonly<{
  observedAt: string;
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  asianHandicapLine?: number;
  asianHandicapHomeOdds?: number;
  asianHandicapAwayOdds?: number;
  overUnderLine?: number;
  overOdds?: number;
  underOdds?: number;
}>;
