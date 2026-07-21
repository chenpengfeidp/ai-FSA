import type { ImportMatchResult } from "@fas/application";
import type { Evidence } from "@fas/evidence";
import type { EvidenceQueryResult } from "@fas/evidence-query";
import type { Feature, FeatureBundle } from "@fas/feature";
import type { MatchId } from "@fas/match";
import type { RuleResult } from "@fas/rule";
import {
  type CalibrationArtifact,
  IDENTITY_CALIBRATION_ARTIFACT,
} from "@fas/statistics";
import { computeIntelligenceConfidence } from "../confidence/intelligence-confidence.js";
import {
  createAnalysisResult,
  type AnalysisResult,
} from "../domain/analysis-result.js";
import { computeDeterministicMatchProjection } from "../projection/compute-deterministic-projection.js";
import type { DeterministicMatchProjection } from "../projection/deterministic-match-projection.js";
import { buildScenarioSet } from "../scenario/scenario-set.js";

export type Result<Value, Failure> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ error: Failure; ok: false }>;

export interface MatchImportOperation {
  execute(matchId: MatchId): Promise<ImportMatchResult>;
}

export interface EvidenceByMatchQuery {
  findByMatch(matchId: MatchId): Promise<EvidenceQueryResult<readonly Evidence[]>>;
}

export interface FeatureExtractionOperation {
  extractBundle(evidences: readonly Evidence[]): FeatureBundle;
}

export interface RuleEvaluationOperation {
  evaluate(features: readonly Feature[]): readonly RuleResult[];
}

export type AnalysisErrorCode =
  | "ANALYSIS_RESULT_FAILED"
  | "EVIDENCE_NOT_FOUND"
  | "EVIDENCE_QUERY_FAILED"
  | "FEATURE_EXTRACTION_FAILED"
  | "IMPORT_FAILED"
  | "PROJECTION_FAILED"
  | "RULE_EVALUATION_FAILED";

export interface AnalysisErrorCause {
  readonly code: string;
  readonly message: string;
}

export interface AnalysisError {
  readonly cause?: AnalysisErrorCause;
  readonly code: AnalysisErrorCode;
  readonly message: string;
}

export type AnalyzeMatchResult = Result<AnalysisResult, AnalysisError>;

function success(value: AnalysisResult): Readonly<{
  ok: true;
  value: AnalysisResult;
}> {
  return Object.freeze({ ok: true, value });
}

function failure(
  code: AnalysisErrorCode,
  message: string,
  cause?: AnalysisErrorCause,
): Readonly<{ error: AnalysisError; ok: false }> {
  const frozenCause =
    cause === undefined
      ? undefined
      : Object.freeze({ code: cause.code, message: cause.message });
  const error =
    frozenCause === undefined
      ? Object.freeze({ code, message })
      : Object.freeze({ cause: frozenCause, code, message });

  return Object.freeze({ error, ok: false });
}

function latestEvaluationTime(ruleResults: readonly RuleResult[]): string {
  return ruleResults.reduce((latest, result) => {
    const latestTime = Date.parse(latest);
    const resultTime = Date.parse(result.evaluatedAt);

    if (
      resultTime > latestTime ||
      (resultTime === latestTime && result.evaluatedAt > latest)
    ) {
      return result.evaluatedAt;
    }

    return latest;
  }, ruleResults[0]?.evaluatedAt ?? "");
}

function countRequiredEvidence(evidences: readonly Evidence[]): number {
  const hasMatchInfo = evidences.some((evidence) => evidence.type === "MATCH_INFO");
  const hasHomeForm = evidences.some(
    (evidence) =>
      evidence.type === "TEAM_FORM" && evidence.payload.teamSide === "home",
  );
  const hasAwayForm = evidences.some(
    (evidence) =>
      evidence.type === "TEAM_FORM" && evidence.payload.teamSide === "away",
  );
  const hasHomeStats = evidences.some(
    (evidence) =>
      evidence.type === "STATISTICS" && evidence.payload.teamSide === "home",
  );
  const hasAwayStats = evidences.some(
    (evidence) =>
      evidence.type === "STATISTICS" && evidence.payload.teamSide === "away",
  );

  return [hasMatchInfo, hasHomeForm, hasAwayForm, hasHomeStats, hasAwayStats].filter(
    Boolean,
  ).length;
}

