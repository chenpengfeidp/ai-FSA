import type { MatchSummary } from "../types/match-center";

export const todaysMatches: readonly MatchSummary[] = Object.freeze([
  Object.freeze({
    id: "match-example-1",
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    kickoff: "2026-08-01T19:30:00Z",
    kickoffTime: "2026-08-01 19:30",
    competition: "Premier League",
    status: "SCHEDULED",
    providerSource: "fixture",
  }),
  Object.freeze({
    id: "match-example-2",
    homeTeam: "Arsenal",
    awayTeam: "Coventry City",
    kickoff: "2026-08-21T19:00:00Z",
    kickoffTime: "2026-08-21 19:00",
    competition: "Premier League",
    status: "SCHEDULED",
    providerSource: "fixture",
  }),
  Object.freeze({
    id: "match-example-3",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    kickoff: "2026-08-01T20:30:00Z",
    kickoffTime: "2026-08-01 20:30",
    competition: "La Liga",
    status: "SCHEDULED",
    providerSource: "fixture",
  }),
  Object.freeze({
    id: "match-example-4",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    kickoff: "2026-08-01T18:30:00Z",
    kickoffTime: "2026-08-01 18:30",
    competition: "Bundesliga",
    status: "SCHEDULED",
    providerSource: "fixture",
  }),
  Object.freeze({
    id: "match-example-5",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    kickoff: "2026-08-01T21:00:00Z",
    kickoffTime: "2026-08-01 21:00",
    competition: "Ligue 1",
    status: "SCHEDULED",
    providerSource: "fixture",
  }),
  Object.freeze({
    id: "match-example-6",
    homeTeam: "Inter Milan",
    awayTeam: "Juventus",
    kickoff: "2026-08-01T19:45:00Z",
    kickoffTime: "2026-08-01 19:45",
    competition: "Serie A",
    status: "SCHEDULED",
    providerSource: "fixture",
  }),
]);

export function findMatchById(
  matchId: string,
  extras: readonly MatchSummary[] = [],
): MatchSummary | undefined {
  // Lazy import avoided: callers already normalize via decodeRouteMatchId.
  const candidates = matchId.includes("%")
    ? [matchId, safeDecode(matchId)]
    : [matchId];

  return (
    extras.find((match) => candidates.includes(match.id)) ??
    todaysMatches.find((match) => candidates.includes(match.id))
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
