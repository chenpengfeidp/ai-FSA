import type { FootballBoardRow } from "../domain/football-models.js";

/** Transport shape shared with Match Center / @fas/provider-odds UpcomingFixture. */
export interface FootballUpcomingFixtureRow {
  readonly matchId: string;
  readonly eventId: string;
  readonly sportKey: string;
  readonly competition: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly analyzable: boolean;
  readonly providerSource: "api-football";
  readonly providerMethod: FootballBoardRow["providerMethod"];
}

export function mapBoardRowToUpcomingFixture(
  row: FootballBoardRow,
): FootballUpcomingFixtureRow {
  return Object.freeze({
    matchId: row.matchId,
    eventId: row.fixtureId,
    sportKey: `api-football:${row.competitionId}`,
    competition: row.competition,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    kickoff: row.kickoff,
    analyzable: row.analyzable,
    providerSource: "api-football",
    providerMethod: row.providerMethod,
  });
}
