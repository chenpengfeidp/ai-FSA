import type { Evidence } from "@fas/evidence";
import {
  createFeatureBundle,
  FEATURE_MODEL_VERSION,
  type FeatureBundle,
  type FeatureBundleStatus,
} from "../domain/feature-bundle.js";
import { createFeature, type Feature, type FeatureName } from "../domain/feature.js";
import {
  computeAsianHandicapLean,
  computeAttackEfficiency,
  computeAttackRating,
  computeAvailabilityPenalty,
  computeChanceCreation,
  computeDefenseRating,
  computeDisciplineRisk,
  computeFatigueIndex,
  computeFinishingEfficiency,
  computeH2hLean,
  computeHomeStability,
  computeImpliedProbabilities,
  computeKnockoutContext,
  computeMarketLean,
  computeMomentum,
  computePossessionDominance,
  computeRecentFormScore,
  computeRotationPressure,
  computeScheduleAdvantage,
  computeXgAttackQuality,
  computeXgDefenseQuality,
  computeXgDominance,
  DEFAULT_HOME_ADVANTAGE,
  roundFeature,
  VENUE_ADVANTAGE_SCORE,
  type AdvancedStatInputs,
} from "./feature-math.js";
import { stableChecksum } from "./stable-checksum.js";

export type FeatureExtractionErrorCode =
  | "MATCH_ID_REQUIRED"
  | "MATCH_INFO_FIELD_INVALID"
  | "MIXED_MATCHES";

export class FeatureExtractionError extends Error {
  readonly code: FeatureExtractionErrorCode;
  readonly field: string | undefined;

  constructor(code: FeatureExtractionErrorCode, message: string, field?: string) {
    super(message);
    this.name = "FeatureExtractionError";
    this.code = code;
    this.field = field;
  }
}

const emptyFeatures = Object.freeze([]) as readonly Feature[];

function requirePayloadString(evidence: Evidence, field: string): string {
  const value = evidence.payload[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FeatureExtractionError(
      "MATCH_INFO_FIELD_INVALID",
      `${field} must be a non-empty string.`,
      field,
    );
  }

  return value;
}

function featureId(evidenceId: string, name: FeatureName): string {
  return `feature:${evidenceId}:${name}`;
}

function asResultCodes(value: unknown): readonly ("D" | "L" | "W")[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const results: ("D" | "L" | "W")[] = [];

  for (const entry of value) {
    if (entry !== "W" && entry !== "D" && entry !== "L") {
      return undefined;
    }

    results.push(entry);
  }

  return results;
}

function asNumberArray(value: unknown): readonly number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const numbers: number[] = [];

  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return undefined;
    }

    numbers.push(entry);
  }

  return numbers;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readFormSplit(
  value: unknown,
): Readonly<{ results: readonly ("D" | "L" | "W")[] }> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const results = asResultCodes((value as { results?: unknown }).results);
  return results === undefined ? undefined : Object.freeze({ results });
}

