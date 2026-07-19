interface FixtureMatch {
  readonly matchId: string;
  readonly home: string;
  readonly away: string;
  readonly kickoff: string;
}

function fixture(
  matchId: string,
  home: string,
  away: string,
  kickoff: string,
): FixtureMatch {
  return Object.freeze({ matchId, home, away, kickoff });
}

const fixtureMatches: Readonly<Record<string, FixtureMatch>> = Object.freeze({
  "match-example": fixture(
    "match-example",
    "Liverpool",
    "Chelsea",
    "2026-08-01T19:30:00Z",
  ),
  "match-example-1": fixture(
    "match-example-1",
    "Liverpool",
    "Chelsea",
    "2026-08-01T19:30:00Z",
  ),
  "match-example-2": fixture(
    "match-example-2",
    "Arsenal",
    "Manchester City",
    "2026-08-01T20:00:00Z",
  ),
  "match-example-3": fixture(
    "match-example-3",
    "Barcelona",
    "Real Madrid",
    "2026-08-01T20:30:00Z",
  ),
  "match-example-4": fixture(
    "match-example-4",
    "Bayern Munich",
    "Borussia Dortmund",
    "2026-08-01T18:30:00Z",
  ),
  "match-example-5": fixture(
    "match-example-5",
    "PSG",
    "Marseille",
    "2026-08-01T21:00:00Z",
  ),
  "match-example-6": fixture(
    "match-example-6",
    "Inter Milan",
    "Juventus",
    "2026-08-01T19:45:00Z",
  ),
});

export class FixtureProvider {
  getMatch(matchId: string): unknown {
    return fixtureMatches[matchId];
  }
}
