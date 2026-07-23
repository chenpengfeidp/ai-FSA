import type {
  MarketDepthSnapshot,
  MarketEvidenceRecord,
  OddsProviderMethod,
  PreMatchOddsOverlay,
} from "../domain/pre-match-odds.js";

/**
 * Maps vendor JSON via `unknown` + structural checks.
 * The Odds API event shape is intentionally not a public FAS contract.
 *
 * Optional cassette key `fas_market_depth` may supply opening/closing /
 * public/volume/sharp facts for recorded demos. Live payloads omit it →
 * honest absence for those metrics.
 */

export interface MapTheOddsApiH2hOptions {
  readonly providerMethod: OddsProviderMethod;
  readonly preferredBookmakerKey?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteOdds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 1
    ? value
    : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asIsoTimestamp(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
    ? value.trim()
    : undefined;
}

function movement(
  current: number | undefined,
  opening: number | undefined,
): number | undefined {
  if (current === undefined || opening === undefined) {
    return undefined;
  }

  return Math.round((current - opening) * 1e6) / 1e6;
}

interface AsianHandicapSlice {
  readonly asianHandicapLine: number;
  readonly asianHandicapHomeOdds: number;
  readonly asianHandicapAwayOdds: number;
  readonly lastUpdate?: string;
}

interface TotalsSlice {
  readonly overUnderLine: number;
  readonly overOdds: number;
  readonly underOdds: number;
  readonly lastUpdate?: string;
}

function parseSpreadsMarket(
  market: Record<string, unknown>,
  homeTeam: string,
  awayTeam: string,
): AsianHandicapSlice | undefined {
  if (!Array.isArray(market.outcomes)) {
    return undefined;
  }

  let homeOdds: number | undefined;
  let awayOdds: number | undefined;
  let homeLine: number | undefined;

  for (const outcome of market.outcomes) {
    if (!isRecord(outcome) || typeof outcome.name !== "string") {
      continue;
    }

    const price = asFiniteOdds(outcome.price);
    const point = asFiniteNumber(outcome.point);

    if (price === undefined || point === undefined) {
      continue;
    }

    if (outcome.name === homeTeam) {
      homeOdds = price;
      homeLine = point;
    } else if (outcome.name === awayTeam) {
      awayOdds = price;
    }
  }

  if (homeOdds === undefined || awayOdds === undefined || homeLine === undefined) {
    return undefined;
  }

  const lastUpdate = asIsoTimestamp(market.last_update);

  return Object.freeze({
    asianHandicapLine: homeLine,
    asianHandicapHomeOdds: homeOdds,
    asianHandicapAwayOdds: awayOdds,
    ...(lastUpdate === undefined ? {} : { lastUpdate }),
  });
}

function parseTotalsMarket(
  market: Record<string, unknown>,
): TotalsSlice | undefined {
  if (!Array.isArray(market.outcomes)) {
    return undefined;
  }

  let overOdds: number | undefined;
  let underOdds: number | undefined;
  let line: number | undefined;

  for (const outcome of market.outcomes) {
    if (!isRecord(outcome) || typeof outcome.name !== "string") {
      continue;
    }

    const price = asFiniteOdds(outcome.price);
    const point = asFiniteNumber(outcome.point);

    if (price === undefined || point === undefined) {
      continue;
    }

    const name = outcome.name.trim().toLowerCase();

    if (name === "over") {
      overOdds = price;
      line = point;
    } else if (name === "under") {
      underOdds = price;
      if (line === undefined) {
        line = point;
      }
    }
  }

  if (overOdds === undefined || underOdds === undefined || line === undefined) {
    return undefined;
  }

  const lastUpdate = asIsoTimestamp(market.last_update);

  return Object.freeze({
    overUnderLine: line,
    overOdds,
    underOdds,
    ...(lastUpdate === undefined ? {} : { lastUpdate }),
  });
}

function parseDepthSnapshot(value: unknown): MarketDepthSnapshot | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const observedAt = asIsoTimestamp(value.observedAt);

  if (observedAt === undefined) {
    return undefined;
  }

  const snapshot: {
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
  } = { observedAt };

  const homeOdds = asFiniteOdds(value.homeOdds);
  const drawOdds = asFiniteOdds(value.drawOdds);
  const awayOdds = asFiniteOdds(value.awayOdds);
  const asianHandicapLine = asFiniteNumber(value.asianHandicapLine);
  const asianHandicapHomeOdds = asFiniteOdds(value.asianHandicapHomeOdds);
  const asianHandicapAwayOdds = asFiniteOdds(value.asianHandicapAwayOdds);
  const overUnderLine = asFiniteNumber(value.overUnderLine);
  const overOdds = asFiniteOdds(value.overOdds);
  const underOdds = asFiniteOdds(value.underOdds);

