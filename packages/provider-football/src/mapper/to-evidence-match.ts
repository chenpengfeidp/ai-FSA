import type { FootballMatchBundle } from "../domain/football-models.js";

/**
 * Converts a FAS FootballMatchBundle into the shape expected by
 * FixtureEvidenceNormalizer / ImportMatchUseCase (never vendor JSON).
 */
export function toEvidenceMatchShape(bundle: FootballMatchBundle): unknown {
  const { fixture, homeForm, awayForm, homeStats, awayStats, headToHead } = bundle;
  const fixtureKey = fixture.fixtureId;

  return Object.freeze({
    matchId: fixture.matchId,
    home: fixture.homeTeamName,
    away: fixture.awayTeamName,
    kickoff: fixture.kickoff,
    providerSource: "api-football",
    providerSourceId: `api-football:${fixtureKey}:match`,
    providerMethod: fixture.providerMethod,
    teamForm: Object.freeze([
      Object.freeze({
        teamSide: homeForm.teamSide,
        window: homeForm.window,
        results: homeForm.results,
        goalsFor: homeForm.goalsFor,
        goalsAgainst: homeForm.goalsAgainst,
        providerSource: "api-football",
        providerSourceId: `api-football:${fixtureKey}:form:home`,
        providerMethod: homeForm.providerMethod,
      }),
      Object.freeze({
        teamSide: awayForm.teamSide,
        window: awayForm.window,
        results: awayForm.results,
        goalsFor: awayForm.goalsFor,
        goalsAgainst: awayForm.goalsAgainst,
        providerSource: "api-football",
        providerSourceId: `api-football:${fixtureKey}:form:away`,
        providerMethod: awayForm.providerMethod,
      }),
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
