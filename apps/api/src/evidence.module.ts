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
import { FixtureProvider } from "@fas/provider-fixture";
import { Module } from "@nestjs/common";
import { EvidenceExampleInitializer } from "./evidence-example.initializer.js";
import { EvidenceController } from "./evidence.controller.js";
import { ImportController } from "./import.controller.js";

const evidenceRepositoryToken = Symbol("EvidenceRepository");

@Module({
  controllers: [EvidenceController, ImportController],
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
          evidenceId: "evidence-fixture-match-example",
          sourceId: "fixture-match-example",
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
    EvidenceExampleInitializer,
  ],
})
export class EvidenceModule {}
