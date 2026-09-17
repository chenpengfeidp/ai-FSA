import { HistoricalEvaluationIntakeError } from "../domain/historical-evaluation-intake.js";
import type { VerifiedRealWorldActual } from "../domain/historical-evaluation-intake.js";
import type { HistoricalPredictionSeal } from "../domain/historical-prediction-seal.js";

export function validateVerifiedRealWorldActual(
  actual: VerifiedRealWorldActual,
  seal: HistoricalPredictionSeal,
): VerifiedRealWorldActual {
  if (actual.actual.matchStatus !== "FINISHED") {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_NOT_FINISHED",
      "Actual matchStatus must be FINISHED.",
    );
  }

  if (
    actual.realWorldVerification !== true ||
    actual.verificationClass === "controlled-fixture-only" ||
    actual.evidence.quality !== "verified"
  ) {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_NOT_REAL_WORLD_VERIFIED",
      "Controlled fixture verification is never real-world verification.",
    );
  }

  if (actual.evidence.type !== "MATCH_RESULT") {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_NOT_REAL_WORLD_VERIFIED",
      "Verified Actual Evidence type must be MATCH_RESULT.",
    );
  }

  if (actual.evidence.id.trim().length === 0) {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_NOT_REAL_WORLD_VERIFIED",
      "Verified Actual Evidence id is required.",
    );
  }

  if (
    actual.evidence.providerId.trim().length === 0 ||
    actual.evidence.sourceId.trim().length === 0 ||
    actual.evidence.method.trim().length === 0
  ) {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_NOT_REAL_WORLD_VERIFIED",
      "Verified Actual Evidence provenance (providerId / sourceId / method) is required.",
    );
  }

  if (
    actual.actual.matchId !== seal.matchId ||
    actual.evidence.matchId !== seal.matchId
  ) {
    throw new HistoricalEvaluationIntakeError(
      "FIXTURE_IDENTITY_MISMATCH",
      "Actual matchId must bind exactly to the seal matchId.",
    );
  }

  if (actual.homeTeam === seal.awayTeam && actual.awayTeam === seal.homeTeam) {
    throw new HistoricalEvaluationIntakeError(
      "HOME_AWAY_ORIENTATION_MISMATCH",
      "Actual home/away orientation is reversed relative to the seal.",
    );
  }

  if (
    actual.homeTeam !== seal.homeTeam ||
    actual.awayTeam !== seal.awayTeam ||
    actual.competitionId !== seal.competitionId ||
    actual.competitionName !== seal.competitionName ||
    actual.season !== seal.season ||
    actual.kickoff !== seal.kickoff
  ) {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_FIXTURE_MISMATCH",
      "Actual competition, season, teams, or kickoff do not bind to the seal.",
    );
  }

  if (
    actual.actual.competitionId !== undefined &&
    actual.actual.competitionId !== seal.competitionId
  ) {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_FIXTURE_MISMATCH",
      "ActualMatchResult.competitionId does not bind to the seal.",
    );
  }

  if (
    actual.actual.competitionName !== undefined &&
    actual.actual.competitionName !== seal.competitionName
  ) {
    throw new HistoricalEvaluationIntakeError(
      "ACTUAL_FIXTURE_MISMATCH",
      "ActualMatchResult.competitionName does not bind to the seal.",
    );
  }

  return actual;
}
