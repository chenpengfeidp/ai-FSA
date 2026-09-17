import type { SealedPredictionInput } from "./prediction-evaluation.js";
import type { PrematchPredictionSeal } from "./prematch-prediction-seal.js";
import { PREMATCH_SEAL_SOURCE_AUTHORITY } from "./prematch-prediction-seal.js";

export const HISTORICAL_PREDICTION_SEAL_KIND = "sealed_projection" as const;

export const UNIT_TEST_CONSTRUCTED_SOURCE_AUTHORITY =
  "unit_test_constructed" as const;

export interface HistoricalPredictionSealObservation {
  readonly type?: string;
  readonly collectedAt: string;
}

/**
 * Intake-facing authentic PRE_MATCH seal contract.
 * The intake authenticates this artifact; it never generates one.
 */
export interface HistoricalPredictionSeal {
  readonly originalSealId: string;
  readonly originalSealKind: typeof HISTORICAL_PREDICTION_SEAL_KIND;
  readonly originalSealSource: string;
  readonly originalSealChecksum: string;
  readonly checksumAlgorithm: string;
  readonly checksumCanonicalization: string;
  readonly checksumScope: string;
  readonly checksumPayload?: unknown;
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly competitionId: string;
  readonly competitionName: string;
  readonly season: string;
  readonly kickoff: string;
  readonly generatedAt: string;
  readonly analysisTime: string;
  readonly analysisCutoff: string;
  readonly predictionSnapshot: SealedPredictionInput;
  readonly featureModelVersion: string;
  readonly ruleSetVersion: string;
  readonly projectionModelVersion: string;
  readonly projectionPolicyPin?: string;
  readonly parameterArtifactId?: string;
  readonly parameterVersionLabel?: string;
  readonly parameterArtifactChecksum?: string;
  readonly reportChecksum?: string;
  readonly historicalAuthenticity: boolean;
  readonly synthetic: boolean;
  readonly provenanceClass: string;
  readonly allowedUsage: readonly string[];
  readonly reconstructed?: boolean;
  readonly generatedByCurrentAnalysisPipeline?: boolean;
  readonly observations?: readonly HistoricalPredictionSealObservation[];
  readonly sourceAuthority?: string;
}

export function historicalPredictionSealFromPrematch(
  seal: PrematchPredictionSeal,
): HistoricalPredictionSeal {
  const identity = seal.sealIdentity;

  return Object.freeze({
    originalSealId: seal.originalSealId,
    originalSealKind: HISTORICAL_PREDICTION_SEAL_KIND,
    originalSealSource: identity.sourceAuthority,
    originalSealChecksum: seal.contentSha256,
    checksumAlgorithm: "sha256",
    checksumCanonicalization: "fas-json-canonical.v1",
    checksumScope: "/schemaVersion+originalSealId+sealedAt+sealIdentity",
    checksumPayload: Object.freeze({
      schemaVersion: seal.schemaVersion,
      originalSealId: seal.originalSealId,
      sealedAt: seal.sealedAt,
      sealIdentity: identity,
    }),
    matchId: identity.matchId,
    homeTeam: identity.homeTeam,
    awayTeam: identity.awayTeam,
    competitionId: identity.competitionId,
    competitionName: identity.competitionName,
    season: identity.season,
    kickoff: identity.kickoff,
    generatedAt: seal.sealedAt,
    analysisTime: identity.analysisTime,
    analysisCutoff: identity.analysisCutoff,
    predictionSnapshot: identity.predictionSnapshot,
    featureModelVersion: identity.featureModelVersion,
    ruleSetVersion: identity.ruleSetVersion,
    projectionModelVersion: identity.projectionModelVersion,
    projectionPolicyPin: identity.projectionPolicyPin,
    ...(identity.parameterArtifactId === undefined
      ? {}
      : { parameterArtifactId: identity.parameterArtifactId }),
    ...(identity.parameterVersionLabel === undefined
      ? {}
      : { parameterVersionLabel: identity.parameterVersionLabel }),
    ...(identity.parameterArtifactChecksum === undefined
      ? {}
      : { parameterArtifactChecksum: identity.parameterArtifactChecksum }),
    historicalAuthenticity: identity.historicalAuthenticity,
    synthetic: identity.synthetic,
    provenanceClass: identity.provenanceClass,
    allowedUsage: identity.allowedUsage,
    sourceAuthority: identity.sourceAuthority ?? PREMATCH_SEAL_SOURCE_AUTHORITY,
  });
}
