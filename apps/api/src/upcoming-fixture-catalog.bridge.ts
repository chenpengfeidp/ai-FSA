import type { UpcomingFixtureCatalog } from "@fas/application";
import type { UpcomingMatchesBoardBridge } from "./upcoming-matches-board.bridge.js";

/** Adapts the Match Center upcoming board to fixture discovery. */
export class UpcomingFixtureCatalogBridge implements UpcomingFixtureCatalog {
  readonly #board: UpcomingMatchesBoardBridge;

  constructor(board: UpcomingMatchesBoardBridge) {
    this.#board = board;
  }

  async listFixtures(): Promise<
    Readonly<{
      readonly fixtures: readonly import("@fas/application").FixtureScheduleRow[];
      readonly scheduleSource: string;
    }>
  > {
    const board = await this.#board.listUpcoming();

    return Object.freeze({
      scheduleSource: board.scheduleSource,
      fixtures: Object.freeze(
        board.rows.map((row) =>
          Object.freeze({
            matchId: row.matchId,
            homeTeam: row.homeTeam,
            awayTeam: row.awayTeam,
            kickoff: row.kickoff,
            competition: row.competition,
            analyzable: row.analyzable,
            providerSource: row.providerSource,
          }),
        ),
      ),
    });
  }
}
