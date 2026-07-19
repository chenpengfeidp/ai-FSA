import { AnalyzeMatchUseCase } from "@fas/analysis";
import { ImportMatchUseCase } from "@fas/application";
import {
  type EvidenceRepository,
  EvidenceService,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import {
  EvidenceImportPipeline,
  type EvidenceNormalizer,
} from "@fas/evidence-import";
import { FixtureEvidenceNormalizer } from "@fas/evidence-normalizer";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor } from "@fas/feature";
import { FixtureProvider } from "@fas/provider-fixture";
import { GenerateMatchReportUseCase, ReportBuilder } from "@fas/report";
import { RuleEvaluator } from "@fas/rule";
import { Module } from "@nestjs/common";
import { AnalysisController } from "./analysis.controller.js";
import { EvidenceExampleInitializer } from "./evidence-example.initializer.js";
import { EvidenceController } from "./evidence.controller.js";
import { ImportController } from "./import.controller.js";

const evidenceRepositoryToken = Symbol("EvidenceRepository");

@Module({
  controllers: [AnalysisController, EvidenceController, ImportController],
  providers: [
    InMemoryEvidenceRepository,
    {
      provide: evidenceRepositoryToken,
      useExisting: InMemoryEvidenceRepository,
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
    FixtureProvider,
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
      inject: [FixtureProvider, EvidenceImportPipeline],
      useFactory: (
        provider: FixtureProvider,
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
        ),
    },
    ReportBuilder,
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
