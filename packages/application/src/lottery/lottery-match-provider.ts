import type { MatchProvider } from "../import-match-use-case.js";
import { registeredLotteryFixtureToEvidenceInput } from "./to-fixture-evidence-input.js";
import type { LotteryFixtureRegistry } from "./lottery-fixture-registry.js";
import { isLotteryMatchId } from "./build-lottery-match-id.js";

export class LotteryMatchProvider implements MatchProvider {
  readonly #registry: LotteryFixtureRegistry;

  constructor(registry: LotteryFixtureRegistry) {
    this.#registry = registry;
  }

  getMatch(matchId: string): unknown {
    if (!isLotteryMatchId(matchId)) {
      return undefined;
    }

    const fixture = this.#registry.get(matchId);

    if (fixture === undefined) {
      return undefined;
    }

    return registeredLotteryFixtureToEvidenceInput(fixture);
  }
}