export class AnalyzeMatchUseCase {
  readonly #importMatch: MatchImportOperation;
  readonly #evidenceQuery: EvidenceByMatchQuery;
  readonly #featureExtractor: FeatureExtractionOperation;
  readonly #ruleEvaluator: RuleEvaluationOperation;
  readonly #calibrationArtifact: CalibrationArtifact;

  constructor(
    importMatch: MatchImportOperation,
    evidenceQuery: EvidenceByMatchQuery,
    featureExtractor: FeatureExtractionOperation,
    ruleEvaluator: RuleEvaluationOperation,
    calibrationArtifact: CalibrationArtifact = IDENTITY_CALIBRATION_ARTIFACT,
  ) {
    this.#importMatch = importMatch;
    this.#evidenceQuery = evidenceQuery;
    this.#featureExtractor = featureExtractor;
    this.#ruleEvaluator = ruleEvaluator;
    this.#calibrationArtifact = calibrationArtifact;
  }

  async execute(matchId: MatchId): Promise<AnalyzeMatchResult> {
    let imported: ImportMatchResult;

    try {
      imported = await this.#importMatch.execute(matchId);
    } catch {
      return failure("IMPORT_FAILED", "Match import failed unexpectedly.");
    }

    if (!imported.ok) {
      return failure("IMPORT_FAILED", "Match import failed.", imported.error);
    }

    let queried: EvidenceQueryResult<readonly Evidence[]>;

    try {
      queried = await this.#evidenceQuery.findByMatch(matchId);
    } catch {
      return failure("EVIDENCE_QUERY_FAILED", "Evidence query failed unexpectedly.");
    }

    if (!queried.ok) {
      return failure(
        "EVIDENCE_QUERY_FAILED",
        "Evidence query failed.",
        queried.error,
      );
    }

    const evidenceSet = queried.value;
    const matchInfo = evidenceSet.find((evidence) => evidence.type === "MATCH_INFO");

    if (matchInfo === undefined) {
      return failure(
        "EVIDENCE_NOT_FOUND",
        `MATCH_INFO Evidence for "${matchId}" was not found.`,
      );
    }

    let featureBundle: FeatureBundle;

    try {
      featureBundle = this.#featureExtractor.extractBundle(evidenceSet);
    } catch {
      return failure(
        "FEATURE_EXTRACTION_FAILED",
        "Feature extraction failed unexpectedly.",
      );
    }

    const features = featureBundle.features;
    let ruleResults: readonly RuleResult[];

    try {
      ruleResults = Object.freeze([...this.#ruleEvaluator.evaluate(features)]);
    } catch {
      return failure(
        "RULE_EVALUATION_FAILED",
        "Rule evaluation failed unexpectedly.",
      );
    }

    let projection: DeterministicMatchProjection;

    try {
      projection = computeDeterministicMatchProjection({
        featureBundle,
        ruleResults,
        requiredEvidencePresentCount: countRequiredEvidence(evidenceSet),
        calibrationArtifact: this.#calibrationArtifact,
      });
    } catch {
      return failure(
        "PROJECTION_FAILED",
        "Deterministic match projection failed unexpectedly.",
      );
    }

    const scenarios = buildScenarioSet(projection);
    const intelligenceConfidence = computeIntelligenceConfidence({
      matchId,
      evidenceSet,
      featureBundle,
      ruleResults,
      scenarios,
    });

    try {
      return success(
        createAnalysisResult({
          matchId,
          evidence: matchInfo,
          evidenceSet,
          features,
          featureBundle,
          ruleResults,
          projection,
          scenarios,
          intelligenceConfidence,
          generatedAt: latestEvaluationTime(ruleResults),
        }),
      );
    } catch {
      return failure(
        "ANALYSIS_RESULT_FAILED",
        "AnalysisResult creation failed unexpectedly.",
      );
    }
  }
}
