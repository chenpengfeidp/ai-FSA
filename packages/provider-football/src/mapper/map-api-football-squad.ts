import type {
  FootballPlayer,
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

/**
 * Maps API-Football `/players/squads` response into basic FootballPlayer rows.
 * Does not map statistics, ratings, injuries, or lineups.
 */
export function mapApiFootballSquadResponse(
  body: unknown,
  options: {
    readonly teamId: string;
    readonly teamName: string;
    readonly teamSide: "away" | "home";
    readonly providerMethod: FootballProviderMethod;
    /** Cap for private demos / free-tier friendliness; undefined = all. */
    readonly maxPlayers?: number;
  },
): readonly FootballPlayer[] {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return Object.freeze([]);
  }

  const first = body.response[0];
  if (!isRecord(first) || !Array.isArray(first.players)) {
    return Object.freeze([]);
  }

  const players: FootballPlayer[] = [];

  for (const entry of first.players) {
    if (!isRecord(entry)) {
      continue;
    }

    const playerIdNum = asNumber(entry.id);
    const name = asString(entry.name);

    if (playerIdNum === undefined || name === undefined) {
      continue;
    }

    players.push(
      Object.freeze({
        playerId: String(playerIdNum),
        name,
        teamId: options.teamId,
        teamName: options.teamName,
        teamSide: options.teamSide,
        position: asString(entry.position),
        number: asNumber(entry.number),
        age: undefined,
        nationality: asString(entry.nationality),
        photoUrl: asString(entry.photo),
        captain: undefined,
        availabilityStatus: undefined,
        matchSquadStatus: undefined,
        seasonStats: undefined,
        providerMethod: options.providerMethod,
      }),
    );

    if (options.maxPlayers !== undefined && players.length >= options.maxPlayers) {
      break;
    }
  }

  return Object.freeze(players);
}
