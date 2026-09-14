import type { RegisteredLotteryFixture } from "./lottery-fixture-registry.js";
import type { LotteryOddsInput } from "./lottery-manifest-types.js";

function serializeOdds(
  odds: LotteryOddsInput,
  matchId: string,
  index: number,
): Record<string, unknown> {
  const providerSource =
    odds.providerSource ?? odds.marketSource ?? "china-sports-lottery";
  const providerSourceId =
    odds.providerSourceId ??
    `lottery-odds:${matchId}:${providerSource}:${String(index)}`;

  return Object.freeze({
    homeOdds: odds.homeOdds,
    drawOdds: odds.drawOdds,
    awayOdds: odds.awayOdds,
    observedAt: odds.observedAt,
    marketSource: odds.marketSource,
    providerSource,
    providerSourceId,
    providerMethod: "lottery-manifest",
    ...(odds.asianHandicapLine === undefined ||
    odds.asianHandicapHomeOdds === undefined ||
    odds.asianHandicapAwayOdds === undefined
      ? {}
      : {
          asianHandicapLine: odds.asianHandicapLine,
          asianHandicapHomeOdds: odds.asianHandicapHomeOdds,
          asianHandicapAwayOdds: odds.asianHandicapAwayOdds,
        }),
    ...(odds.overUnderLine === undefined ||
    odds.overOdds === undefined ||
    odds.underOdds === undefined
      ? {}
      : {
          overUnderLine: odds.overUnderLine,
          overOdds: odds.overOdds,
          underOdds: odds.underOdds,
        }),
  });
}

export function registeredLotteryFixtureToEvidenceInput(
  fixture: RegisteredLotteryFixture,
): Record<string, unknown> {
  const { matchId, row } = fixture;

  const additionalOdds =
    row.additionalOdds === undefined
      ? []
      : row.additionalOdds.map((odds, index) =>
          serializeOdds(odds, matchId, index + 1),
        );

  return Object.freeze({
    matchId,
    home: row.homeTeam,
    away: row.awayTeam,
    kickoff: row.kickoff,
    competitionId: row.competitionId,
    competitionName: row.competitionName,
    season: row.season,
    scheduleSource: row.scheduleSource,
    fixtureAuthority: row.fixtureAuthority,
    timezone: row.timezone,
    providerSource: "china-sports-lottery",
    providerSourceId: `lottery:${fixture.salesIssueId}:${row.lotteryMatchCode}`,
    providerMethod: "lottery-manifest",
    teamForm: row.teamForm,
    statistics: row.statistics,
    odds: serializeOdds(row.odds, matchId, 0),
    ...(additionalOdds.length === 0 ? {} : { additionalOdds }),
  });
}
