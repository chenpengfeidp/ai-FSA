/**
 * Validation-only bootstrap: real AnalyzeMatch → History + Sidecar via
 * GenerateMatchReportUseCase (production persistence path).
 *
 * Does not mutate existing fixture Sidecars. Does not promote Candidate C.
 * Does not change Match Script / Projection mathematics.
 */
import { LocalDeterministicNarrativeAdapter } from "@fas/ai-provider";
import { AnalyzeMatchUseCase } from "@fas/analysis";
import { ImportMatchUseCase, type MatchProvider } from "@fas/application";
import { InMemoryEvidenceRepository } from "@fas/evidence";
import { EvidenceImportPipeline } from "@fas/evidence-import";
import { FixtureEvidenceNormalizer } from "@fas/evidence-normalizer";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  RuleEvaluator,
  createRuleResult,
  RuleResultValidationError,
} from "@fas/rule";
import type {
  EvaluationHistoryRecord,
  EvaluationHistoryRepository,
  ProjectionReplaySidecarRecord,
  ProjectionReplaySidecarRepository,
} from "@fas/statistics";

import { ReportBuilder } from "../builder/report-builder.js";
import { GenerateMatchReportUseCase } from "../use-case/generate-match-report-use-case.js";

interface FixtureMatchShape {
  readonly matchId: string;
  readonly kickoff: string;
}

export const VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE =
  "validation-bootstrap" as const;

export const DEFAULT_VALIDATION_BOOTSTRAP_MATCH_IDS = Object.freeze([
  "match-example-1",
  "match-example-2",
  "match-example-3",
  "match-example-4",
  "match-example-5",
  "match-example-6",
] as const);

export interface ValidationBootstrapFtOutcome {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly winner: "away" | "draw" | "home";
}

/**
 * Deterministic FT outcomes for fixture matches that are SCHEDULED in the
 * provider catalog (no FT score). Used only as MATCH_RESULT Evidence so the
 * production Report → History path can persist scored evaluation.
 * Never used to fabricate RuleResults or Sidecar rule ids.
 */
export const DEFAULT_VALIDATION_BOOTSTRAP_OUTCOMES: Readonly<
  Record<string, ValidationBootstrapFtOutcome>
> = Object.freeze({
  "match-example-1": Object.freeze({
    homeGoals: 2,
    awayGoals: 1,
    winner: "home" as const,
  }),
  "match-example-2": Object.freeze({
    homeGoals: 3,
    awayGoals: 0,
    winner: "home" as const,
  }),
  "match-example-3": Object.freeze({
    homeGoals: 1,
    awayGoals: 1,
    winner: "draw" as const,
  }),
  "match-example-4": Object.freeze({
    homeGoals: 1,
    awayGoals: 2,
    winner: "away" as const,
  }),
  "match-example-5": Object.freeze({
    homeGoals: 2,
    awayGoals: 0,
    winner: "home" as const,
  }),
  "match-example-6": Object.freeze({
    homeGoals: 0,
    awayGoals: 0,
    winner: "draw" as const,
  }),
});

export interface ValidationBootstrapRuleAudit {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly status: string;
  readonly score: number;
  readonly weight: number;
  readonly catalogValid: boolean;
  readonly passScoreEqualsWeight: boolean | undefined;
}

export interface ValidationBootstrapMatchResult {
  readonly matchId: string;
  readonly ok: boolean;
  readonly historyId: string | undefined;
  readonly featureModelVersion: string | undefined;
  readonly sidecarContentSha256: string | undefined;
  readonly rules: readonly ValidationBootstrapRuleAudit[];
  readonly error: string | undefined;
}

export interface ValidationBootstrapResult {
  readonly option: "B";
  readonly realAnalyzeMatchPath: true;
  readonly matchResults: readonly ValidationBootstrapMatchResult[];
  readonly historyCreatedOrIdempotent: number;
  readonly sidecarCreatedOrIdempotent: number;
  readonly allCatalogValid: boolean;
  readonly existingFixturesUntouched: true;
  readonly candidateCProductionPromoted: false;
  readonly productionMatchScriptUnchanged: true;
}

export class ValidationBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationBootstrapError";
  }
}

