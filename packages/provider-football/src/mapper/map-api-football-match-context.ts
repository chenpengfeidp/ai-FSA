import type {
  FootballCompetitionKind,
  FootballMatchContextMetrics,
  FootballMatchContextRecord,
  FootballMatchLeg,
} from "../domain/football-match-context.js";
import type {
  FootballFixture,
  FootballProviderMethod,
} from "../domain/football-models.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function parseKickoffMs(value: string): number | undefined {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function wholeDaysBetween(earlierMs: number, laterMs: number): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((laterMs - earlierMs) / msPerDay);
}

function mapCompetitionKind(
  raw: string | undefined,
): FootballCompetitionKind | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized === "league") {
    return "league";
  }

  if (normalized === "cup") {
    return "cup";
  }

  if (normalized === "friendly" || normalized === "friendlies") {
    return "friendly";
  }

  return "other";
}

/**
 * Knockout only when the provider round label clearly indicates it.
 * Never invent knockout for regular season rounds.
 */
function detectKnockout(roundLabel: string | undefined): boolean | undefined {
  if (roundLabel === undefined) {
    return undefined;
  }

  const normalized = roundLabel.trim().toLowerCase();

  if (
    /final|semi|quarter|round of|1\/8|1\/4|1\/2|knockout|play-?off/.test(normalized)
  ) {
    return true;
  }

  if (/regular season|group stage|league stage|matchday/.test(normalized)) {
    return false;
  }

  return undefined;
}

function detectLeg(roundLabel: string | undefined): FootballMatchLeg | undefined {
  if (roundLabel === undefined) {
    return undefined;
  }

  const normalized = roundLabel.trim().toLowerCase();

  if (/\b1st\s*leg\b|\bfirst\s*leg\b|\bleg\s*1\b/.test(normalized)) {
    return "first";
  }

  if (/\b2nd\s*leg\b|\bsecond\s*leg\b|\bleg\s*2\b/.test(normalized)) {
    return "second";
  }

  return undefined;
}

function extractFixtureKickoffs(
  body: unknown,
  teamId: string,
): Readonly<{ kickoffs: readonly number[]; sampleObserved: boolean }> {
  if (!isRecord(body) || !Array.isArray(body.response)) {
    return Object.freeze({ kickoffs: Object.freeze([]), sampleObserved: false });
  }

  const kickoffs: number[] = [];

  for (const entry of body.response) {
    if (!isRecord(entry)) {
      continue;
    }

    const fixture = isRecord(entry.fixture) ? entry.fixture : undefined;
    const teams = isRecord(entry.teams) ? entry.teams : undefined;
    const home =
      teams !== undefined && isRecord(teams.home) ? teams.home : undefined;
    const away =
      teams !== undefined && isRecord(teams.away) ? teams.away : undefined;
    const homeId =
      typeof home?.id === "number" || typeof home?.id === "string"
        ? String(home.id)
        : undefined;
    const awayId =
      typeof away?.id === "number" || typeof away?.id === "string"
        ? String(away.id)
        : undefined;

    if (homeId !== teamId && awayId !== teamId) {
      continue;
    }

    const date = asString(fixture?.date);

    if (date === undefined) {
      continue;
    }

    const ms = parseKickoffMs(date);

    if (ms !== undefined) {
      kickoffs.push(ms);
    }
  }

  return Object.freeze({
    kickoffs: Object.freeze(kickoffs.sort((left, right) => left - right)),
    sampleObserved: true,
  });
}

