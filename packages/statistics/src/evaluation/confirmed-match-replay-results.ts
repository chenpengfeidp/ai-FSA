import {
  type ActualMatchResult,
  createActualMatchResult,
} from "../domain/actual-match-result.js";

/**
 * Outcome-only evaluation/replay samples.
 *
 * These records deliberately contain no PRE_MATCH_PREDICTION. They must not be
 * inserted into Evaluation History or a replay cohort until a genuine sealed
 * pre-match prediction exists. Rich post-match annotations remain in the
 * owning completion report because ActualMatchResult is intentionally FT-only.
 */
export const CONFIRMED_MATCH_REPLAY_RESULTS_DATASET_VERSION =
  "confirmed-match-replay-results.v1" as const;

export const CONFIRMED_MATCH_REPLAY_RESULTS: readonly ActualMatchResult[] =
  Object.freeze([
    createActualMatchResult({
      matchId: "replay:2026-08-27:anderlecht:kairat-almaty",
      homeGoals: 3,
      awayGoals: 0,
      winner: "home",
      totalGoals: 3,
      competitionId: "uefa-europa-league-2026-27-qualifying-playoff",
      competitionName: "UEFA Europa League Qualifying — Play-off Round",
      matchStatus: "FINISHED",
      providerId: "evaluation:curated-result",
      providerSourceId: "https://www.rsca.be/en/fixture/view/6042",
      providerMethod: "authoritative-web-verification",
      observedAt: "2026-08-28T02:47:00.000Z",
    }),
    createActualMatchResult({
      matchId: "replay:2026-08-27:celta-vigo:osasuna",
      homeGoals: 1,
      awayGoals: 2,
      winner: "away",
      totalGoals: 3,
      competitionId: "laliga-2026-27",
      competitionName: "LaLiga EA Sports 2026/27",
      matchStatus: "FINISHED",
      providerId: "evaluation:curated-result",
      providerSourceId:
        "https://www.laliga.com/en-GB/match/temporada-2026-2027-laliga-ea-sports-rc-celta-ca-osasuna-1",
      providerMethod: "authoritative-web-verification",
      observedAt: "2026-08-28T02:47:00.000Z",
    }),
    createActualMatchResult({
      matchId: "replay:2026-08-27:barcelona:athletic-club",
      homeGoals: 2,
      awayGoals: 0,
      winner: "home",
      totalGoals: 2,
      competitionId: "laliga-2026-27",
      competitionName: "LaLiga EA Sports 2026/27",
      matchStatus: "FINISHED",
      providerId: "evaluation:curated-result",
      providerSourceId:
        "https://www.laliga.com/en-GB/match/temporada-2026-2027-laliga-ea-sports-fc-barcelona-athletic-club-1",
      providerMethod: "authoritative-web-verification",
      observedAt: "2026-08-28T02:47:00.000Z",
    }),
    createActualMatchResult({
      matchId: "replay:2026-08-27:omonia:sint-truiden",
      homeGoals: 4,
      awayGoals: 2,
      winner: "home",
      totalGoals: 6,
      competitionId: "uefa-europa-league-2026-27-qualifying-playoff",
      competitionName: "UEFA Europa League Qualifying — Play-off Round",
      matchStatus: "FINISHED",
      providerId: "evaluation:curated-result",
      providerSourceId:
        "https://www.espn.com/soccer/match/_/gameId/401909830/sint-truidense-omonia-nicosia",
      providerMethod: "curated-result-verification",
      observedAt: "2026-08-28T02:47:00.000Z",
    }),
  ]);