function extractFormDecompositionFeatures(input: {
  readonly form: Evidence;
  readonly side: "away" | "home";
  readonly matchId: Evidence["matchId"];
  readonly generatedAt: string;
}): readonly Feature[] {
  const { form, side, matchId, generatedAt } = input;

  if (matchId === undefined) {
    return emptyFeatures;
  }

  const features: Feature[] = [];
  const atHomeName =
    side === "home" ? ("formAtHomeHome" as const) : ("formAtHomeAway" as const);
  const onRoadName =
    side === "home" ? ("formOnRoadHome" as const) : ("formOnRoadAway" as const);
  const scoredName =
    side === "home"
      ? ("goalsScoredRateHome" as const)
      : ("goalsScoredRateAway" as const);
  const concededName =
    side === "home"
      ? ("goalsConcededRateHome" as const)
      : ("goalsConcededRateAway" as const);
  const shortName =
    side === "home"
      ? ("recentFormShortHome" as const)
      : ("recentFormShortAway" as const);

  const homeSplit = readFormSplit(form.payload.homeSplit);
  const awaySplit = readFormSplit(form.payload.awaySplit);
  const recentShort = readFormSplit(form.payload.recentShort);
  const scored = asFiniteNumber(form.payload.goalsScoredPerMatch);
  const conceded = asFiniteNumber(form.payload.goalsConcededPerMatch);

  if (homeSplit !== undefined) {
    const score = roundFeature(computeRecentFormScore(homeSplit.results));
    features.push(
      createFeature({
        featureId: featureId(form.id, atHomeName),
        matchId,
        name: atHomeName,
        value: score,
        explanation: `Home-venue form ${score} from ${homeSplit.results.length} home matches.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (awaySplit !== undefined) {
    const score = roundFeature(computeRecentFormScore(awaySplit.results));
    features.push(
      createFeature({
        featureId: featureId(form.id, onRoadName),
        matchId,
        name: onRoadName,
        value: score,
        explanation: `Away-venue form ${score} from ${awaySplit.results.length} away matches.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (scored !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(form.id, scoredName),
        matchId,
        name: scoredName,
        value: roundFeature(scored),
        explanation: `Goals scored per match ${roundFeature(scored)} over recent window.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (conceded !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(form.id, concededName),
        matchId,
        name: concededName,
        value: roundFeature(conceded),
        explanation: `Goals conceded per match ${roundFeature(conceded)} over recent window.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  if (recentShort !== undefined) {
    const score = roundFeature(computeRecentFormScore(recentShort.results));
    features.push(
      createFeature({
        featureId: featureId(form.id, shortName),
        matchId,
        name: shortName,
        value: score,
        explanation: `Short-window form ${score} from last ${recentShort.results.length} matches.`,
        sourceEvidenceId: form.id,
        generatedAt,
      }),
    );
  }

  return Object.freeze(features);
}

function readAdvancedStatInputs(stats: Evidence): AdvancedStatInputs | undefined {
  const advancedRaw = stats.payload.advanced;

  if (
    typeof advancedRaw !== "object" ||
    advancedRaw === null ||
    Array.isArray(advancedRaw)
  ) {
    return undefined;
  }

  const advanced = advancedRaw as Record<string, unknown>;

  return Object.freeze({
    shotsTotal: asFiniteNumber(advanced.shotsTotal),
    shotsOnTarget: asFiniteNumber(advanced.shotsOnTarget),
    possessionPct: asFiniteNumber(advanced.possessionPct),
    corners: asFiniteNumber(advanced.corners),
    dangerousAttacks: asFiniteNumber(advanced.dangerousAttacks),
    yellowCards: asFiniteNumber(advanced.yellowCards),
    redCards: asFiniteNumber(advanced.redCards),
    fouls: asFiniteNumber(advanced.fouls),
  });
}

/**
 * F1.2b: derived football Features from STATISTICS.advanced Evidence only.
 * Never invents missing provider metrics.
 */
function extractAdvancedStatisticsFeatures(input: {
  readonly stats: Evidence;
  readonly side: "away" | "home";
  readonly matchId: Evidence["matchId"];
  readonly generatedAt: string;
}): readonly Feature[] {
  const { stats, side, matchId, generatedAt } = input;

  if (matchId === undefined) {
    return emptyFeatures;
  }

  const advanced = readAdvancedStatInputs(stats);

  if (advanced === undefined) {
    return emptyFeatures;
  }

  const features: Feature[] = [];
  const efficiencyName =
    side === "home"
      ? ("attackEfficiencyHome" as const)
      : ("attackEfficiencyAway" as const);
  const possessionName =
    side === "home" ? ("possessionHome" as const) : ("possessionAway" as const);
  const chanceName =
    side === "home"
      ? ("chanceCreationHome" as const)
      : ("chanceCreationAway" as const);
  const disciplineName =
    side === "home"
      ? ("disciplineRiskHome" as const)
      : ("disciplineRiskAway" as const);

  const efficiency = computeAttackEfficiency(advanced);
  if (efficiency !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(stats.id, efficiencyName),
        matchId,
        name: efficiencyName,
        value: roundFeature(efficiency),
        explanation: `Attack efficiency ${roundFeature(efficiency)} derived from STATISTICS.advanced shots/SoT (Evidence ${stats.id}).`,
        sourceEvidenceId: stats.id,
        generatedAt,
      }),
    );
  }

  const possession = computePossessionDominance(advanced);
  if (possession !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(stats.id, possessionName),
        matchId,
        name: possessionName,
        value: roundFeature(possession),
        explanation: `Possession ${roundFeature(possession)}% from STATISTICS.advanced (Evidence ${stats.id}).`,
        sourceEvidenceId: stats.id,
        generatedAt,
      }),
    );
  }

  const chance = computeChanceCreation(advanced);
  if (chance !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(stats.id, chanceName),
        matchId,
        name: chanceName,
        value: roundFeature(chance),
        explanation: `Chance creation ${roundFeature(chance)} from dangerous attacks/shots/corners (Evidence ${stats.id}).`,
        sourceEvidenceId: stats.id,
        generatedAt,
      }),
    );
  }

  const discipline = computeDisciplineRisk(advanced);
  if (discipline !== undefined) {
    features.push(
      createFeature({
        featureId: featureId(stats.id, disciplineName),
        matchId,
        name: disciplineName,
        value: roundFeature(discipline),
        explanation: `Discipline risk ${roundFeature(discipline)} from yellow/red/fouls (Evidence ${stats.id}).`,
        sourceEvidenceId: stats.id,
        generatedAt,
      }),
    );
  }

  return Object.freeze(features);
}

const EXPECTED_GOALS_WINDOW_PRIORITY = Object.freeze([
  "overall",
  "last10",
  "last5",
  "recent",
  "fixture",
] as const);

function readExpectedGoalsMetric(
  payload: Evidence["payload"],
  metric: "xg" | "xga",
): number | undefined {
  const metricsRaw = payload.metrics;

  if (
    typeof metricsRaw !== "object" ||
    metricsRaw === null ||
    Array.isArray(metricsRaw)
  ) {
    return undefined;
  }

  const value = (metricsRaw as Record<string, unknown>)[metric];
  return asFiniteNumber(value);
}

/**
 * Prefer season/rolling windows, then fixture. Venue-specific windows
 * (home/away) are used only when they match the team side.
 */
