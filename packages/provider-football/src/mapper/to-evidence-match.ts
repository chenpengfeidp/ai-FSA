import type {
  FootballFormSplit,
  FootballMatchBundle,
  FootballTeamForm,
} from "../domain/football-models.js";

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
  } = bundle;
  const fixtureKey = fixture.fixtureId;

  return Object.freeze({
    matchId: fixture.matchId,
    home: fixture.homeTeamName,
    away: fixture.awayTeamName,
    kickoff: fixture.kickoff,
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:match`,
    providerMethod: fixture.providerMethod,
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
    teamForm: Object.freeze([
      toTeamFormShape(homeForm, fixtureKey),
      toTeamFormShape(awayForm, fixtureKey),
    ]),
    statistics: Object.freeze([
      Object.freeze({
        teamSide: homeStats.teamSide,
        windowMatches: homeStats.windowMatches,
        shotsForPerMatch: homeStats.shotsForPerMatch,
        shotsAgainstPerMatch: homeStats.shotsAgainstPerMatch,
        xgForPerMatch: homeStats.xgForPerMatch,
        xgAgainstPerMatch: homeStats.xgAgainstPerMatch,
        providerSource: "api-football",
        providerSourceId: `api-football:${fixtureKey}:stats:home:${homeStats.statsBasis}`,
        providerMethod: homeStats.providerMethod,
        statsBasis: homeStats.statsBasis,
      }),
      Object.freeze({
        teamSide: awayStats.teamSide,
        windowMatches: awayStats.windowMatches,
        shotsForPerMatch: awayStats.shotsForPerMatch,
        shotsAgainstPerMatch: awayStats.shotsAgainstPerMatch,
        xgForPerMatch: awayStats.xgForPerMatch,
        xgAgainstPerMatch: awayStats.xgAgainstPerMatch,
        providerSource: "api-football",
        providerSourceId: `api-football:${fixtureKey}:stats:away:${awayStats.statsBasis}`,
        providerMethod: awayStats.providerMethod,
        statsBasis: awayStats.statsBasis,
      }),
    ]),
    headToHead: Object.freeze({
      sampleSize: headToHead.sampleSize,
      meetings: headToHead.meetings,
      providerSource: "api-football",
      providerSourceId: `api-football:${fixtureKey}:h2h`,
      providerMethod: headToHead.providerMethod,
    }),
    // Standings stay FAS-domain only; Evidence kinds do not require them in F.1.
    standings: bundle.standings,
  });
}
