import type {
  DeterministicMatchProjection,
  IntelligenceConfidence,
  ScenarioSet,
} from "@fas/analysis";
import type { NarrativeDraft } from "@fas/ai-provider";
import type { Feature } from "@fas/feature";
import { createMatchId, type MatchId } from "@fas/match";
import type { RuleResult } from "@fas/rule";

export interface AnalysisReport {
  readonly reportId: string;
  readonly matchId: MatchId;
  readonly generatedAt: string;
  readonly summary: readonly string[];
  readonly features: readonly Feature[];
  readonly rules: readonly RuleResult[];
  readonly deterministic: DeterministicMatchProjection;
  readonly scenarios: ScenarioSet;
  readonly intelligenceConfidence: IntelligenceConfidence;
  readonly narrative: NarrativeDraft;
}

export interface CreateAnalysisReportInput {
  readonly reportId: string;
  readonly matchId: MatchId;
  readonly generatedAt: string;
  readonly summary: readonly string[];
  readonly features: readonly Feature[];
  readonly rules: readonly RuleResult[];
  readonly deterministic: DeterministicMatchProjection;
  readonly scenarios: ScenarioSet;
  readonly intelligenceConfidence: IntelligenceConfidence;
  readonly narrative: NarrativeDraft;
}

export class AnalysisReportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisReportValidationError";
  }
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new AnalysisReportValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new AnalysisReportValidationError(
      "generatedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

function freezeNonEmptyArray<Value>(
  values: readonly Value[],
  field: string,
): readonly Value[] {
  if (values.length === 0) {
    throw new AnalysisReportValidationError(`${field} must not be empty.`);
  }

  return Object.freeze([...values]);
}

export function createAnalysisReport(
  input: CreateAnalysisReportInput,
): AnalysisReport {
  const matchId = createMatchId(input.matchId);
  const summary = freezeNonEmptyArray(
    input.summary.map((line) => requireNonEmpty(line, "summary")),
    "summary",
  );
  const features = freezeNonEmptyArray(input.features, "features");
  const rules = freezeNonEmptyArray(input.rules, "rules");

  if (features.some((feature) => feature.matchId !== matchId)) {
    throw new AnalysisReportValidationError(
      "features must reference the AnalysisReport MatchId.",
    );
  }

  if (rules.some((rule) => rule.matchId !== matchId)) {
    throw new AnalysisReportValidationError(
      "rules must reference the AnalysisReport MatchId.",
    );
  }

  if (input.deterministic.matchId !== matchId) {
    throw new AnalysisReportValidationError(
      "deterministic must reference the AnalysisReport MatchId.",
    );
  }

  if (input.scenarios.matchId !== matchId) {
    throw new AnalysisReportValidationError(
      "scenarios must reference the AnalysisReport MatchId.",
    );
  }

  if (input.intelligenceConfidence.matchId !== matchId) {
    throw new AnalysisReportValidationError(
      "intelligenceConfidence must reference the AnalysisReport MatchId.",
    );
  }

  if (input.deterministic.status === "blocked") {
    throw new AnalysisReportValidationError(
      "deterministic projection is blocked; report cannot be sealed.",
    );
  }

  if (input.narrative.epistemicKind !== "inference") {
    throw new AnalysisReportValidationError(
      "narrative.epistemicKind must be inference.",
    );
  }

  if (input.narrative.sections.length === 0) {
    throw new AnalysisReportValidationError("narrative.sections must not be empty.");
  }

  return Object.freeze({
    reportId: requireNonEmpty(input.reportId, "reportId"),
    matchId,
    generatedAt: requireTimestamp(input.generatedAt),
    summary,
    features,
    rules,
    deterministic: input.deterministic,
    scenarios: input.scenarios,
    intelligenceConfidence: input.intelligenceConfidence,
    narrative: Object.freeze({
      ...input.narrative,
      sections: Object.freeze(
        input.narrative.sections.map((section) => Object.freeze({ ...section })),
      ),
    }),
  });
}
