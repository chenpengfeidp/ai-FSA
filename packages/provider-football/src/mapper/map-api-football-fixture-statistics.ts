import type { FootballAdvancedTeamStats } from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asStatNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().replace(/%/g, "");
  if (trimmed.length === 0 || trimmed.toLowerCase() === "null") {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeType(type: string): string {
  return type.trim().toLowerCase().replace(/\s+/g, " ");
}

function freezeAdvanced(
  partial: Omit<FootballAdvancedTeamStats, "scope"> & {
    readonly scope: FootballAdvancedTeamStats["scope"];
  },
): FootballAdvancedTeamStats | undefined {
  const hasAny = [
    partial.shotsTotal,
    partial.shotsOnTarget,
    partial.shotsOffTarget,
    partial.possessionPct,
    partial.corners,
    partial.yellowCards,
    partial.redCards,
    partial.attacks,
    partial.dangerousAttacks,
    partial.fouls,
    partial.saves,
    partial.passingAccuracyPct,
  ].some((value) => value !== undefined);

  if (!hasAny) {
    return undefined;
  }

  return Object.freeze({
    scope: partial.scope,
    shotsTotal: partial.shotsTotal,
    shotsOnTarget: partial.shotsOnTarget,
    shotsOffTarget: partial.shotsOffTarget,
    possessionPct: partial.possessionPct,
    corners: partial.corners,
    yellowCards: partial.yellowCards,
    redCards: partial.redCards,
    attacks: partial.attacks,
    dangerousAttacks: partial.dangerousAttacks,
    fouls: partial.fouls,
    saves: partial.saves,
    passingAccuracyPct: partial.passingAccuracyPct,
  });
}

function mapTeamStatisticsBlock(
  statistics: unknown,
): FootballAdvancedTeamStats | undefined {
  if (!Array.isArray(statistics)) {
    return undefined;
  }

  let shotsTotal: number | undefined;
  let shotsOnTarget: number | undefined;
  let shotsOffTarget: number | undefined;
  let possessionPct: number | undefined;
  let corners: number | undefined;
  let yellowCards: number | undefined;
  let redCards: number | undefined;
  let attacks: number | undefined;
  let dangerousAttacks: number | undefined;
  let fouls: number | undefined;
  let saves: number | undefined;
  let passingAccuracyPct: number | undefined;

  for (const entry of statistics) {
    if (!isRecord(entry) || typeof entry.type !== "string") {
      continue;
    }

    const type = normalizeType(entry.type);
    const value = asStatNumber(entry.value);

    if (value === undefined) {
      continue;
    }

    switch (type) {
      case "total shots":
      case "shots total":
        shotsTotal = value;
        break;
      case "shots on goal":
      case "shots on target":
        shotsOnTarget = value;
        break;
      case "shots off goal":
      case "shots off target":
        shotsOffTarget = value;
        break;
      case "ball possession":
      case "possession":
        possessionPct = value;
        break;
      case "corner kicks":
      case "corners":
        corners = value;
        break;
      case "yellow cards":
        yellowCards = value;
        break;
      case "red cards":
        redCards = value;
        break;
      case "attacks":
        attacks = value;
        break;
      case "dangerous attacks":
        dangerousAttacks = value;
        break;
      case "fouls":
        fouls = value;
        break;
      case "goalkeeper saves":
      case "saves":
        saves = value;
        break;
      case "passes %":
      case "passes%":
      case "pass accuracy":
      case "passing accuracy":
        passingAccuracyPct = value;
        break;
      default:
        break;
    }
  }

  return freezeAdvanced({
    scope: "fixture",
    shotsTotal,
    shotsOnTarget,
    shotsOffTarget,
    possessionPct,
    corners,
    yellowCards,
    redCards,
    attacks,
    dangerousAttacks,
    fouls,
    saves,
    passingAccuracyPct,
  });
}

export interface FixtureAdvancedStatisticsPair {
  readonly home: FootballAdvancedTeamStats | undefined;
  readonly away: FootballAdvancedTeamStats | undefined;
}

/**
 * Maps API-Football `/fixtures/statistics` into confirmed advanced measurements.
 * Empty / missing response → honest absence (never fabricate).
 */
export function mapApiFootballFixtureStatistics(
  body: unknown,
  options: {
    readonly homeTeamId: string;
    readonly awayTeamId: string;
  },
): FixtureAdvancedStatisticsPair | undefined {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return undefined;
  }

  let home: FootballAdvancedTeamStats | undefined;
  let away: FootballAdvancedTeamStats | undefined;

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

    if (teamId === undefined) {
      continue;
    }

    const advanced = mapTeamStatisticsBlock(entry.statistics);

    if (teamId === options.homeTeamId) {
      home = advanced;
    } else if (teamId === options.awayTeamId) {
      away = advanced;
    }
  }

  if (home === undefined && away === undefined) {
    return undefined;
  }

  return Object.freeze({ home, away });
}
