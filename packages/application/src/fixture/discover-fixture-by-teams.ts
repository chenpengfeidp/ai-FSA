import { normalizeTeamName } from "./normalize-team-name.js";

export interface FixtureScheduleRow {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly competition: string;
  readonly analyzable: boolean;
  readonly providerSource: string;
}

export interface FixtureResolutionMetadata {
  readonly requestedHomeTeam: string;
  readonly requestedAwayTeam: string;
  readonly requestedDate?: string;
  readonly normalizedHomeTeam: string;
  readonly normalizedAwayTeam: string;
  readonly resolvedHomeTeam: string;
  readonly resolvedAwayTeam: string;
  readonly resolvedMatchId: string;
  readonly kickoff: string;
  readonly competition: string;
  readonly scheduleSource: string;
  readonly providerSource: string;
  readonly homeAwaySwapped: boolean;
}

export interface FixtureDiscoveryCandidate {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoff: string;
  readonly competition: string;
  readonly providerSource: string;
  readonly analyzable: boolean;
  readonly homeAwaySwapped: boolean;
}

export type FixtureDiscoveryErrorCode = "FIXTURE_AMBIGUOUS" | "FIXTURE_NOT_FOUND";

export interface FixtureDiscoveryError {
  readonly code: FixtureDiscoveryErrorCode;
  readonly message: string;
  readonly candidates?: readonly FixtureDiscoveryCandidate[];
}

export type DiscoverFixtureByTeamsResult =
  | Readonly<{ ok: true; value: FixtureResolutionMetadata }>
  | Readonly<{ error: FixtureDiscoveryError; ok: false }>;

interface MatchedFixture extends FixtureScheduleRow {
  readonly homeAwaySwapped: boolean;
}

function success(value: FixtureResolutionMetadata): DiscoverFixtureByTeamsResult {
  return Object.freeze({ ok: true, value: Object.freeze(value) });
}

function failure(
  code: FixtureDiscoveryErrorCode,
  message: string,
  candidates?: readonly FixtureDiscoveryCandidate[],
): DiscoverFixtureByTeamsResult {
  return Object.freeze({
    error: Object.freeze({
      code,
      message,
      ...(candidates === undefined
        ? {}
        : { candidates: Object.freeze([...candidates]) }),
    }),
    ok: false,
  });
}

function kickoffDate(kickoff: string): string {
  return kickoff.slice(0, 10);
}

function matchesTeamPair(
  fixture: FixtureScheduleRow,
  normalizedHome: string,
  normalizedAway: string,
): MatchedFixture | undefined {
  const fixtureHome = normalizeTeamName(fixture.homeTeam);
  const fixtureAway = normalizeTeamName(fixture.awayTeam);

  if (fixtureHome === normalizedHome && fixtureAway === normalizedAway) {
    return Object.freeze({ ...fixture, homeAwaySwapped: false });
  }

  if (fixtureHome === normalizedAway && fixtureAway === normalizedHome) {
    return Object.freeze({ ...fixture, homeAwaySwapped: true });
  }

  return undefined;
}

function toCandidate(fixture: MatchedFixture): FixtureDiscoveryCandidate {
  return Object.freeze({
    matchId: fixture.matchId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    kickoff: fixture.kickoff,
    competition: fixture.competition,
    providerSource: fixture.providerSource,
    analyzable: fixture.analyzable,
    homeAwaySwapped: fixture.homeAwaySwapped,
  });
}

function compareCandidates(left: MatchedFixture, right: MatchedFixture): number {
  if (left.homeAwaySwapped !== right.homeAwaySwapped) {
    return left.homeAwaySwapped ? 1 : -1;
  }

  const kickoffCompare = left.kickoff.localeCompare(right.kickoff);

  if (kickoffCompare !== 0) {
    return kickoffCompare;
  }

  return left.matchId.localeCompare(right.matchId);
}

