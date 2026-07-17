import type { ImportMatchResult } from "@fas/application";
import type { Evidence } from "@fas/evidence";
import type { EvidenceQueryResult } from "@fas/evidence-query";
import type { Feature } from "@fas/feature";
import type { MatchId } from "@fas/match";
import type { RuleResult } from "@fas/rule";
import {
  createAnalysisResult,
  type AnalysisResult,
} from "../domain/analysis-result.js";

export type Result<Value, Failure> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ error: Failure; ok: false }>;

export interface MatchImportOperation {
  execute(matchId: MatchId): ImportMatchResult;
}

export interface EvidenceByIdQuery {
  findById(id: string): EvidenceQueryResult<Evidence | undefined>;
}

export interface FeatureExtractionOperation {
  extract(evidence: Evidence): readonly Feature[];
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

export class AnalyzeMatchUseCase {
  readonly #importMatch: MatchImportOperation;
  readonly #evidenceQuery: EvidenceByIdQuery;
  readonly #featureExtractor: FeatureExtractionOperation;
  readonly #ruleEvaluator: RuleEvaluationOperation;

  constructor(
    importMatch: MatchImportOperation,
    evidenceQuery: EvidenceByIdQuery,
    featureExtractor: FeatureExtractionOperation,
    ruleEvaluator: RuleEvaluationOperation,
  ) {
    this.#importMatch = importMatch;
    this.#evidenceQuery = evidenceQuery;
    this.#featureExtractor = featureExtractor;
    this.#ruleEvaluator = ruleEvaluator;
  }

  execute(matchId: MatchId): AnalyzeMatchResult {
    let imported: ImportMatchResult;

    try {
      imported = this.#importMatch.execute(matchId);
    } catch {
      return failure("IMPORT_FAILED", "Match import failed unexpectedly.");
    }

    if (!imported.ok) {
      return failure("IMPORT_FAILED", "Match import failed.", imported.error);
    }

    let queried: EvidenceQueryResult<Evidence | undefined>;

    try {
      queried = this.#evidenceQuery.findById(imported.value.id);
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

    if (queried.value === undefined) {
      return failure(
        "EVIDENCE_NOT_FOUND",
        `Imported Evidence "${imported.value.id}" was not found.`,
      );
    }

    if (queried.value.id !== imported.value.id) {
      return failure(
        "EVIDENCE_QUERY_FAILED",
        "Evidence query returned an unexpected identity.",
      );
    }

    let features: readonly Feature[];

    try {
      features = Object.freeze([...this.#featureExtractor.extract(queried.value)]);
    } catch {
      return failure(
        "FEATURE_EXTRACTION_FAILED",
        "Feature extraction failed unexpectedly.",
      );
    }

    let ruleResults: readonly RuleResult[];

    try {
      ruleResults = Object.freeze([...this.#ruleEvaluator.evaluate(features)]);
    } catch {
      return failure(
        "RULE_EVALUATION_FAILED",
        "Rule evaluation failed unexpectedly.",
      );
    }

    try {
      return success(
        createAnalysisResult({
          matchId,
          evidence: queried.value,
          features,
          ruleResults,
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