function freezeMetrics(
  partial: FootballMatchContextMetrics,
): FootballMatchContextMetrics | undefined {
  const metrics: {
    restDays?: number;
    daysSinceLastMatch?: number;
    daysUntilNextMatch?: number;
    matchesInLast7Days?: number;
    matchesInLast14Days?: number;
    fixtureCongestion?: number;
    homeAwayContext?: "away" | "home";
    travelContext?: "away" | "home";
    venueCity?: string;
    competitionKind?: FootballCompetitionKind;
    competitionTypeLabel?: string;
    isKnockout?: boolean;
    roundLabel?: string;
    leg?: FootballMatchLeg;
    aggregateScore?: string;
  } = {};

  if (partial.restDays !== undefined) {
    metrics.restDays = partial.restDays;
  }
  if (partial.daysSinceLastMatch !== undefined) {
    metrics.daysSinceLastMatch = partial.daysSinceLastMatch;
  }
  if (partial.daysUntilNextMatch !== undefined) {
    metrics.daysUntilNextMatch = partial.daysUntilNextMatch;
  }
  if (partial.matchesInLast7Days !== undefined) {
    metrics.matchesInLast7Days = partial.matchesInLast7Days;
  }
  if (partial.matchesInLast14Days !== undefined) {
    metrics.matchesInLast14Days = partial.matchesInLast14Days;
  }
  if (partial.fixtureCongestion !== undefined) {
    metrics.fixtureCongestion = partial.fixtureCongestion;
  }
  if (partial.homeAwayContext !== undefined) {
    metrics.homeAwayContext = partial.homeAwayContext;
  }
  if (partial.travelContext !== undefined) {
    metrics.travelContext = partial.travelContext;
  }
  if (partial.venueCity !== undefined) {
    metrics.venueCity = partial.venueCity;
  }
  if (partial.competitionKind !== undefined) {
    metrics.competitionKind = partial.competitionKind;
  }
  if (partial.competitionTypeLabel !== undefined) {
    metrics.competitionTypeLabel = partial.competitionTypeLabel;
  }
  if (partial.isKnockout !== undefined) {
    metrics.isKnockout = partial.isKnockout;
  }
  if (partial.roundLabel !== undefined) {
    metrics.roundLabel = partial.roundLabel;
  }
  if (partial.leg !== undefined) {
    metrics.leg = partial.leg;
  }
  if (partial.aggregateScore !== undefined) {
    metrics.aggregateScore = partial.aggregateScore;
  }

  if (Object.keys(metrics).length === 0) {
    return undefined;
  }

  return Object.freeze(metrics);
}

function buildTeamContext(input: {
  readonly fixture: FootballFixture;
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: "away" | "home";
  readonly pastKickoffs: readonly number[];
  readonly pastSampleObserved: boolean;
  readonly nextKickoffs: readonly number[];
  readonly nextSampleObserved: boolean;
  readonly competitionTypeLabel?: string;
  readonly roundLabel?: string;
  readonly aggregateScore?: string;
  readonly providerMethod: FootballProviderMethod;
}): FootballMatchContextRecord | undefined {
  const kickoffMs = parseKickoffMs(input.fixture.kickoff);

  if (kickoffMs === undefined) {
    return undefined;
  }

  const prior = input.pastKickoffs.filter((ms) => ms < kickoffMs);
  const upcoming = input.nextKickoffs.filter((ms) => ms > kickoffMs);
  const msPerDay = 24 * 60 * 60 * 1000;
  const window7 = kickoffMs - 7 * msPerDay;
  const window14 = kickoffMs - 14 * msPerDay;
  const matchesInLast7Days = input.pastSampleObserved
    ? prior.filter((ms) => ms >= window7).length
    : undefined;
  const matchesInLast14Days = input.pastSampleObserved
    ? prior.filter((ms) => ms >= window14).length
    : undefined;
  const lastMatchMs = prior.length > 0 ? prior[prior.length - 1] : undefined;
  const nextMatchMs = upcoming.length > 0 ? upcoming[0] : undefined;
  const restDays =
    lastMatchMs === undefined ? undefined : wholeDaysBetween(lastMatchMs, kickoffMs);
  const daysUntilNextMatch =
    !input.nextSampleObserved || nextMatchMs === undefined
      ? undefined
      : wholeDaysBetween(kickoffMs, nextMatchMs);
  const competitionKind = mapCompetitionKind(input.competitionTypeLabel);
  const isKnockout = detectKnockout(input.roundLabel);
  const leg = detectLeg(input.roundLabel);
  const venueCity = input.fixture.venue?.city;

  const metrics = freezeMetrics({
    ...(restDays === undefined ? {} : { restDays, daysSinceLastMatch: restDays }),
    ...(daysUntilNextMatch === undefined ? {} : { daysUntilNextMatch }),
    ...(matchesInLast7Days === undefined
      ? {}
      : {
          matchesInLast7Days,
          fixtureCongestion: matchesInLast7Days,
        }),
    ...(matchesInLast14Days === undefined ? {} : { matchesInLast14Days }),
    homeAwayContext: input.teamSide,
    travelContext: input.teamSide,
    ...(venueCity === undefined ? {} : { venueCity }),
    ...(competitionKind === undefined ? {} : { competitionKind }),
    ...(input.competitionTypeLabel === undefined
      ? {}
      : { competitionTypeLabel: input.competitionTypeLabel }),
    ...(isKnockout === undefined ? {} : { isKnockout }),
    ...(input.roundLabel === undefined ? {} : { roundLabel: input.roundLabel }),
    ...(leg === undefined ? {} : { leg }),
    ...(input.aggregateScore === undefined
      ? {}
      : { aggregateScore: input.aggregateScore }),
  });

  if (metrics === undefined) {
    return undefined;
  }

  return Object.freeze({
    teamId: input.teamId,
    teamName: input.teamName,
    teamSide: input.teamSide,
    matchId: input.fixture.matchId,
    competitionId: input.fixture.competitionId,
    competitionName: input.fixture.competitionName,
    season: String(input.fixture.season),
    metrics,
    observedAt: input.fixture.kickoff,
    providerMethod: input.providerMethod,
  });
}

