import type {
  CompletedScoreline,
  ScoresProviderMethod,
  TeamFormSide,
  TeamStatisticsSide,
} from "../domain/scores.js";

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildTeamFormFromScores(
  teamName: string,
  teamSide: "away" | "home",
  scorelines: readonly CompletedScoreline[],
  options: {
    readonly providerMethod: ScoresProviderMethod;
    readonly maxWindow?: number;
  },
): TeamFormSide | undefined {
  const maxWindow = options.maxWindow ?? 5;
  const results: Array<"D" | "L" | "W"> = [];
  const goalsFor: number[] = [];
  const goalsAgainst: number[] = [];

  for (const game of scorelines) {
    if (results.length >= maxWindow) {
      break;
    }

    const isHome = game.homeTeam === teamName;
    const isAway = game.awayTeam === teamName;

    if (!isHome && !isAway) {
      continue;
    }

    const gf = isHome ? game.homeGoals : game.awayGoals;
    const ga = isHome ? game.awayGoals : game.homeGoals;
    const result: "D" | "L" | "W" = gf > ga ? "W" : gf < ga ? "L" : "D";

    results.push(result);
    goalsFor.push(gf);
    goalsAgainst.push(ga);
  }

  if (results.length === 0) {
    return undefined;
  }

  return Object.freeze({
    teamSide,
    window: results.length,
    results: Object.freeze(results),
    goalsFor: Object.freeze(goalsFor),
    goalsAgainst: Object.freeze(goalsAgainst),
    providerSource: "the-odds-api",
    providerSourceId: `scores:${teamName}:form`,
    providerMethod: options.providerMethod,
  });
}

/**
 * Odds scores have no shots/xG. Map mean goals into the STATISTICS numeric
 * fields and label provenance as scores-goals-proxy.
 */
export function buildGoalsProxyStatistics(form: TeamFormSide): TeamStatisticsSide {
  const shotsForPerMatch = mean(form.goalsFor);
  const shotsAgainstPerMatch = mean(form.goalsAgainst);

  return Object.freeze({
    teamSide: form.teamSide,
    windowMatches: form.window,
    shotsForPerMatch,
    shotsAgainstPerMatch,
    xgForPerMatch: shotsForPerMatch,
    xgAgainstPerMatch: shotsAgainstPerMatch,
    providerSource: "the-odds-api",
    providerSourceId: `scores:${form.providerSourceId}:goals-proxy`,
    providerMethod: "scores-goals-proxy",
  });
}

export function buildFormAndStatsForMatch(input: {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly scorelines: readonly CompletedScoreline[];
  readonly providerMethod: ScoresProviderMethod;
}):
  | {
      readonly teamForm: readonly [TeamFormSide, TeamFormSide];
      readonly statistics: readonly [TeamStatisticsSide, TeamStatisticsSide];
    }
  | undefined {
  const homeForm = buildTeamFormFromScores(
    input.homeTeam,
    "home",
    input.scorelines,
    { providerMethod: input.providerMethod },
  );
  const awayForm = buildTeamFormFromScores(
    input.awayTeam,
    "away",
    input.scorelines,
    { providerMethod: input.providerMethod },
  );

  if (homeForm === undefined || awayForm === undefined) {
    return undefined;
  }

  return Object.freeze({
    teamForm: Object.freeze([homeForm, awayForm] as const),
    statistics: Object.freeze([
      buildGoalsProxyStatistics(homeForm),
      buildGoalsProxyStatistics(awayForm),
    ] as const),
  });
}
