import type { MatchSummary } from "../types/match-center";

export const todaysMatches: readonly MatchSummary[] = Object.freeze([
  Object.freeze({
    id: "match-example-1",
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    kickoffTime: "19:30",
    competition: "Premier League",
  }),
  Object.freeze({
    id: "match-example-2",
    homeTeam: "Arsenal",
    awayTeam: "Manchester City",
    kickoffTime: "20:00",
    competition: "Premier League",
  }),
  Object.freeze({
    id: "match-example-3",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    kickoffTime: "20:30",
    competition: "La Liga",
  }),
  Object.freeze({
    id: "match-example-4",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    kickoffTime: "18:30",
    competition: "Bundesliga",
  }),
  Object.freeze({
    id: "match-example-5",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    kickoffTime: "21:00",
    competition: "Ligue 1",
  }),
  Object.freeze({
    id: "match-example-6",
    homeTeam: "Inter Milan",
    awayTeam: "Juventus",
    kickoffTime: "19:45",
    competition: "Serie A",
  }),
]);
