import {
  AnalyzeMatchUseCase,
  resolvePinnedCalibrationArtifact,
} from "@fas/analysis";
import { ImportMatchUseCase } from "@fas/application";
import { loadApiConfig } from "@fas/config";

import { type EvidenceRepository, EvidenceService } from "@fas/evidence";
import {
  EvidenceImportPipeline,
  type EvidenceNormalizer,
} from "@fas/evidence-import";
import { FixtureEvidenceNormalizer } from "@fas/evidence-normalizer";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor } from "@fas/feature";
import type { MatchLookup } from "@fas/provider-odds";
import { LocalDeterministicNarrativeAdapter } from "@fas/ai-provider";
import { GenerateMatchReportUseCase, ReportBuilder } from "@fas/report";
import { RuleEvaluator } from "@fas/rule";
import { Module } from "@nestjs/common";
import { AnalysisController } from "./analysis.controller.js";
import { EvidenceExampleInitializer } from "./evidence-example.initializer.js";
import { EvidenceController } from "./evidence.controller.js";
import { matchProviderToken } from "./evidence.tokens.js";
import { ImportController } from "./import.controller.js";
import { MatchesController } from "./matches.controller.js";
import { FootballMatchPrimerBridge } from "./football-match-primer.bridge.js";
import { createMatchProviderWiring } from "./match-provider.factory.js";
import { OddsSnapshotPrimerBridge } from "./odds-snapshot-primer.bridge.js";
import { createApiEvidenceRepository } from "./runtime-database.js";
import { ScoresSnapshotPrimerBridge } from "./scores-snapshot-primer.bridge.js";
import { UpcomingMatchesBoardBridge } from "./upcoming-matches-board.bridge.js";
import { createUpcomingMatchesBoard } from "./upcoming-matches.factory.js";

const evidenceRepositoryToken = Symbol("EvidenceRepository");

const apiConfig = loadApiConfig();
const matchProviderWiring = createMatchProviderWiring(
  apiConfig.oddsProvider,
  apiConfig.footballDataProvider,
);
const upcomingMatchesBoard = createUpcomingMatchesBoard(
  apiConfig.footballDataProvider,
  apiConfig.oddsProvider,
  {
    eventStore: matchProviderWiring.eventStore,
    scoresSource: matchProviderWiring.scoresSource,
    scoresPrimer: matchProviderWiring.scoresPrimer,
    scoresMethod: () => matchProviderWiring.scoresSource.providerMethod(),
  },
);

@Module({
  controllers: [
    AnalysisController,
    EvidenceController,
    ImportController,
    MatchesController,
  ],
  providers: [
    {
      provide: evidenceRepositoryToken,
      useFactory: (): EvidenceRepository => createApiEvidenceRepository(),
    },
    {
      provide: EvidenceService,
      inject: [evidenceRepositoryToken],
      useFactory: (repository: EvidenceRepository): EvidenceService =>
        new EvidenceService(repository),
    },
    {
      provide: EvidenceQueryService,
      inject: [evidenceRepositoryToken],
      useFactory: (repository: EvidenceRepository): EvidenceQueryService =>
        new EvidenceQueryService(repository),
    },
    {
      provide: FixtureEvidenceNormalizer,
      useFactory: (): FixtureEvidenceNormalizer =>
        new FixtureEvidenceNormalizer({
          collectedAt: "2026-07-17T10:00:00Z",
        }),
    },
    {
      provide: matchProviderToken,
      useValue: matchProviderWiring.matchProvider,
    },
    {
      provide: OddsSnapshotPrimerBridge,
      useValue: new OddsSnapshotPrimerBridge(matchProviderWiring.oddsPrimer),
    },
    {
      provide: FootballMatchPrimerBridge,
      useValue: new FootballMatchPrimerBridge(matchProviderWiring.footballPrimer),
    },
    {
      provide: UpcomingMatchesBoardBridge,
      useValue: new UpcomingMatchesBoardBridge(upcomingMatchesBoard),
    },
    {
      provide: ScoresSnapshotPrimerBridge,
      useValue: new ScoresSnapshotPrimerBridge(matchProviderWiring.scoresPrimer),
    },
    {
      provide: EvidenceImportPipeline,
      inject: [FixtureEvidenceNormalizer, evidenceRepositoryToken],
      useFactory: (
        normalizer: EvidenceNormalizer,
        repository: EvidenceRepository,
      ): EvidenceImportPipeline =>
        new EvidenceImportPipeline(normalizer, repository),
    },
    {
      provide: ImportMatchUseCase,
      inject: [matchProviderToken, EvidenceImportPipeline],
      useFactory: (
        provider: MatchLookup,
        importer: EvidenceImportPipeline,
      ): ImportMatchUseCase => new ImportMatchUseCase(provider, importer),
    },
    FeatureExtractor,
    RuleEvaluator,
    {
      provide: AnalyzeMatchUseCase,
      inject: [
        ImportMatchUseCase,
        EvidenceQueryService,
        FeatureExtractor,
        RuleEvaluator,
      ],
      useFactory: (
        importMatch: ImportMatchUseCase,
        evidenceQuery: EvidenceQueryService,
        featureExtractor: FeatureExtractor,
        ruleEvaluator: RuleEvaluator,
      ): AnalyzeMatchUseCase =>
        new AnalyzeMatchUseCase(
          importMatch,
          evidenceQuery,
          featureExtractor,
          ruleEvaluator,
          resolvePinnedCalibrationArtifact(apiConfig.calibration.artifactMode),
        ),
    },
    {
      provide: ReportBuilder,
      useFactory: (): ReportBuilder =>
        new ReportBuilder(new LocalDeterministicNarrativeAdapter()),
    },
    {
      provide: GenerateMatchReportUseCase,
      inject: [AnalyzeMatchUseCase, ReportBuilder],
      useFactory: (
        analyzeMatch: AnalyzeMatchUseCase,
        reportBuilder: ReportBuilder,
      ): GenerateMatchReportUseCase =>
        new GenerateMatchReportUseCase(analyzeMatch, reportBuilder),
    },
    EvidenceExampleInitializer,
  ],
})
export class EvidenceModule {}
