import type { FootballClubManagerFact } from "../domain/football-club-intelligence.js";
import type { FootballClubIntelligenceSide } from "../domain/football-club-intelligence.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function utcDayStamp(iso: string): number | undefined {
  const trimmed = iso.trim();
  if (trimmed.length < 10) {
    return undefined;
  }

  const day = trimmed.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const millis = Date.UTC(year, month - 1, date);
  return Number.isFinite(millis) ? millis : undefined;
}

function tenureDays(startDate: string, observedAt: string): number | undefined {
  const start = utcDayStamp(startDate);
  const observed = utcDayStamp(observedAt);
  if (start === undefined || observed === undefined || observed < start) {
    return undefined;
  }

  return Math.floor((observed - start) / 86_400_000);
}

/**
 * Maps API-Football `/coachs?team=` into optional manager facts for one side.
 * Empty / incomplete → undefined (honest absence). Never invents tenure.
 */
export function mapApiFootballCoachResponse(
  body: unknown,
  options: {
    readonly teamId: string;
    readonly teamSide: FootballClubIntelligenceSide;
    readonly observedAt: string;
  },
): FootballClubManagerFact | undefined {
  if (
    !isRecord(body) ||
    !Array.isArray(body.response) ||
    body.response.length === 0
  ) {
    return undefined;
  }

  const coach = body.response[0];
  if (!isRecord(coach)) {
    return undefined;
  }

  const managerName =
    asString(coach.name) ??
    [asString(coach.firstname), asString(coach.lastname)]
      .filter((part): part is string => part !== undefined)
      .join(" ");

  if (managerName.length === 0) {
    return undefined;
  }

  let managerStartDate: string | undefined;

  if (Array.isArray(coach.career)) {
    for (const entry of coach.career) {
      if (!isRecord(entry)) {
        continue;
      }

      const team = isRecord(entry.team) ? entry.team : undefined;
      const careerTeamId = asNumber(team?.id);
      const end = entry.end;
      const start = asString(entry.start);

      if (
        careerTeamId !== undefined &&
        String(careerTeamId) === options.teamId &&
        (end === null || end === undefined) &&
        start !== undefined
      ) {
        managerStartDate = start.length >= 10 ? start.slice(0, 10) : start;
        break;
      }
    }
  }

  const managerTenureDays =
    managerStartDate === undefined
      ? undefined
      : tenureDays(managerStartDate, options.observedAt);

  return Object.freeze({
    teamId: options.teamId,
    teamSide: options.teamSide,
    managerName,
    ...(managerStartDate === undefined ? {} : { managerStartDate }),
    ...(managerTenureDays === undefined ? {} : { managerTenureDays }),
  });
}

/**
 * Maps coach name from a `/fixtures/lineups` team entry when present.
 */
export function mapCoachNameFromLineupEntry(entry: unknown): string | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const coach = isRecord(entry.coach) ? entry.coach : undefined;
  return asString(coach?.name);
}
