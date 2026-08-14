/**
 * P2K-G2-A — Validation Dataset Diversity Expansion templates.
 *
 * New deterministic fixture templates for the match-p2kg-expansion-v2-* namespace.
 * Each template carries genuinely different Evidence (form / stats / H2H / odds and,
 * for enriched templates, Expected Goals / Manager Intelligence / Availability /
 * Advanced statistics / Player evidence), which drives different Feature / Rule /
 * Projection / prediction-profile / confidence output through the real AnalyzeMatch
 * composition (verified empirically in the P2K-G2-A probe).
 *
 * Outcomes are attached ONLY as MATCH_RESULT Evidence overlay (never written into
 * RuleResult / Sidecar prediction / parameter provenance). Nothing here mutates
 * existing fixtures, History, Sidecars, or SEALED cohorts.
 */
import type { FixtureMatch } from "@fas/provider-fixture";
import { VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE } from "./bootstrap-validation-history-sidecar.js";

export const EXPANSION_V2_PROJECTION_POLICY_PIN = "v2" as const;

/** New isolated namespace — never reuses match-example-* / match-p2kg-recovery-v2-*. */
export const EXPANSION_V2_MATCH_IDS: readonly string[] = Object.freeze(
  Array.from({ length: 30 }, (_, index) => `match-p2kg-expansion-v2-${index + 1}`),
);

export interface ExpansionV2FtOutcome {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly winner: "away" | "draw" | "home";
}

/**
 * Deterministic FT outcomes for the 30 expansion templates.
 * Distribution (30 rows): Home 10 / Draw 9 / Away 11; goal totals span
 * 0, 1, 2, 3, 4, 5, 6 — no single-goal-range collapse.
 */
export const EXPANSION_V2_OUTCOMES: Readonly<Record<string, ExpansionV2FtOutcome>> =
  Object.freeze({
    "match-p2kg-expansion-v2-1": Object.freeze({
      homeGoals: 2,
      awayGoals: 0,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-2": Object.freeze({
      homeGoals: 3,
      awayGoals: 1,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-3": Object.freeze({
      homeGoals: 1,
      awayGoals: 0,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-4": Object.freeze({
      homeGoals: 2,
      awayGoals: 1,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-5": Object.freeze({
      homeGoals: 1,
      awayGoals: 1,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-6": Object.freeze({
      homeGoals: 1,
      awayGoals: 1,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-7": Object.freeze({
      homeGoals: 0,
      awayGoals: 0,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-8": Object.freeze({
      homeGoals: 0,
      awayGoals: 1,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-9": Object.freeze({
      homeGoals: 1,
      awayGoals: 2,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-10": Object.freeze({
      homeGoals: 0,
      awayGoals: 2,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-11": Object.freeze({
      homeGoals: 1,
      awayGoals: 3,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-12": Object.freeze({
      homeGoals: 4,
      awayGoals: 2,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-13": Object.freeze({
      homeGoals: 2,
      awayGoals: 2,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-14": Object.freeze({
      homeGoals: 2,
      awayGoals: 3,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-15": Object.freeze({
      homeGoals: 1,
      awayGoals: 0,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-16": Object.freeze({
      homeGoals: 1,
      awayGoals: 1,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-17": Object.freeze({
      homeGoals: 0,
      awayGoals: 0,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-18": Object.freeze({
      homeGoals: 2,
      awayGoals: 1,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-19": Object.freeze({
      homeGoals: 0,
      awayGoals: 2,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-20": Object.freeze({
      homeGoals: 3,
      awayGoals: 0,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-21": Object.freeze({
      homeGoals: 1,
      awayGoals: 1,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-22": Object.freeze({
      homeGoals: 2,
      awayGoals: 1,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-23": Object.freeze({
      homeGoals: 2,
      awayGoals: 0,
      winner: "home",
    }),
    "match-p2kg-expansion-v2-24": Object.freeze({
      homeGoals: 0,
      awayGoals: 1,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-25": Object.freeze({
      homeGoals: 1,
      awayGoals: 1,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-26": Object.freeze({
      homeGoals: 0,
      awayGoals: 1,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-27": Object.freeze({
      homeGoals: 1,
      awayGoals: 1,
      winner: "draw",
    }),
    "match-p2kg-expansion-v2-28": Object.freeze({
      homeGoals: 0,
      awayGoals: 2,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-29": Object.freeze({
      homeGoals: 0,
      awayGoals: 2,
      winner: "away",
    }),
    "match-p2kg-expansion-v2-30": Object.freeze({
      homeGoals: 1,
      awayGoals: 2,
      winner: "away",
    }),
  });

