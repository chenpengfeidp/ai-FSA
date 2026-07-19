export interface DemoOddsCatalogEntry {
  readonly matchId: string;
  readonly sportKey: string;
  readonly eventId: string;
  readonly cassetteFile: string;
}

/** Maps FAS demo match IDs to recorded cassettes / live event keys. */
export const DEMO_ODDS_CATALOG: readonly DemoOddsCatalogEntry[] = Object.freeze([
  Object.freeze({
    matchId: "match-example",
    sportKey: "soccer_epl",
    eventId: "evt_match_example_liverpool_chelsea",
    cassetteFile: "match-example.json",
  }),
  Object.freeze({
    matchId: "match-example-1",
    sportKey: "soccer_epl",
    eventId: "evt_match_example_1_liverpool_chelsea",
    cassetteFile: "match-example-1.json",
  }),
]);

export function findDemoOddsCatalogEntry(
  matchId: string,
): DemoOddsCatalogEntry | undefined {
  return DEMO_ODDS_CATALOG.find((entry) => entry.matchId === matchId);
}