  if (homeOdds !== undefined) {
    snapshot.homeOdds = homeOdds;
  }
  if (drawOdds !== undefined) {
    snapshot.drawOdds = drawOdds;
  }
  if (awayOdds !== undefined) {
    snapshot.awayOdds = awayOdds;
  }
  if (asianHandicapLine !== undefined) {
    snapshot.asianHandicapLine = asianHandicapLine;
  }
  if (asianHandicapHomeOdds !== undefined) {
    snapshot.asianHandicapHomeOdds = asianHandicapHomeOdds;
  }
  if (asianHandicapAwayOdds !== undefined) {
    snapshot.asianHandicapAwayOdds = asianHandicapAwayOdds;
  }
  if (overUnderLine !== undefined) {
    snapshot.overUnderLine = overUnderLine;
  }
  if (overOdds !== undefined) {
    snapshot.overOdds = overOdds;
  }
  if (underOdds !== undefined) {
    snapshot.underOdds = underOdds;
  }

  return Object.freeze(snapshot);
}

function buildMarketRecords(input: {
  readonly observedAt: string;
  readonly marketSource: string;
  readonly homeOdds: number;
  readonly drawOdds: number;
  readonly awayOdds: number;
  readonly asian?: AsianHandicapSlice;
  readonly totals?: TotalsSlice;
  readonly opening?: MarketDepthSnapshot;
  readonly closing?: MarketDepthSnapshot;
}): readonly MarketEvidenceRecord[] {
  const { observedAt, marketSource, opening, closing } = input;
  const records: MarketEvidenceRecord[] = [];

  const push1x2 = (
    selection: "away" | "draw" | "home",
    current: number,
    openingValue: number | undefined,
    closingValue: number | undefined,
  ): void => {
    const move = movement(current, openingValue);
    records.push(
      Object.freeze({
        marketType: "european_1x2",
        selection,
        currentValue: current,
        ...(openingValue === undefined ? {} : { openingValue }),
        ...(closingValue === undefined ? {} : { closingValue }),
        ...(move === undefined ? {} : { movement: move }),
        observedAt,
        marketSource,
      }),
    );
  };

  push1x2("home", input.homeOdds, opening?.homeOdds, closing?.homeOdds);
  push1x2("draw", input.drawOdds, opening?.drawOdds, closing?.drawOdds);
  push1x2("away", input.awayOdds, opening?.awayOdds, closing?.awayOdds);

  if (input.asian !== undefined) {
    const lineMove = movement(
      input.asian.asianHandicapLine,
      opening?.asianHandicapLine,
    );
    const homeMove = movement(
      input.asian.asianHandicapHomeOdds,
      opening?.asianHandicapHomeOdds,
    );
    const awayMove = movement(
      input.asian.asianHandicapAwayOdds,
      opening?.asianHandicapAwayOdds,
    );

    records.push(
      Object.freeze({
        marketType: "asian_handicap",
        selection: "asian_home",
        line: input.asian.asianHandicapLine,
        currentValue: input.asian.asianHandicapHomeOdds,
        ...(opening?.asianHandicapHomeOdds === undefined
          ? {}
          : { openingValue: opening.asianHandicapHomeOdds }),
        ...(closing?.asianHandicapHomeOdds === undefined
          ? {}
          : { closingValue: closing.asianHandicapHomeOdds }),
        ...(homeMove === undefined ? {} : { movement: homeMove }),
        ...(lineMove === undefined ? {} : { lineMovement: lineMove }),
        observedAt,
        marketSource,
      }),
      Object.freeze({
        marketType: "asian_handicap",
        selection: "asian_away",
        line: -input.asian.asianHandicapLine,
        currentValue: input.asian.asianHandicapAwayOdds,
        ...(opening?.asianHandicapAwayOdds === undefined
          ? {}
          : { openingValue: opening.asianHandicapAwayOdds }),
        ...(closing?.asianHandicapAwayOdds === undefined
          ? {}
          : { closingValue: closing.asianHandicapAwayOdds }),
        ...(awayMove === undefined ? {} : { movement: awayMove }),
        ...(lineMove === undefined ? {} : { lineMovement: lineMove }),
        observedAt,
        marketSource,
      }),
    );
  }

  if (input.totals !== undefined) {
    const lineMove = movement(input.totals.overUnderLine, opening?.overUnderLine);
    const overMove = movement(input.totals.overOdds, opening?.overOdds);
    const underMove = movement(input.totals.underOdds, opening?.underOdds);

    records.push(
      Object.freeze({
        marketType: "over_under",
        selection: "over",
        line: input.totals.overUnderLine,
        currentValue: input.totals.overOdds,
        ...(opening?.overOdds === undefined
          ? {}
          : { openingValue: opening.overOdds }),
        ...(closing?.overOdds === undefined
          ? {}
          : { closingValue: closing.overOdds }),
        ...(overMove === undefined ? {} : { movement: overMove }),
        ...(lineMove === undefined ? {} : { lineMovement: lineMove }),
        observedAt,
        marketSource,
      }),
      Object.freeze({
        marketType: "over_under",
        selection: "under",
        line: input.totals.overUnderLine,
        currentValue: input.totals.underOdds,
        ...(opening?.underOdds === undefined
          ? {}
          : { openingValue: opening.underOdds }),
        ...(closing?.underOdds === undefined
          ? {}
          : { closingValue: closing.underOdds }),
        ...(underMove === undefined ? {} : { movement: underMove }),
        ...(lineMove === undefined ? {} : { lineMovement: lineMove }),
        observedAt,
        marketSource,
      }),
    );
  }

  return Object.freeze(records);
}

