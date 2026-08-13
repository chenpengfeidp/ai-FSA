/**
 * P2K-G-RECOVERY — Projection V2 Validation Data Bootstrap.
 *
 * Real AnalyzeMatch production composition with projectionPolicyPin = "v2"
 * so Sidecars persist parameterVersionLabel / artifactId / checksum.
 *
 * Uses a new matchId namespace (match-p2kg-recovery-v2-*). Does not mutate
 * existing match-example-* / fixture Sidecars or SEALED cohorts.
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
import {
  IDENTITY_CALIBRATION_ARTIFACT,
  type EvaluationHistoryRecord,
  type EvaluationHistoryRepository,
  type ProjectionReplaySidecarRecord,
  type ProjectionReplaySidecarRepository,
} from "@fas/statistics";

import { ReportBuilder } from "../builder/report-builder.js";
import { GenerateMatchReportUseCase } from "../use-case/generate-match-report-use-case.js";
import type { ValidationBootstrapFtOutcome } from "./bootstrap-validation-history-sidecar.js";
import { VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE } from "./bootstrap-validation-history-sidecar.js";

interface FixtureMatchShape {
  readonly matchId: string;
  readonly kickoff: string;
}

export const P2KG_RECOVERY_V2_PROJECTION_POLICY_PIN = "v2" as const;

export const P2KG_RECOVERY_V2_MATCH_IDS = Object.freeze([
  "match-p2kg-recovery-v2-1",
  "match-p2kg-recovery-v2-2",
  "match-p2kg-recovery-v2-3",
  "match-p2kg-recovery-v2-4",
  "match-p2kg-recovery-v2-5",
  "match-p2kg-recovery-v2-6",
] as const);

/** Maps recovery matchIds → deterministic FixtureProvider templates (content only). */
export const P2KG_RECOVERY_V2_TEMPLATE_MATCH_IDS: Readonly<Record<string, string>> =
  Object.freeze({
    "match-p2kg-recovery-v2-1": "match-example-1",
    "match-p2kg-recovery-v2-2": "match-example-2",
    "match-p2kg-recovery-v2-3": "match-example-3",
    "match-p2kg-recovery-v2-4": "match-example-4",
    "match-p2kg-recovery-v2-5": "match-example-5",
    "match-p2kg-recovery-v2-6": "match-example-6",
  });

export const P2KG_RECOVERY_V2_OUTCOMES: Readonly<
  Record<string, ValidationBootstrapFtOutcome>
> = Object.freeze({
  "match-p2kg-recovery-v2-1": Object.freeze({
    homeGoals: 2,
    awayGoals: 1,
    winner: "home" as const,
  }),
  "match-p2kg-recovery-v2-2": Object.freeze({
    homeGoals: 3,
    awayGoals: 0,
    winner: "home" as const,
  }),
  "match-p2kg-recovery-v2-3": Object.freeze({
    homeGoals: 1,
    awayGoals: 1,
    winner: "draw" as const,
  }),
  "match-p2kg-recovery-v2-4": Object.freeze({
    homeGoals: 1,
    awayGoals: 2,
    winner: "away" as const,
  }),
  "match-p2kg-recovery-v2-5": Object.freeze({
    homeGoals: 2,
    awayGoals: 0,
    winner: "home" as const,
  }),
  "match-p2kg-recovery-v2-6": Object.freeze({
    homeGoals: 0,
    awayGoals: 0,
    winner: "draw" as const,
  }),
});

export interface ProjectionV2BootstrapRuleAudit {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly status: string;
  readonly score: number;
  readonly weight: number;
  readonly catalogValid: boolean;
  readonly passScoreEqualsWeight: boolean | undefined;
}

export interface ProjectionV2BootstrapParameterProvenance {
  readonly parameterVersionLabel: string | undefined;
  readonly parameterArtifactId: string | undefined;
  readonly parameterArtifactChecksum: string | undefined;
  readonly complete: boolean;
}

export interface ProjectionV2BootstrapMatchResult {
  readonly matchId: string;
  readonly templateMatchId: string;
  readonly ok: boolean;
  readonly historyId: string | undefined;
  readonly featureModelVersion: string | undefined;
  readonly sidecarContentSha256: string | undefined;
  readonly parameterProvenance: ProjectionV2BootstrapParameterProvenance | undefined;
  readonly rules: readonly ProjectionV2BootstrapRuleAudit[];
  readonly error: string | undefined;
}

export interface ProjectionV2BootstrapResult {
  readonly slice: "P2K-G-RECOVERY";
  readonly projectionPolicyPin: typeof P2KG_RECOVERY_V2_PROJECTION_POLICY_PIN;
  readonly realAnalyzeMatchPath: true;
  readonly matchResults: readonly ProjectionV2BootstrapMatchResult[];
  readonly historyCreatedOrIdempotent: number;
  readonly sidecarCreatedOrIdempotent: number;
  readonly allCatalogValid: boolean;
  readonly allParameterProvenanceComplete: boolean;
  readonly existingV1BootstrapUntouched: true;
  readonly existingFixturesUntouched: true;
  readonly candidateCProductionPromoted: false;
  readonly productionMatchScriptUnchanged: true;
  readonly cohortCreated: false;
  readonly p2kEExecuted: false;
  readonly p2kFExecuted: false;
  readonly p2kGPopulationExecuted: false;
}

