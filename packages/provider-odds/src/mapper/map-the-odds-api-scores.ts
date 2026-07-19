import type { CompletedScoreline, ScoresProviderMethod } from "../domain/scores.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonNegativeInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return undefined;
}

/** Maps The Odds API `/scores` array into completed scorelines only. */
export function mapTheOddsApiScores(
  body: unknown,
  _providerMethod: ScoresProviderMethod,
): readonly CompletedScoreline[] {
  if (!Array.isArray(body)) {
    return Object.freeze([]);
  }

  const rows: CompletedScoreline[] = [];

  for (const item of body) {
    if (!isRecord(item) || item.completed !== true || !Array.isArray(item.scores)) {
      continue;
    }

    const eventId = typeof item.id === "string" ? item.id.trim() : "";
    const homeTeam = typeof item.home_team === "string" ? item.home_team.trim() : "";
    const awayTeam = typeof item.away_team === "string" ? item.away_team.trim() : "";
    const commenceTime =
      typeof item.commence_time === "string" ? item.commence_time.trim() : "";

    if (
      eventId.length === 0 ||
      homeTeam.length === 0 ||
      awayTeam.length === 0 ||
      commenceTime.length === 0
    ) {
      continue;
    }

    let homeGoals: number | undefined;
    let awayGoals: number | undefined;

    for (const score of item.scores) {
      if (!isRecord(score) || typeof score.name !== "string") {
        continue;
      }

      const goals = asNonNegativeInt(score.score);

      if (goals === undefined) {
        continue;
      }

      if (score.name === homeTeam) {
        homeGoals = goals;
      } else if (score.name === awayTeam) {
        awayGoals = goals;
      }
    }

    if (homeGoals === undefined || awayGoals === undefined) {
      continue;
    }

    rows.push(
      Object.freeze({
        eventId,
        commenceTime,
        homeTeam,
        awayTeam,
        homeGoals,
        awayGoals,
      }),
    );
  }

  return Object.freeze(
    [...rows].sort((left, right) =>
      right.commenceTime.localeCompare(left.commenceTime),
    ),
  );
}