function selectExpectedGoalsMetric(
  evidences: readonly Evidence[],
  side: "away" | "home",
  metric: "xg" | "xga",
): Readonly<{ value: number; evidenceId: string; window: string }> | undefined {
  const sideRecords = evidences.filter(
    (evidence) =>
      evidence.type === "EXPECTED_GOALS" && evidence.payload.teamSide === side,
  );

  if (sideRecords.length === 0) {
    return undefined;
  }

  const venueWindow = side;
  const priority = [...EXPECTED_GOALS_WINDOW_PRIORITY, venueWindow];

  for (const window of priority) {
    const match = sideRecords.find((evidence) => evidence.payload.window === window);

    if (match === undefined) {
      continue;
    }

    const value = readExpectedGoalsMetric(match.payload, metric);

    if (value !== undefined) {
      return Object.freeze({
        value,
        evidenceId: match.id,
        window: String(match.payload.window),
      });
    }
  }

  for (const evidence of sideRecords) {
    const value = readExpectedGoalsMetric(evidence.payload, metric);

    if (value !== undefined) {
      return Object.freeze({
        value,
        evidenceId: evidence.id,
        window: String(evidence.payload.window ?? "unknown"),
      });
    }
  }

  return undefined;
}

/**
 * F1.3B: derived football Features from EXPECTED_GOALS Evidence only.
 * Never invents missing provider xG/xGA.
 */
function extractExpectedGoalsFeatures(input: {
  readonly evidences: readonly Evidence[];
  readonly homeForm: Evidence | undefined;
  readonly awayForm: Evidence | undefined;
  readonly matchId: Evidence["matchId"];
  readonly generatedAt: string;
}): readonly Feature[] {
  const { evidences, homeForm, awayForm, matchId, generatedAt } = input;

  if (matchId === undefined) {
    return emptyFeatures;
  }

  const features: Feature[] = [];
  const homeXg = selectExpectedGoalsMetric(evidences, "home", "xg");
  const awayXg = selectExpectedGoalsMetric(evidences, "away", "xg");
  const homeXga = selectExpectedGoalsMetric(evidences, "home", "xga");
  const awayXga = selectExpectedGoalsMetric(evidences, "away", "xga");

  if (homeXg !== undefined) {
    const quality = roundFeature(computeXgAttackQuality(homeXg.value));
    features.push(
      createFeature({
        featureId: featureId(homeXg.evidenceId, "xgAttackQualityHome"),
        matchId,
        name: "xgAttackQualityHome",
        value: quality,
        explanation: `Attack quality ${quality} from EXPECTED_GOALS xG=${homeXg.value} (window=${homeXg.window}; Evidence ${homeXg.evidenceId}).`,
        sourceEvidenceId: homeXg.evidenceId,
        generatedAt,
      }),
    );
  }

  if (awayXg !== undefined) {
    const quality = roundFeature(computeXgAttackQuality(awayXg.value));
    features.push(
      createFeature({
        featureId: featureId(awayXg.evidenceId, "xgAttackQualityAway"),
        matchId,
        name: "xgAttackQualityAway",
        value: quality,
        explanation: `Attack quality ${quality} from EXPECTED_GOALS xG=${awayXg.value} (window=${awayXg.window}; Evidence ${awayXg.evidenceId}).`,
        sourceEvidenceId: awayXg.evidenceId,
        generatedAt,
      }),
    );
  }

  if (homeXga !== undefined) {
    const quality = roundFeature(computeXgDefenseQuality(homeXga.value));
    features.push(
      createFeature({
        featureId: featureId(homeXga.evidenceId, "xgDefenseQualityHome"),
        matchId,
        name: "xgDefenseQualityHome",
        value: quality,
        explanation: `Defensive quality ${quality} from EXPECTED_GOALS xGA=${homeXga.value} (window=${homeXga.window}; Evidence ${homeXga.evidenceId}).`,
        sourceEvidenceId: homeXga.evidenceId,
        generatedAt,
      }),
    );
  }

  if (awayXga !== undefined) {
    const quality = roundFeature(computeXgDefenseQuality(awayXga.value));
    features.push(
      createFeature({
        featureId: featureId(awayXga.evidenceId, "xgDefenseQualityAway"),
        matchId,
        name: "xgDefenseQualityAway",
        value: quality,
        explanation: `Defensive quality ${quality} from EXPECTED_GOALS xGA=${awayXga.value} (window=${awayXga.window}; Evidence ${awayXga.evidenceId}).`,
        sourceEvidenceId: awayXga.evidenceId,
        generatedAt,
      }),
    );
  }

  if (homeXg !== undefined && awayXg !== undefined) {
    const dominance = computeXgDominance(homeXg.value, awayXg.value);
    features.push(
      createFeature({
        featureId: featureId(homeXg.evidenceId, "xgDominance"),
        matchId,
        name: "xgDominance",
        value: dominance,
        explanation: `xG dominance ${dominance} = home xG ${homeXg.value} minus away xG ${awayXg.value} (provider Expected Goals only).`,
        sourceEvidenceId: homeXg.evidenceId,
        generatedAt,
      }),
    );
  }

  const finishingSides = [
    {
      side: "home" as const,
      form: homeForm,
      xg: homeXg,
      name: "finishingEfficiencyHome" as const,
    },
    {
      side: "away" as const,
      form: awayForm,
      xg: awayXg,
      name: "finishingEfficiencyAway" as const,
    },
  ];

  for (const side of finishingSides) {
    if (side.form === undefined || side.xg === undefined) {
      continue;
    }

    const goalsRate =
      asFiniteNumber(side.form.payload.goalsScoredPerMatch) ??
      (() => {
        const goalsFor = asNumberArray(side.form.payload.goalsFor);
        return goalsFor === undefined || goalsFor.length === 0
          ? undefined
          : goalsFor.reduce((sum, value) => sum + value, 0) / goalsFor.length;
      })();

    if (goalsRate === undefined) {
      continue;
    }

    const finishing = roundFeature(
      computeFinishingEfficiency(goalsRate, side.xg.value),
    );
    features.push(
      createFeature({
        featureId: featureId(side.xg.evidenceId, side.name),
        matchId,
        name: side.name,
        value: finishing,
        explanation: `Finishing efficiency ${finishing} from goalsPerMatch=${goalsRate} vs xG=${side.xg.value} (Evidence ${side.xg.evidenceId} + ${side.form.id}).`,
        sourceEvidenceId: side.xg.evidenceId,
        generatedAt,
      }),
    );
  }

  return Object.freeze(features);
}

