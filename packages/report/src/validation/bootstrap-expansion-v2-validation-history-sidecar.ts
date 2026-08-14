/**
 * P2K-G2-A — Validation Dataset Diversity Expansion bootstrap.
 *
 * Real AnalyzeMatch production composition with projectionPolicyPin = "v2" over the
 * new match-p2kg-expansion-v2-* namespace. Writes NEW History + Sidecar rows with
 * real parameter provenance. Does NOT mutate existing History / Sidecars / cohorts
 * and does NOT run P2K-E / P2K-F / P2K-G / P2K-H.
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
import {
  EXPANSION_V2_MATCH_IDS,
  EXPANSION_V2_PROJECTION_POLICY_PIN,
  EXPANSION_V2_TEMPLATES,
  expansionFixtureShape,
  type ExpansionV2FtOutcome,
} from "./expansion-validation-templates.js";

export interface ExpansionV2BootstrapRuleAudit {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly status: string;
  readonly score: number;
  readonly weight: number;
  readonly catalogValid: boolean;
  readonly passScoreEqualsWeight: boolean | undefined;
}

export interface ExpansionV2BootstrapParameterProvenance {
  readonly parameterVersionLabel: string | undefined;
  readonly parameterArtifactId: string | undefined;
  readonly parameterArtifactChecksum: string | undefined;
  readonly complete: boolean;
}

export interface ExpansionV2BootstrapMatchResult {
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly ok: boolean;
  readonly historyId: string | undefined;
  readonly featureModelVersion: string | undefined;
  readonly sidecarContentSha256: string | undefined;
  readonly parameterProvenance: ExpansionV2BootstrapParameterProvenance | undefined;
  readonly rules: readonly ExpansionV2BootstrapRuleAudit[];
  readonly error: string | undefined;
}

export interface ExpansionV2BootstrapResult {
  readonly slice: "P2K-G2-A";
  readonly projectionPolicyPin: typeof EXPANSION_V2_PROJECTION_POLICY_PIN;
  readonly realAnalyzeMatchPath: true;
  readonly matchResults: readonly ExpansionV2BootstrapMatchResult[];
  readonly historyCreatedOrIdempotent: number;
  readonly sidecarCreatedOrIdempotent: number;
  readonly allCatalogValid: boolean;
  readonly allParameterProvenanceComplete: boolean;
  readonly existingFixturesUntouched: true;
  readonly candidateCProductionPromoted: false;
  readonly productionMatchScriptUnchanged: true;
  readonly cohortCreated: false;
  readonly p2kEExecuted: false;
  readonly p2kFExecuted: false;
  readonly p2kGPopulationExecuted: false;
  readonly p2kHAuthorized: false;
}

export class ExpansionV2BootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpansionV2BootstrapError";
  }
}

class ExpansionV2MatchProvider implements MatchProvider {
  getMatch(matchId: string): unknown {
    return expansionFixtureShape(matchId);
  }
}

function auditRules(
  history: EvaluationHistoryRecord,
  sidecar: ProjectionReplaySidecarRecord,
): readonly ExpansionV2BootstrapRuleAudit[] {
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
): ExpansionV2BootstrapParameterProvenance {
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
 * Bootstrap NEW Projection-v2 History + Sidecar rows for the expansion namespace.
 * Idempotent per matchId (same content → same historyId). No cohort creation.
 */
export async function bootstrapExpansionV2ValidationHistorySidecar(input: {
  readonly matchIds?: readonly string[];
  readonly outcomesByMatchId?: Readonly<Record<string, ExpansionV2FtOutcome>>;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository: ProjectionReplaySidecarRepository;
  readonly collectedAt?: string;
}): Promise<ExpansionV2BootstrapResult> {
  const matchIds = input.matchIds ?? EXPANSION_V2_MATCH_IDS;
  const collectedAt = input.collectedAt ?? "2026-08-16T10:00:00.000Z";

  const matchResults: ExpansionV2BootstrapMatchResult[] = [];
  let historyCreatedOrIdempotent = 0;
  let sidecarCreatedOrIdempotent = 0;
  let allCatalogValid = true;
  let allParameterProvenanceComplete = true;

  for (const matchId of matchIds) {
    const template = EXPANSION_V2_TEMPLATES[matchId];
    if (template === undefined) {
      matchResults.push(
        Object.freeze({
          matchId,
          homeTeam: "",
          awayTeam: "",
          ok: false,
          historyId: undefined,
          featureModelVersion: undefined,
          sidecarContentSha256: undefined,
          parameterProvenance: undefined,
          rules: Object.freeze([]),
          error: `No expansion template for matchId "${matchId}".`,
        }),
      );
      allCatalogValid = false;
      allParameterProvenanceComplete = false;
      continue;
    }

    const evidenceRepository = new InMemoryEvidenceRepository();
    const normalizer = new FixtureEvidenceNormalizer({ collectedAt });
    const importMatch = new ImportMatchUseCase(
      new ExpansionV2MatchProvider(),
      new EvidenceImportPipeline(normalizer, evidenceRepository),
      collectedAt,
    );
    const analyzeMatch = new AnalyzeMatchUseCase(
      importMatch,
      new EvidenceQueryService(evidenceRepository),
      new FeatureExtractor(),
      new RuleEvaluator(),
      IDENTITY_CALIBRATION_ARTIFACT,
      EXPANSION_V2_PROJECTION_POLICY_PIN,
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
          readonly error: { readonly code?: string; readonly message: string };
        };
        if (failure.error.code !== "PROJECTION_REPLAY_REPORT_FAILED") {
          matchResults.push(
            Object.freeze({
              matchId,
              homeTeam: template.home,
              awayTeam: template.away,
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
            homeTeam: template.home,
            awayTeam: template.away,
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
            homeTeam: template.home,
            awayTeam: template.away,
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
          homeTeam: template.home,
          awayTeam: template.away,
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
          homeTeam: template.home,
          awayTeam: template.away,
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
    slice: "P2K-G2-A",
    projectionPolicyPin: EXPANSION_V2_PROJECTION_POLICY_PIN,
    realAnalyzeMatchPath: true,
    matchResults: Object.freeze(matchResults),
    historyCreatedOrIdempotent,
    sidecarCreatedOrIdempotent,
    allCatalogValid,
    allParameterProvenanceComplete,
    existingFixturesUntouched: true,
    candidateCProductionPromoted: false,
    productionMatchScriptUnchanged: true,
    cohortCreated: false,
    p2kEExecuted: false,
    p2kFExecuted: false,
    p2kGPopulationExecuted: false,
    p2kHAuthorized: false,
  });
}
