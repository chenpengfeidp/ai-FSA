import type { MatchProvider } from "../import-match-use-case.js";
import { isLotteryMatchId } from "./build-lottery-match-id.js";

export class CompositeLotteryFirstMatchProvider implements MatchProvider {
  readonly #lottery: MatchProvider;
  readonly #fallback: MatchProvider;

  constructor(lottery: MatchProvider, fallback: MatchProvider) {
    this.#lottery = lottery;
    this.#fallback = fallback;
  }

  getMatch(matchId: string): unknown {
    if (isLotteryMatchId(matchId)) {
      return this.#lottery.getMatch(matchId);
    }

    return this.#fallback.getMatch(matchId);
  }
}