function readMatchContextMetrics(payload: Evidence["payload"]): Readonly<{
  restDays?: number;
  matchesInLast7Days?: number;
  matchesInLast14Days?: number;
  fixtureCongestion?: number;
  homeAwayContext?: "away" | "home";
  isKnockout?: boolean;
  leg?: "first" | "second";
  aggregateScore?: string;
}> {
  const metricsRaw = payload.metrics;

  if (
    typeof metricsRaw !== "object" ||
    metricsRaw === null ||
    Array.isArray(metricsRaw)
  ) {
    return Object.freeze({});
  }

  const metrics = metricsRaw as Record<string, unknown>;
  const restDays = asFiniteNumber(metrics.restDays);
  const matchesInLast7Days =
    asFiniteNumber(metrics.matchesInLast7Days) ??
    asFiniteNumber(metrics.fixtureCongestion);
  const matchesInLast14Days = asFiniteNumber(metrics.matchesInLast14Days);
  const fixtureCongestion = asFiniteNumber(metrics.fixtureCongestion);
  const homeAwayContext =
    metrics.homeAwayContext === "home" || metrics.homeAwayContext === "away"
      ? metrics.homeAwayContext
      : undefined;
  const isKnockout =
    typeof metrics.isKnockout === "boolean" ? metrics.isKnockout : undefined;
  const leg =
    metrics.leg === "first" || metrics.leg === "second" ? metrics.leg : undefined;
  const aggregateScore =
    typeof metrics.aggregateScore === "string" &&
    metrics.aggregateScore.trim().length > 0
      ? metrics.aggregateScore.trim()
      : undefined;

  return Object.freeze({
    ...(restDays === undefined ? {} : { restDays }),
    ...(matchesInLast7Days === undefined ? {} : { matchesInLast7Days }),
    ...(matchesInLast14Days === undefined ? {} : { matchesInLast14Days }),
    ...(fixtureCongestion === undefined ? {} : { fixtureCongestion }),
    ...(homeAwayContext === undefined ? {} : { homeAwayContext }),
    ...(isKnockout === undefined ? {} : { isKnockout }),
    ...(leg === undefined ? {} : { leg }),
    ...(aggregateScore === undefined ? {} : { aggregateScore }),
  });
}

function findMatchContextEvidence(
  evidences: readonly Evidence[],
  side: "away" | "home",
): Evidence | undefined {
  return evidences.find(
    (evidence) =>
      evidence.type === "MATCH_CONTEXT" && evidence.payload.teamSide === side,
  );
}

/**
 * I1B: derived football Features from MATCH_CONTEXT Evidence only.
 * Never invents rest, congestion, travel distance, or knockout facts.
 */
