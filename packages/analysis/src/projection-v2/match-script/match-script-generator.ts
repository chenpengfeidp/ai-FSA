import type { FootballStateEnvelope } from "../football-state/football-state-envelope.js";
import { scoreMatchScriptFromFootballState } from "./match-script-football-state-scoring.js";
import { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "./match-script-governed-parameters.js";
import type { MatchScriptParameterSet } from "./match-script-parameter-set.js";
import {
  createMatchScriptSet,
  type MatchScript,
  type MatchScriptSet,
} from "./match-script-set.js";

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

export function generateMatchScriptSet(input: {
  readonly footballState: FootballStateEnvelope;
  readonly parameters?: MatchScriptParameterSet;
}): MatchScriptSet {
  const parameters = input.parameters ?? GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
  const scored = parameters.catalog.map((entry) => {
    const result = scoreMatchScriptFromFootballState({
      entry,
      footballState: input.footballState,
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
      activationReason: item.activationReasons.join(" "),
      activationReasons: item.activationReasons,
      footballStateRefs: item.footballStateRefs,
      activatingRules: Object.freeze([]),
      strengtheningFeatures: Object.freeze([]),
      lambdaModifiers: item.entry.lambdaModifiers,
      limitations: Object.freeze([
        "Pre-match script only; no live in-match events.",
        "Activation derives from Football State dimensions and composite tags only.",
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
          activationReasons: Object.freeze([
            "Balanced script fallback ensures a neutral pre-match mixture.",
          ]),
          footballStateRefs: Object.freeze(["balanced"]),
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
    "Match Script set derived from governed matchScript.v1 Football State activation tables.",
    "Script weights are softmax-normalized affinities over Football State only — not learned.",
    "No ML, LLM, randomization, or live in-match events.",
    ...(parameters.calibrationLabel === undefined
      ? []
      : [`Active Match Script calibration label: ${parameters.calibrationLabel}.`]),
  ];

  if (singleScriptFallback) {
    limitations.push(
      "Only one script exceeded activation threshold; single-script fallback applied.",
    );
  }

  return createMatchScriptSet({
    matchId: input.footballState.matchId,
    footballStateChecksum: input.footballState.checksum,
    scripts: Object.freeze(candidates),
    singleScriptFallback,
    limitations: Object.freeze(limitations),
  });
}
