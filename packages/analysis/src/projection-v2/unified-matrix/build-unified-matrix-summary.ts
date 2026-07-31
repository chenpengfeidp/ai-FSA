import { roundProbability } from "../../projection/projection-math.js";
import { MULTI_SCRIPT_MERGE_ALGORITHM } from "../multi-script/compute-multi-script-projection.js";
import type { PerScriptProjection } from "../multi-script/compute-multi-script-projection.js";
import type { ProbabilityMatrix } from "../probability-matrix/probability-matrix.js";
import {
  buildUnifiedMatrixDerivationNotes,
  deriveMatrixPredictions,
  UNIFIED_MATRIX_DERIVATION_POLICY,
  type MatrixDerivedPredictions,
} from "./derive-matrix-predictions.js";

export interface UnifiedMatrixSummary {
  readonly policyVersion: typeof UNIFIED_MATRIX_DERIVATION_POLICY;
  readonly mergeAlgorithm: typeof MULTI_SCRIPT_MERGE_ALGORITHM;
  readonly matrixChecksum: string;
  readonly scriptCount: number;
  readonly explanation: string;
  readonly derived: MatrixDerivedPredictions;
  readonly derivationNotes: readonly string[];
}

export function buildUnifiedMatrixSummary(input: {
  readonly perScriptProjections: readonly PerScriptProjection[];
  readonly unifiedMatrix: ProbabilityMatrix | null;
}): UnifiedMatrixSummary | null {
  const { unifiedMatrix } = input;

  if (unifiedMatrix === null) {
    return null;
  }

  const derived = deriveMatrixPredictions(unifiedMatrix.matrix);

  return Object.freeze({
    policyVersion: UNIFIED_MATRIX_DERIVATION_POLICY,
    mergeAlgorithm: MULTI_SCRIPT_MERGE_ALGORITHM,
    matrixChecksum: unifiedMatrix.checksum,
    scriptCount: input.perScriptProjections.length,
    explanation:
      "Per-script scoreline matrices merge by Match Script weights into one unified matrix. " +
      "Every displayed prediction below is a marginal or cell aggregate of that matrix only.",
    derived,
    derivationNotes: buildUnifiedMatrixDerivationNotes(derived),
  });
}

export function derivePerScriptMatrixPredictions(
  matrix: ProbabilityMatrix,
): Pick<MatrixDerivedPredictions, "pBttsYes" | "pBttsNo" | "pOver25" | "pUnder25"> {
  const derived = deriveMatrixPredictions(matrix.matrix);

  return Object.freeze({
    pBttsYes: derived.pBttsYes,
    pBttsNo: derived.pBttsNo,
    pOver25: derived.pOver25,
    pUnder25: derived.pUnder25,
  });
}

export function roundDerivedPredictions(
  derived: MatrixDerivedPredictions,
): MatrixDerivedPredictions {
  return Object.freeze({
    ...derived,
    pHome: roundProbability(derived.pHome),
    pDraw: roundProbability(derived.pDraw),
    pAway: roundProbability(derived.pAway),
    goalRange: Object.freeze({
      range01: roundProbability(derived.goalRange.range01),
      range23: roundProbability(derived.goalRange.range23),
      range4Plus: roundProbability(derived.goalRange.range4Plus),
    }),
    mostLikelyScoreline: Object.freeze({
      ...derived.mostLikelyScoreline,
      probability: roundProbability(derived.mostLikelyScoreline.probability),
    }),
    secondScoreline:
      derived.secondScoreline === null
        ? null
        : Object.freeze({
            ...derived.secondScoreline,
            probability: roundProbability(derived.secondScoreline.probability),
          }),
    pBttsYes: roundProbability(derived.pBttsYes),
    pBttsNo: roundProbability(derived.pBttsNo),
    pOver25: roundProbability(derived.pOver25),
    pUnder25: roundProbability(derived.pUnder25),
  });
}
