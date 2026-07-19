import type {
  FootballH2H,
  FootballH2HMeeting,
  FootballProviderMethod,
} from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/**
 * Maps API-Football `/fixtures/headtohead` into FAS FootballH2H.
 */
export function mapApiFootballH2H(
  body: unknown,
  options: {
    readonly homeTeamId: string;
    readonly awayTeamId: string;
    readonly providerMethod: FootballProviderMethod;
    readonly maxMeetings?: number;
  },
): FootballH2H | undefined {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return undefined;
  }

  const maxMeetings = options.maxMeetings ?? 5;
  const meetings: FootballH2HMeeting[] = [];

  for (const item of body.response) {
    if (meetings.length >= maxMeetings) {
      break;
    }

    if (!isRecord(item)) {
      continue;
    }

    const fixture = isRecord(item.fixture) ? item.fixture : undefined;
    const goals = isRecord(item.goals) ? item.goals : undefined;
    const playedAt = asString(fixture?.date);
    const homeGoals = asNumber(goals?.home);
    const awayGoals = asNumber(goals?.away);

    if (
      playedAt === undefined ||
      homeGoals === undefined ||
      awayGoals === undefined
    ) {
      continue;
    }

    meetings.push(
      Object.freeze({
        playedAt,
        homeGoals,
        awayGoals,
      }),
    );
  }

  if (meetings.length === 0) {
    return undefined;
  }

  return Object.freeze({
    homeTeamId: options.homeTeamId,
    awayTeamId: options.awayTeamId,
    sampleSize: meetings.length,
    meetings: Object.freeze(meetings),
    providerMethod: options.providerMethod,
  });
}
