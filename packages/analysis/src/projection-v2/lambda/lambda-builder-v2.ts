import { clamp } from "../../projection/projection-math.js";
import type { FootballStateEnvelope } from "../football-state/football-state-envelope.js";
import type {
  LambdaBuilderV2Result,
  LambdaGroupContribution,
  LambdaParameterSet,
} from "./lambda-parameter-set.js";

function sideLambdaFromProjectionInputs(input: {
  readonly side: "home" | "away";
  readonly projectionInputs: FootballStateEnvelope["projectionInputs"];
  readonly parameters: LambdaParameterSet;
}): {
  readonly lambda: number;
  readonly contributions: readonly LambdaGroupContribution[];
  readonly absentOptionalFeatures: readonly string[];
} {
  const { projectionInputs, side, parameters } = input;
  const attackRating =
    side === "home"
      ? projectionInputs.homeAttackRating
      : projectionInputs.awayAttackRating;
  const opponentDefenseRating =
    side === "home"
      ? projectionInputs.awayDefenseRating
      : projectionInputs.homeDefenseRating;
  const homeAdvantage = projectionInputs.homeAdvantage;
  const opponentSide = side === "home" ? "away" : "home";
  const contributions = projectionInputs.groupContributions.filter(
    (entry) =>
      entry.side === side ||
      (entry.side === opponentSide && entry.group === "defence"),
  );
  const absentOptionalFeatures = projectionInputs.groupContributions
    .filter((entry) => entry.side === side)
    .flatMap((entry) => entry.absentFeatures);
  const attackBase = attackRating / parameters.ratingScale;
  const defenseBase = Math.max(
    opponentDefenseRating / parameters.ratingScale,
    parameters.defenseFloor,
  );
  const attackFactor =
    attackBase *
    contributions
      .filter(
        (entry) =>
          entry.side === side &&
          (entry.group === "attack" ||
            entry.group === "xg" ||
            entry.group === "clubStrength"),
      )
      .reduce((product, entry) => product * entry.factor, 1);
  const defenseFactor =
    defenseBase *
    contributions
      .filter((entry) => entry.side === opponentSide && entry.group === "defence")
      .reduce((product, entry) => product * entry.factor, 1);
  const contextFactor = contributions
    .filter((entry) => entry.side === side && entry.group === "matchContext")
    .reduce((product, entry) => product * entry.factor, 1);
  const availabilityFactor = contributions
    .filter((entry) => entry.side === side && entry.group === "playerAvailability")
    .reduce((product, entry) => product * entry.factor, 1);
  const homeFieldFactor =
    side === "home"
      ? 1 + parameters.homeAttackShare * homeAdvantage
      : 1 - parameters.awaySuppressShare * homeAdvantage;
  const lambda = clamp(
    ((parameters.baseRate * attackFactor * contextFactor * availabilityFactor) /
      defenseFactor) *
      homeFieldFactor,
    parameters.min,
    parameters.max,
  );

  return Object.freeze({
    lambda,
    contributions: Object.freeze([...contributions]),
    absentOptionalFeatures: Object.freeze([...absentOptionalFeatures]),
  });
}

export function buildLambdasV2(input: {
  readonly footballState: FootballStateEnvelope;
  readonly parameters: LambdaParameterSet;
}): LambdaBuilderV2Result {
  const { projectionInputs } = input.footballState;

  if (projectionInputs.blocked) {
    return Object.freeze({
      lambdaHome: 0,
      lambdaAway: 0,
      blocked: true,
      limitations: Object.freeze([
        "Required foundation Features are missing for LambdaBuilderV2.",
        `Missing: ${projectionInputs.missingFoundationFeatures.join(", ")}.`,
      ]),
      groupContributions: Object.freeze([]),
      absentOptionalFeatures: Object.freeze([]),
    });
  }

  const home = sideLambdaFromProjectionInputs({
    side: "home",
    projectionInputs,
    parameters: input.parameters,
  });
  const away = sideLambdaFromProjectionInputs({
    side: "away",
    projectionInputs,
    parameters: input.parameters,
  });
  const absentOptionalFeatures = Object.freeze([
    ...new Set([
      ...home.absentOptionalFeatures,
      ...away.absentOptionalFeatures,
      ...projectionInputs.absentOptionalFeatures,
    ]),
  ]);
  const limitations = [
    "Projection V2 lambdas derive from Football State projection inputs only.",
    "Optional Feature factors default to neutral (1.0) when absent.",
  ];

  if (absentOptionalFeatures.length > 0) {
    limitations.push(
      `Absent optional lambda Features (neutral default): ${absentOptionalFeatures.join(", ")}.`,
    );
  }

  return Object.freeze({
    lambdaHome: home.lambda,
    lambdaAway: away.lambda,
    blocked: false,
    limitations: Object.freeze(limitations),
    groupContributions: Object.freeze([
      ...home.contributions,
      ...away.contributions,
    ]),
    absentOptionalFeatures,
  });
}

export { REQUIRED_FOUNDATION_FEATURES } from "../football-state/football-state-types.js";
