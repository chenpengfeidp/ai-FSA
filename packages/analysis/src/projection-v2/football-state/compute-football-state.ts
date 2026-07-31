import type { Feature, FeatureBundle, FeatureName } from "@fas/feature";
import type { LambdaParameterSet } from "../lambda/lambda-parameter-set.js";
import {
  DEFAULT_FOOTBALL_STATE_PARAMETERS,
  type FootballStateParameterSet,
} from "../projection-parameter-groups.js";
import { buildFootballStateProjectionInputs } from "./build-football-state-projection-inputs.js";
import {
  FOOTBALL_STATE_DIMENSION_IDS,
  type FootballStateDimensionId,
} from "./football-state-dimensions.js";
import { scoreDimension } from "./football-state-scoring.js";
import {
  createFootballStateEnvelope,
  type FootballStateEnvelope,
} from "./football-state-envelope.js";
import type { StateDimensionValue } from "./football-state-types.js";

const ATTACK_FEATURES = Object.freeze([
  "attackRatingHome",
  "attackRatingAway",
  "momentumHome",
  "momentumAway",
  "goalsScoredRateHome",
  "goalsScoredRateAway",
  "attackEfficiencyHome",
  "attackEfficiencyAway",
  "xgAttackQualityHome",
  "xgAttackQualityAway",
  "recentFormHome",
  "recentFormAway",
  "playerAttackContributionHome",
  "playerAttackContributionAway",
] as const satisfies readonly FeatureName[]);

const DEFENSE_FEATURES = Object.freeze([
  "defenseRatingHome",
  "defenseRatingAway",
  "goalsConcededRateHome",
  "goalsConcededRateAway",
  "xgDefenseQualityHome",
  "xgDefenseQualityAway",
  "disciplineRiskHome",
  "disciplineRiskAway",
  "clubDefensiveStrengthHome",
  "clubDefensiveStrengthAway",
  "goalkeeperReliabilityHome",
  "goalkeeperReliabilityAway",
] as const satisfies readonly FeatureName[]);

const CONTROL_FEATURES = Object.freeze([
  "possessionHome",
  "possessionAway",
  "chanceCreationHome",
  "chanceCreationAway",
  "venueAdvantage",
  "homeAdvantage",
  "clubStrengthHome",
  "clubStrengthAway",
] as const satisfies readonly FeatureName[]);

const TRANSITION_FEATURES = Object.freeze([
  "finishingEfficiencyHome",
  "finishingEfficiencyAway",
  "formAtHomeHome",
  "formOnRoadAway",
  "momentumHome",
  "momentumAway",
  "xgDominance",
] as const satisfies readonly FeatureName[]);

const PRESSURE_FEATURES = Object.freeze([
  "knockoutContext",
  "scheduleAdvantage",
  "fatigueIndexHome",
  "fatigueIndexAway",
  "rotationPressureHome",
  "rotationPressureAway",
  "homeStability",
] as const satisfies readonly FeatureName[]);

const RISK_FEATURES = Object.freeze([
  "availabilityPenaltyHome",
  "availabilityPenaltyAway",
  "playerAvailabilityImpactHome",
  "playerAvailabilityImpactAway",
  "keyPlayerAvailabilityHome",
  "keyPlayerAvailabilityAway",
  "squadAvailabilityScoreHome",
  "squadAvailabilityScoreAway",
  "disciplineRiskHome",
  "disciplineRiskAway",
] as const satisfies readonly FeatureName[]);

const DIMENSION_FEATURES: Readonly<
  Record<FootballStateDimensionId, readonly FeatureName[]>
> = Object.freeze({
  attackState: ATTACK_FEATURES,
  defenseState: DEFENSE_FEATURES,
  controlState: CONTROL_FEATURES,
  transitionState: TRANSITION_FEATURES,
  pressureState: PRESSURE_FEATURES,
  riskState: RISK_FEATURES,
});

function buildDimension(
  id: FootballStateDimensionId,
  features: ReadonlyMap<FeatureName, Feature>,
  thresholds: FootballStateParameterSet,
): StateDimensionValue {
  const scored = scoreDimension({
    features,
    featureNames: DIMENSION_FEATURES[id],
    thresholds,
  });

  return Object.freeze({
    level: scored.level,
    score: scored.score,
    basis: scored.sourceRefs.length === 0 ? "derived" : "feature",
    sourceRefs: scored.sourceRefs,
  });
}

function buildCompositeTags(
  dimensions: Readonly<Record<FootballStateDimensionId, StateDimensionValue>>,
): readonly string[] {
  const tags: string[] = [];

  if (
    dimensions.defenseState.level !== "absent" &&
    dimensions.controlState.level === "low"
  ) {
    tags.push("LOW_EVENT_SHAPE");
  }

  if (
    dimensions.attackState.level === "high" &&
    dimensions.transitionState.level !== "absent"
  ) {
    tags.push("TRANSITION_CHANNEL");
  }

  if (dimensions.pressureState.level === "high") {
    tags.push("ELEVATED_PRESSURE");
  }

  if (dimensions.riskState.level === "high") {
    tags.push("ELEVATED_RISK");
  }

  return Object.freeze(tags);
}

export function computeFootballState(input: {
  readonly featureBundle: FeatureBundle;
  readonly lambdaParameters: LambdaParameterSet;
  readonly footballStateParameters?: FootballStateParameterSet;
}): FootballStateEnvelope {
  const thresholds =
    input.footballStateParameters ?? DEFAULT_FOOTBALL_STATE_PARAMETERS;
  const features = new Map(
    input.featureBundle.features.map((feature) => [feature.name, feature]),
  );
  const projectionInputs = buildFootballStateProjectionInputs({
    featureBundle: input.featureBundle,
    parameters: input.lambdaParameters,
  });
  const dimensions = Object.freeze(
    Object.fromEntries(
      FOOTBALL_STATE_DIMENSION_IDS.map((id) => [
        id,
        buildDimension(id, features, thresholds),
      ]),
    ) as Record<FootballStateDimensionId, StateDimensionValue>,
  );
  const driverFeatureNames = Object.freeze([
    ...new Set(
      FOOTBALL_STATE_DIMENSION_IDS.flatMap((id) => dimensions[id].sourceRefs),
    ),
  ]);
  const limitations = [
    "Football State v1 aggregates existing Features only — no Provider, Evidence, or Rule recomputation.",
    "State values are deterministic scalars and levels — not probabilities.",
    "Pre-match only; no live in-match events.",
  ];

  if (projectionInputs.blocked) {
    limitations.push(
      `Required foundation Features missing for projection inputs: ${projectionInputs.missingFoundationFeatures.join(", ")}.`,
    );
  }

  if (projectionInputs.absentOptionalFeatures.length > 0) {
    limitations.push(
      `Optional Features absent in projection inputs (neutral defaults downstream): ${projectionInputs.absentOptionalFeatures.join(", ")}.`,
    );
  }

  return createFootballStateEnvelope({
    matchId: input.featureBundle.matchId,
    dimensions,
    projectionInputs,
    compositeTags: buildCompositeTags(dimensions),
    driverRuleNames: Object.freeze([]),
    driverFeatureNames,
    limitations: Object.freeze(limitations),
  });
}