/**
 * Maps a The Odds API–shaped event odds document to a FAS pre-match overlay.
 * Prefers a bookmaker with h2h; attaches spreads / totals when present.
 */
export function mapTheOddsApiH2h(
  input: unknown,
  options: MapTheOddsApiH2hOptions,
): PreMatchOddsOverlay | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const eventId = typeof input.id === "string" ? input.id.trim() : "";
  const homeTeam = typeof input.home_team === "string" ? input.home_team.trim() : "";
  const awayTeam = typeof input.away_team === "string" ? input.away_team.trim() : "";

  if (eventId.length === 0 || homeTeam.length === 0 || awayTeam.length === 0) {
    return undefined;
  }

  if (!Array.isArray(input.bookmakers) || input.bookmakers.length === 0) {
    return undefined;
  }

  const depth = isRecord(input.fas_market_depth)
    ? input.fas_market_depth
    : undefined;
  const opening = parseDepthSnapshot(depth?.opening);
  const closing = parseDepthSnapshot(depth?.closing);
  const publicBettingHomePct = asFiniteNumber(depth?.publicBettingHomePct);
  const publicBettingDrawPct = asFiniteNumber(depth?.publicBettingDrawPct);
  const publicBettingAwayPct = asFiniteNumber(depth?.publicBettingAwayPct);
  const bettingVolume = asFiniteNumber(depth?.bettingVolume);
  const sharpMoneyIndicator =
    typeof depth?.sharpMoneyIndicator === "boolean" ||
    (typeof depth?.sharpMoneyIndicator === "string" &&
      depth.sharpMoneyIndicator.trim().length > 0)
      ? depth.sharpMoneyIndicator
      : undefined;

  const bookmakers = input.bookmakers.filter(isRecord);
  const preferredKey = options.preferredBookmakerKey;
  const ordered =
    preferredKey === undefined
      ? bookmakers
      : [
          ...bookmakers.filter((bookmaker) => bookmaker.key === preferredKey),
          ...bookmakers.filter((bookmaker) => bookmaker.key !== preferredKey),
        ];

  for (const bookmaker of ordered) {
    const bookmakerKey =
      typeof bookmaker.key === "string" ? bookmaker.key.trim() : "";

    if (bookmakerKey.length === 0 || !Array.isArray(bookmaker.markets)) {
      continue;
    }

    const markets = bookmaker.markets.filter(isRecord);
    const h2h = markets.find((market) => market.key === "h2h");

    if (h2h === undefined || !Array.isArray(h2h.outcomes)) {
      continue;
    }

    let homeOdds: number | undefined;
    let drawOdds: number | undefined;
    let awayOdds: number | undefined;

    for (const outcome of h2h.outcomes) {
      if (!isRecord(outcome) || typeof outcome.name !== "string") {
        continue;
      }

      const price = asFiniteOdds(outcome.price);

      if (price === undefined) {
        continue;
      }

      if (outcome.name === homeTeam) {
        homeOdds = price;
      } else if (outcome.name === awayTeam) {
        awayOdds = price;
      } else if (outcome.name === "Draw") {
        drawOdds = price;
      }
    }

    if (homeOdds === undefined || drawOdds === undefined || awayOdds === undefined) {
      continue;
    }

    const spreads = markets.find((market) => market.key === "spreads");
    const asian =
      spreads === undefined
        ? undefined
        : parseSpreadsMarket(spreads, homeTeam, awayTeam);
    const totalsMarket = markets.find((market) => market.key === "totals");
    const totals =
      totalsMarket === undefined ? undefined : parseTotalsMarket(totalsMarket);

    const observedAtCandidate =
      asIsoTimestamp(h2h.last_update) ||
      asian?.lastUpdate ||
      totals?.lastUpdate ||
      asIsoTimestamp(bookmaker.last_update) ||
      asIsoTimestamp(input.commence_time);

    if (observedAtCandidate === undefined) {
      continue;
    }

    const marketParts = ["h2h"];
    if (asian !== undefined) {
      marketParts.push("spreads");
    }
    if (totals !== undefined) {
      marketParts.push("totals");
    }

    const marketRecords = buildMarketRecords({
      observedAt: observedAtCandidate,
      marketSource: bookmakerKey,
      homeOdds,
      drawOdds,
      awayOdds,
      ...(asian === undefined ? {} : { asian }),
      ...(totals === undefined ? {} : { totals }),
      ...(opening === undefined ? {} : { opening }),
      ...(closing === undefined ? {} : { closing }),
    });

    const oddsMovementHome = movement(homeOdds, opening?.homeOdds);
    const oddsMovementDraw = movement(drawOdds, opening?.drawOdds);
    const oddsMovementAway = movement(awayOdds, opening?.awayOdds);
    const handicapMovement = movement(
      asian?.asianHandicapLine,
      opening?.asianHandicapLine,
    );
    const overUnderLineMovement = movement(
      totals?.overUnderLine,
      opening?.overUnderLine,
    );

    return Object.freeze({
      homeOdds,
      drawOdds,
      awayOdds,
      observedAt: observedAtCandidate,
      providerSource: "the-odds-api",
      providerSourceId: `${eventId}:${bookmakerKey}:${marketParts.join("+")}`,
      providerMethod: options.providerMethod,
      marketSource: bookmakerKey,
      ...(asian === undefined
        ? {}
        : {
            asianHandicapLine: asian.asianHandicapLine,
            asianHandicapHomeOdds: asian.asianHandicapHomeOdds,
            asianHandicapAwayOdds: asian.asianHandicapAwayOdds,
          }),
      ...(totals === undefined
        ? {}
        : {
            overUnderLine: totals.overUnderLine,
            overOdds: totals.overOdds,
            underOdds: totals.underOdds,
          }),
      ...(opening?.homeOdds === undefined
        ? {}
        : { openingHomeOdds: opening.homeOdds }),
      ...(opening?.drawOdds === undefined
        ? {}
        : { openingDrawOdds: opening.drawOdds }),
      ...(opening?.awayOdds === undefined
        ? {}
        : { openingAwayOdds: opening.awayOdds }),
      ...(closing?.homeOdds === undefined
        ? {}
        : { closingHomeOdds: closing.homeOdds }),
      ...(closing?.drawOdds === undefined
        ? {}
        : { closingDrawOdds: closing.drawOdds }),
      ...(closing?.awayOdds === undefined
        ? {}
        : { closingAwayOdds: closing.awayOdds }),
      ...(oddsMovementHome === undefined ? {} : { oddsMovementHome }),
      ...(oddsMovementDraw === undefined ? {} : { oddsMovementDraw }),
      ...(oddsMovementAway === undefined ? {} : { oddsMovementAway }),
      ...(opening?.asianHandicapLine === undefined
        ? {}
        : { asianHandicapOpeningLine: opening.asianHandicapLine }),
      ...(opening?.asianHandicapHomeOdds === undefined
        ? {}
        : { asianHandicapOpeningHomeOdds: opening.asianHandicapHomeOdds }),
      ...(opening?.asianHandicapAwayOdds === undefined
        ? {}
        : { asianHandicapOpeningAwayOdds: opening.asianHandicapAwayOdds }),
      ...(handicapMovement === undefined ? {} : { handicapMovement }),
      ...(opening?.overUnderLine === undefined
        ? {}
        : { overUnderOpeningLine: opening.overUnderLine }),
      ...(opening?.overOdds === undefined
        ? {}
        : { overOpeningOdds: opening.overOdds }),
      ...(opening?.underOdds === undefined
        ? {}
        : { underOpeningOdds: opening.underOdds }),
      ...(overUnderLineMovement === undefined ? {} : { overUnderLineMovement }),
      ...(publicBettingHomePct === undefined ? {} : { publicBettingHomePct }),
      ...(publicBettingDrawPct === undefined ? {} : { publicBettingDrawPct }),
      ...(publicBettingAwayPct === undefined ? {} : { publicBettingAwayPct }),
      ...(bettingVolume === undefined ? {} : { bettingVolume }),
      ...(sharpMoneyIndicator === undefined ? {} : { sharpMoneyIndicator }),
      markets: marketRecords,
      ...(opening === undefined ? {} : { openingSnapshot: opening }),
      ...(closing === undefined ? {} : { closingSnapshot: closing }),
    });
  }

  return undefined;
}