export interface ExpansionV2ShapeBuilders {
  form(
    teamSide: "away" | "home",
    results: readonly string[],
    goalsFor: readonly number[],
    goalsAgainst: readonly number[],
  ): unknown;
  stats(
    teamSide: "away" | "home",
    windowMatches: number,
    shotsForPerMatch: number,
    shotsAgainstPerMatch: number,
    xgForPerMatch: number,
    xgAgainstPerMatch: number,
    advanced?: Readonly<{
      scope: "fixture" | "season-average";
      possessionPct?: number;
      shotsTotal?: number;
    }>,
  ): unknown;
}

const OBSERVED_AT = "2026-08-16T10:00:00Z";
const KICKOFF = "2026-08-16T19:30:00Z";

function form(
  teamSide: "away" | "home",
  results: readonly string[],
  goalsFor: readonly number[],
  goalsAgainst: readonly number[],
) {
  return Object.freeze({
    teamSide,
    window: results.length,
    results: Object.freeze([...results]),
    goalsFor: Object.freeze([...goalsFor]),
    goalsAgainst: Object.freeze([...goalsAgainst]),
  });
}

function stats(
  teamSide: "away" | "home",
  windowMatches: number,
  shotsForPerMatch: number,
  shotsAgainstPerMatch: number,
  xgForPerMatch: number,
  xgAgainstPerMatch: number,
  advanced?: Readonly<{
    scope: "fixture" | "season-average";
    possessionPct?: number;
    shotsTotal?: number;
  }>,
) {
  const base = Object.freeze({
    teamSide,
    windowMatches,
    shotsForPerMatch,
    shotsAgainstPerMatch,
    xgForPerMatch,
    xgAgainstPerMatch,
  });
  return advanced === undefined ? base : Object.freeze({ ...base, advanced });
}

function h2h(
  meetings: readonly Readonly<{
    playedAt: string;
    homeGoals: number;
    awayGoals: number;
  }>[],
) {
  return Object.freeze({
    sampleSize: meetings.length,
    meetings: Object.freeze(
      meetings.map((meeting) => Object.freeze({ ...meeting })),
    ),
  });
}

function odds(homeOdds: number, drawOdds: number, awayOdds: number) {
  return Object.freeze({ homeOdds, drawOdds, awayOdds, observedAt: OBSERVED_AT });
}

function xgBlock(
  homeId: string,
  homeName: string,
  awayId: string,
  awayName: string,
  homeXg: number,
  homeXga: number,
  awayXg: number,
  awayXga: number,
) {
  return Object.freeze([
    Object.freeze({
      teamId: homeId,
      teamName: homeName,
      teamSide: "home",
      window: "overall",
      metrics: Object.freeze({ xg: homeXg, xga: homeXga }),
      observedAt: OBSERVED_AT,
    }),
    Object.freeze({
      teamId: awayId,
      teamName: awayName,
      teamSide: "away",
      window: "overall",
      metrics: Object.freeze({ xg: awayXg, xga: awayXga }),
      observedAt: OBSERVED_AT,
    }),
  ]);
}

function managerBlock(
  homeId: string,
  homeName: string,
  awayId: string,
  awayName: string,
  homeTenureDays: number,
  awayTenureDays: number,
  homeManager: string,
  awayManager: string,
) {
  const mk = (
    teamId: string,
    teamName: string,
    teamSide: "away" | "home",
    tenureDays: number,
    managerName: string,
    managerId: string,
  ) =>
    Object.freeze({
      teamId,
      teamName,
      teamSide,
      managerId,
      managerName,
      competitionId: "exp-competition",
      competitionName: "League",
      season: "2026",
      nationality: "Any",
      age: 48,
      appointmentDate: "2025-01-01",
      tenureDays,
      previousClubs: Object.freeze(["Club A", "Club B"]),
      matchManagerConfirmed: true,
      observedAt: OBSERVED_AT,
    });
  return Object.freeze([
    mk(homeId, homeName, "home", homeTenureDays, homeManager, `mh-${homeId}`),
    mk(awayId, awayName, "away", awayTenureDays, awayManager, `ma-${awayId}`),
  ]);
}

