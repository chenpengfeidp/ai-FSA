import type {
  FootballLineupPlayer,
  FootballProviderMethod,
  FootballTeamLineup,
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

function mapLineupPlayer(entry: unknown): FootballLineupPlayer | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const player = isRecord(entry.player) ? entry.player : entry;
  const playerIdNum = asNumber(player.id);
  const name = asString(player.name);

  if (playerIdNum === undefined || name === undefined) {
    return undefined;
  }

  return Object.freeze({
    playerId: String(playerIdNum),
    name,
    number: asNumber(player.number),
    position: asString(player.pos) ?? asString(player.position),
    grid: asString(player.grid),
  });
}

function mapPlayerRows(value: unknown): readonly FootballLineupPlayer[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }

  const players: FootballLineupPlayer[] = [];

  for (const entry of value) {
    const mapped = mapLineupPlayer(entry);

    if (mapped !== undefined) {
      players.push(mapped);
    }
  }

  return Object.freeze(players);
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
 * Maps API-Football `/fixtures/lineups` into confirmed team sheets.
 * Empty / incomplete provider response → empty list (honest absence).
 * Never invents Expected Lineup.
 */
export function mapApiFootballLineupsResponse(
  body: unknown,
  options: {
    readonly homeTeamId: string;
    readonly awayTeamId: string;
    readonly providerMethod: FootballProviderMethod;
  },
): readonly FootballTeamLineup[] {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return Object.freeze([]);
  }

  const lineups: FootballTeamLineup[] = [];

  for (const entry of body.response) {
    if (!isRecord(entry)) {
      continue;
    }

    const team = isRecord(entry.team) ? entry.team : undefined;
    const teamIdNum = asNumber(team?.id);
    const teamName = asString(team?.name);

    if (teamIdNum === undefined || teamName === undefined) {
      continue;
    }

    const teamId = String(teamIdNum);
    const teamSide = resolveTeamSide(teamId, options.homeTeamId, options.awayTeamId);

    if (teamSide === undefined) {
      continue;
    }

    const startXI = mapPlayerRows(entry.startXI);

    // Confirmed sheet requires a published starting XI — never fabricate.
    if (startXI.length === 0) {
      continue;
    }

    lineups.push(
      Object.freeze({
        teamId,
        teamName,
        teamSide,
        formation: asString(entry.formation),
        startXI,
        substitutes: mapPlayerRows(entry.substitutes),
        providerMethod: options.providerMethod,
      }),
    );
  }

  return Object.freeze(lineups);
}
