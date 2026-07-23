import type { FootballClubIntelligenceRecord } from "../domain/football-club-intelligence.js";
import type { FootballExpectedGoalsRecord } from "../domain/football-expected-goals.js";
import type { FootballMatchContextRecord } from "../domain/football-match-context.js";
import type {
  FootballAdvancedTeamStats,
  FootballFormSplit,
  FootballMatchBundle,
  FootballTeamForm,
  FootballTeamStats,
} from "../domain/football-models.js";

function freezeExpectedGoalsMetrics(
  metrics: FootballExpectedGoalsRecord["metrics"],
): unknown {
  return Object.freeze({
    ...(metrics.xg === undefined ? {} : { xg: metrics.xg }),
    ...(metrics.xga === undefined ? {} : { xga: metrics.xga }),
    ...(metrics.nonPenaltyXg === undefined
      ? {}
      : { nonPenaltyXg: metrics.nonPenaltyXg }),
    ...(metrics.nonPenaltyXga === undefined
      ? {}
      : { nonPenaltyXga: metrics.nonPenaltyXga }),
    ...(metrics.expectedPoints === undefined
      ? {}
      : { expectedPoints: metrics.expectedPoints }),
    ...(metrics.expectedGoalDifference === undefined
      ? {}
      : { expectedGoalDifference: metrics.expectedGoalDifference }),
  });
}

function toExpectedGoalsShape(
  record: FootballExpectedGoalsRecord,
  fixtureKey: string,
): unknown {
  return Object.freeze({
    teamId: record.teamId,
    teamName: record.teamName,
    teamSide: record.teamSide,
    ...(record.competitionId === undefined
      ? {}
      : { competitionId: record.competitionId }),
    ...(record.competitionName === undefined
      ? {}
      : { competitionName: record.competitionName }),
    ...(record.season === undefined ? {} : { season: record.season }),
    window: record.window,
    metrics: freezeExpectedGoalsMetrics(record.metrics),
    observedAt: record.observedAt,
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:xg:${record.teamSide}:${record.window}`,
    providerMethod: record.providerMethod,
  });
}

function freezeMatchContextMetrics(
  metrics: FootballMatchContextRecord["metrics"],
): unknown {
  return Object.freeze({
    ...(metrics.restDays === undefined ? {} : { restDays: metrics.restDays }),
    ...(metrics.daysSinceLastMatch === undefined
      ? {}
      : { daysSinceLastMatch: metrics.daysSinceLastMatch }),
    ...(metrics.daysUntilNextMatch === undefined
      ? {}
      : { daysUntilNextMatch: metrics.daysUntilNextMatch }),
    ...(metrics.matchesInLast7Days === undefined
      ? {}
      : { matchesInLast7Days: metrics.matchesInLast7Days }),
    ...(metrics.matchesInLast14Days === undefined
      ? {}
      : { matchesInLast14Days: metrics.matchesInLast14Days }),
    ...(metrics.fixtureCongestion === undefined
      ? {}
      : { fixtureCongestion: metrics.fixtureCongestion }),
    ...(metrics.homeAwayContext === undefined
      ? {}
      : { homeAwayContext: metrics.homeAwayContext }),
    ...(metrics.travelContext === undefined
      ? {}
      : { travelContext: metrics.travelContext }),
    ...(metrics.venueCity === undefined ? {} : { venueCity: metrics.venueCity }),
    ...(metrics.competitionKind === undefined
      ? {}
      : { competitionKind: metrics.competitionKind }),
    ...(metrics.competitionTypeLabel === undefined
      ? {}
      : { competitionTypeLabel: metrics.competitionTypeLabel }),
    ...(metrics.isKnockout === undefined ? {} : { isKnockout: metrics.isKnockout }),
    ...(metrics.roundLabel === undefined ? {} : { roundLabel: metrics.roundLabel }),
    ...(metrics.leg === undefined ? {} : { leg: metrics.leg }),
    ...(metrics.aggregateScore === undefined
      ? {}
      : { aggregateScore: metrics.aggregateScore }),
  });
}

function toMatchContextShape(
  record: FootballMatchContextRecord,
  fixtureKey: string,
): unknown {
  return Object.freeze({
    teamId: record.teamId,
    teamName: record.teamName,
    teamSide: record.teamSide,
    matchId: record.matchId,
    ...(record.competitionId === undefined
      ? {}
      : { competitionId: record.competitionId }),
    ...(record.competitionName === undefined
      ? {}
      : { competitionName: record.competitionName }),
    ...(record.season === undefined ? {} : { season: record.season }),
    metrics: freezeMatchContextMetrics(record.metrics),
    observedAt: record.observedAt,
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:context:${record.teamSide}`,
    providerMethod: record.providerMethod,
  });
}

