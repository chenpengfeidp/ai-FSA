import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  FootballExpectedGoalsMetrics,
  FootballExpectedGoalsRecord,
  FootballExpectedGoalsWindow,
} from "../domain/football-expected-goals.js";
import type {
  FootballCompetitionKind,
  FootballMatchContextMetrics,
  FootballMatchContextRecord,
  FootballMatchLeg,
} from "../domain/football-match-context.js";
import type {
  FootballAdvancedTeamStats,
  FootballAvailabilityAbsence,
  FootballBoardRow,
  FootballFormSplit,
  FootballFixture,
  FootballH2H,
  FootballLineupPlayer,
  FootballMatchBundle,
  FootballPlayer,
  FootballReferee,
  FootballStandings,
  FootballTeamForm,
  FootballTeamLineup,
  FootballTeamStats,
} from "../domain/football-models.js";
import type {
  FootballFixturesSource,
  FootballMatchCatalog,
} from "../domain/ports.js";
import { mapBundleToBoardRow } from "../mapper/map-bundle-to-board-row.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseFormSplit(value: unknown): FootballFormSplit | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const window =
    typeof value.window === "number" && Number.isInteger(value.window)
      ? value.window
      : undefined;

  if (
    window === undefined ||
    !Array.isArray(value.results) ||
    !Array.isArray(value.goalsFor) ||
    !Array.isArray(value.goalsAgainst) ||
    value.results.length !== window ||
    value.goalsFor.length !== window ||
    value.goalsAgainst.length !== window
  ) {
    return undefined;
  }

  const results: Array<"D" | "L" | "W"> = [];
  const goalsFor: number[] = [];
  const goalsAgainst: number[] = [];

  for (let index = 0; index < window; index += 1) {
    const result = value.results[index];
    const gf = value.goalsFor[index];
    const ga = value.goalsAgainst[index];

    if (
      (result !== "W" && result !== "D" && result !== "L") ||
      typeof gf !== "number" ||
      !Number.isFinite(gf) ||
      typeof ga !== "number" ||
      !Number.isFinite(ga)
    ) {
      return undefined;
    }

    results.push(result);
    goalsFor.push(gf);
    goalsAgainst.push(ga);
  }

  return Object.freeze({
    window,
    results: Object.freeze(results),
    goalsFor: Object.freeze(goalsFor),
    goalsAgainst: Object.freeze(goalsAgainst),
  });
}

function optionalFinite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseAdvancedStats(value: unknown): FootballAdvancedTeamStats | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const scope =
    value.scope === "fixture" || value.scope === "season-average"
      ? value.scope
      : undefined;

  if (scope === undefined) {
    return undefined;
  }

  const advanced = Object.freeze({
    scope,
    shotsTotal: optionalFinite(value.shotsTotal),
    shotsOnTarget: optionalFinite(value.shotsOnTarget),
    shotsOffTarget: optionalFinite(value.shotsOffTarget),
    possessionPct: optionalFinite(value.possessionPct),
    corners: optionalFinite(value.corners),
    yellowCards: optionalFinite(value.yellowCards),
    redCards: optionalFinite(value.redCards),
    attacks: optionalFinite(value.attacks),
    dangerousAttacks: optionalFinite(value.dangerousAttacks),
    fouls: optionalFinite(value.fouls),
    saves: optionalFinite(value.saves),
    passingAccuracyPct: optionalFinite(value.passingAccuracyPct),
  });

  const hasAny = [
    advanced.shotsTotal,
    advanced.shotsOnTarget,
    advanced.shotsOffTarget,
    advanced.possessionPct,
    advanced.corners,
    advanced.yellowCards,
    advanced.redCards,
    advanced.attacks,
    advanced.dangerousAttacks,
    advanced.fouls,
    advanced.saves,
    advanced.passingAccuracyPct,
  ].some((entry) => entry !== undefined);

  return hasAny ? advanced : undefined;
}

function enrichTeamStats(raw: FootballTeamStats): FootballTeamStats {
  const record = raw as unknown as FootballTeamStats & Record<string, unknown>;
  return Object.freeze({
    ...raw,
    advanced: parseAdvancedStats(record.advanced),
  });
}

