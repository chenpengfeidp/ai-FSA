import type { Evidence } from "@fas/evidence";
import type { Feature } from "@fas/feature";
import { createMatchId, type MatchId } from "@fas/match";
import type { RuleResult } from "@fas/rule";

export interface AnalysisResult {
  readonly matchId: MatchId;
  readonly evidence: Evidence;
  readonly features: readonly Feature[];
  readonly ruleResults: readonly RuleResult[];
  readonly generatedAt: string;
}

export interface CreateAnalysisResultInput {
  readonly matchId: MatchId;
  readonly evidence: Evidence;
  readonly features: readonly Feature[];
  readonly ruleResults: readonly RuleResult[];
  readonly generatedAt: string;
}

export class AnalysisResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisResultValidationError";
  }
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AnalysisResultValidationError(
      "generatedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

function requireNonEmpty<Value>(
  values: readonly Value[],
  field: string,
): readonly Value[] {
  if (values.length === 0) {
    throw new AnalysisResultValidationError(`${field} must not be empty.`);
  }

  return Object.freeze([...values]);
}

export function createAnalysisResult(
  input: CreateAnalysisResultInput,
): AnalysisResult {
  const matchId = createMatchId(input.matchId);
  const features = requireNonEmpty(input.features, "features");
  const ruleResults = requireNonEmpty(input.ruleResults, "ruleResults");

  if (input.evidence.matchId !== matchId) {
    throw new AnalysisResultValidationError(
      "evidence must reference the AnalysisResult MatchId.",
    );
  }

  if (features.some((feature) => feature.matchId !== matchId)) {
    throw new AnalysisResultValidationError(
      "features must reference the AnalysisResult MatchId.",
    );
  }

  if (ruleResults.some((result) => result.matchId !== matchId)) {
    throw new AnalysisResultValidationError(
      "ruleResults must reference the AnalysisResult MatchId.",
    );
  }

  return Object.freeze({
    matchId,
    evidence: input.evidence,
    features,
    ruleResults,
    generatedAt: requireTimestamp(input.generatedAt),
  });
}
