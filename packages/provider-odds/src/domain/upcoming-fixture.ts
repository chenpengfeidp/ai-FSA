export type UpcomingFixtureProviderMethod = "http-live" | "recorded-snapshot";

/** Schedule row for Match Center — market calendar signal, not full evidence. */
export interface UpcomingFixture {
  readonly matchId: string;
  readonly eventId: string;
  readonly sportKey: string;
  readonly competition: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly analyzable: boolean;
  readonly providerSource: "api-football" | "fixture" | "the-odds-api";
  readonly providerMethod: UpcomingFixtureProviderMethod | "fixture";
}

export interface UpcomingFixturesSource {
  listUpcoming(): Promise<readonly UpcomingFixture[]>;
}