export class ProjectionV2BootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectionV2BootstrapError";
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

function attachMatchResult(
  match: FixtureMatchShape & Record<string, unknown>,
  matchId: string,
  outcome: ValidationBootstrapFtOutcome,
): unknown {
  const winner = winnerFromGoals(outcome.homeGoals, outcome.awayGoals);
  if (winner !== outcome.winner) {
    throw new ProjectionV2BootstrapError(
      `Outcome winner mismatch for ${matchId}: goals imply ${winner}, got ${outcome.winner}.`,
    );
  }

  return Object.freeze({
    ...match,
    matchId,
    matchResult: Object.freeze({
      homeGoals: outcome.homeGoals,
      awayGoals: outcome.awayGoals,
      winner: outcome.winner,
      totalGoals: outcome.homeGoals + outcome.awayGoals,
      matchStatus: "FINISHED" as const,
      providerSource: VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
      providerSourceId: `${VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE}:${matchId}:result`,
      providerMethod: VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
      observedAt: match.kickoff,
    }),
  });
}

class ProjectionV2RecoveryMatchProvider implements MatchProvider {
  readonly #inner = new FixtureProvider();
  readonly #outcomes: Readonly<Record<string, ValidationBootstrapFtOutcome>>;
  readonly #templates: Readonly<Record<string, string>>;

  constructor(
    outcomes: Readonly<Record<string, ValidationBootstrapFtOutcome>>,
    templates: Readonly<Record<string, string>>,
  ) {
    this.#outcomes = outcomes;
    this.#templates = templates;
  }

  getMatch(matchId: string): unknown {
    const templateMatchId = this.#templates[matchId];
    if (templateMatchId === undefined) {
      return undefined;
    }
    const match = this.#inner.getMatch(templateMatchId);
    if (match === undefined) {
      throw new ProjectionV2BootstrapError(
        `Template fixture "${templateMatchId}" missing for recovery matchId "${matchId}".`,
      );
    }
    if (!isFixtureMatchShape(match)) {
      throw new ProjectionV2BootstrapError(
        `Template fixture "${templateMatchId}" is missing required matchId/kickoff fields.`,
      );
    }
    const outcome = this.#outcomes[matchId];
    if (outcome === undefined) {
      throw new ProjectionV2BootstrapError(
        `No FT outcome configured for recovery matchId "${matchId}".`,
      );
    }
    return attachMatchResult(match, matchId, outcome);
  }
}

