import type { SealedPredictionInput } from "../domain/prediction-evaluation.js";
import {
  PREMATCH_SEAL_SOURCE_AUTHORITY,
  PrematchPredictionSealError,
  type PrematchFixtureIdentity,
  type PrematchPredictionSeal,
  type SealEvidenceAuditRecord,
} from "../domain/prematch-prediction-seal.js";
import { createPrematchPredictionSeal } from "./create-prematch-prediction-seal.js";
import type { PrematchPredictionSealRepository } from "../repository/prematch-prediction-seal-repository.js";

export interface CapturePrematchPredictionSealInput {
  readonly fixture: PrematchFixtureIdentity;
  readonly expectedFixture?: PrematchFixtureIdentity;
  readonly evidenceSet: readonly SealEvidenceAuditRecord[];
  readonly predictionSnapshot: SealedPredictionInput;
  readonly featureModelVersion: string;
  readonly ruleSetVersion: string;
  readonly projectionModelVersion: string;
  readonly projectionPolicyPin: string;
  readonly parameterArtifactId?: string;
  readonly parameterVersionLabel?: string;
  readonly parameterArtifactChecksum?: string;
  readonly analysisTime: string;
  readonly analysisCutoff: string;
  readonly sealedAt: string;
  readonly sourceAuthority?: string;
  readonly schemaVersion?: string;
  readonly checksumAlgorithm?: string;
  readonly canonicalization?: string;
  readonly synthetic?: boolean;
  readonly reconstructed?: boolean;
  readonly replay?: boolean;
  readonly actual?: unknown;
  readonly timestampsInferred?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function capturePrematchPredictionSeal(
  input: CapturePrematchPredictionSealInput,
  repository: PrematchPredictionSealRepository,
): Promise<PrematchPredictionSeal> {
  if (input.reconstructed === true) {
    throw new PrematchPredictionSealError(
      "RETROSPECTIVE_RECONSTRUCTION",
      "Retrospective reconstruction or backfilling cannot create an original PRE_MATCH seal.",
    );
  }

  if (input.replay === true) {
    throw new PrematchPredictionSealError(
      "REPLAY_NOT_ORIGINAL_SEAL",
      "Replay output cannot be stored as an original PRE_MATCH seal.",
    );
  }

  if (input.actual !== undefined) {
    throw new PrematchPredictionSealError(
      "ACTUAL_FORBIDDEN",
      "Actual results are forbidden on PRE_MATCH seal capture.",
    );
  }

  if (input.timestampsInferred === true) {
    throw new PrematchPredictionSealError(
      "TIMESTAMP_INFERRED",
      "Git, filesystem, intake, or replay timestamps cannot prove PRE_MATCH authenticity.",
    );
  }

  if (input.analysisCutoff !== input.analysisTime) {
    throw new PrematchPredictionSealError(
      "INVALID_ANALYSIS_CUTOFF",
      "analysisCutoff must equal analysisTime.",
    );
  }

  if (input.expectedFixture !== undefined) {
    if (input.expectedFixture.matchId !== input.fixture.matchId) {
      throw new PrematchPredictionSealError(
        "FIXTURE_IDENTITY_MISMATCH",
        "Seal matchId does not match the expected fixture identity.",
      );
    }

    if (
      input.expectedFixture.competitionId !== input.fixture.competitionId ||
      input.expectedFixture.competitionName !== input.fixture.competitionName ||
      input.expectedFixture.season !== input.fixture.season
    ) {
      throw new PrematchPredictionSealError(
        "FIXTURE_IDENTITY_MISMATCH",
        "Competition or season does not match the expected fixture identity.",
      );
    }

    if (
      input.expectedFixture.homeTeam !== input.fixture.homeTeam ||
      input.expectedFixture.awayTeam !== input.fixture.awayTeam
    ) {
      throw new PrematchPredictionSealError(
        "HOME_AWAY_ORIENTATION_MISMATCH",
        "Home/away orientation does not match the expected fixture identity.",
      );
    }
  }

  for (const evidence of input.evidenceSet) {
    if (evidence.type === "MATCH_RESULT") {
      throw new PrematchPredictionSealError(
        "POST_MATCH_EVIDENCE",
        "MATCH_RESULT evidence cannot contribute to a Class A PRE_MATCH seal.",
      );
    }

    if (Date.parse(evidence.collectedAt) > Date.parse(input.analysisCutoff)) {
      throw new PrematchPredictionSealError(
        "EVIDENCE_AFTER_CUTOFF",
        "Evidence collectedAt must be at or before analysisCutoff.",
      );
    }
  }

  const seal = createPrematchPredictionSeal({
    fixture: input.fixture,
    analysisTime: input.analysisTime,
    analysisCutoff: input.analysisCutoff,
    sealedAt: input.sealedAt,
    predictionSnapshot: input.predictionSnapshot,
    featureModelVersion: input.featureModelVersion,
    ruleSetVersion: input.ruleSetVersion,
    projectionModelVersion: input.projectionModelVersion,
    projectionPolicyPin: input.projectionPolicyPin,
    ...(input.parameterArtifactId === undefined
      ? {}
      : { parameterArtifactId: input.parameterArtifactId }),
    ...(input.parameterVersionLabel === undefined
      ? {}
      : { parameterVersionLabel: input.parameterVersionLabel }),
    ...(input.parameterArtifactChecksum === undefined
      ? {}
      : { parameterArtifactChecksum: input.parameterArtifactChecksum }),
    ...(input.sourceAuthority === undefined
      ? {}
      : { sourceAuthority: input.sourceAuthority }),
    ...(input.schemaVersion === undefined
      ? {}
      : { schemaVersion: input.schemaVersion }),
    ...(input.checksumAlgorithm === undefined
      ? {}
      : { checksumAlgorithm: input.checksumAlgorithm }),
    ...(input.canonicalization === undefined
      ? {}
      : { canonicalization: input.canonicalization }),
    ...(input.synthetic === undefined ? {} : { synthetic: input.synthetic }),
  });

  if (
    seal.sealIdentity.sourceAuthority !== PREMATCH_SEAL_SOURCE_AUTHORITY ||
    !isRecord(seal.sealIdentity)
  ) {
    throw new PrematchPredictionSealError(
      "UNTRUSTED_SOURCE_AUTHORITY",
      "Class A seals require prisma.prematch_prediction_seal_items.",
    );
  }

  return repository.save(seal);
}
