import type { Evidence } from "@fas/evidence";
import {
  evaluatePrediction,
  findActualMatchResult,
  type ActualMatchResult,
  type PredictionEvaluationRecord,
  type SealedPredictionInput,
} from "@fas/statistics";
import type { AnalysisResult } from "../domain/analysis-result.js";
import { buildSealedPredictionInput } from "../evaluation/build-sealed-prediction-input.js";

export type EvaluatePredictionResult =
  | Readonly<{
      ok: true;
      value: Readonly<{
        actual: ActualMatchResult;
        evaluation: PredictionEvaluationRecord;
      }>;
    }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: "ACTUAL_RESULT_UNAVAILABLE" | "EVALUATION_FAILED";
        message: string;
      }>;
    }>;

export interface EvaluatePredictionCommand {
  readonly analysis: AnalysisResult;
  readonly evaluatedAt?: string;
  /** Optional override; defaults to MATCH_RESULT in analysis.evidenceSet. */
  readonly actual?: ActualMatchResult;
  readonly evidences?: readonly Evidence[];
}

/**
 * B2 EvaluatePredictionUseCase: compare sealed analysis to verified Actual.
 * Never mutates pre-match seals or Projection.
 */
export class EvaluatePredictionUseCase {
  execute(command: EvaluatePredictionCommand): EvaluatePredictionResult {
    try {
      const actual =
        command.actual ??
        findActualMatchResult(command.evidences ?? command.analysis.evidenceSet);

      if (actual === undefined) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "ACTUAL_RESULT_UNAVAILABLE" as const,
            message:
              "MATCH_RESULT Evidence is absent; evaluation requires a finished actual outcome.",
          }),
        });
      }

      const prediction: SealedPredictionInput = buildSealedPredictionInput(
        command.analysis,
      );
      const evaluation = evaluatePrediction({
        prediction,
        actual,
        evaluatedAt: command.evaluatedAt ?? command.analysis.generatedAt,
      });

      return Object.freeze({
        ok: true as const,
        value: Object.freeze({ actual, evaluation }),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Prediction evaluation failed unexpectedly.";

      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code: "EVALUATION_FAILED" as const,
          message,
        }),
      });
    }
  }
}