function enrichTeamForm(
  raw: FootballTeamForm,
  options: {
    readonly homeSplit: FootballFormSplit | undefined;
    readonly awaySplit: FootballFormSplit | undefined;
    readonly recentShort: FootballFormSplit | undefined;
    readonly goalsScoredPerMatch: number | undefined;
    readonly goalsConcededPerMatch: number | undefined;
  },
): FootballTeamForm {
  const goalsFor = [...raw.goalsFor];
  const goalsAgainst = [...raw.goalsAgainst];
  const recentShort =
    options.recentShort ??
    (raw.window >= 3
      ? Object.freeze({
          window: 3,
          results: Object.freeze(raw.results.slice(-3)),
          goalsFor: Object.freeze(goalsFor.slice(-3)),
          goalsAgainst: Object.freeze(goalsAgainst.slice(-3)),
        })
      : undefined);

  return Object.freeze({
    teamId: raw.teamId,
    teamName: raw.teamName,
    teamSide: raw.teamSide,
    window: raw.window,
    results: Object.freeze([...raw.results]),
    goalsFor: Object.freeze(goalsFor),
    goalsAgainst: Object.freeze(goalsAgainst),
    homeSplit: options.homeSplit,
    awaySplit: options.awaySplit,
    goalsScoredPerMatch:
      options.goalsScoredPerMatch !== undefined &&
      Number.isFinite(options.goalsScoredPerMatch)
        ? options.goalsScoredPerMatch
        : mean(goalsFor),
    goalsConcededPerMatch:
      options.goalsConcededPerMatch !== undefined &&
      Number.isFinite(options.goalsConcededPerMatch)
        ? options.goalsConcededPerMatch
        : mean(goalsAgainst),
    recentShort,
    providerMethod: raw.providerMethod,
  });
}

function parseReferee(value: unknown): FootballReferee | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = typeof value.name === "string" ? value.name.trim() : "";

  if (name.length === 0) {
    return undefined;
  }

  const statistics = isRecord(value.statistics)
    ? Object.freeze({
        appearances:
          typeof value.statistics.appearances === "number"
            ? value.statistics.appearances
            : undefined,
        yellowCardsPerMatch:
          typeof value.statistics.yellowCardsPerMatch === "number"
            ? value.statistics.yellowCardsPerMatch
            : undefined,
        redCardsPerMatch:
          typeof value.statistics.redCardsPerMatch === "number"
            ? value.statistics.redCardsPerMatch
            : undefined,
      })
    : undefined;

  return Object.freeze({
    name,
    country:
      typeof value.country === "string" && value.country.trim().length > 0
        ? value.country.trim()
        : undefined,
    league:
      typeof value.league === "string" && value.league.trim().length > 0
        ? value.league.trim()
        : undefined,
    statistics,
  });
}

function parseLineupPlayer(entry: unknown): FootballLineupPlayer | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const playerId = typeof entry.playerId === "string" ? entry.playerId.trim() : "";
  const name = typeof entry.name === "string" ? entry.name.trim() : "";

  if (playerId.length === 0 || name.length === 0) {
    return undefined;
  }

  return Object.freeze({
    playerId,
    name,
    number:
      typeof entry.number === "number" && Number.isFinite(entry.number)
        ? entry.number
        : undefined,
    position:
      typeof entry.position === "string" && entry.position.trim().length > 0
        ? entry.position.trim()
        : undefined,
    grid:
      typeof entry.grid === "string" && entry.grid.trim().length > 0
        ? entry.grid.trim()
        : undefined,
  });
}

const EXPECTED_GOALS_WINDOWS: ReadonlySet<FootballExpectedGoalsWindow> = new Set([
  "overall",
  "home",
  "away",
  "recent",
  "last5",
  "last10",
  "fixture",
]);

function parseOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseExpectedGoalsMetrics(
  value: unknown,
): FootballExpectedGoalsMetrics | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const xg = parseOptionalFiniteNumber(value.xg);
  const xga = parseOptionalFiniteNumber(value.xga);
  const nonPenaltyXg = parseOptionalFiniteNumber(value.nonPenaltyXg);
  const nonPenaltyXga = parseOptionalFiniteNumber(value.nonPenaltyXga);
  const expectedPoints = parseOptionalFiniteNumber(value.expectedPoints);
  const expectedGoalDifference = parseOptionalFiniteNumber(
    value.expectedGoalDifference,
  );

  if (
    xg === undefined &&
    xga === undefined &&
    nonPenaltyXg === undefined &&
    nonPenaltyXga === undefined &&
    expectedPoints === undefined &&
    expectedGoalDifference === undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    ...(xg === undefined ? {} : { xg }),
    ...(xga === undefined ? {} : { xga }),
    ...(nonPenaltyXg === undefined ? {} : { nonPenaltyXg }),
    ...(nonPenaltyXga === undefined ? {} : { nonPenaltyXga }),
    ...(expectedPoints === undefined ? {} : { expectedPoints }),
    ...(expectedGoalDifference === undefined ? {} : { expectedGoalDifference }),
  });
}

function parseExpectedGoalsRecord(
  entry: unknown,
): FootballExpectedGoalsRecord | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
  const teamName = typeof entry.teamName === "string" ? entry.teamName.trim() : "";
  const teamSide =
    entry.teamSide === "home" || entry.teamSide === "away"
      ? entry.teamSide
      : undefined;
  const window =
    typeof entry.window === "string" &&
    EXPECTED_GOALS_WINDOWS.has(entry.window as FootballExpectedGoalsWindow)
      ? (entry.window as FootballExpectedGoalsWindow)
      : undefined;
  const observedAt =
    typeof entry.observedAt === "string" && entry.observedAt.trim().length > 0
      ? entry.observedAt.trim()
      : undefined;
  const providerMethod =
    entry.providerMethod === "http-live" ||
    entry.providerMethod === "recorded-snapshot"
      ? entry.providerMethod
      : undefined;
  const metrics = parseExpectedGoalsMetrics(entry.metrics);

  if (
    teamId.length === 0 ||
    teamName.length === 0 ||
    teamSide === undefined ||
    window === undefined ||
    observedAt === undefined ||
    providerMethod === undefined ||
    metrics === undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    teamId,
    teamName,
    teamSide,
    ...(typeof entry.competitionId === "string" &&
    entry.competitionId.trim().length > 0
      ? { competitionId: entry.competitionId.trim() }
      : {}),
    ...(typeof entry.competitionName === "string" &&
    entry.competitionName.trim().length > 0
      ? { competitionName: entry.competitionName.trim() }
      : {}),
    ...(typeof entry.season === "string" && entry.season.trim().length > 0
      ? { season: entry.season.trim() }
      : typeof entry.season === "number" && Number.isFinite(entry.season)
        ? { season: String(entry.season) }
        : {}),
    window,
    metrics,
    observedAt,
    providerMethod,
  });
}

function parseOptionalNonNegativeInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function parseMatchContextMetrics(
  value: unknown,
): FootballMatchContextMetrics | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const restDays = parseOptionalNonNegativeInt(value.restDays);
  const daysSinceLastMatch = parseOptionalNonNegativeInt(value.daysSinceLastMatch);
  const daysUntilNextMatch = parseOptionalNonNegativeInt(value.daysUntilNextMatch);
  const matchesInLast7Days = parseOptionalNonNegativeInt(value.matchesInLast7Days);
  const matchesInLast14Days = parseOptionalNonNegativeInt(value.matchesInLast14Days);
  const fixtureCongestion = parseOptionalNonNegativeInt(value.fixtureCongestion);
  const homeAwayContext =
    value.homeAwayContext === "home" || value.homeAwayContext === "away"
      ? value.homeAwayContext
      : undefined;
  const travelContext =
    value.travelContext === "home" || value.travelContext === "away"
      ? value.travelContext
      : undefined;
  const venueCity =
    typeof value.venueCity === "string" && value.venueCity.trim().length > 0
      ? value.venueCity.trim()
      : undefined;
  const competitionKind =
    value.competitionKind === "cup" ||
    value.competitionKind === "friendly" ||
    value.competitionKind === "league" ||
    value.competitionKind === "other"
      ? (value.competitionKind as FootballCompetitionKind)
      : undefined;
  const competitionTypeLabel =
    typeof value.competitionTypeLabel === "string" &&
    value.competitionTypeLabel.trim().length > 0
      ? value.competitionTypeLabel.trim()
      : undefined;
  const isKnockout =
    typeof value.isKnockout === "boolean" ? value.isKnockout : undefined;
  const roundLabel =
    typeof value.roundLabel === "string" && value.roundLabel.trim().length > 0
      ? value.roundLabel.trim()
      : undefined;
  const leg =
    value.leg === "first" || value.leg === "second"
      ? (value.leg as FootballMatchLeg)
      : undefined;
  const aggregateScore =
    typeof value.aggregateScore === "string" &&
    value.aggregateScore.trim().length > 0
      ? value.aggregateScore.trim()
      : undefined;

  const metrics: FootballMatchContextMetrics = Object.freeze({
    ...(restDays === undefined ? {} : { restDays }),
    ...(daysSinceLastMatch === undefined ? {} : { daysSinceLastMatch }),
    ...(daysUntilNextMatch === undefined ? {} : { daysUntilNextMatch }),
    ...(matchesInLast7Days === undefined ? {} : { matchesInLast7Days }),
    ...(matchesInLast14Days === undefined ? {} : { matchesInLast14Days }),
    ...(fixtureCongestion === undefined ? {} : { fixtureCongestion }),
    ...(homeAwayContext === undefined ? {} : { homeAwayContext }),
    ...(travelContext === undefined ? {} : { travelContext }),
    ...(venueCity === undefined ? {} : { venueCity }),
    ...(competitionKind === undefined ? {} : { competitionKind }),
    ...(competitionTypeLabel === undefined ? {} : { competitionTypeLabel }),
    ...(isKnockout === undefined ? {} : { isKnockout }),
    ...(roundLabel === undefined ? {} : { roundLabel }),
    ...(leg === undefined ? {} : { leg }),
    ...(aggregateScore === undefined ? {} : { aggregateScore }),
  });

  if (Object.keys(metrics).length === 0) {
    return undefined;
  }

  return metrics;
}

function parseMatchContextRecord(
  entry: unknown,
): FootballMatchContextRecord | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
  const teamName = typeof entry.teamName === "string" ? entry.teamName.trim() : "";
  const teamSide =
    entry.teamSide === "home" || entry.teamSide === "away"
      ? entry.teamSide
      : undefined;
  const matchId =
    typeof entry.matchId === "string" && entry.matchId.trim().length > 0
      ? entry.matchId.trim()
      : undefined;
  const observedAt =
    typeof entry.observedAt === "string" && entry.observedAt.trim().length > 0
      ? entry.observedAt.trim()
      : undefined;
  const providerMethod =
    entry.providerMethod === "http-live" ||
    entry.providerMethod === "recorded-snapshot"
      ? entry.providerMethod
      : undefined;
  const metrics = parseMatchContextMetrics(entry.metrics);

  if (
    teamId.length === 0 ||
    teamName.length === 0 ||
    teamSide === undefined ||
    matchId === undefined ||
    observedAt === undefined ||
    providerMethod === undefined ||
    metrics === undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    teamId,
    teamName,
    teamSide,
    matchId,
    ...(typeof entry.competitionId === "string" &&
    entry.competitionId.trim().length > 0
      ? { competitionId: entry.competitionId.trim() }
      : {}),
    ...(typeof entry.competitionName === "string" &&
    entry.competitionName.trim().length > 0
      ? { competitionName: entry.competitionName.trim() }
      : {}),
    ...(typeof entry.season === "string" && entry.season.trim().length > 0
      ? { season: entry.season.trim() }
      : typeof entry.season === "number" && Number.isFinite(entry.season)
        ? { season: String(entry.season) }
        : {}),
    metrics,
    observedAt,
    providerMethod,
  });
}

