import type {
  FootballBoardRow,
  FootballMatchBundle,
  FootballStandings,
} from "./football-models.js";

export interface FootballFixturesSource {
  listUpcoming(options?: {
    readonly fromDate?: string;
    readonly toDate?: string;
  }): Promise<readonly FootballBoardRow[]>;
}

export interface FootballMatchCatalog {
  getMatchBundle(matchId: string): FootballMatchBundle | undefined;
  listBundles(): readonly FootballMatchBundle[];
}

export interface FootballStandingsSource {
  getStandings(
    competitionId: string,
    season: number,
  ): Promise<FootballStandings | undefined>;
}

export interface FootballMatchLookup {
  getMatch(matchId: string): unknown;
}
