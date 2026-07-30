import type { Feature, FeatureName } from "@fas/feature";
import type { StateDimensionLevel } from "./football-state-types.js";

export function numericFeatureValue(
  features: ReadonlyMap<FeatureName, Feature>,
  name: FeatureName,
): number | undefined {
  const value = features.get(name)?.value;

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeFeatureSignal(name: FeatureName, value: number): number {
  if (name.includes("Rating") || name.includes("Strength")) {
    return clamp01(value / 50);
  }

  if (
    name.includes("momentum") ||
    name.includes("Advantage") ||
    name.includes("Dominance") ||
    name.includes("Efficiency") ||
    name.includes("Quality")
  ) {
    return clamp01((value + 1) / 2);
  }

  if (
    name.includes("Penalty") ||
    name.includes("Risk") ||
    name.includes("fatigue")
  ) {
    return clamp01(value);
  }

  if (name.includes("possession") || name.includes("chanceCreation")) {
    return clamp01(value);
  }

  if (
    name.includes("recentForm") ||
    name.includes("formAt") ||
    name.includes("formOn")
  ) {
    return clamp01(value);
  }

  return clamp01(value);
}

export function levelFromScore(
  score: number,
  sourceCount: number,
): StateDimensionLevel {
  if (sourceCount === 0 || score <= 0) {
    return "absent";
  }

  if (score < 0.34) {
    return "low";
  }

  if (score < 0.67) {
    return "medium";
  }

  return "high";
}

export function scoreDimension(input: {
  readonly features: ReadonlyMap<FeatureName, Feature>;
  readonly featureNames: readonly FeatureName[];
}): {
  readonly score: number;
  readonly level: StateDimensionLevel;
  readonly sourceRefs: readonly string[];
} {
  const sourceRefs: string[] = [];
  let total = 0;

  for (const featureName of input.featureNames) {
    const value = numericFeatureValue(input.features, featureName);

    if (value === undefined) {
      continue;
    }

    total += normalizeFeatureSignal(featureName, value);
    sourceRefs.push(featureName);
  }

  const score = sourceRefs.length === 0 ? 0 : total / sourceRefs.length;

  return Object.freeze({
    score,
    level: levelFromScore(score, sourceRefs.length),
    sourceRefs: Object.freeze([...sourceRefs]),
  });
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
