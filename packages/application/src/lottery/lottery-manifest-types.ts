export const LOTTERY_FIXTURE_MANIFEST_SCHEMA = "lottery-fixture-manifest.v1";

export const LOTTERY_SCHEDULE_SOURCE = "china-sports-lottery";

export const LOTTERY_FIXTURE_AUTHORITY = "lottery-official-list";

export interface LotteryTeamFormInput {
  readonly teamSide: "home" | "away";
  readonly window: number;
  readonly results: readonly ("D" | "L" | "W")[];
  readonly goalsFor: readonly number[];
  readonly goalsAgainst: readonly number[];
}

export interface LotteryStatisticsInput {
  readonly teamSide: "home" | "away";
  readonly windowMatches: number;
  readonly shotsForPerMatch: number;
  readonly shotsAgainstPerMatch: number;
  readonly xgForPerMatch: number;
  readonly xgAgainstPerMatch: number;
}

export interface LotteryOddsInput {
  readonly homeOdds: number;
  readonly drawOdds: number;
  readonly awayOdds: number;
  readonly observedAt: string;
  readonly marketSource: string;
  readonly asianHandicapLine?: number;
  readonly asianHandicapHomeOdds?: number;
  readonly asianHandicapAwayOdds?: number;
  readonly overUnderLine?: number;
  readonly overOdds?: number;
  readonly underOdds?: number;
  readonly providerSource?: string;
  readonly providerSourceId?: string;
}

export interface LotteryMatchManifestRow {
  readonly lotteryMatchCode: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly competitionId: string;
  readonly competitionName: string;
  readonly season: string;
  readonly kickoff: string;
  readonly timezone: string;
  readonly scheduleSource: string;
  readonly fixtureAuthority: string;
  readonly collectedAt: string;
  readonly fixtureRevision?: number;
  readonly teamAliasHints?: readonly string[];
  readonly teamForm: readonly LotteryTeamFormInput[];
  readonly statistics: readonly LotteryStatisticsInput[];
  readonly odds: LotteryOddsInput;
  readonly additionalOdds?: readonly LotteryOddsInput[];
  readonly supplementalKickoff?: string;
}

export interface LotteryFixtureManifestV1 {
  readonly schemaVersion: typeof LOTTERY_FIXTURE_MANIFEST_SCHEMA;
  readonly salesIssueId: string;
  readonly manifestCollectedAt: string;
  readonly sourceReference?: string;
  readonly teamAliasMapVersion?: string;
  readonly marketPrimaryBook?: string;
  readonly matches: readonly LotteryMatchManifestRow[];
}
