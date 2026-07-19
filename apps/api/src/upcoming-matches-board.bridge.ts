import type {
  UpcomingBoardResult,
  UpcomingMatchesBoard,
} from "./upcoming-matches.factory.js";

/** Nest-injectable value wrapper (avoids parameter decorator / type-only pitfalls). */
export class UpcomingMatchesBoardBridge {
  readonly #board: UpcomingMatchesBoard;

  constructor(board: UpcomingMatchesBoard) {
    this.#board = board;
  }

  listUpcoming(): Promise<UpcomingBoardResult> {
    return this.#board.listUpcoming();
  }
}