function winnerFromGoals(
  homeGoals: number,
  awayGoals: number,
): "away" | "draw" | "home" {
  if (homeGoals > awayGoals) {
    return "home";
  }
  if (awayGoals > homeGoals) {
    return "away";
  }
  return "draw";
}

function attachMatchResult(
  match: FixtureMatchShape & Record<string, unknown>,
  outcome: ValidationBootstrapFtOutcome,
): unknown {
  const winner = winnerFromGoals(outcome.homeGoals, outcome.awayGoals);
  if (winner !== outcome.winner) {
    throw new ValidationBootstrapError(
      `Outcome winner mismatch for ${match.matchId}: goals imply ${winner}, got ${outcome.winner}.`,
    );
  }

  return Object.freeze({
    ...match,
    matchResult: Object.freeze({
      homeGoals: outcome.homeGoals,
      awayGoals: outcome.awayGoals,
      winner: outcome.winner,
      totalGoals: outcome.homeGoals + outcome.awayGoals,
      matchStatus: "FINISHED" as const,
      providerSource: VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
      providerSourceId: `${VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE}:${match.matchId}:result`,
      providerMethod: VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
      observedAt: match.kickoff,
    }),
  });
}

function isFixtureMatchShape(
  value: unknown,
): value is FixtureMatchShape & Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { matchId?: unknown }).matchId === "string" &&
    typeof (value as { kickoff?: unknown }).kickoff === "string"
  );
}

class ValidationBootstrapMatchProvider implements MatchProvider {
  readonly #inner = new FixtureProvider();
  readonly #outcomes: Readonly<Record<string, ValidationBootstrapFtOutcome>>;

  constructor(outcomes: Readonly<Record<string, ValidationBootstrapFtOutcome>>) {
    this.#outcomes = outcomes;
  }

  getMatch(matchId: string): unknown {
    const match = this.#inner.getMatch(matchId);
    if (match === undefined) {
      return undefined;
    }
    if (!isFixtureMatchShape(match)) {
      throw new ValidationBootstrapError(
        `Fixture match "${matchId}" is missing required matchId/kickoff fields.`,
      );
    }
    const outcome = this.#outcomes[matchId];
    if (outcome === undefined) {
      throw new ValidationBootstrapError(
        `No validation FT outcome configured for matchId "${matchId}".`,
      );
    }
    return attachMatchResult(match, outcome);
  }
}

function auditRules(
  history: EvaluationHistoryRecord,
  sidecar: ProjectionReplaySidecarRecord,
): readonly ValidationBootstrapRuleAudit[] {
  return Object.freeze(
    sidecar.context.rules.map((rule) => {
      let catalogValid = true;
      try {
        createRuleResult({
          ruleId: rule.ruleId,
          matchId: createMatchId(history.matchId),
          ruleName: rule.ruleName,
          status: rule.status,
          score: rule.score,
          weight: rule.weight,
          channel: rule.channel,
          explanation: `audit ${rule.ruleName}`,
          sourceFeatureIds: [],
          evaluatedAt: sidecar.context.generatedAt,
        });
      } catch (error) {
        if (error instanceof RuleResultValidationError) {
          catalogValid = false;
        } else {
          throw error;
        }
      }

      return Object.freeze({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        status: rule.status,
        score: rule.score,
        weight: rule.weight,
        catalogValid,
        passScoreEqualsWeight:
          rule.status === "PASS" ? rule.score === rule.weight : undefined,
      });
    }),
  );
}

/**
 * Bootstrap History + Sidecar for fixture matchIds through the real
 * Import → AnalyzeMatch → ReportBuilder → GenerateMatchReportUseCase path.
 */