function selectDeterministicCandidate(
  candidates: readonly MatchedFixture[],
): MatchedFixture | undefined {
  const analyzable = candidates.filter((candidate) => candidate.analyzable);

  if (analyzable.length === 1) {
    return analyzable[0];
  }

  const pool = analyzable.length > 0 ? analyzable : candidates;
  const sorted = [...pool].sort(compareCandidates);
  const [first, second] = sorted;

  if (first === undefined) {
    return undefined;
  }

  if (second === undefined) {
    return first;
  }

  if (first.kickoff === second.kickoff && first.analyzable && second.analyzable) {
    return undefined;
  }

  return first;
}

export function discoverFixtureByTeams(input: {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly date?: string;
  readonly fixtures: readonly FixtureScheduleRow[];
  readonly scheduleSource: string;
}): DiscoverFixtureByTeamsResult {
  const requestedHomeTeam = input.homeTeam.trim();
  const requestedAwayTeam = input.awayTeam.trim();

  if (requestedHomeTeam.length === 0 || requestedAwayTeam.length === 0) {
    return failure(
      "FIXTURE_NOT_FOUND",
      "Both homeTeam and awayTeam must be non-empty.",
    );
  }

  const normalizedHomeTeam = normalizeTeamName(requestedHomeTeam);
  const normalizedAwayTeam = normalizeTeamName(requestedAwayTeam);
  const matched: MatchedFixture[] = [];

  for (const fixture of input.fixtures) {
    const pair = matchesTeamPair(fixture, normalizedHomeTeam, normalizedAwayTeam);

    if (pair !== undefined) {
      matched.push(pair);
    }
  }

  const dateFiltered =
    input.date === undefined
      ? matched
      : matched.filter((fixture) => kickoffDate(fixture.kickoff) === input.date);

  if (dateFiltered.length === 0) {
    const dateHint = input.date === undefined ? "" : ` on date "${input.date}"`;

    return failure(
      "FIXTURE_NOT_FOUND",
      `No fixture found for "${requestedHomeTeam}" vs "${requestedAwayTeam}"${dateHint}.`,
      matched.map(toCandidate),
    );
  }

  if (dateFiltered.length === 1) {
    const fixture = dateFiltered[0] as MatchedFixture;

    return success(
      Object.freeze({
        requestedHomeTeam,
        requestedAwayTeam,
        ...(input.date === undefined ? {} : { requestedDate: input.date }),
        normalizedHomeTeam,
        normalizedAwayTeam,
        resolvedHomeTeam: fixture.homeTeam,
        resolvedAwayTeam: fixture.awayTeam,
        resolvedMatchId: fixture.matchId,
        kickoff: fixture.kickoff,
        competition: fixture.competition,
        scheduleSource: input.scheduleSource,
        providerSource: fixture.providerSource,
        homeAwaySwapped: fixture.homeAwaySwapped,
      }),
    );
  }

  const selected = selectDeterministicCandidate(dateFiltered);

  if (selected === undefined) {
    return failure(
      "FIXTURE_AMBIGUOUS",
      `Multiple fixtures match "${requestedHomeTeam}" vs "${requestedAwayTeam}"${
        input.date === undefined ? "" : ` on date "${input.date}"`
      }. Provide a date or disambiguate manually.`,
      dateFiltered.map(toCandidate),
    );
  }

  return success(
    Object.freeze({
      requestedHomeTeam,
      requestedAwayTeam,
      ...(input.date === undefined ? {} : { requestedDate: input.date }),
      normalizedHomeTeam,
      normalizedAwayTeam,
      resolvedHomeTeam: selected.homeTeam,
      resolvedAwayTeam: selected.awayTeam,
      resolvedMatchId: selected.matchId,
      kickoff: selected.kickoff,
      competition: selected.competition,
      scheduleSource: input.scheduleSource,
      providerSource: selected.providerSource,
      homeAwaySwapped: selected.homeAwaySwapped,
    }),
  );
}
