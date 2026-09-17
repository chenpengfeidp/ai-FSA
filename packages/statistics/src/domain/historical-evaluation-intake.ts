import type { ActualMatchResult } from "./actual-match-result.js";
import type { HistoricalPredictionSeal } from "./historical-prediction-seal.js";
import type { HistoricalIntakeEvaluationHistoryRecord } from "./evaluation-history.js";
import type { SealedProjectionReplayContext } from "../replay/projection-replay-context.js";

export const HISTORICAL_EVALUATION_INTAKE_FAILURE_CODES = Object.freeze([
  "INVALID_SEAL_CHECKSUM",
  "UNSUPPORTED_CHECKSUM_ALGORITHM",
  "UNSUPPORTED_CANONICALIZATION",
  "FIXTURE_IDENTITY_MISMATCH",
  "HOME_AWAY_ORIENTATION_MISMATCH",
  "GENERATED_AT_NOT_PRE_MATCH",
  "ANALYSIS_TIME_NOT_PRE_MATCH",
  "INVALID_ANALYSIS_CUTOFF",
  "POST_MATCH_LEAKAGE",
  "ACTUAL_NOT_FINISHED",
  "ACTUAL_NOT_REAL_WORLD_VERIFIED",
  "ACTUAL_FIXTURE_MISMATCH",
  "ACTUAL_OBSERVED_NOT_AFTER_KICKOFF",
  "SYNTHETIC_FIXTURE_REJECTED",
  "RETROSPECTIVE_RECONSTRUCTION",
  "CONFLICTING_ACTUAL",
  "UNSUPPORTED_HISTORY_SCHEMA_VERSION",
  "INVALID_REPLAY_PROVENANCE",
  "MISSING_MODEL_VERSION",
] as const);

export type HistoricalEvaluationIntakeFailureCode =
  (typeof HISTORICAL_EVALUATION_INTAKE_FAILURE_CODES)[number];

export class HistoricalEvaluationIntakeError extends Error {
  readonly code: HistoricalEvaluationIntakeFailureCode;

  constructor(code: HistoricalEvaluationIntakeFailureCode, message: string) {
    super(message);
    this.name = "HistoricalEvaluationIntakeError";
    this.code = code;
  }
}

export interface HistoricalIntakeMatchResultEvidence {
  readonly id: string;
  readonly type: string;
  readonly quality: string;
  readonly providerId: string;
  readonly sourceId: string;
  readonly method: string;
  readonly matchId: string;
  readonly collectedAt?: string;
}

export interface VerifiedRealWorldActual {
  readonly actual: ActualMatchResult;
  readonly evidence: HistoricalIntakeMatchResultEvidence;
  readonly realWorldVerification: boolean;
  readonly verificationClass: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly competitionId: string;
  readonly competitionName: string;
  readonly season: string;
  readonly kickoff: string;
}

export interface HistoricalIntakeReplaySidecarInput {
  readonly context: SealedProjectionReplayContext;
  readonly contentSha256?: string;
  readonly reconstructed?: boolean;
}

export interface HistoricalEvaluationIntakeCommand {
  readonly seal: HistoricalPredictionSeal;
  readonly actual: VerifiedRealWorldActual;
  readonly intakeRecordedAt: string;
  readonly replaySidecar?: HistoricalIntakeReplaySidecarInput;
}

export type HistoricalEvaluationIntakeResult =
  | {
      readonly status: "accepted";
      readonly history: HistoricalIntakeEvaluationHistoryRecord;
      readonly sidecarSaved: boolean;
      readonly sidecarFailureCode?: HistoricalEvaluationIntakeFailureCode;
    }
  | {
      readonly status: "rejected";
      readonly code: HistoricalEvaluationIntakeFailureCode;
      readonly message: string;
    };