function extractMatchContextFeatures(input: {
  readonly evidences: readonly Evidence[];
  readonly matchId: Evidence["matchId"];
  readonly generatedAt: string;
}): readonly Feature[] {
  const { evidences, matchId, generatedAt } = input;

  if (matchId === undefined) {
    return emptyFeatures;
  }

  const homeEvidence = findMatchContextEvidence(evidences, "home");
  const awayEvidence = findMatchContextEvidence(evidences, "away");
  const homeMetrics =
    homeEvidence === undefined
      ? undefined
      : readMatchContextMetrics(homeEvidence.payload);
  const awayMetrics =
    awayEvidence === undefined
      ? undefined
      : readMatchContextMetrics(awayEvidence.payload);
  const features: Feature[] = [];

  const congestionFor = (
    metrics: ReturnType<typeof readMatchContextMetrics>,
  ): number | undefined => metrics.matchesInLast7Days ?? metrics.fixtureCongestion;

  if (
    homeEvidence !== undefined &&
    homeMetrics !== undefined &&
    homeMetrics.restDays !== undefined
  ) {
    const congestion = congestionFor(homeMetrics);

    if (congestion !== undefined) {
      const fatigue = roundFeature(
        computeFatigueIndex({
          restDays: homeMetrics.restDays,
          matchesInLast7Days: congestion,
          ...(homeMetrics.matchesInLast14Days === undefined
            ? {}
            : { matchesInLast14Days: homeMetrics.matchesInLast14Days }),
        }),
      );
      features.push(
        createFeature({
          featureId: featureId(homeEvidence.id, "fatigueIndexHome"),
          matchId,
          name: "fatigueIndexHome",
          value: fatigue,
          explanation: `Fatigue index ${fatigue} from MATCH_CONTEXT restDays=${homeMetrics.restDays}, matchesInLast7Days=${congestion} (Evidence ${homeEvidence.id}).`,
          sourceEvidenceId: homeEvidence.id,
          generatedAt,
        }),
      );
    }
  }

  if (
    awayEvidence !== undefined &&
    awayMetrics !== undefined &&
    awayMetrics.restDays !== undefined
  ) {
    const congestion = congestionFor(awayMetrics);

    if (congestion !== undefined) {
      const fatigue = roundFeature(
        computeFatigueIndex({
          restDays: awayMetrics.restDays,
          matchesInLast7Days: congestion,
          ...(awayMetrics.matchesInLast14Days === undefined
            ? {}
            : { matchesInLast14Days: awayMetrics.matchesInLast14Days }),
        }),
      );
      features.push(
        createFeature({
          featureId: featureId(awayEvidence.id, "fatigueIndexAway"),
          matchId,
          name: "fatigueIndexAway",
          value: fatigue,
          explanation: `Fatigue index ${fatigue} from MATCH_CONTEXT restDays=${awayMetrics.restDays}, matchesInLast7Days=${congestion} (Evidence ${awayEvidence.id}).`,
          sourceEvidenceId: awayEvidence.id,
          generatedAt,
        }),
      );
    }
  }

  if (
    homeEvidence !== undefined &&
    awayEvidence !== undefined &&
    homeMetrics?.restDays !== undefined &&
    awayMetrics?.restDays !== undefined
  ) {
    const homeCongestion = congestionFor(homeMetrics);
    const awayCongestion = congestionFor(awayMetrics);
    const advantage = computeScheduleAdvantage({
      homeRestDays: homeMetrics.restDays,
      awayRestDays: awayMetrics.restDays,
      ...(homeCongestion === undefined
        ? {}
        : { homeMatchesInLast7Days: homeCongestion }),
      ...(awayCongestion === undefined
        ? {}
        : { awayMatchesInLast7Days: awayCongestion }),
    });
    features.push(
      createFeature({
        featureId: featureId(homeEvidence.id, "scheduleAdvantage"),
        matchId,
        name: "scheduleAdvantage",
        value: advantage,
        explanation: `Schedule advantage ${advantage} from relative rest/congestion (Evidence ${homeEvidence.id} + ${awayEvidence.id}).`,
        sourceEvidenceId: homeEvidence.id,
        generatedAt,
      }),
    );
  }

  if (homeEvidence !== undefined && homeMetrics?.homeAwayContext !== undefined) {
    const stability = computeHomeStability(homeMetrics.homeAwayContext);
    features.push(
      createFeature({
        featureId: featureId(homeEvidence.id, "homeStability"),
        matchId,
        name: "homeStability",
        value: stability,
        explanation: `Home stability ${stability} from MATCH_CONTEXT homeAwayContext=${homeMetrics.homeAwayContext} (Evidence ${homeEvidence.id}).`,
        sourceEvidenceId: homeEvidence.id,
        generatedAt,
      }),
    );
  }

  if (homeEvidence !== undefined && homeMetrics !== undefined) {
    const homeCongestion = congestionFor(homeMetrics);

    if (homeCongestion !== undefined) {
      const pressure = roundFeature(computeRotationPressure(homeCongestion));
      features.push(
        createFeature({
          featureId: featureId(homeEvidence.id, "rotationPressureHome"),
          matchId,
          name: "rotationPressureHome",
          value: pressure,
          explanation: `Rotation pressure ${pressure} from MATCH_CONTEXT fixture congestion (Evidence ${homeEvidence.id}).`,
          sourceEvidenceId: homeEvidence.id,
          generatedAt,
        }),
      );
    }
  }

  if (awayEvidence !== undefined && awayMetrics !== undefined) {
    const awayCongestion = congestionFor(awayMetrics);

    if (awayCongestion !== undefined) {
      const pressure = roundFeature(computeRotationPressure(awayCongestion));
      features.push(
        createFeature({
          featureId: featureId(awayEvidence.id, "rotationPressureAway"),
          matchId,
          name: "rotationPressureAway",
          value: pressure,
          explanation: `Rotation pressure ${pressure} from MATCH_CONTEXT fixture congestion (Evidence ${awayEvidence.id}).`,
          sourceEvidenceId: awayEvidence.id,
          generatedAt,
        }),
      );
    }
  }

  const knockoutSource = homeEvidence ?? awayEvidence;
  const knockoutMetrics =
    homeMetrics?.isKnockout !== undefined
      ? homeMetrics
      : awayMetrics?.isKnockout !== undefined
        ? awayMetrics
        : undefined;

  if (knockoutSource !== undefined && knockoutMetrics?.isKnockout !== undefined) {
    const knockout = computeKnockoutContext({
      isKnockout: knockoutMetrics.isKnockout,
      ...(knockoutMetrics.leg === undefined ? {} : { leg: knockoutMetrics.leg }),
      hasAggregateScore: knockoutMetrics.aggregateScore !== undefined,
    });
    features.push(
      createFeature({
        featureId: featureId(knockoutSource.id, "knockoutContext"),
        matchId,
        name: "knockoutContext",
        value: knockout,
        explanation: `Knockout context ${knockout} from MATCH_CONTEXT isKnockout=${String(knockoutMetrics.isKnockout)}${knockoutMetrics.leg === undefined ? "" : `, leg=${knockoutMetrics.leg}`} (Evidence ${knockoutSource.id}).`,
        sourceEvidenceId: knockoutSource.id,
        generatedAt,
      }),
    );
  }

  return Object.freeze(features);
}

function findSideEvidence(
  evidences: readonly Evidence[],
  type: "STATISTICS" | "TEAM_FORM",
  side: "away" | "home",
): Evidence | undefined {
  return evidences.find(
    (evidence) => evidence.type === type && evidence.payload.teamSide === side,
  );
}

