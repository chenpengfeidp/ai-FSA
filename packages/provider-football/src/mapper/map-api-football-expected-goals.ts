import type {
  FootballExpectedGoalsMetrics,
  FootballExpectedGoalsRecord,
  FootballExpectedGoalsWindow,
} from "../domain/football-expected-goals.js";
import type { FootballProviderMethod } from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asMetricNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.toLowerCase() === "null") {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeType(type: string): string {
  return type
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");
}

function freezeMetrics(partial: {
  readonly xg?: number;
  readonly xga?: number;
  readonly nonPenaltyXg?: number;
  readonly nonPenaltyXga?: number;
  readonly expectedPoints?: number;
  readonly expectedGoalDifference?: number;
}): FootballExpectedGoalsMetrics | undefined {
  const metrics: {
    xg?: number;
    xga?: number;
    nonPenaltyXg?: number;
    nonPenaltyXga?: number;
    expectedPoints?: number;
    expectedGoalDifference?: number;
  } = {};

  if (partial.xg !== undefined) {
    metrics.xg = partial.xg;
  }
  if (partial.xga !== undefined) {
    metrics.xga = partial.xga;
  }
  if (partial.nonPenaltyXg !== undefined) {
    metrics.nonPenaltyXg = partial.nonPenaltyXg;
  }
  if (partial.nonPenaltyXga !== undefined) {
    metrics.nonPenaltyXga = partial.nonPenaltyXga;
  }
  if (partial.expectedPoints !== undefined) {
    metrics.expectedPoints = partial.expectedPoints;
  }
  if (partial.expectedGoalDifference !== undefined) {
    metrics.expectedGoalDifference = partial.expectedGoalDifference;
  }

  if (Object.keys(metrics).length === 0) {
    return undefined;
  }

  return Object.freeze(metrics);
}

function mapTeamStatisticsXg(
  statistics: unknown,
): FootballExpectedGoalsMetrics | undefined {
  if (!Array.isArray(statistics)) {
    return undefined;
  }

  let xg: number | undefined;
  let nonPenaltyXg: number | undefined;
  let expectedPoints: number | undefined;
  let expectedGoalDifference: number | undefined;

  for (const entry of statistics) {
    if (!isRecord(entry) || typeof entry.type !== "string") {
      continue;
    }

    const type = normalizeType(entry.type);
    const value = asMetricNumber(entry.value);

    if (value === undefined) {
      continue;
    }

    switch (type) {
      case "expected goals":
      case "expected goals xg":
      case "xg":
        xg = value;
        break;
      case "non penalty expected goals":
      case "non-penalty expected goals":
      case "npxg":
      case "non penalty xg":
        nonPenaltyXg = value;
        break;
      case "expected points":
      case "xpts":
        expectedPoints = value;
        break;
      case "expected goal difference":
      case "xg difference":
      case "xgd":
        expectedGoalDifference = value;
        break;
      default:
        break;
    }
  }

  // Never invent xGA from the opponent's xG — only map when the same block supplies it.
  return freezeMetrics({
    ...(xg === undefined ? {} : { xg }),
    ...(nonPenaltyXg === undefined ? {} : { nonPenaltyXg }),
    ...(expectedPoints === undefined ? {} : { expectedPoints }),
    ...(expectedGoalDifference === undefined ? {} : { expectedGoalDifference }),
  });
}

function freezeRecord(input: {
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly season?: string;
  readonly window: FootballExpectedGoalsWindow;
  readonly metrics: FootballExpectedGoalsMetrics;
  readonly observedAt: string;
  readonly providerMethod: FootballProviderMethod;
}): FootballExpectedGoalsRecord {
  const record: {
    teamId: string;
    teamName: string;
    teamSide: "away" | "home";
    competitionId?: string;
    competitionName?: string;
    season?: string;
    window: FootballExpectedGoalsWindow;
    metrics: FootballExpectedGoalsMetrics;
    observedAt: string;
    providerMethod: FootballProviderMethod;
  } = {
    teamId: input.teamId,
    teamName: input.teamName,
    teamSide: input.teamSide,
    window: input.window,
    metrics: input.metrics,
    observedAt: input.observedAt,
    providerMethod: input.providerMethod,
  };

  if (input.competitionId !== undefined) {
    record.competitionId = input.competitionId;
  }
  if (input.competitionName !== undefined) {
    record.competitionName = input.competitionName;
  }
  if (input.season !== undefined) {
    record.season = input.season;
  }

  return Object.freeze(record);
}

/**
 * Maps API-Football `/fixtures/statistics` Expected Goals fields when present.
 * Empty / missing → honest absence. Never estimates from shots or invents xGA.
 */
export function mapApiFootballFixtureExpectedGoals(
  body: unknown,
  options: {
    readonly homeTeamId: string;
    readonly homeTeamName: string;
    readonly awayTeamId: string;
    readonly awayTeamName: string;
    readonly competitionId?: string;
    readonly competitionName?: string;
    readonly season?: string | number;
    readonly observedAt: string;
    readonly providerMethod: FootballProviderMethod;
  },
): readonly FootballExpectedGoalsRecord[] {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return Object.freeze([]);
  }

  const season =
    options.season === undefined
      ? undefined
      : typeof options.season === "number"
        ? String(options.season)
        : options.season.trim().length > 0
          ? options.season.trim()
          : undefined;

  const records: FootballExpectedGoalsRecord[] = [];

  for (const entry of body.response) {
    if (!isRecord(entry)) {
      continue;
    }

    const team = isRecord(entry.team) ? entry.team : undefined;
    const teamIdNum = team !== undefined ? team.id : undefined;
    const teamId =
      typeof teamIdNum === "number" || typeof teamIdNum === "string"
        ? String(teamIdNum)
        : undefined;
    const teamName =
      team !== undefined &&
      typeof team.name === "string" &&
      team.name.trim().length > 0
        ? team.name.trim()
        : undefined;

    if (teamId === undefined) {
      continue;
    }

    const metrics = mapTeamStatisticsXg(entry.statistics);

    if (metrics === undefined) {
      continue;
    }

    let teamSide: "away" | "home" | undefined;
    let resolvedName: string | undefined;

    if (teamId === options.homeTeamId) {
      teamSide = "home";
      resolvedName = options.homeTeamName;
    } else if (teamId === options.awayTeamId) {
      teamSide = "away";
      resolvedName = options.awayTeamName;
    }

    if (teamSide === undefined || resolvedName === undefined) {
      continue;
    }

    records.push(
      freezeRecord({
        teamId,
        teamName: teamName ?? resolvedName,
        teamSide,
        ...(options.competitionId === undefined
          ? {}
          : { competitionId: options.competitionId }),
        ...(options.competitionName === undefined
          ? {}
          : { competitionName: options.competitionName }),
        ...(season === undefined ? {} : { season }),
        window: "fixture",
        metrics,
        observedAt: options.observedAt,
        providerMethod: options.providerMethod,
      }),
    );
  }

  return Object.freeze(records);
}
