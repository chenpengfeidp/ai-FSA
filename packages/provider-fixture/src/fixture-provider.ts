const exampleMatch = Object.freeze({
  matchId: "match-example",
  home: "Liverpool",
  away: "Chelsea",
  kickoff: "2026-08-01T19:30:00Z",
});

export class FixtureProvider {
  getMatch(matchId: string): unknown {
    if (matchId !== exampleMatch.matchId) {
      return undefined;
    }

    return exampleMatch;
  }
}