function bundleChecksum(
  matchId: string,
  features: readonly Feature[],
  evidenceRefs: readonly string[],
  status: FeatureBundleStatus,
): string {
  const payload = JSON.stringify({
    featureModelVersion: FEATURE_MODEL_VERSION,
    matchId,
    status,
    evidenceRefs,
    features: features.map((feature) => ({
      name: feature.name,
      value: feature.value,
      sourceEvidenceId: feature.sourceEvidenceId,
    })),
  });

  return stableChecksum(payload);
}

export class FeatureExtractor {
  extract(evidence: Evidence): readonly Feature[] {
    if (evidence.type !== "MATCH_INFO") {
      return emptyFeatures;
    }

    if (evidence.matchId === undefined) {
      throw new FeatureExtractionError(
        "MATCH_ID_REQUIRED",
        "MATCH_INFO Evidence must reference a MatchId.",
        "matchId",
      );
    }

    const matchId = evidence.matchId;
    const inputs = [
      {
        name: "homeTeam" as const,
        value: requirePayloadString(evidence, "home"),
        explanation: "Home team extracted from MATCH_INFO.",
      },
      {
        name: "awayTeam" as const,
        value: requirePayloadString(evidence, "away"),
        explanation: "Away team extracted from MATCH_INFO.",
      },
      {
        name: "kickoff" as const,
        value: requirePayloadString(evidence, "kickoff"),
        explanation: "Kickoff extracted from MATCH_INFO.",
      },
    ];
    const features = inputs.map(({ name, value, explanation }) =>
      createFeature({
        featureId: featureId(evidence.id, name),
        matchId,
        name,
        value,
        explanation,
        sourceEvidenceId: evidence.id,
        generatedAt: evidence.collectedAt,
      }),
    );

    return Object.freeze(features);
  }

