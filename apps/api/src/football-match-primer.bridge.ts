import { Injectable } from "@nestjs/common";

export interface FootballMatchPrimer {
  ensureMatch(matchId: string): Promise<void>;
}

@Injectable()
export class FootballMatchPrimerBridge {
  readonly #primer: FootballMatchPrimer;

  constructor(primer: FootballMatchPrimer) {
    this.#primer = primer;
  }

  async ensureMatch(matchId: string): Promise<void> {
    await this.#primer.ensureMatch(matchId);
  }
}