function freezeClubIntelligenceMetrics(
  metrics: FootballClubIntelligenceRecord["metrics"],
): unknown {
  return Object.freeze({
    ...(metrics.leagueRank === undefined ? {} : { leagueRank: metrics.leagueRank }),
    ...(metrics.leaguePoints === undefined
      ? {}
      : { leaguePoints: metrics.leaguePoints }),
    ...(metrics.goalDifference === undefined
      ? {}
      : { goalDifference: metrics.goalDifference }),
    ...(metrics.goalsScored === undefined
      ? {}
      : { goalsScored: metrics.goalsScored }),
    ...(metrics.goalsConceded === undefined
      ? {}
      : { goalsConceded: metrics.goalsConceded }),
    ...(metrics.wins === undefined ? {} : { wins: metrics.wins }),
    ...(metrics.draws === undefined ? {} : { draws: metrics.draws }),
    ...(metrics.losses === undefined ? {} : { losses: metrics.losses }),
    ...(metrics.played === undefined ? {} : { played: metrics.played }),
    ...(metrics.homePlayed === undefined ? {} : { homePlayed: metrics.homePlayed }),
    ...(metrics.homeWins === undefined ? {} : { homeWins: metrics.homeWins }),
    ...(metrics.homeDraws === undefined ? {} : { homeDraws: metrics.homeDraws }),
    ...(metrics.homeLosses === undefined ? {} : { homeLosses: metrics.homeLosses }),
    ...(metrics.homeGoalsScored === undefined
      ? {}
      : { homeGoalsScored: metrics.homeGoalsScored }),
    ...(metrics.homeGoalsConceded === undefined
      ? {}
      : { homeGoalsConceded: metrics.homeGoalsConceded }),
    ...(metrics.awayPlayed === undefined ? {} : { awayPlayed: metrics.awayPlayed }),
    ...(metrics.awayWins === undefined ? {} : { awayWins: metrics.awayWins }),
    ...(metrics.awayDraws === undefined ? {} : { awayDraws: metrics.awayDraws }),
    ...(metrics.awayLosses === undefined ? {} : { awayLosses: metrics.awayLosses }),
    ...(metrics.awayGoalsScored === undefined
      ? {}
      : { awayGoalsScored: metrics.awayGoalsScored }),
    ...(metrics.awayGoalsConceded === undefined
      ? {}
      : { awayGoalsConceded: metrics.awayGoalsConceded }),
    ...(metrics.currentForm === undefined
      ? {}
      : { currentForm: metrics.currentForm }),
    ...(metrics.promotionRelegationStatus === undefined
      ? {}
      : { promotionRelegationStatus: metrics.promotionRelegationStatus }),
    ...(metrics.managerName === undefined
      ? {}
      : { managerName: metrics.managerName }),
    ...(metrics.managerStartDate === undefined
      ? {}
      : { managerStartDate: metrics.managerStartDate }),
    ...(metrics.managerTenureDays === undefined
      ? {}
      : { managerTenureDays: metrics.managerTenureDays }),
  });
}