function absenceBlock(homeName: string, awayName: string) {
  return Object.freeze([
    Object.freeze({
      playerId: "p1",
      playerName: "Home Defender",
      teamId: "h-1",
      teamName: homeName,
      teamSide: "home",
      kind: "injury",
      reason: "Ankle",
    }),
    Object.freeze({
      playerId: "p2",
      playerName: "Away Midfielder",
      teamId: "a-1",
      teamName: awayName,
      teamSide: "away",
      kind: "suspension",
      reason: "Cards",
    }),
  ]);
}

function playerBlock(
  homeId: string,
  homeName: string,
  awayId: string,
  awayName: string,
  homeRating: number,
  awayRating: number,
) {
  const mk = (
    playerId: string,
    name: string,
    teamId: string,
    teamName: string,
    teamSide: "away" | "home",
    rating: number,
    position: string,
  ) =>
    Object.freeze({
      playerId,
      name,
      teamId,
      teamName,
      teamSide,
      position,
      number: 9,
      age: 27,
      nationality: "Any",
      captain: false,
      seasonStats: Object.freeze({
        competitionId: "exp-competition",
        season: 2026,
        appearances: 22,
        starts: 20,
        minutesPlayed: 1800,
        rating,
      }),
    });
  return Object.freeze([
    mk(
      `ph-${homeId}-1`,
      `${homeName} Striker`,
      homeId,
      homeName,
      "home",
      homeRating,
      "Forward",
    ),
    mk(
      `ph-${homeId}-2`,
      `${homeName} Mid`,
      homeId,
      homeName,
      "home",
      homeRating - 0.3,
      "Midfielder",
    ),
    mk(
      `pa-${awayId}-1`,
      `${awayName} Striker`,
      awayId,
      awayName,
      "away",
      awayRating,
      "Forward",
    ),
    mk(
      `pa-${awayId}-2`,
      `${awayName} Mid`,
      awayId,
      awayName,
      "away",
      awayRating - 0.3,
      "Midfielder",
    ),
  ]);
}

function advanced(
  scope: "fixture" | "season-average",
  possessionPct?: number,
  shotsTotal?: number,
) {
  return Object.freeze({
    scope,
    ...(possessionPct === undefined ? {} : { possessionPct }),
    ...(shotsTotal === undefined ? {} : { shotsTotal }),
  });
}

interface Enrichment {
  readonly expectedGoals: ReturnType<typeof xgBlock>;
  readonly managerIntelligence: ReturnType<typeof managerBlock>;
  readonly availabilityAbsences: ReturnType<typeof absenceBlock>;
  readonly players: ReturnType<typeof playerBlock>;
}

export interface ExpansionTemplateShape extends Record<string, unknown> {
  readonly matchId: string;
  readonly home: string;
  readonly away: string;
  readonly kickoff: string;
  readonly teamForm: readonly unknown[];
  readonly statistics: readonly unknown[];
  readonly headToHead: unknown;
  readonly odds: unknown;
  readonly expectedGoals?: unknown;
  readonly managerIntelligence?: unknown;
  readonly availabilityAbsences?: unknown;
  readonly players?: unknown;
}

const homeForms = {
  allW: form("home", ["W", "W", "W", "W", "W"], [2, 3, 2, 1, 3], [0, 1, 0, 1, 0]),
  strongW: form("home", ["W", "W", "D", "W", "W"], [2, 3, 1, 2, 0], [0, 1, 1, 1, 1]),
  mixedW: form("home", ["W", "D", "W", "L", "W"], [1, 2, 1, 0, 2], [1, 1, 2, 1, 0]),
  balanced: form(
    "home",
    ["D", "W", "D", "L", "W"],
    [1, 1, 0, 2, 1],
    [0, 1, 1, 1, 1],
  ),
  mixedL: form("home", ["L", "D", "W", "L", "D"], [0, 1, 1, 2, 0], [2, 1, 3, 1, 2]),
  allL: form("home", ["L", "L", "L", "L", "L"], [0, 1, 0, 1, 0], [2, 1, 2, 2, 1]),
};

