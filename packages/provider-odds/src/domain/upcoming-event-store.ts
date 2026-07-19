export interface UpcomingEventShell {
  readonly matchId: string;
  readonly eventId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly competition: string;
}

export class UpcomingEventStore {
  readonly #byMatchId = new Map<string, UpcomingEventShell>();

  replaceAll(events: readonly UpcomingEventShell[]): void {
    this.#byMatchId.clear();

    for (const event of events) {
      this.#byMatchId.set(event.matchId, Object.freeze({ ...event }));
    }
  }

  get(matchId: string): UpcomingEventShell | undefined {
    return this.#byMatchId.get(matchId);
  }

  list(): readonly UpcomingEventShell[] {
    return Object.freeze([...this.#byMatchId.values()]);
  }
}
