import type {
  FootballClubIntelligenceMetrics,
  FootballClubIntelligenceRecord,
  FootballClubManagerFact,
} from "../domain/football-club-intelligence.js";
import type {
  FootballProviderMethod,
  FootballStandingRow,
  FootballStandings,
} from "../domain/football-models.js";

function freezeMetrics(
  partial: FootballClubIntelligenceMetrics,
): FootballClubIntelligenceMetrics | undefined {
  const metrics: {
    leagueRank?: number;
    leaguePoints?: number;
    goalDifference?: number;
    goalsScored?: number;
    goalsConceded?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    played?: number;
    homePlayed?: number;
    homeWins?: number;
    homeDraws?: number;
    homeLosses?: number;
    homeGoalsScored?: number;
    homeGoalsConceded?: number;
    awayPlayed?: number;
    awayWins?: number;
    awayDraws?: number;
    awayLosses?: number;
    awayGoalsScored?: number;
    awayGoalsConceded?: number;
    currentForm?: string;
    promotionRelegationStatus?: string;
    managerName?: string;
    managerStartDate?: string;
    managerTenureDays?: number;
  } = {};

  if (partial.leagueRank !== undefined) metrics.leagueRank = partial.leagueRank;
  if (partial.leaguePoints !== undefined)
    metrics.leaguePoints = partial.leaguePoints;
  if (partial.goalDifference !== undefined) {
    metrics.goalDifference = partial.goalDifference;
  }
  if (partial.goalsScored !== undefined) metrics.goalsScored = partial.goalsScored;
  if (partial.goalsConceded !== undefined) {
    metrics.goalsConceded = partial.goalsConceded;
  }
  if (partial.wins !== undefined) metrics.wins = partial.wins;
  if (partial.draws !== undefined) metrics.draws = partial.draws;
  if (partial.losses !== undefined) metrics.losses = partial.losses;
  if (partial.played !== undefined) metrics.played = partial.played;
  if (partial.homePlayed !== undefined) metrics.homePlayed = partial.homePlayed;
  if (partial.homeWins !== undefined) metrics.homeWins = partial.homeWins;
  if (partial.homeDraws !== undefined) metrics.homeDraws = partial.homeDraws;
  if (partial.homeLosses !== undefined) metrics.homeLosses = partial.homeLosses;
  if (partial.homeGoalsScored !== undefined) {
    metrics.homeGoalsScored = partial.homeGoalsScored;
  }
  if (partial.homeGoalsConceded !== undefined) {
    metrics.homeGoalsConceded = partial.homeGoalsConceded;
  }
  if (partial.awayPlayed !== undefined) metrics.awayPlayed = partial.awayPlayed;
  if (partial.awayWins !== undefined) metrics.awayWins = partial.awayWins;
  if (partial.awayDraws !== undefined) metrics.awayDraws = partial.awayDraws;
  if (partial.awayLosses !== undefined) metrics.awayLosses = partial.awayLosses;
  if (partial.awayGoalsScored !== undefined) {
    metrics.awayGoalsScored = partial.awayGoalsScored;
  }
  if (partial.awayGoalsConceded !== undefined) {
    metrics.awayGoalsConceded = partial.awayGoalsConceded;
  }
  if (partial.currentForm !== undefined && partial.currentForm.trim().length > 0) {
    metrics.currentForm = partial.currentForm.trim();
  }
  if (
    partial.promotionRelegationStatus !== undefined &&
    partial.promotionRelegationStatus.trim().length > 0
  ) {
    metrics.promotionRelegationStatus = partial.promotionRelegationStatus.trim();
  }
  if (partial.managerName !== undefined && partial.managerName.trim().length > 0) {
    metrics.managerName = partial.managerName.trim();
  }
  if (
    partial.managerStartDate !== undefined &&
    partial.managerStartDate.trim().length > 0
  ) {
    metrics.managerStartDate = partial.managerStartDate.trim();
  }
  if (partial.managerTenureDays !== undefined) {
    metrics.managerTenureDays = partial.managerTenureDays;
  }

  if (Object.keys(metrics).length === 0) {
    return undefined;
  }

  return Object.freeze(metrics);
}

function metricsFromStandingRow(
  row: FootballStandingRow,
  manager: FootballClubManagerFact | undefined,
): FootballClubIntelligenceMetrics | undefined {
  const goalDifference =
    row.goalsDiff !== undefined ? row.goalsDiff : row.goalsFor - row.goalsAgainst;

  return freezeMetrics({
    leagueRank: row.rank,
    leaguePoints: row.points,
    goalDifference,
    goalsScored: row.goalsFor,
    goalsConceded: row.goalsAgainst,
    wins: row.won,
    draws: row.drawn,
    losses: row.lost,
    played: row.played,
    ...(row.home === undefined
      ? {}
      : {
          homePlayed: row.home.played,
          homeWins: row.home.won,
          homeDraws: row.home.drawn,
          homeLosses: row.home.lost,
          homeGoalsScored: row.home.goalsFor,
          homeGoalsConceded: row.home.goalsAgainst,
        }),
    ...(row.away === undefined
      ? {}
      : {
          awayPlayed: row.away.played,
          awayWins: row.away.won,
          awayDraws: row.away.drawn,
          awayLosses: row.away.lost,
          awayGoalsScored: row.away.goalsFor,
          awayGoalsConceded: row.away.goalsAgainst,
        }),
    ...(row.form === undefined ? {} : { currentForm: row.form }),
    ...(row.description === undefined
      ? {}
      : { promotionRelegationStatus: row.description }),
    ...(manager?.managerName === undefined
      ? {}
      : { managerName: manager.managerName }),
    ...(manager?.managerStartDate === undefined
      ? {}
      : { managerStartDate: manager.managerStartDate }),
    ...(manager?.managerTenureDays === undefined
      ? {}
      : { managerTenureDays: manager.managerTenureDays }),
  });
}

/**
 * Builds Club Intelligence records for the match sides from standings + optional managers.
 * Missing standing row for a side → no record (honest absence).
 */
export function mapClubIntelligenceFromStandings(
  standings: FootballStandings | undefined,
  options: {
    readonly homeTeamId: string;
    readonly awayTeamId: string;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly observedAt: string;
    readonly providerMethod: FootballProviderMethod;
    readonly managers?: readonly FootballClubManagerFact[];
  },
): readonly FootballClubIntelligenceRecord[] {
  if (standings === undefined) {
    return Object.freeze([]);
  }

  const managersByTeamId = new Map<string, FootballClubManagerFact>();
  for (const manager of options.managers ?? []) {
    managersByTeamId.set(manager.teamId, manager);
  }

  const sides = [
    {
      teamId: options.homeTeamId,
      teamName: options.homeTeamName,
      teamSide: "home" as const,
    },
    {
      teamId: options.awayTeamId,
      teamName: options.awayTeamName,
      teamSide: "away" as const,
    },
  ];

  const records: FootballClubIntelligenceRecord[] = [];

  for (const side of sides) {
    const row = standings.rows.find((entry) => entry.teamId === side.teamId);
    if (row === undefined) {
      continue;
    }

    const metrics = metricsFromStandingRow(row, managersByTeamId.get(side.teamId));
    if (metrics === undefined) {
      continue;
    }

    records.push(
      Object.freeze({
        teamId: side.teamId,
        teamName: side.teamName,
        teamSide: side.teamSide,
        competitionId: standings.competitionId,
        competitionName: standings.competitionName,
        season: String(standings.season),
        window: "season",
        metrics,
        observedAt: options.observedAt,
        providerMethod: options.providerMethod,
      }),
    );
  }

  return Object.freeze(records);
}
