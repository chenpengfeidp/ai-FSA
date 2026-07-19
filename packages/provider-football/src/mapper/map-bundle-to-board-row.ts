import type {
  FootballBoardRow,
  FootballMatchBundle,
} from "../domain/football-models.js";

export function mapBundleToBoardRow(bundle: FootballMatchBundle): FootballBoardRow {
  return Object.freeze({
    matchId: bundle.fixture.matchId,
    fixtureId: bundle.fixture.fixtureId,
    competitionId: bundle.fixture.competitionId,
    competition: bundle.fixture.competitionName,
    homeTeam: bundle.fixture.homeTeamName,
    awayTeam: bundle.fixture.awayTeamName,
    kickoff: bundle.fixture.kickoff,
    analyzable: true,
    providerSource: "api-football",
    providerMethod: bundle.fixture.providerMethod,
  });
}
