import { roundProbability } from "../../projection/projection-math.js";
import type { MatchScript } from "../match-script/match-script-set.js";
import type {
  ProbabilityMatrix,
  ScorelineCell,
} from "../probability-matrix/probability-matrix.js";
import type { PerScriptProjection } from "./compute-multi-script-projection.js";
import { MULTI_SCRIPT_MERGE_ALGORITHM } from "./compute-multi-script-projection.js";
import { derivePerScriptMatrixPredictions } from "../unified-matrix/build-unified-matrix-summary.js";

export interface ScriptScorelineSummary {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface ScriptMergeContribution {
  readonly weight: number;
  readonly weightedPHome: number;
  readonly weightedPDraw: number;
  readonly weightedPAway: number;
}

export interface MatchScriptProjectionSummary {
  readonly scriptId: string;
  readonly label: string;
  readonly weight: number;
  readonly activationReason: string;
  readonly activationReasons: readonly string[];
  readonly footballStateRefs: readonly string[];
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly string[];
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly mostLikelyScoreline: ScriptScorelineSummary;
  readonly secondScoreline: ScriptScorelineSummary | null;
  readonly goalRange: Readonly<{
    readonly range01: number;
    readonly range23: number;
    readonly range4Plus: number;
  }>;
  readonly mergeContribution: ScriptMergeContribution;
  readonly pBttsYes: number;
  readonly pBttsNo: number;
  readonly pOver25: number;
  readonly pUnder25: number;
}

export interface MultiScriptMergeSummary {
  readonly algorithm: typeof MULTI_SCRIPT_MERGE_ALGORITHM;
  readonly scriptCount: number;
  readonly explanation: string;
  readonly mergedPHome: number;
  readonly mergedPDraw: number;
  readonly mergedPAway: number;
  readonly mergedGoalRange: Readonly<{
    readonly range01: number;
    readonly range23: number;
    readonly range4Plus: number;
  }>;
  readonly mergedMostLikelyScoreline: ScriptScorelineSummary;
  readonly mergedSecondScoreline: ScriptScorelineSummary | null;
}

function toScorelineSummary(cell: ScorelineCell): ScriptScorelineSummary {
  return Object.freeze({
    homeGoals: cell.homeGoals,
    awayGoals: cell.awayGoals,
    probability: roundProbability(cell.probability),
  });
}

function secondScoreline(
  topScorelines: readonly ScorelineCell[],
): ScriptScorelineSummary | null {
  const second = topScorelines[1];

  return second === undefined ? null : toScorelineSummary(second);
}

export function buildMatchScriptProjectionSummaries(input: {
  readonly scripts: readonly MatchScript[];
  readonly perScriptProjections: readonly PerScriptProjection[];
}): readonly MatchScriptProjectionSummary[] {
  const matrixByScriptId = new Map(
    input.perScriptProjections.map((entry) => [entry.scriptId, entry.matrix]),
  );

  return Object.freeze(
    input.scripts.map((script) => {
      const matrix = matrixByScriptId.get(script.scriptId);

      if (matrix === undefined) {
        throw new Error(`Missing per-script matrix for ${script.scriptId}.`);
      }

      const mergeContribution = Object.freeze({
        weight: roundProbability(script.weight),
        weightedPHome: roundProbability(script.weight * matrix.pHome),
        weightedPDraw: roundProbability(script.weight * matrix.pDraw),
        weightedPAway: roundProbability(script.weight * matrix.pAway),
      });

      const matrixDerived = derivePerScriptMatrixPredictions(matrix);

      return Object.freeze({
        scriptId: script.scriptId,
        label: script.label,
        weight: roundProbability(script.weight),
        activationReason: script.activationReason,
        activationReasons: script.activationReasons,
        footballStateRefs: script.footballStateRefs,
        activatingRules: script.activatingRules,
        strengtheningFeatures: script.strengtheningFeatures,
        lambdaHome: roundProbability(matrix.lambdaHome),
        lambdaAway: roundProbability(matrix.lambdaAway),
        pHome: roundProbability(matrix.pHome),
        pDraw: roundProbability(matrix.pDraw),
        pAway: roundProbability(matrix.pAway),
        mostLikelyScoreline: toScorelineSummary(
          matrix.topScorelines[0] ?? {
            homeGoals: 0,
            awayGoals: 0,
            probability: 0,
          },
        ),
        secondScoreline: secondScoreline(matrix.topScorelines),
        goalRange: Object.freeze({
          range01: roundProbability(matrix.goalRange.range01),
          range23: roundProbability(matrix.goalRange.range23),
          range4Plus: roundProbability(matrix.goalRange.range4Plus),
        }),
        mergeContribution,
        pBttsYes: matrixDerived.pBttsYes,
        pBttsNo: matrixDerived.pBttsNo,
        pOver25: matrixDerived.pOver25,
        pUnder25: matrixDerived.pUnder25,
      });
    }),
  );
}

export function buildMultiScriptMergeSummary(input: {
  readonly perScriptProjections: readonly PerScriptProjection[];
  readonly mergedMatrix: ProbabilityMatrix | null;
}): MultiScriptMergeSummary | null {
  const { mergedMatrix } = input;

  if (mergedMatrix === null) {
    return null;
  }

  return Object.freeze({
    algorithm: MULTI_SCRIPT_MERGE_ALGORITHM,
    scriptCount: input.perScriptProjections.length,
    explanation:
      "Each activated Match Script produces an independent Poisson scoreline matrix. " +
      "Final pre-calibration probabilities are the convex combination of cell probabilities " +
      "using Match Script weights only; calibration applies afterward to the merged 1X2 marginals.",
    mergedPHome: roundProbability(mergedMatrix.pHome),
    mergedPDraw: roundProbability(mergedMatrix.pDraw),
    mergedPAway: roundProbability(mergedMatrix.pAway),
    mergedGoalRange: Object.freeze({
      range01: roundProbability(mergedMatrix.goalRange.range01),
      range23: roundProbability(mergedMatrix.goalRange.range23),
      range4Plus: roundProbability(mergedMatrix.goalRange.range4Plus),
    }),
    mergedMostLikelyScoreline: toScorelineSummary(
      mergedMatrix.topScorelines[0] ?? {
        homeGoals: 0,
        awayGoals: 0,
        probability: 0,
      },
    ),
    mergedSecondScoreline: secondScoreline(mergedMatrix.topScorelines),
  });
}