function toClubIntelligenceShape(
  record: FootballClubIntelligenceRecord,
  fixtureKey: string,
): unknown {
  return Object.freeze({
    teamId: record.teamId,
    teamName: record.teamName,
    teamSide: record.teamSide,
    ...(record.competitionId === undefined
      ? {}
      : { competitionId: record.competitionId }),
    ...(record.competitionName === undefined
      ? {}
      : { competitionName: record.competitionName }),
    ...(record.season === undefined ? {} : { season: record.season }),
    window: record.window,
    metrics: freezeClubIntelligenceMetrics(record.metrics),
    observedAt: record.observedAt,
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:club:${record.teamSide}:${record.window}`,
    providerMethod: record.providerMethod,
  });
}

function freezeAdvancedShape(
  advanced: FootballAdvancedTeamStats | undefined,
): unknown {
  if (advanced === undefined) {
    return undefined;
  }

  return Object.freeze({
    scope: advanced.scope,
    ...(advanced.shotsTotal === undefined
      ? {}
      : { shotsTotal: advanced.shotsTotal }),
    ...(advanced.shotsOnTarget === undefined
      ? {}
      : { shotsOnTarget: advanced.shotsOnTarget }),
    ...(advanced.shotsOffTarget === undefined
      ? {}
      : { shotsOffTarget: advanced.shotsOffTarget }),
    ...(advanced.possessionPct === undefined
      ? {}
      : { possessionPct: advanced.possessionPct }),
    ...(advanced.corners === undefined ? {} : { corners: advanced.corners }),
    ...(advanced.yellowCards === undefined
      ? {}
      : { yellowCards: advanced.yellowCards }),
    ...(advanced.redCards === undefined ? {} : { redCards: advanced.redCards }),
    ...(advanced.attacks === undefined ? {} : { attacks: advanced.attacks }),
    ...(advanced.dangerousAttacks === undefined
      ? {}
      : { dangerousAttacks: advanced.dangerousAttacks }),
    ...(advanced.fouls === undefined ? {} : { fouls: advanced.fouls }),
    ...(advanced.saves === undefined ? {} : { saves: advanced.saves }),
    ...(advanced.passingAccuracyPct === undefined
      ? {}
      : { passingAccuracyPct: advanced.passingAccuracyPct }),
  });
}

function toStatisticsShape(stats: FootballTeamStats, fixtureKey: string): unknown {
  const advanced = freezeAdvancedShape(stats.advanced);

  return Object.freeze({
    teamSide: stats.teamSide,
    windowMatches: stats.windowMatches,
    shotsForPerMatch: stats.shotsForPerMatch,
    shotsAgainstPerMatch: stats.shotsAgainstPerMatch,
    xgForPerMatch: stats.xgForPerMatch,
    xgAgainstPerMatch: stats.xgAgainstPerMatch,
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:stats:${stats.teamSide}:${stats.statsBasis}`,
    providerMethod: stats.providerMethod,
    statsBasis: stats.statsBasis,
    ...(advanced === undefined ? {} : { advanced }),
  });
}

function freezeSplitShape(split: FootballFormSplit | undefined): unknown {
  if (split === undefined) {
    return undefined;
  }

  return Object.freeze({
    window: split.window,
    results: split.results,
    goalsFor: split.goalsFor,
    goalsAgainst: split.goalsAgainst,
  });
}