const awayForms = {
  allW: form("away", ["W", "W", "W", "W", "W"], [2, 3, 2, 1, 3], [0, 1, 0, 1, 0]),
  strongW: form("away", ["W", "W", "D", "W", "W"], [2, 3, 1, 2, 0], [0, 1, 1, 1, 1]),
  mixedW: form("away", ["W", "D", "W", "L", "W"], [1, 2, 1, 0, 2], [1, 1, 2, 1, 0]),
  balanced: form(
    "away",
    ["D", "W", "D", "L", "W"],
    [1, 1, 0, 2, 1],
    [0, 1, 1, 1, 1],
  ),
  mixedL: form("away", ["L", "D", "W", "L", "D"], [0, 1, 1, 2, 0], [2, 1, 3, 1, 2]),
  allL: form("away", ["L", "L", "L", "L", "L"], [0, 1, 0, 1, 0], [2, 1, 2, 2, 1]),
};

const homeLeanH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 2, awayGoals: 0 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 1, awayGoals: 0 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 2, awayGoals: 1 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 1 },
  { playedAt: "2023-10-15T15:00:00Z", homeGoals: 3, awayGoals: 1 },
]);
const balancedH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 1, awayGoals: 1 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 0, awayGoals: 1 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 2, awayGoals: 2 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 0 },
]);
const awayLeanH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 0, awayGoals: 2 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 1, awayGoals: 2 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 0, awayGoals: 1 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 1 },
]);
const drawHeavyH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 1, awayGoals: 1 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 0, awayGoals: 0 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 2, awayGoals: 2 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 1 },
  { playedAt: "2023-10-15T15:00:00Z", homeGoals: 1, awayGoals: 1 },
]);
const openH2h = h2h([
  { playedAt: "2025-12-01T15:00:00Z", homeGoals: 3, awayGoals: 2 },
  { playedAt: "2025-05-10T15:00:00Z", homeGoals: 2, awayGoals: 2 },
  { playedAt: "2024-11-20T15:00:00Z", homeGoals: 4, awayGoals: 1 },
  { playedAt: "2024-04-02T15:00:00Z", homeGoals: 2, awayGoals: 3 },
  { playedAt: "2023-10-15T15:00:00Z", homeGoals: 3, awayGoals: 1 },
]);

const homeFavoredOdds = odds(1.55, 4.2, 5.8);
const awayFavoredOdds = odds(5.8, 4.2, 1.55);
const balancedOdds = odds(2.4, 3.3, 2.9);
const slightAwayOdds = odds(2.9, 3.3, 2.35);
const conflictOdds = odds(3.6, 3.4, 2.05);

interface TemplateSpec {
  readonly home: string;
  readonly away: string;
  readonly homeForm: ReturnType<typeof form>;
  readonly awayForm: ReturnType<typeof form>;
  readonly homeStats: ReturnType<typeof stats>;
  readonly awayStats: ReturnType<typeof stats>;
  readonly h2h: ReturnType<typeof h2h>;
  readonly odds: ReturnType<typeof odds>;
  readonly enrich?: Enrichment;
}

function rich(
  homeId: string,
  homeName: string,
  awayId: string,
  awayName: string,
  hXg: number,
  hXga: number,
  aXg: number,
  aXga: number,
  hTenure: number,
  aTenure: number,
  hMgr: string,
  aMgr: string,
  hRating: number,
  aRating: number,
): Enrichment {
  return {
    expectedGoals: xgBlock(homeId, homeName, awayId, awayName, hXg, hXga, aXg, aXga),
    managerIntelligence: managerBlock(
      homeId,
      homeName,
      awayId,
      awayName,
      hTenure,
      aTenure,
      hMgr,
      aMgr,
    ),
    availabilityAbsences: absenceBlock(homeName, awayName),
    players: playerBlock(homeId, homeName, awayId, awayName, hRating, aRating),
  };
}

function spec(
  matchId: string,
  input: TemplateSpec,
): readonly [string, ExpansionTemplateShape] {
  const shape: ExpansionTemplateShape = Object.freeze({
    matchId,
    home: input.home,
    away: input.away,
    kickoff: KICKOFF,
    teamForm: Object.freeze([input.homeForm, input.awayForm]),
    statistics: Object.freeze([input.homeStats, input.awayStats]),
    headToHead: input.h2h,
    odds: input.odds,
    ...(input.enrich === undefined
      ? {}
      : {
          expectedGoals: input.enrich.expectedGoals,
          managerIntelligence: input.enrich.managerIntelligence,
          availabilityAbsences: input.enrich.availabilityAbsences,
          players: input.enrich.players,
        }),
  });
  return [matchId, shape];
}

