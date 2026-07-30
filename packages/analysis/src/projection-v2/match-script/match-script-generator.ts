import type { Feature, FeatureBundle, FeatureName } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import type { FootballStateEnvelope } from "../football-state/football-state-envelope.js";
import { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "./match-script-governed-parameters.js";
import type { MatchScriptParameterSet } from "./match-script-parameter-set.js";
import type { MatchScriptCatalogEntry } from "./match-script-parameter-set.js";
import {
  createMatchScriptSet,
  type MatchScript,
  type MatchScriptSet,
} from "./match-script-set.js";

function numericFeature(
  features: ReadonlyMap<FeatureName, Feature>,
  name: FeatureName,
): number | undefined {
  const value = features.get(name)?.value;

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function rulePasses(ruleResults: readonly RuleResult[], ruleName: string): boolean {
  return ruleResults.some(
    (rule) => rule.ruleName === ruleName && rule.status === "PASS",
  );
}

function featurePresent(
  features: ReadonlyMap<FeatureName, Feature>,
  name: FeatureName,
): boolean {
  return features.has(name);
}

function scoreCatalogEntry(input: {
  readonly entry: MatchScriptCatalogEntry;
  readonly features: ReadonlyMap<FeatureName, Feature>;
  readonly ruleResults: readonly RuleResult[];
}): {
  readonly score: number;
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly string[];
} {
  const activatingRules: string[] = [];
  const strengtheningFeatures: string[] = [];
  let score = input.entry.baselineAffinity;

  for (const ruleName of input.entry.activatingRules) {
    if (rulePasses(input.ruleResults, ruleName)) {
      score += input.entry.rulePassWeight;
      activatingRules.push(ruleName);
    }
  }

  for (const featureName of input.entry.strengtheningFeatures) {
    if (featurePresent(input.features, featureName)) {
      score += input.entry.featurePresenceWeight;
      strengtheningFeatures.push(featureName);

      const numeric = numericFeature(input.features, featureName);

      if (numeric !== undefined) {
        if (
          featureName.includes("defense") ||
          featureName.includes("chanceCreation") ||
          featureName === "xgDominance"
        ) {
          score += input.entry.featurePresenceWeight * (numeric <= 0.45 ? 0.5 : 0);
        } else {
          score +=
            input.entry.featurePresenceWeight * Math.min(Math.max(numeric, 0), 1);
        }
      }
    }
  }

  return Object.freeze({
    score,
    activatingRules: Object.freeze([...activatingRules]),
    strengtheningFeatures: Object.freeze([...strengtheningFeatures]),
  });
}

function softmaxWeights(
  scores: readonly number[],
  temperature: number,
): readonly number[] {
  const scaled = scores.map((score) => Math.exp(score / temperature));
  const total = scaled.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return Object.freeze(scores.map(() => 1 / Math.max(scores.length, 1)));
  }

  return Object.freeze(scaled.map((value) => value / total));
}

function activationReasonFor(input: {
  readonly label: string;
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly string[];
}): string {
  const parts = [`${input.label} script activated deterministically.`];

  if (input.activatingRules.length > 0) {
    parts.push(`Rules: ${input.activatingRules.join(", ")}.`);
  }

  if (input.strengtheningFeatures.length > 0) {
    parts.push(`Features: ${input.strengtheningFeatures.join(", ")}.`);
  }

  return parts.join(" ");
}

export function generateMatchScriptSet(input: {
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
  readonly footballState: FootballStateEnvelope;
  readonly parameters?: MatchScriptParameterSet;
}): MatchScriptSet {
  const parameters = input.parameters ?? GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
  const features = new Map(
    input.featureBundle.features.map((feature) => [feature.name, feature]),
  );
  const scored = parameters.catalog.map((entry) => {
    const result = scoreCatalogEntry({
      entry,
      features,
      ruleResults: input.ruleResults,
    });

    return Object.freeze({
      entry,
      ...result,
    });
  });
  const rawWeights = softmaxWeights(
    scored.map((item) => item.score),
    parameters.temperature,
  );
  let candidates: MatchScript[] = scored.map((item, index) =>
    Object.freeze({
      scriptId: item.entry.scriptId,
      label: item.entry.label,
      weight: rawWeights[index] ?? 0,
      activationReason: activationReasonFor({
        label: item.entry.label,
        activatingRules: item.activatingRules,
        strengtheningFeatures: item.strengtheningFeatures,
      }),
      activatingRules: item.activatingRules,
      strengtheningFeatures: item.strengtheningFeatures,
      lambdaModifiers: item.entry.lambdaModifiers,
      limitations: Object.freeze([
        "Pre-match script only; no live in-match events.",
        "Activation uses existing deterministic Features and Rules only.",
      ]),
    }),
  );
  candidates = candidates.filter(
    (script) => script.weight >= parameters.minScriptWeight,
  );

  const balancedEntry = parameters.catalog.find(
    (entry) => entry.scriptId === "balanced",
  );
  const balancedScript =
    balancedEntry === undefined
      ? undefined
      : Object.freeze({
          scriptId: balancedEntry.scriptId,
          label: balancedEntry.label,
          weight: 1,
          activationReason:
            "Balanced script fallback ensures a neutral pre-match mixture.",
          activatingRules: Object.freeze([]),
          strengtheningFeatures: Object.freeze([]),
          lambdaModifiers: balancedEntry.lambdaModifiers,
          limitations: Object.freeze([
            "Neutral lambda modifiers; used when script mixture would collapse.",
          ]),
        });

  if (
    candidates.length < parameters.minActiveScripts &&
    balancedScript !== undefined
  ) {
    const hasBalanced = candidates.some((script) => script.scriptId === "balanced");

    if (!hasBalanced) {
      candidates = [...candidates, balancedScript];
    }
  }

  if (candidates.length === 0 && balancedScript !== undefined) {
    candidates = [balancedScript];
  }

  const singleScriptFallback = candidates.length <= 1;
  const limitations = [
    "Match Script set derived from governed matchScript.v1 activation tables.",
    "Script weights are softmax-normalized affinities over Features and Rules — not learned.",
    "No ML, LLM, or live in-match events.",
  ];

  if (singleScriptFallback) {
    limitations.push(
      "Only one script exceeded activation threshold; single-script fallback applied.",
    );
  }

  return createMatchScriptSet({
    matchId: input.featureBundle.matchId,
    footballStateChecksum: input.footballState.checksum,
    scripts: Object.freeze(candidates),
    singleScriptFallback,
    limitations: Object.freeze(limitations),
  });
}