function freezeBundle(raw: unknown): FootballMatchBundle | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const fixtureRaw = isRecord(raw.fixture) ? raw.fixture : undefined;
  const homeFormRaw = raw.homeForm as FootballTeamForm | undefined;
  const awayFormRaw = raw.awayForm as FootballTeamForm | undefined;
  const homeStats = raw.homeStats as FootballTeamStats | undefined;
  const awayStats = raw.awayStats as FootballTeamStats | undefined;
  const headToHead = raw.headToHead as FootballH2H | undefined;

  if (
    fixtureRaw === undefined ||
    homeFormRaw === undefined ||
    awayFormRaw === undefined ||
    homeStats === undefined ||
    awayStats === undefined ||
    headToHead === undefined
  ) {
    return undefined;
  }

  const referee = parseReferee(fixtureRaw.referee);
  const statusRaw = fixtureRaw.status;
  const status: FootballFixture["status"] =
    statusRaw === "FINISHED" || statusRaw === "OTHER" || statusRaw === "SCHEDULED"
      ? statusRaw
      : "OTHER";
  const completedScoreRaw = isRecord(fixtureRaw.completedScore)
    ? fixtureRaw.completedScore
    : undefined;
  const homeGoals =
    completedScoreRaw !== undefined &&
    typeof completedScoreRaw.homeGoals === "number"
      ? completedScoreRaw.homeGoals
      : undefined;
  const awayGoals =
    completedScoreRaw !== undefined &&
    typeof completedScoreRaw.awayGoals === "number"
      ? completedScoreRaw.awayGoals
      : undefined;
  const completedScore =
    status === "FINISHED" &&
    homeGoals !== undefined &&
    awayGoals !== undefined &&
    Number.isInteger(homeGoals) &&
    Number.isInteger(awayGoals) &&
    homeGoals >= 0 &&
    awayGoals >= 0
      ? Object.freeze({ homeGoals, awayGoals })
      : undefined;
  const fixture: FootballFixture = Object.freeze({
    ...(fixtureRaw as unknown as FootballFixture),
    status,
    completedScore,
    referee,
  });
  const homeFormRecord = homeFormRaw as unknown as FootballTeamForm &
    Record<string, unknown>;
  const awayFormRecord = awayFormRaw as unknown as FootballTeamForm &
    Record<string, unknown>;
  const homeForm = enrichTeamForm(homeFormRaw, {
    homeSplit: parseFormSplit(homeFormRecord.homeSplit),
    awaySplit: parseFormSplit(homeFormRecord.awaySplit),
    recentShort: parseFormSplit(homeFormRecord.recentShort),
    goalsScoredPerMatch:
      typeof homeFormRecord.goalsScoredPerMatch === "number"
        ? homeFormRecord.goalsScoredPerMatch
        : undefined,
    goalsConcededPerMatch:
      typeof homeFormRecord.goalsConcededPerMatch === "number"
        ? homeFormRecord.goalsConcededPerMatch
        : undefined,
  });
  const awayForm = enrichTeamForm(awayFormRaw, {
    homeSplit: parseFormSplit(awayFormRecord.homeSplit),
    awaySplit: parseFormSplit(awayFormRecord.awaySplit),
    recentShort: parseFormSplit(awayFormRecord.recentShort),
    goalsScoredPerMatch:
      typeof awayFormRecord.goalsScoredPerMatch === "number"
        ? awayFormRecord.goalsScoredPerMatch
        : undefined,
    goalsConcededPerMatch:
      typeof awayFormRecord.goalsConcededPerMatch === "number"
        ? awayFormRecord.goalsConcededPerMatch
        : undefined,
  });

  const standings =
    raw.standings === null || raw.standings === undefined
      ? undefined
      : (raw.standings as FootballStandings);

  const playersRaw = Array.isArray(raw.players) ? raw.players : [];
  const absencesRaw = Array.isArray(raw.availabilityAbsences)
    ? raw.availabilityAbsences
    : [];
  const lineupsRaw = Array.isArray(raw.lineups) ? raw.lineups : [];
  const expectedGoalsRaw = Array.isArray(raw.expectedGoals) ? raw.expectedGoals : [];
  const matchContextRaw = Array.isArray(raw.matchContext) ? raw.matchContext : [];

  return Object.freeze({
    fixture,
    homeForm,
    awayForm,
    homeStats: enrichTeamStats(homeStats),
    awayStats: enrichTeamStats(awayStats),
    headToHead: Object.freeze({ ...headToHead }),
    standings: standings === undefined ? undefined : Object.freeze({ ...standings }),
    players: Object.freeze(
      playersRaw.flatMap((entry) => {
        if (!isRecord(entry)) {
          return [];
        }

        const playerId =
          typeof entry.playerId === "string" ? entry.playerId.trim() : "";
        const name = typeof entry.name === "string" ? entry.name.trim() : "";
        const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
        const teamName =
          typeof entry.teamName === "string" ? entry.teamName.trim() : "";
        const teamSide =
          entry.teamSide === "home" || entry.teamSide === "away"
            ? entry.teamSide
            : undefined;
        const providerMethod =
          entry.providerMethod === "http-live" ||
          entry.providerMethod === "recorded-snapshot"
            ? entry.providerMethod
            : undefined;

        if (
          playerId.length === 0 ||
          name.length === 0 ||
          teamId.length === 0 ||
          teamName.length === 0 ||
          teamSide === undefined ||
          providerMethod === undefined
        ) {
          return [];
        }

        const player: FootballPlayer = Object.freeze({
          playerId,
          name,
          teamId,
          teamName,
          teamSide,
          position:
            typeof entry.position === "string" && entry.position.trim().length > 0
              ? entry.position.trim()
              : undefined,
          number:
            typeof entry.number === "number" && Number.isFinite(entry.number)
              ? entry.number
              : undefined,
          nationality:
            typeof entry.nationality === "string" &&
            entry.nationality.trim().length > 0
              ? entry.nationality.trim()
              : undefined,
          photoUrl:
            typeof entry.photoUrl === "string" && entry.photoUrl.trim().length > 0
              ? entry.photoUrl.trim()
              : undefined,
          providerMethod,
        });

        return [player];
      }),
    ),
    availabilityAbsences: Object.freeze(
      absencesRaw.flatMap((entry) => {
        if (!isRecord(entry)) {
          return [];
        }

        const playerId =
          typeof entry.playerId === "string" ? entry.playerId.trim() : "";
        const playerName =
          typeof entry.playerName === "string" ? entry.playerName.trim() : "";
        const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
        const teamName =
          typeof entry.teamName === "string" ? entry.teamName.trim() : "";
        const teamSide =
          entry.teamSide === "home" || entry.teamSide === "away"
            ? entry.teamSide
            : undefined;
        const kind =
          entry.kind === "injury" || entry.kind === "suspension"
            ? entry.kind
            : undefined;
        const providerMethod =
          entry.providerMethod === "http-live" ||
          entry.providerMethod === "recorded-snapshot"
            ? entry.providerMethod
            : undefined;

        if (
          playerId.length === 0 ||
          playerName.length === 0 ||
          teamId.length === 0 ||
          teamName.length === 0 ||
          teamSide === undefined ||
          kind === undefined ||
          providerMethod === undefined
        ) {
          return [];
        }

        const absence: FootballAvailabilityAbsence = Object.freeze({
          playerId,
          playerName,
          teamId,
          teamName,
          teamSide,
          kind,
          reason:
            typeof entry.reason === "string" && entry.reason.trim().length > 0
              ? entry.reason.trim()
              : undefined,
          providerMethod,
        });

        return [absence];
      }),
    ),
    lineups: Object.freeze(
      lineupsRaw.flatMap((entry) => {
        if (!isRecord(entry)) {
          return [];
        }

        const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
        const teamName =
          typeof entry.teamName === "string" ? entry.teamName.trim() : "";
        const teamSide =
          entry.teamSide === "home" || entry.teamSide === "away"
            ? entry.teamSide
            : undefined;
        const providerMethod =
          entry.providerMethod === "http-live" ||
          entry.providerMethod === "recorded-snapshot"
            ? entry.providerMethod
            : undefined;
        const startXI = Array.isArray(entry.startXI)
          ? entry.startXI.flatMap((player) => {
              const mapped = parseLineupPlayer(player);
              return mapped === undefined ? [] : [mapped];
            })
          : [];

        if (
          teamId.length === 0 ||
          teamName.length === 0 ||
          teamSide === undefined ||
          providerMethod === undefined ||
          startXI.length === 0
        ) {
          return [];
        }

        const substitutes = Array.isArray(entry.substitutes)
          ? entry.substitutes.flatMap((player) => {
              const mapped = parseLineupPlayer(player);
              return mapped === undefined ? [] : [mapped];
            })
          : [];

        const lineup: FootballTeamLineup = Object.freeze({
          teamId,
          teamName,
          teamSide,
          formation:
            typeof entry.formation === "string" && entry.formation.trim().length > 0
              ? entry.formation.trim()
              : undefined,
          startXI: Object.freeze(startXI),
          substitutes: Object.freeze(substitutes),
          providerMethod,
        });

        return [lineup];
      }),
    ),
    expectedGoals: Object.freeze(
      expectedGoalsRaw.flatMap((entry) => {
        const mapped = parseExpectedGoalsRecord(entry);
        return mapped === undefined ? [] : [mapped];
      }),
    ),
    matchContext: Object.freeze(
      matchContextRaw.flatMap((entry) => {
        const mapped = parseMatchContextRecord(entry);
        return mapped === undefined ? [] : [mapped];
      }),
    ),
  });
}