/** Template shapes keyed by matchId (30 entries). Content only — outcomes attached by the provider. */
export const EXPANSION_V2_TEMPLATES: Readonly<
  Record<string, ExpansionTemplateShape>
> = Object.freeze(
  Object.fromEntries([
    spec("match-p2kg-expansion-v2-1", {
      home: "Manchester City",
      away: "Sheffield United",
      homeForm: homeForms.allW,
      awayForm: awayForms.allL,
      homeStats: stats(
        "home",
        5,
        17,
        8,
        2.1,
        0.9,
        advanced("season-average", 58, 21),
      ),
      awayStats: stats(
        "away",
        5,
        8,
        16,
        0.9,
        1.8,
        advanced("season-average", 42, 9),
      ),
      h2h: homeLeanH2h,
      odds: homeFavoredOdds,
      enrich: rich(
        "h-mci",
        "Manchester City",
        "a-shu",
        "Sheffield United",
        2.2,
        0.8,
        0.8,
        1.9,
        1200,
        200,
        "Pep Guardiola",
        "Chris Wilder",
        7.6,
        6.4,
      ),
    }),
    spec("match-p2kg-expansion-v2-2", {
      home: "Liverpool",
      away: "Southampton",
      homeForm: homeForms.strongW,
      awayForm: awayForms.mixedL,
      homeStats: stats("home", 5, 15, 9, 1.8, 1.0),
      awayStats: stats("away", 5, 10, 14, 1.0, 1.7),
      h2h: homeLeanH2h,
      odds: homeFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-3", {
      home: "Arsenal",
      away: "Crystal Palace",
      homeForm: homeForms.mixedW,
      awayForm: awayForms.balanced,
      homeStats: stats(
        "home",
        5,
        12,
        11,
        1.4,
        1.2,
        advanced("season-average", 52, 13),
      ),
      awayStats: stats(
        "away",
        5,
        11,
        12,
        1.2,
        1.3,
        advanced("season-average", 50, 11),
      ),
      h2h: homeLeanH2h,
      odds: homeFavoredOdds,
      enrich: rich(
        "h-ars",
        "Arsenal",
        "a-cry",
        "Crystal Palace",
        1.6,
        1.0,
        1.1,
        1.4,
        900,
        400,
        "Mikel Arteta",
        "Oliver Glasner",
        7.2,
        6.9,
      ),
    }),
    spec("match-p2kg-expansion-v2-4", {
      home: "Chelsea",
      away: "Everton",
      homeForm: homeForms.mixedW,
      awayForm: awayForms.balanced,
      homeStats: stats("home", 5, 12, 12, 1.3, 1.3),
      awayStats: stats("away", 5, 12, 12, 1.3, 1.3),
      h2h: balancedH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-5", {
      home: "Inter Milan",
      away: "Atalanta",
      homeForm: homeForms.balanced,
      awayForm: awayForms.balanced,
      homeStats: stats(
        "home",
        5,
        12,
        12,
        1.3,
        1.3,
        advanced("season-average", 50, 12),
      ),
      awayStats: stats(
        "away",
        5,
        12,
        12,
        1.3,
        1.3,
        advanced("season-average", 50, 12),
      ),
      h2h: balancedH2h,
      odds: balancedOdds,
      enrich: rich(
        "h-int",
        "Inter Milan",
        "a-ata",
        "Atalanta",
        1.5,
        1.2,
        1.5,
        1.2,
        700,
        500,
        "Simone Inzaghi",
        "Gian Piero Gasperini",
        7.0,
        7.0,
      ),
    }),
    spec("match-p2kg-expansion-v2-6", {
      home: "AC Milan",
      away: "Roma",
      homeForm: homeForms.balanced,
      awayForm: awayForms.balanced,
      homeStats: stats(
        "home",
        5,
        11,
        12,
        1.2,
        1.3,
        advanced("season-average", 50, 11),
      ),
      awayStats: stats(
        "away",
        5,
        11,
        12,
        1.2,
        1.3,
        advanced("season-average", 50, 11),
      ),
      h2h: drawHeavyH2h,
      odds: balancedOdds,
      enrich: rich(
        "h-mil",
        "AC Milan",
        "a-rom",
        "Roma",
        1.4,
        1.3,
        1.4,
        1.3,
        600,
        650,
        "Paulo Fonseca",
        "Daniele De Rossi",
        7.0,
        7.0,
      ),
    }),
    spec("match-p2kg-expansion-v2-7", {
      home: "Bologna",
      away: "Torino",
      homeForm: homeForms.mixedW,
      awayForm: awayForms.mixedL,
      homeStats: stats("home", 5, 10, 13, 1.1, 1.4),
      awayStats: stats("away", 5, 10, 13, 1.1, 1.4),
      h2h: drawHeavyH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-8", {
      home: "Lyon",
      away: "Strasbourg",
      homeForm: homeForms.mixedL,
      awayForm: awayForms.mixedW,
      homeStats: stats(
        "home",
        5,
        11,
        13,
        1.2,
        1.4,
        advanced("season-average", 47, 10),
      ),
      awayStats: stats(
        "away",
        5,
        13,
        11,
        1.4,
        1.2,
        advanced("season-average", 53, 13),
      ),
      h2h: awayLeanH2h,
      odds: slightAwayOdds,
      enrich: rich(
        "h-lyo",
        "Lyon",
        "a-str",
        "Strasbourg",
        1.2,
        1.5,
        1.5,
        1.1,
        500,
        800,
        "Pierre Sage",
        "Liam Rosenior",
        6.8,
        7.1,
      ),
    }),
    spec("match-p2kg-expansion-v2-9", {
      home: "Marseille",
      away: "Nice",
      homeForm: homeForms.balanced,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 11, 12, 1.2, 1.3),
      awayStats: stats("away", 5, 13, 11, 1.4, 1.2),
      h2h: awayLeanH2h,
      odds: awayFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-10", {
      home: "Getafe",
      away: "Real Madrid",
      homeForm: homeForms.allL,
      awayForm: awayForms.allW,
      homeStats: stats(
        "home",
        5,
        8,
        16,
        0.9,
        1.8,
        advanced("season-average", 41, 8),
      ),
      awayStats: stats(
        "away",
        5,
        17,
        8,
        2.1,
        0.9,
        advanced("season-average", 57, 20),
      ),
      h2h: awayLeanH2h,
      odds: awayFavoredOdds,
      enrich: rich(
        "h-get",
        "Getafe",
        "a-rma",
        "Real Madrid",
        0.9,
        1.9,
        2.3,
        0.7,
        300,
        1500,
        "Jose Bordalas",
        "Carlo Ancelotti",
        6.5,
        7.8,
      ),
    }),
    spec("match-p2kg-expansion-v2-11", {
      home: "Alaves",
      away: "Atletico Madrid",
      homeForm: homeForms.mixedL,
      awayForm: awayForms.strongW,
      homeStats: stats("home", 5, 9, 15, 1.0, 1.7),
      awayStats: stats("away", 5, 15, 9, 1.8, 1.0),
      h2h: awayLeanH2h,
      odds: awayFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-12", {
      home: "Bayern Munich",
      away: "Mainz",
      homeForm: homeForms.allW,
      awayForm: awayForms.mixedL,
      homeStats: stats(
        "home",
        5,
        17,
        14,
        2.2,
        1.6,
        advanced("season-average", 56, 19),
      ),
      awayStats: stats(
        "away",
        5,
        12,
        15,
        1.4,
        1.7,
        advanced("season-average", 46, 11),
      ),
      h2h: openH2h,
      odds: homeFavoredOdds,
      enrich: rich(
        "h-bay",
        "Bayern Munich",
        "a-mai",
        "Mainz",
        2.4,
        1.3,
        1.3,
        1.8,
        1100,
        350,
        "Vincent Kompany",
        "Bo Henriksen",
        7.7,
        6.7,
      ),
    }),
    spec("match-p2kg-expansion-v2-13", {
      home: "RB Leipzig",
      away: "Werder Bremen",
      homeForm: homeForms.mixedW,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 16, 14, 2.0, 1.6),
      awayStats: stats("away", 5, 16, 14, 2.0, 1.6),
      h2h: openH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-14", {
      home: "Wolfsburg",
      away: "Borussia Dortmund",
      homeForm: homeForms.mixedL,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 12, 15, 1.4, 1.7),
      awayStats: stats("away", 5, 17, 14, 2.2, 1.6),
      h2h: openH2h,
      odds: awayFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-15", {
      home: "Juventus",
      away: "Udinese",
      homeForm: homeForms.strongW,
      awayForm: awayForms.mixedL,
      homeStats: stats(
        "home",
        5,
        10,
        8,
        1.1,
        0.9,
        advanced("season-average", 55, 11),
      ),
      awayStats: stats(
        "away",
        5,
        8,
        13,
        0.9,
        1.4,
        advanced("season-average", 45, 8),
      ),
      h2h: homeLeanH2h,
      odds: homeFavoredOdds,
      enrich: rich(
        "h-juv",
        "Juventus",
        "a-udi",
        "Udinese",
        1.2,
        0.8,
        0.9,
        1.5,
        1000,
        300,
        "Thiago Motta",
        "Kosta Runjaic",
        7.1,
        6.5,
      ),
    }),
    spec("match-p2kg-expansion-v2-16", {
      home: "Fiorentina",
      away: "Genoa",
      homeForm: homeForms.balanced,
      awayForm: awayForms.balanced,
      homeStats: stats("home", 5, 9, 10, 1.0, 1.0),
      awayStats: stats("away", 5, 9, 10, 1.0, 1.0),
      h2h: balancedH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-17", {
      home: "Cagliari",
      away: "Venezia",
      homeForm: homeForms.allL,
      awayForm: awayForms.allL,
      homeStats: stats("home", 5, 8, 12, 0.9, 1.2),
      awayStats: stats("away", 5, 8, 12, 0.9, 1.2),
      h2h: drawHeavyH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-18", {
      home: "Tottenham Hotspur",
      away: "Fulham",
      homeForm: homeForms.strongW,
      awayForm: awayForms.mixedL,
      homeStats: stats("home", 5, 15, 9, 1.8, 1.0),
      awayStats: stats("away", 5, 10, 14, 1.0, 1.7),
      h2h: homeLeanH2h,
      odds: conflictOdds,
    }),
    spec("match-p2kg-expansion-v2-19", {
      home: "Valencia",
      away: "Sevilla",
      homeForm: homeForms.mixedL,
      awayForm: awayForms.strongW,
      homeStats: stats("home", 5, 9, 15, 1.0, 1.7),
      awayStats: stats("away", 5, 15, 9, 1.8, 1.0),
      h2h: awayLeanH2h,
      odds: homeFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-20", {
      home: "Newcastle United",
      away: "Burnley",
      homeForm: homeForms.allW,
      awayForm: awayForms.allL,
      homeStats: stats("home", 5, 18, 7, 2.3, 0.8),
      awayStats: stats("away", 5, 7, 19, 0.8, 2.0),
      h2h: homeLeanH2h,
      odds: homeFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-21", {
      home: "Villarreal",
      away: "Girona",
      homeForm: homeForms.mixedL,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 11, 13, 1.2, 1.4),
      awayStats: stats("away", 5, 13, 11, 1.4, 1.2),
      h2h: awayLeanH2h,
      odds: homeFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-22", {
      home: "PSV Eindhoven",
      away: "Feyenoord",
      homeForm: homeForms.mixedW,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 14, 13, 1.6, 1.5),
      awayStats: stats("away", 5, 14, 13, 1.6, 1.5),
      h2h: openH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-23", {
      home: "Brighton",
      away: "Ipswich Town",
      homeForm: homeForms.allW,
      awayForm: awayForms.allL,
      homeStats: stats("home", 5, 14, 7, 1.6, 0.8),
      awayStats: stats("away", 5, 8, 15, 0.9, 1.7),
      h2h: homeLeanH2h,
      odds: homeFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-24", {
      home: "West Ham United",
      away: "Brentford",
      homeForm: homeForms.mixedL,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 10, 13, 1.1, 1.4),
      awayStats: stats("away", 5, 12, 8, 1.3, 0.9),
      h2h: awayLeanH2h,
      odds: awayFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-25", {
      home: "Nottingham Forest",
      away: "Aston Villa",
      homeForm: homeForms.balanced,
      awayForm: awayForms.balanced,
      homeStats: stats("home", 5, 11, 11, 1.2, 1.1),
      awayStats: stats("away", 5, 11, 11, 1.2, 1.1),
      h2h: balancedH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-26", {
      home: "Southampton",
      away: "Bournemouth",
      homeForm: homeForms.mixedL,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 9, 12, 1.0, 1.2),
      awayStats: stats("away", 5, 13, 10, 1.4, 1.0),
      h2h: awayLeanH2h,
      odds: slightAwayOdds,
    }),
    spec("match-p2kg-expansion-v2-27", {
      home: "Coventry City",
      away: "Derby County",
      homeForm: homeForms.balanced,
      awayForm: awayForms.balanced,
      homeStats: stats("home", 5, 10, 10, 1.1, 1.0),
      awayStats: stats("away", 5, 10, 10, 1.1, 1.0),
      h2h: drawHeavyH2h,
      odds: balancedOdds,
    }),
    spec("match-p2kg-expansion-v2-28", {
      home: "Sheffield Wednesday",
      away: "Sunderland",
      homeForm: homeForms.allL,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 8, 12, 0.9, 1.2),
      awayStats: stats("away", 5, 14, 9, 1.5, 1.0),
      h2h: awayLeanH2h,
      odds: awayFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-29", {
      home: "Leicester City",
      away: "Middlesbrough",
      homeForm: homeForms.allL,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 7, 10, 0.8, 1.0),
      awayStats: stats("away", 5, 10, 11, 1.1, 1.2),
      h2h: awayLeanH2h,
      odds: awayFavoredOdds,
    }),
    spec("match-p2kg-expansion-v2-30", {
      home: "Stoke City",
      away: "Norwich City",
      homeForm: homeForms.allL,
      awayForm: awayForms.mixedW,
      homeStats: stats("home", 5, 8, 11, 0.9, 1.1),
      awayStats: stats("away", 5, 11, 10, 1.2, 1.0),
      h2h: awayLeanH2h,
      odds: awayFavoredOdds,
    }),
  ]),
);

