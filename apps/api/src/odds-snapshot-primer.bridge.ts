import type { OddsSnapshotPrimer } from "@fas/provider-odds";

/** Nest-injectable bridge so controllers avoid parameter `@Inject` tokens. */
export class OddsSnapshotPrimerBridge implements OddsSnapshotPrimer {
  readonly #inner: OddsSnapshotPrimer;

  constructor(inner: OddsSnapshotPrimer) {
    this.#inner = inner;
  }

  ensurePreMatch1x2(matchId: string): Promise<void> {
    return this.#inner.ensurePreMatch1x2(matchId);
  }
}
