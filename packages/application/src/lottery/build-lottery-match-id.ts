export const LOTTERY_MATCH_ID_PREFIX = "lottery:csl:";

export function buildLotteryMatchId(
  salesIssueId: string,
  lotteryMatchCode: string,
): string {
  return `${LOTTERY_MATCH_ID_PREFIX}${salesIssueId}:${lotteryMatchCode}`;
}

export function isLotteryMatchId(matchId: string): boolean {
  return matchId.startsWith(LOTTERY_MATCH_ID_PREFIX);
}
