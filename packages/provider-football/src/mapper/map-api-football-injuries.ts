import type {
  FootballAvailabilityAbsence,
  FootballAvailabilityKind,
  FootballProviderMethod,
} from "../domain/football-models.js";

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

function classifyKind(
  typeRaw: string | undefined,
): FootballAvailabilityKind | undefined {
  if (typeRaw === undefined) {
    return undefined;
  }

  const normalized = typeRaw.trim().toLowerCase();

  if (normalized.includes("suspension")) {
    return "suspension";
  }

  if (normalized.includes("injury")) {
    return "injury";
  }

  // Honest: do not invent a kind for unknown provider type strings.
  return undefined;
}

function resolveTeamSide(
  teamId: string,
  homeTeamId: string,
  awayTeamId: string,
): "away" | "home" | undefined {
  if (teamId === homeTeamId) {
    return "home";
  }

  if (teamId === awayTeamId) {
    return "away";
  }

  return undefined;
}

/**
 * Maps API-Football `/injuries` response into FAS availability absences.
 * Skips rows with unknown type (no guess). Empty response → empty list.
 */
export function mapApiFootballInjuriesResponse(
  body: unknown,
  options: {
    readonly homeTeamId: string;
    readonly awayTeamId: string;
    readonly providerMethod: FootballProviderMethod;
  },
): readonly FootballAvailabilityAbsence[] {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return Object.freeze([]);
  }

  const absences: FootballAvailabilityAbsence[] = [];

  for (const entry of body.response) {
    if (!isRecord(entry)) {
      continue;
    }

    const player = isRecord(entry.player) ? entry.player : undefined;
    const team = isRecord(entry.team) ? entry.team : undefined;

    if (player === undefined || team === undefined) {
      continue;
    }

    const playerIdNum = asNumber(player.id);
    const playerName = asString(player.name);
    const teamIdNum = asNumber(team.id);
    const teamName = asString(team.name);
    const kind = classifyKind(asString(entry.type));

    if (
      playerIdNum === undefined ||
      playerName === undefined ||
      teamIdNum === undefined ||
      teamName === undefined ||
      kind === undefined
    ) {
      continue;
    }

    const teamId = String(teamIdNum);
    const teamSide = resolveTeamSide(teamId, options.homeTeamId, options.awayTeamId);

    if (teamSide === undefined) {
      continue;
    }

    absences.push(
      Object.freeze({
        playerId: String(playerIdNum),
        playerName,
        teamId,
        teamName,
        teamSide,
        kind,
        reason: asString(entry.reason),
        providerMethod: options.providerMethod,
      }),
    );
  }

  return Object.freeze(absences);
}
