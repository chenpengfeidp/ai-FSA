import {
  discoverFixtureByTeams,
  type DiscoverFixtureByTeamsResult,
  type FixtureScheduleRow,
} from "./fixture/discover-fixture-by-teams.js";

export interface UpcomingFixtureCatalog {
  listFixtures(): Promise<
    Readonly<{
      readonly fixtures: readonly FixtureScheduleRow[];
      readonly scheduleSource: string;
    }>
  >;
}

export class DiscoverFixtureByTeamsUseCase {
  readonly #catalog: UpcomingFixtureCatalog;

  constructor(catalog: UpcomingFixtureCatalog) {
    this.#catalog = catalog;
  }

  async execute(input: {
    readonly homeTeam: string;
    readonly awayTeam: string;
    readonly date?: string;
  }): Promise<DiscoverFixtureByTeamsResult> {
    const board = await this.#catalog.listFixtures();

    return discoverFixtureByTeams({
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      ...(input.date === undefined ? {} : { date: input.date }),
      fixtures: board.fixtures,
      scheduleSource: board.scheduleSource,
    });
  }
}