/**
 * Reads optional league.type / league.round / aggregate from one API-Football
 * fixture item. Never invents missing competition metadata.
 */
export function readApiFootballFixtureContextMeta(item: unknown): Readonly<{
  competitionTypeLabel?: string;
  roundLabel?: string;
  aggregateScore?: string;
}> {
  if (!isRecord(item)) {
    return Object.freeze({});
  }

  const league = isRecord(item.league) ? item.league : undefined;
  const score = isRecord(item.score) ? item.score : undefined;
  const aggregate = isRecord(score?.aggregate) ? score.aggregate : undefined;
  const homeAgg = aggregate?.home;
  const awayAgg = aggregate?.away;
  const aggregateScore =
    (typeof homeAgg === "number" || typeof homeAgg === "string") &&
    (typeof awayAgg === "number" || typeof awayAgg === "string")
      ? `${String(homeAgg)}-${String(awayAgg)}`
      : undefined;

  const competitionTypeLabel = asString(league?.type);
  const roundLabel = asString(league?.round);

  return Object.freeze({
    ...(competitionTypeLabel === undefined ? {} : { competitionTypeLabel }),
    ...(roundLabel === undefined ? {} : { roundLabel }),
    ...(aggregateScore === undefined ? {} : { aggregateScore }),
  });
}

/**
 * Maps provider fixture schedule samples into Match Context Evidence rows.
 * Empty / incomplete schedule → partial metrics or honest absence.
 */
export function mapApiFootballMatchContext(input: {
  readonly fixture: FootballFixture;
  readonly homePastFixturesBody: unknown;
  readonly awayPastFixturesBody: unknown;
  readonly homeNextFixturesBody?: unknown;
  readonly awayNextFixturesBody?: unknown;
  readonly competitionTypeLabel?: string;
  readonly roundLabel?: string;
  readonly aggregateScore?: string;
  readonly providerMethod: FootballProviderMethod;
}): readonly FootballMatchContextRecord[] {
  const homePast = extractFixtureKickoffs(
    input.homePastFixturesBody,
    input.fixture.homeTeamId,
  );
  const awayPast = extractFixtureKickoffs(
    input.awayPastFixturesBody,
    input.fixture.awayTeamId,
  );
  const homeNext =
    input.homeNextFixturesBody === undefined
      ? Object.freeze({
          kickoffs: Object.freeze([] as number[]),
          sampleObserved: false,
        })
      : extractFixtureKickoffs(input.homeNextFixturesBody, input.fixture.homeTeamId);
  const awayNext =
    input.awayNextFixturesBody === undefined
      ? Object.freeze({
          kickoffs: Object.freeze([] as number[]),
          sampleObserved: false,
        })
      : extractFixtureKickoffs(input.awayNextFixturesBody, input.fixture.awayTeamId);

  const sharedMeta = Object.freeze({
    ...(input.competitionTypeLabel === undefined
      ? {}
      : { competitionTypeLabel: input.competitionTypeLabel }),
    ...(input.roundLabel === undefined ? {} : { roundLabel: input.roundLabel }),
    ...(input.aggregateScore === undefined
      ? {}
      : { aggregateScore: input.aggregateScore }),
  });

  const records = [
    buildTeamContext({
      fixture: input.fixture,
      teamId: input.fixture.homeTeamId,
      teamName: input.fixture.homeTeamName,
      teamSide: "home",
      pastKickoffs: homePast.kickoffs,
      pastSampleObserved: homePast.sampleObserved,
      nextKickoffs: homeNext.kickoffs,
      nextSampleObserved: homeNext.sampleObserved,
      ...sharedMeta,
      providerMethod: input.providerMethod,
    }),
    buildTeamContext({
      fixture: input.fixture,
      teamId: input.fixture.awayTeamId,
      teamName: input.fixture.awayTeamName,
      teamSide: "away",
      pastKickoffs: awayPast.kickoffs,
      pastSampleObserved: awayPast.sampleObserved,
      nextKickoffs: awayNext.kickoffs,
      nextSampleObserved: awayNext.sampleObserved,
      ...sharedMeta,
      providerMethod: input.providerMethod,
    }),
  ].filter((record): record is FootballMatchContextRecord => record !== undefined);

  return Object.freeze(records);
}