export async function bootstrapValidationHistorySidecar(input: {
  readonly matchIds?: readonly string[];
  readonly outcomesByMatchId?: Readonly<
    Record<string, ValidationBootstrapFtOutcome>
  >;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly collectedAt?: string;
}): Promise<ValidationBootstrapResult> {
  const matchIds = input.matchIds ?? DEFAULT_VALIDATION_BOOTSTRAP_MATCH_IDS;
  const outcomes = input.outcomesByMatchId ?? DEFAULT_VALIDATION_BOOTSTRAP_OUTCOMES;
  const collectedAt = input.collectedAt ?? "2026-07-17T10:00:00.000Z";

  const matchResults: ValidationBootstrapMatchResult[] = [];
  let historyCreatedOrIdempotent = 0;
  let sidecarCreatedOrIdempotent = 0;
  let allCatalogValid = true;

  for (const matchId of matchIds) {
    const evidenceRepository = new InMemoryEvidenceRepository();
    const normalizer = new FixtureEvidenceNormalizer({ collectedAt });
    const importMatch = new ImportMatchUseCase(
      new ValidationBootstrapMatchProvider(outcomes),
      new EvidenceImportPipeline(normalizer, evidenceRepository),
      collectedAt,
    );
    const analyzeMatch = new AnalyzeMatchUseCase(
      importMatch,
      new EvidenceQueryService(evidenceRepository),
      new FeatureExtractor(),
      new RuleEvaluator(),
    );
    const generateReport = new GenerateMatchReportUseCase(
      analyzeMatch,
      new ReportBuilder(new LocalDeterministicNarrativeAdapter()),
      input.historyRepository,
      input.sidecarRepository,
    );

    let overlayError: string | undefined;

    try {
      const report = await generateReport.execute(createMatchId(matchId));
      if (
        typeof report === "object" &&
        report !== null &&
        "ok" in report &&
        report.ok === false
      ) {
        const failure = report as {
          readonly error: {
            readonly code?: string;
            readonly message: string;
          };
        };
        // History + Sidecar persist before population overlays. Overlay failure
        // (e.g. PROJECTION_REPLAY_REPORT_FAILED on contaminated fixture rows)
        // must not discard a successful production persistence seal.
        if (failure.error.code !== "PROJECTION_REPLAY_REPORT_FAILED") {
          matchResults.push(
            Object.freeze({
              matchId,
              ok: false,
              historyId: undefined,
              featureModelVersion: undefined,
              sidecarContentSha256: undefined,
              rules: Object.freeze([]),
              error: failure.error.message,
            }),
          );
          allCatalogValid = false;
          continue;
        }
        overlayError = failure.error.message;
      }

      const histories = await input.historyRepository.findByMatch(matchId);
      const history = histories[histories.length - 1];
      if (history === undefined) {
        matchResults.push(
          Object.freeze({
            matchId,
            ok: false,
            historyId: undefined,
            featureModelVersion: undefined,
            sidecarContentSha256: undefined,
            rules: Object.freeze([]),
            error:
              overlayError ??
              "No Evaluation History persisted — MATCH_RESULT / scored evaluation missing.",
          }),
        );
        allCatalogValid = false;
        continue;
      }

      const sidecar = await input.sidecarRepository.findRecordByHistoryId(
        history.historyId,
      );
      if (sidecar === undefined) {
        matchResults.push(
          Object.freeze({
            matchId,
            ok: false,
            historyId: history.historyId,
            featureModelVersion: history.featureModelVersion,
            sidecarContentSha256: undefined,
            rules: Object.freeze([]),
            error:
              overlayError ??
              "Evaluation History saved but Projection Replay Sidecar missing.",
          }),
        );
        allCatalogValid = false;
        continue;
      }

      const rules = auditRules(history, sidecar);
      if (rules.some((rule) => !rule.catalogValid)) {
        allCatalogValid = false;
      }
      if (rules.some((rule) => rule.passScoreEqualsWeight === false)) {
        allCatalogValid = false;
      }

      historyCreatedOrIdempotent += 1;
      sidecarCreatedOrIdempotent += 1;
      matchResults.push(
        Object.freeze({
          matchId,
          ok: true,
          historyId: history.historyId,
          featureModelVersion: history.featureModelVersion,
          sidecarContentSha256: sidecar.contentSha256,
          rules,
          error: overlayError,
        }),
      );
    } catch (error) {
      matchResults.push(
        Object.freeze({
          matchId,
          ok: false,
          historyId: undefined,
          featureModelVersion: undefined,
          sidecarContentSha256: undefined,
          rules: Object.freeze([]),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      allCatalogValid = false;
    }
  }

  return Object.freeze({
    option: "B",
    realAnalyzeMatchPath: true,
    matchResults: Object.freeze(matchResults),
    historyCreatedOrIdempotent,
    sidecarCreatedOrIdempotent,
    allCatalogValid,
    existingFixturesUntouched: true,
    candidateCProductionPromoted: false,
    productionMatchScriptUnchanged: true,
  });
}
