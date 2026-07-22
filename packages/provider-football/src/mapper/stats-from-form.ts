import type {
  FootballTeamForm,
  FootballTeamStats,
} from "../domain/football-models.js";

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Explicit F.1 fallback when API-Football team statistics lack shots.
 * True xG remains F.1.1; this is goals-implied only.
 */
export function statsFromFormGoals(form: FootballTeamForm): FootballTeamStats {
  return Object.freeze({
    teamId: form.teamId,
    teamName: form.teamName,
    teamSide: form.teamSide,
    windowMatches: form.window,
    shotsForPerMatch: mean(form.goalsFor),
    shotsAgainstPerMatch: mean(form.goalsAgainst),
    xgForPerMatch: 0,
    xgAgainstPerMatch: 0,
    providerMethod: form.providerMethod,
    statsBasis: "goals-proxy-fallback" as const,
    // Goals-proxy must not invent advanced statistics.
    advanced: undefined,
  });
}