/** Shape guard mirroring the recovery bootstrap (matchId + kickoff required). */
export function isExpansionFixtureShape(
  value: unknown,
): value is ExpansionTemplateShape {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { matchId?: unknown }).matchId === "string" &&
    typeof (value as { kickoff?: unknown }).kickoff === "string"
  );
}

function winnerFromGoals(
  homeGoals: number,
  awayGoals: number,
): "away" | "draw" | "home" {
  if (homeGoals > awayGoals) {
    return "home";
  }
  if (awayGoals > homeGoals) {
    return "away";
  }
  return "draw";
}

function attachMatchResult(
  shape: ExpansionTemplateShape,
  outcome: ExpansionV2FtOutcome,
): unknown {
  const winner = winnerFromGoals(outcome.homeGoals, outcome.awayGoals);
  if (winner !== outcome.winner) {
    throw new Error(
      `Expansion outcome winner mismatch for ${shape.matchId}: goals imply ${winner}, got ${outcome.winner}.`,
    );
  }
  return Object.freeze({
    ...shape,
    matchResult: Object.freeze({
      homeGoals: outcome.homeGoals,
      awayGoals: outcome.awayGoals,
      winner: outcome.winner,
      totalGoals: outcome.homeGoals + outcome.awayGoals,
      matchStatus: "FINISHED",
      providerSource: VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
      providerSourceId: `${VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE}:${shape.matchId}:result`,
      providerMethod: VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
      observedAt: shape.kickoff,
    }),
  });
}

/** Content accessor used by the bootstrap provider (never mutates). */
export function expansionFixtureShape(matchId: string): unknown {
  const shape = EXPANSION_V2_TEMPLATES[matchId];
  if (shape === undefined) {
    return undefined;
  }
  const outcome = EXPANSION_V2_OUTCOMES[matchId];
  if (outcome === undefined) {
    throw new Error(`No FT outcome configured for expansion matchId "${matchId}".`);
  }
  return attachMatchResult(shape, outcome);
}

/** Exported for symmetry with FixtureProvider typing (not used by the pipeline). */
export type { FixtureMatch };