export class RecordedFootballCatalog
  implements FootballMatchCatalog, FootballFixturesSource
{
  readonly #byMatchId: ReadonlyMap<string, FootballMatchBundle>;
  readonly #bundles: readonly FootballMatchBundle[];

  constructor(bundles?: readonly FootballMatchBundle[]) {
    const loaded = bundles ?? loadDefaultBundles();
    this.#bundles = Object.freeze([...loaded]);
    this.#byMatchId = new Map(
      loaded.map((bundle) => [bundle.fixture.matchId, bundle]),
    );
  }

  getMatchBundle(matchId: string): FootballMatchBundle | undefined {
    return this.#byMatchId.get(matchId);
  }

  listBundles(): readonly FootballMatchBundle[] {
    return this.#bundles;
  }

  async listUpcoming(options?: {
    readonly fromDate?: string;
    readonly toDate?: string;
  }): Promise<readonly FootballBoardRow[]> {
    const fromDate = options?.fromDate;
    const toDate = options?.toDate;

    const rows = this.#bundles
      .filter((bundle) => {
        const day = bundle.fixture.kickoff.slice(0, 10);

        if (fromDate !== undefined && day < fromDate) {
          return false;
        }

        if (toDate !== undefined && day > toDate) {
          return false;
        }

        return true;
      })
      .map(mapBundleToBoardRow)
      .sort((left, right) => left.kickoff.localeCompare(right.kickoff));

    return Object.freeze(rows);
  }
}

function loadBundlesFromFile(path: string): FootballMatchBundle[] {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));

  if (!isRecord(parsed) || !Array.isArray(parsed.bundles)) {
    return [];
  }

  const bundles: FootballMatchBundle[] = [];

  for (const item of parsed.bundles) {
    const frozen = freezeBundle(item);

    if (frozen !== undefined) {
      bundles.push(frozen);
    }
  }

  return bundles;
}

function loadDefaultBundles(): readonly FootballMatchBundle[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const fixtureFiles = [
    join(here, "../../fixtures/match-bundles-k-league.json"),
    join(here, "../../fixtures/match-bundles-veikkausliiga.json"),
  ];
  const bundles = fixtureFiles.flatMap((path) => loadBundlesFromFile(path));

  return Object.freeze(bundles);
}
