import type { UpcomingFixture } from "../domain/upcoming-fixture.js";

export interface FixtureBoardSeed {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly competition: string;
}

/**
 * Odds-calendar rows first (deduped by matchId), then fixture demos not already present.
 */
export function mergeUpcomingMatchBoard(
  oddsRows: readonly UpcomingFixture[],
  fixtureSeeds: readonly FixtureBoardSeed[],
): readonly UpcomingFixture[] {
  const byMatchId = new Map<string, UpcomingFixture>();

  for (const row of oddsRows) {
    byMatchId.set(row.matchId, row);
  }

  for (const seed of fixtureSeeds) {
    if (byMatchId.has(seed.matchId)) {
      continue;
    }

    byMatchId.set(
      seed.matchId,
      Object.freeze({
        matchId: seed.matchId,
        eventId: seed.matchId,
        sportKey: "fixture",
        competition: seed.competition,
        homeTeam: seed.homeTeam,
        awayTeam: seed.awayTeam,
        kickoff: seed.kickoff,
        analyzable: true,
        providerSource: "fixture",
        providerMethod: "fixture",
      }),
    );
  }

  return Object.freeze(
    [...byMatchId.values()].sort((left, right) =>
      left.kickoff.localeCompare(right.kickoff),
    ),
  );
}
