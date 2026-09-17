import { HistoricalEvaluationIntakeError } from "../domain/historical-evaluation-intake.js";
import type { VerifiedRealWorldActual } from "../domain/historical-evaluation-intake.js";
import type { HistoricalPredictionSeal } from "../domain/historical-prediction-seal.js";

function instant(value: string, field: string): number {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new HistoricalEvaluationIntakeError(
      "INVALID_ANALYSIS_CUTOFF",
      `${field} must be a valid ISO-8601 instant.`,
    );
  }

  return parsed;
}

export function assertHistoricalIntakeTemporalIntegrity(input: {
  readonly seal: HistoricalPredictionSeal;
  readonly actual: VerifiedRealWorldActual;
}): void {
  const { seal, actual } = input;
  const analysisTime = instant(seal.analysisTime, "analysisTime");
  const analysisCutoff = instant(seal.analysisCutoff, "analysisCutoff");
  const generatedAt = instant(seal.generatedAt, "generatedAt");
  const kickoff = instant(seal.kickoff, "kickoff");
  const observedAt = instant(actual.actual.observedAt, "observedAt");

  if (seal.analysisCutoff !== seal.analysisTime || analysisCutoff !== analysisTime) {
    throw new HistoricalEvaluationIntakeError(
      "INVALID_ANALYSIS_CUTOFF",
      "analysisCutoff must equal analysisTime.",
    );
  }

  if (analysisTime >= kickoff) {
    throw new HistoricalEvaluationIntakeError(
      "ANALYSIS_TIME_NOT_PRE_MATCH",
      "analysisTime must be strictly before kickoff.",
    );
  }

  if (analysisCutoff >= kickoff) {
    throw new HistoricalEvaluationIntakeError(
      "INVALID_ANALYSIS_CUTOFF",
      "analysisCutoff must be strictly before kickoff.",
    );
  }

  if (generatedAt >= kickoff) {
    throw new HistoricalEvaluationIntakeError(
      "GENERATED_AT_NOT_PRE_MATCH",
      "generatedAt must be strictly before kickoff.",
    );
  }

  if (generatedAt < analysisTime) {
    throw new HistoricalEvaluationIntakeError(
      "GENERATED_AT_NOT_PRE_MATCH",
      "generatedAt must not precede analysisTime.",
    );
  }

  if (observedAt <= kickoff) {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_OBSERVED_NOT_AFTER_KICKOFF",
      "Actual observedAt must be strictly after kickoff.",
    );
  }

  const observations = seal.observations ?? [];

  for (const observation of observations) {
    const collectedAt = instant(observation.collectedAt, "observation.collectedAt");

    if (collectedAt >= kickoff || observation.type === "MATCH_RESULT") {
      throw new HistoricalEvaluationIntakeError(
        "POST_MATCH_LEAKAGE",
        "PRE_MATCH seal must not contain post-kickoff observations or MATCH_RESULT Evidence.",
      );
    }
  }
}