function auditRules(
  history: EvaluationHistoryRecord,
  sidecar: ProjectionReplaySidecarRecord,
): readonly ProjectionV2BootstrapRuleAudit[] {
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

function readParameterProvenance(
  sidecar: ProjectionReplaySidecarRecord,
): ProjectionV2BootstrapParameterProvenance {
  const parameterVersionLabel =
    sidecar.context.parameterVersionLabel?.trim() || undefined;
  const parameterArtifactId =
    sidecar.context.parameterArtifactId?.trim() || undefined;
  const parameterArtifactChecksum =
    sidecar.context.parameterArtifactChecksum?.trim() || undefined;

  return Object.freeze({
    parameterVersionLabel,
    parameterArtifactId,
    parameterArtifactChecksum,
    complete:
      parameterVersionLabel !== undefined &&
      parameterArtifactId !== undefined &&
      parameterArtifactChecksum !== undefined,
  });
}

/**
 * Bootstrap NEW Projection-v2 History + Sidecar rows for P2K-G-RECOVERY.
 * Does not create cohorts or run P2K-E/F/G population evaluation.
 */
export async function bootstrapProjectionV2ValidationHistorySidecar(input: {
  readonly matchIds?: readonly string[];
  readonly outcomesByMatchId?: Readonly<
    Record<string, ValidationBootstrapFtOutcome>
  >;
  readonly templateMatchIdsByMatchId?: Readonly<Record<string, string>>;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly collectedAt?: string;
}): Promise<ProjectionV2BootstrapResult> {
  const matchIds = input.matchIds ?? P2KG_RECOVERY_V2_MATCH_IDS;
  const outcomes = input.outcomesByMatchId ?? P2KG_RECOVERY_V2_OUTCOMES;
  const templates =
    input.templateMatchIdsByMatchId ?? P2KG_RECOVERY_V2_TEMPLATE_MATCH_IDS;
  const collectedAt = input.collectedAt ?? "2026-07-17T10:00:00.000Z";

  const matchResults: ProjectionV2BootstrapMatchResult[] = [];
  let historyCreatedOrIdempotent = 0;
  let sidecarCreatedOrIdempotent = 0;
  let allCatalogValid = true;
  let allParameterProvenanceComplete = true;

  for (const matchId of matchIds) {
    const templateMatchId = templates[matchId];
    if (templateMatchId === undefined) {
      matchResults.push(
        Object.freeze({
          matchId,
          templateMatchId: "",
          ok: false,
          historyId: undefined,
          featureModelVersion: undefined,
          sidecarContentSha256: undefined,
          parameterProvenance: undefined,
          rules: Object.freeze([]),
          error: `No template fixture mapping for recovery matchId "${matchId}".`,
        }),
      );
      allCatalogValid = false;
      allParameterProvenanceComplete = false;
      continue;
    }

    const evidenceRepository = new InMemoryEvidenceRepository();
    const normalizer = new FixtureEvidenceNormalizer({ collectedAt });
    const importMatch = new ImportMatchUseCase(
      new ProjectionV2RecoveryMatchProvider(outcomes, templates),
      new EvidenceImportPipeline(normalizer, evidenceRepository),
      collectedAt,
    );
    const analyzeMatch = new AnalyzeMatchUseCase(
      importMatch,
      new EvidenceQueryService(evidenceRepository),
      new FeatureExtractor(),
      new RuleEvaluator(),
      IDENTITY_CALIBRATION_ARTIFACT,
      P2KG_RECOVERY_V2_PROJECTION_POLICY_PIN,
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
        if (failure.error.code !== "PROJECTION_REPLAY_REPORT_FAILED") {
          matchResults.push(
            Object.freeze({
              matchId,
              templateMatchId,
              ok: false,
              historyId: undefined,
              featureModelVersion: undefined,
              sidecarContentSha256: undefined,
              parameterProvenance: undefined,
              rules: Object.freeze([]),
              error: failure.error.message,
            }),
          );
          allCatalogValid = false;
          allParameterProvenanceComplete = false;
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
            templateMatchId,
            ok: false,
            historyId: undefined,
            featureModelVersion: undefined,
            sidecarContentSha256: undefined,
            parameterProvenance: undefined,
            rules: Object.freeze([]),
            error:
              overlayError ??
              "No Evaluation History persisted — MATCH_RESULT / scored evaluation missing.",
          }),
        );
        allCatalogValid = false;
        allParameterProvenanceComplete = false;
        continue;
      }

      const sidecar = await input.sidecarRepository.findRecordByHistoryId(
        history.historyId,
      );
      if (sidecar === undefined) {
        matchResults.push(
          Object.freeze({
            matchId,
            templateMatchId,
            ok: false,
            historyId: history.historyId,
            featureModelVersion: history.featureModelVersion,
            sidecarContentSha256: undefined,
            parameterProvenance: undefined,
            rules: Object.freeze([]),
            error:
              overlayError ??
              "Evaluation History saved but Projection Replay Sidecar missing.",
          }),
        );
        allCatalogValid = false;
        allParameterProvenanceComplete = false;
        continue;
      }

      const rules = auditRules(history, sidecar);
      const parameterProvenance = readParameterProvenance(sidecar);
      if (rules.some((rule) => !rule.catalogValid)) {
        allCatalogValid = false;
      }
      if (rules.some((rule) => rule.passScoreEqualsWeight === false)) {
        allCatalogValid = false;
      }
      if (!parameterProvenance.complete) {
        allParameterProvenanceComplete = false;
        allCatalogValid = false;
      }

      historyCreatedOrIdempotent += 1;
      sidecarCreatedOrIdempotent += 1;
      matchResults.push(
        Object.freeze({
          matchId,
          templateMatchId,
          ok: true,
          historyId: history.historyId,
          featureModelVersion: history.featureModelVersion,
          sidecarContentSha256: sidecar.contentSha256,
          parameterProvenance,
          rules,
          error: overlayError,
        }),
      );
    } catch (error) {
      matchResults.push(
        Object.freeze({
          matchId,
          templateMatchId,
          ok: false,
          historyId: undefined,
          featureModelVersion: undefined,
          sidecarContentSha256: undefined,
          parameterProvenance: undefined,
          rules: Object.freeze([]),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      allCatalogValid = false;
      allParameterProvenanceComplete = false;
    }
  }

  return Object.freeze({
    slice: "P2K-G-RECOVERY",
    projectionPolicyPin: P2KG_RECOVERY_V2_PROJECTION_POLICY_PIN,
    realAnalyzeMatchPath: true,
    matchResults: Object.freeze(matchResults),
    historyCreatedOrIdempotent,
    sidecarCreatedOrIdempotent,
    allCatalogValid,
    allParameterProvenanceComplete,
    existingV1BootstrapUntouched: true,
    existingFixturesUntouched: true,
    candidateCProductionPromoted: false,
    productionMatchScriptUnchanged: true,
    cohortCreated: false,
    p2kEExecuted: false,
    p2kFExecuted: false,
    p2kGPopulationExecuted: false,
  });
}