  extractBundle(evidences: readonly Evidence[]): FeatureBundle {
    const matchInfoCandidates = evidences.filter(
      (evidence) => evidence.type === "MATCH_INFO",
    );
    const matchInfo =
      matchInfoCandidates.find(
        (evidence) =>
          typeof evidence.payload.home === "string" &&
          typeof evidence.payload.away === "string" &&
          typeof evidence.payload.kickoff === "string",
      ) ?? matchInfoCandidates[0];

    if (matchInfo === undefined || matchInfo.matchId === undefined) {
      throw new FeatureExtractionError(
        "MATCH_ID_REQUIRED",
        "MATCH_INFO Evidence must reference a MatchId.",
        "matchId",
      );
    }

    const matchId = matchInfo.matchId;

    if (evidences.some((evidence) => evidence.matchId !== matchId)) {
      throw new FeatureExtractionError(
        "MIXED_MATCHES",
        "All Evidence items must reference the same MatchId.",
        "matchId",
      );
    }

    const features: Feature[] = [...this.extract(matchInfo)];
    const homeForm = findSideEvidence(evidences, "TEAM_FORM", "home");
    const awayForm = findSideEvidence(evidences, "TEAM_FORM", "away");
    const homeStats = findSideEvidence(evidences, "STATISTICS", "home");
    const awayStats = findSideEvidence(evidences, "STATISTICS", "away");
    const generatedAt = matchInfo.collectedAt;

    const sides = [
      {
        side: "home" as const,
        form: homeForm,
        stats: homeStats,
        attackName: "attackRatingHome" as const,
        defenseName: "defenseRatingHome" as const,
        momentumName: "momentumHome" as const,
      },
      {
        side: "away" as const,
        form: awayForm,
        stats: awayStats,
        attackName: "attackRatingAway" as const,
        defenseName: "defenseRatingAway" as const,
        momentumName: "momentumAway" as const,
      },
    ];

    let missingFootballEvidence = false;

    features.push(
      ...extractExpectedGoalsFeatures({
        evidences,
        homeForm,
        awayForm,
        matchId,
        generatedAt,
      }),
    );

    features.push(
      ...extractMatchContextFeatures({
        evidences,
        matchId,
        generatedAt,
      }),
    );

    for (const side of sides) {
      if (side.stats !== undefined) {
        features.push(
          ...extractAdvancedStatisticsFeatures({
            stats: side.stats,
            side: side.side,
            matchId,
            generatedAt,
          }),
        );
      }

      if (side.form === undefined || side.stats === undefined) {
        missingFootballEvidence = true;
        continue;
      }

      const windowMatches = asFiniteNumber(side.stats.payload.windowMatches);
      const shotsFor = asFiniteNumber(side.stats.payload.shotsForPerMatch);
      const shotsAgainst = asFiniteNumber(side.stats.payload.shotsAgainstPerMatch);
      const statsXgFor = asFiniteNumber(side.stats.payload.xgForPerMatch);
      const statsXgAgainst = asFiniteNumber(side.stats.payload.xgAgainstPerMatch);
      const trueXgFor = selectExpectedGoalsMetric(evidences, side.side, "xg");
      const trueXgAgainst = selectExpectedGoalsMetric(evidences, side.side, "xga");
      // Prefer provider EXPECTED_GOALS when present; never invent from shots.
      const xgFor = trueXgFor?.value ?? statsXgFor;
      const xgAgainst = trueXgAgainst?.value ?? statsXgAgainst;
      const goalsFor = asNumberArray(side.form.payload.goalsFor);
      const goalsAgainst = asNumberArray(side.form.payload.goalsAgainst);
      const results = asResultCodes(side.form.payload.results);

      if (
        windowMatches === undefined ||
        shotsFor === undefined ||
        shotsAgainst === undefined ||
        xgFor === undefined ||
        xgAgainst === undefined ||
        goalsFor === undefined ||
        goalsAgainst === undefined ||
        results === undefined
      ) {
        missingFootballEvidence = true;
        continue;
      }

      const attack = roundFeature(
        computeAttackRating({
          shotsForPerMatch: shotsFor,
          xgForPerMatch: xgFor,
          goalsFor,
          windowMatches,
        }),
      );
      const defense = roundFeature(
        computeDefenseRating({
          shotsAgainstPerMatch: shotsAgainst,
          xgAgainstPerMatch: xgAgainst,
          goalsAgainst,
          windowMatches,
        }),
      );
      const momentum = roundFeature(computeMomentum(results));
      const recentForm = roundFeature(computeRecentFormScore(results));
      const sourceEvidenceId = side.stats.id;
      const recentFormName =
        side.side === "home"
          ? ("recentFormHome" as const)
          : ("recentFormAway" as const);

      features.push(
        createFeature({
          featureId: featureId(sourceEvidenceId, side.attackName),
          matchId,
          name: side.attackName,
          value: attack,
          explanation: `Attack rating ${attack} from shots/goals-for vs baseline; sample=${windowMatches}.`,
          sourceEvidenceId,
          generatedAt,
        }),
        createFeature({
          featureId: featureId(sourceEvidenceId, side.defenseName),
          matchId,
          name: side.defenseName,
          value: defense,
          explanation: `Defense rating ${defense} from shots/goals-against vs baseline; sample=${windowMatches}.`,
          sourceEvidenceId,
          generatedAt,
        }),
        createFeature({
          featureId: featureId(side.form.id, side.momentumName),
          matchId,
          name: side.momentumName,
          value: momentum,
          explanation: `Momentum ${momentum} from decay-weighted recent results.`,
          sourceEvidenceId: side.form.id,
          generatedAt,
        }),
        createFeature({
          featureId: featureId(side.form.id, recentFormName),
          matchId,
          name: recentFormName,
          value: recentForm,
          explanation: `Recent form ${recentForm} from W/D/L window (W=1, D=0.5, L=0).`,
          sourceEvidenceId: side.form.id,
          generatedAt,
        }),
      );

      features.push(
        ...extractFormDecompositionFeatures({
          form: side.form,
          side: side.side,
          matchId,
          generatedAt,
        }),
      );
    }

    const momentumHomeFeature = features.find(
      (feature) => feature.name === "momentumHome",
    );
    const momentumAwayFeature = features.find(
      (feature) => feature.name === "momentumAway",
    );

    if (
      typeof momentumHomeFeature?.value === "number" &&
      typeof momentumAwayFeature?.value === "number"
    ) {
      const momentumLean = roundFeature(
        momentumHomeFeature.value - momentumAwayFeature.value,
      );
      features.push(
        createFeature({
          featureId: featureId(matchInfo.id, "momentum"),
          matchId,
          name: "momentum",
          value: momentumLean,
          explanation: `Signed momentum lean ${momentumLean} (home momentum minus away momentum).`,
          sourceEvidenceId: matchInfo.id,
          generatedAt,
        }),
      );
    }

    features.push(
      createFeature({
        featureId: featureId(matchInfo.id, "homeAdvantage"),
        matchId,
        name: "homeAdvantage",
        value: DEFAULT_HOME_ADVANTAGE,
        explanation:
          "HomeAdvantage uses the competition baseline constant, not derived home/away splits.",
        sourceEvidenceId: matchInfo.id,
        generatedAt,
      }),
    );

    const venueEvidence = evidences.find((evidence) => evidence.type === "VENUE");

    if (venueEvidence !== undefined) {
      features.push(
        createFeature({
          featureId: featureId(venueEvidence.id, "venueAdvantage"),
          matchId,
          name: "venueAdvantage",
          value: VENUE_ADVANTAGE_SCORE,
          explanation: `VenueAdvantage ${VENUE_ADVANTAGE_SCORE} from VENUE Evidence (home context).`,
          sourceEvidenceId: venueEvidence.id,
          generatedAt,
        }),
      );
    }

    for (const side of ["home", "away"] as const) {
      const absenceEvidence = evidences.filter(
        (evidence) =>
          (evidence.type === "INJURY" || evidence.type === "SUSPENSION") &&
          evidence.payload.teamSide === side,
      );

      if (absenceEvidence.length === 0) {
        continue;
      }

      const injuryCount = absenceEvidence.filter(
        (evidence) => evidence.type === "INJURY",
      ).length;
      const suspensionCount = absenceEvidence.filter(
        (evidence) => evidence.type === "SUSPENSION",
      ).length;
      const penalty = roundFeature(
        computeAvailabilityPenalty({ injuryCount, suspensionCount }),
      );
      const name =
        side === "home"
          ? ("availabilityPenaltyHome" as const)
          : ("availabilityPenaltyAway" as const);
      const sourceEvidenceId = absenceEvidence[0]?.id ?? matchInfo.id;

      features.push(
        createFeature({
          featureId: featureId(sourceEvidenceId, name),
          matchId,
          name,
          value: penalty,
          explanation: `Availability penalty ${penalty} from ${injuryCount} injury and ${suspensionCount} suspension Facts.`,
          sourceEvidenceId,
          generatedAt,
        }),
      );
    }

    const headToHead = evidences.find(
      (evidence) => evidence.type === "HEAD_TO_HEAD",
    );

    if (headToHead !== undefined) {
      const sampleSize = asFiniteNumber(headToHead.payload.sampleSize);
      const meetingsRaw = headToHead.payload.meetings;
      const meetings: Array<{ homeGoals: number; awayGoals: number }> = [];

      if (Array.isArray(meetingsRaw) && sampleSize !== undefined) {
        for (const entry of meetingsRaw) {
          if (
            entry !== null &&
            typeof entry === "object" &&
            !Array.isArray(entry) &&
            typeof entry.homeGoals === "number" &&
            typeof entry.awayGoals === "number"
          ) {
            meetings.push({
              homeGoals: entry.homeGoals,
              awayGoals: entry.awayGoals,
            });
          }
        }
      }

      if (meetings.length === sampleSize && sampleSize > 0) {
        const lean = roundFeature(computeH2hLean(meetings));
        features.push(
          createFeature({
            featureId: featureId(headToHead.id, "h2hLean"),
            matchId,
            name: "h2hLean",
            value: lean,
            explanation: `H2H lean ${lean} from ${sampleSize} meetings (shrunken).`,
            sourceEvidenceId: headToHead.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(headToHead.id, "h2hSampleSize"),
            matchId,
            name: "h2hSampleSize",
            value: sampleSize,
            explanation: `H2H sample size ${sampleSize}.`,
            sourceEvidenceId: headToHead.id,
            generatedAt,
          }),
        );
      }
    }

    const oddsEvidence = evidences.find((evidence) => evidence.type === "ODDS");

    if (oddsEvidence !== undefined) {
      const homeOdds = asFiniteNumber(oddsEvidence.payload.homeOdds);
      const drawOdds = asFiniteNumber(oddsEvidence.payload.drawOdds);
      const awayOdds = asFiniteNumber(oddsEvidence.payload.awayOdds);

      if (
        homeOdds !== undefined &&
        drawOdds !== undefined &&
        awayOdds !== undefined &&
        homeOdds > 1 &&
        drawOdds > 1 &&
        awayOdds > 1
      ) {
        const implied = computeImpliedProbabilities({
          homeOdds,
          drawOdds,
          awayOdds,
        });
        const lean = roundFeature(
          computeMarketLean({ homeOdds, drawOdds, awayOdds }),
        );
        features.push(
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketImpliedHome"),
            matchId,
            name: "marketImpliedHome",
            value: roundFeature(implied.home),
            explanation:
              "De-vigged market-implied home win probability from decimal odds (market signal).",
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketImpliedDraw"),
            matchId,
            name: "marketImpliedDraw",
            value: roundFeature(implied.draw),
            explanation:
              "De-vigged market-implied draw probability from decimal odds (market signal).",
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketImpliedAway"),
            matchId,
            name: "marketImpliedAway",
            value: roundFeature(implied.away),
            explanation:
              "De-vigged market-implied away win probability from decimal odds (market signal).",
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
          createFeature({
            featureId: featureId(oddsEvidence.id, "marketLean"),
            matchId,
            name: "marketLean",
            value: lean,
            explanation: `Market lean ${lean} = impliedHome - impliedAway (not an outcome forecast).`,
            sourceEvidenceId: oddsEvidence.id,
            generatedAt,
          }),
        );

        const asianHandicapLine = asFiniteNumber(
          oddsEvidence.payload.asianHandicapLine,
        );
        const asianHandicapHomeOdds = asFiniteNumber(
          oddsEvidence.payload.asianHandicapHomeOdds,
        );
        const asianHandicapAwayOdds = asFiniteNumber(
          oddsEvidence.payload.asianHandicapAwayOdds,
        );

        if (
          asianHandicapLine !== undefined &&
          asianHandicapHomeOdds !== undefined &&
          asianHandicapAwayOdds !== undefined &&
          asianHandicapHomeOdds > 1 &&
          asianHandicapAwayOdds > 1
        ) {
          const ahLean = roundFeature(
            computeAsianHandicapLean({
              asianHandicapHomeOdds,
              asianHandicapAwayOdds,
            }),
          );
          features.push(
            createFeature({
              featureId: featureId(oddsEvidence.id, "asianHandicapLine"),
              matchId,
              name: "asianHandicapLine",
              value: asianHandicapLine,
              explanation:
                "Primary Asian handicap line for the home side (market signal).",
              sourceEvidenceId: oddsEvidence.id,
              generatedAt,
            }),
            createFeature({
              featureId: featureId(oddsEvidence.id, "asianHandicapLean"),
              matchId,
              name: "asianHandicapLean",
              value: ahLean,
              explanation: `Asian handicap lean ${ahLean} from two-way de-vigged prices on line ${asianHandicapLine} (not an outcome forecast).`,
              sourceEvidenceId: oddsEvidence.id,
              generatedAt,
            }),
          );
        }
      }
    }

    const requiredFootballPresent =
      homeForm !== undefined &&
      awayForm !== undefined &&
      homeStats !== undefined &&
      awayStats !== undefined &&
      !missingFootballEvidence;
    const status: FeatureBundleStatus = requiredFootballPresent
      ? "completed_nonempty"
      : "degraded";
    const evidenceRefs = Object.freeze(evidences.map((evidence) => evidence.id));
    const frozenFeatures = Object.freeze(features);

    return createFeatureBundle({
      matchId,
      features: frozenFeatures,
      evidenceRefs,
      checksum: bundleChecksum(matchId, frozenFeatures, evidenceRefs, status),
      status,
    });
  }
}
