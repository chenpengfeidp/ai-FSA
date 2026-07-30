import type { FootballStateEnvelope } from "../football-state/football-state-envelope.js";
import type { StateDimensionLevel } from "../football-state/football-state-types.js";
import type { MatchScriptCatalogEntry } from "./match-script-parameter-set.js";

const LEVEL_ORDER: readonly StateDimensionLevel[] = Object.freeze([
  "absent",
  "low",
  "medium",
  "high",
]);

function levelRank(level: StateDimensionLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function levelMeets(
  minimum: StateDimensionLevel,
  actual: StateDimensionLevel,
): boolean {
  return levelRank(actual) >= levelRank(minimum);
}

function levelAtMost(
  maximum: StateDimensionLevel,
  actual: StateDimensionLevel,
): boolean {
  return levelRank(actual) <= levelRank(maximum);
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function scoreMatchScriptFromFootballState(input: {
  readonly entry: MatchScriptCatalogEntry;
  readonly footballState: FootballStateEnvelope;
}): {
  readonly score: number;
  readonly activationReasons: readonly string[];
  readonly footballStateRefs: readonly string[];
} {
  const { entry, footballState } = input;
  const activationReasons: string[] = [];
  const footballStateRefs: string[] = [];
  let score = entry.baselineAffinity;

  if (entry.baselineAffinity > 0) {
    activationReasons.push(`${entry.label} baseline affinity applied.`);
    pushUnique(footballStateRefs, entry.scriptId);
  }

  for (const bonus of entry.dimensionBonuses) {
    const dimension = footballState.dimensions[bonus.dimensionId];

    if (levelMeets(bonus.minimumLevel, dimension.level)) {
      score += bonus.weight;
      activationReasons.push(bonus.reason);
      pushUnique(footballStateRefs, bonus.dimensionId);
    }
  }

  for (const bonus of entry.compositeTagBonuses) {
    if (footballState.compositeTags.includes(bonus.tag)) {
      score += bonus.weight;
      activationReasons.push(bonus.reason);
      pushUnique(footballStateRefs, bonus.tag);
    }
  }

  const { homeAttackRating, awayAttackRating } = footballState.projectionInputs;

  for (const bonus of entry.asymmetricBonuses) {
    const gap =
      bonus.side === "home"
        ? homeAttackRating - awayAttackRating
        : awayAttackRating - homeAttackRating;

    if (gap > bonus.minimumRatingGap) {
      score += bonus.weight;
      activationReasons.push(bonus.reason);
      pushUnique(footballStateRefs, "attackState");
      pushUnique(footballStateRefs, "projectionInputs");
    }
  }

  const maxLevel = entry.maxDimensionLevel;

  if (maxLevel !== undefined) {
    const dimension = footballState.dimensions[maxLevel.dimensionId];

    if (levelAtMost(maxLevel.maximumLevel, dimension.level)) {
      score += maxLevel.weight;
      activationReasons.push(maxLevel.reason);
      pushUnique(footballStateRefs, maxLevel.dimensionId);
    }
  }

  if (activationReasons.length === 0) {
    activationReasons.push(`${entry.label} activated from baseline affinity only.`);
  }

  return Object.freeze({
    score,
    activationReasons: Object.freeze([...activationReasons]),
    footballStateRefs: Object.freeze([...footballStateRefs]),
  });
}