function toTeamFormShape(form: FootballTeamForm, fixtureKey: string): unknown {
  return Object.freeze({
    teamSide: form.teamSide,
    window: form.window,
    results: form.results,
    goalsFor: form.goalsFor,
    goalsAgainst: form.goalsAgainst,
    goalsScoredPerMatch: form.goalsScoredPerMatch,
    goalsConcededPerMatch: form.goalsConcededPerMatch,
    ...(form.homeSplit === undefined
      ? {}
      : { homeSplit: freezeSplitShape(form.homeSplit) }),
    ...(form.awaySplit === undefined
      ? {}
      : { awaySplit: freezeSplitShape(form.awaySplit) }),
    ...(form.recentShort === undefined
      ? {}
      : { recentShort: freezeSplitShape(form.recentShort) }),
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:form:${form.teamSide}`,
    providerMethod: form.providerMethod,
  });
}

/**
 * Converts a FAS FootballMatchBundle into the shape expected by
 * FixtureEvidenceNormalizer / ImportMatchUseCase (never vendor JSON).
 */
function winnerFromScore(
  homeGoals: number,
  awayGoals: number,
): "away" | "draw" | "home" {
  if (homeGoals > awayGoals) {
    return "home";
  }

  if (homeGoals < awayGoals) {
    return "away";
  }

  return "draw";
}

export function toEvidenceMatchShape(bundle: FootballMatchBundle): unknown {
  const {
    fixture,
    homeForm,
    awayForm,
    homeStats,
    awayStats,
    headToHead,
    players,
    availabilityAbsences,
    lineups,
    expectedGoals,
    matchContext,
    clubIntelligence,
  } = bundle;
  const fixtureKey = fixture.fixtureId;
  const completedScore = fixture.completedScore;

  return Object.freeze({
    matchId: fixture.matchId,
    home: fixture.homeTeamName,
    away: fixture.awayTeamName,
    kickoff: fixture.kickoff,
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:match`,
    providerMethod: fixture.providerMethod,
    ...(fixture.status === "FINISHED" && completedScore !== undefined
      ? {
          matchResult: Object.freeze({
            homeGoals: completedScore.homeGoals,
            awayGoals: completedScore.awayGoals,
            winner: winnerFromScore(
              completedScore.homeGoals,
              completedScore.awayGoals,
            ),
            totalGoals: completedScore.homeGoals + completedScore.awayGoals,
            competitionId: fixture.competitionId,
            competitionName: fixture.competitionName,
            matchStatus: "FINISHED" as const,
            providerSource: "api-football",
            providerSourceId: `api-football:${fixtureKey}:result`,
            providerMethod: fixture.providerMethod,
            observedAt: fixture.kickoff,
          }),
        }
      : {}),
    ...(fixture.referee === undefined
      ? {}
      : {
          referee: Object.freeze({
            name: fixture.referee.name,
            ...(fixture.referee.country === undefined
              ? {}
              : { country: fixture.referee.country }),
            ...(fixture.referee.league === undefined
              ? {}
              : { league: fixture.referee.league }),
            ...(fixture.referee.statistics === undefined
              ? {}
              : { statistics: fixture.referee.statistics }),
            providerSource: "api-football",
            providerSourceId: `api-football:${fixtureKey}:referee`,
            providerMethod: fixture.providerMethod,
          }),
        }),
    ...(fixture.venue === undefined
      ? {}
      : {
          venue: Object.freeze({
            venueId: fixture.venue.venueId,
            name: fixture.venue.name,
            city: fixture.venue.city,
            providerSource: "api-football",
            providerSourceId: `api-football:${fixtureKey}:venue`,
            providerMethod: fixture.providerMethod,
          }),
        }),
    ...(players.length === 0
      ? {}
      : {
          players: Object.freeze(
            players.map((player) =>
              Object.freeze({
                playerId: player.playerId,
                name: player.name,
                teamId: player.teamId,
                teamName: player.teamName,
                teamSide: player.teamSide,
                position: player.position,
                number: player.number,
                nationality: player.nationality,
                photo: player.photoUrl,
                providerSource: "api-football",
                providerSourceId: `api-football:${fixtureKey}:player:${player.playerId}`,
                providerMethod: player.providerMethod,
              }),
            ),
          ),
        }),
    ...(availabilityAbsences.length === 0
      ? {}
      : {
          availabilityAbsences: Object.freeze(
            availabilityAbsences.map((absence) =>
              Object.freeze({
                playerId: absence.playerId,
                playerName: absence.playerName,
                teamId: absence.teamId,
                teamName: absence.teamName,
                teamSide: absence.teamSide,
                kind: absence.kind,
                reason: absence.reason,
                providerSource: "api-football",
                providerSourceId: `api-football:${fixtureKey}:availability:${absence.kind}:${absence.playerId}`,
                providerMethod: absence.providerMethod,
              }),
            ),
          ),
        }),
    ...(lineups.length === 0
      ? {}
      : {
          lineups: Object.freeze(
            lineups.map((lineup) =>
              Object.freeze({
                teamId: lineup.teamId,
                teamName: lineup.teamName,
                teamSide: lineup.teamSide,
                formation: lineup.formation,
                startXI: lineup.startXI,
                substitutes: lineup.substitutes,
                status: "confirmed",
                providerSource: "api-football",
                providerSourceId: `api-football:${fixtureKey}:lineup:${lineup.teamSide}`,
                providerMethod: lineup.providerMethod,
              }),
            ),
          ),
        }),
    ...(expectedGoals.length === 0
      ? {}
      : {
          expectedGoals: Object.freeze(
            expectedGoals.map((record) => toExpectedGoalsShape(record, fixtureKey)),
          ),
        }),
    ...(matchContext.length === 0
      ? {}
      : {
          matchContext: Object.freeze(
            matchContext.map((record) => toMatchContextShape(record, fixtureKey)),
          ),
        }),
    ...(clubIntelligence.length === 0
      ? {}
      : {
          clubIntelligence: Object.freeze(
            clubIntelligence.map((record) =>
              toClubIntelligenceShape(record, fixtureKey),
            ),
          ),
        }),
    teamForm: Object.freeze([
      toTeamFormShape(homeForm, fixtureKey),
      toTeamFormShape(awayForm, fixtureKey),
    ]),
    statistics: Object.freeze([
      toStatisticsShape(homeStats, fixtureKey),
      toStatisticsShape(awayStats, fixtureKey),
    ]),
    headToHead: Object.freeze({
      sampleSize: headToHead.sampleSize,
      meetings: headToHead.meetings,
      providerSource: "api-football",
      providerSourceId: `api-football:${fixtureKey}:h2h`,
      providerMethod: headToHead.providerMethod,
    }),
    // Raw standings domain retained for diagnostics; Club Intelligence is Evidence.
    standings: bundle.standings,
  });
}
