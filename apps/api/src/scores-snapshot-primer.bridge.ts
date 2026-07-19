import type { ScoresSnapshotPrimer } from "@fas/provider-odds";

export class ScoresSnapshotPrimerBridge implements ScoresSnapshotPrimer {
  readonly #inner: ScoresSnapshotPrimer;

  constructor(inner: ScoresSnapshotPrimer) {
    this.#inner = inner;
  }

  ensureScores(): Promise<void> {
    return this.#inner.ensureScores();
  }
}
