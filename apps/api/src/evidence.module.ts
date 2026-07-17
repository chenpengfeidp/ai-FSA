import {
  type EvidenceRepository,
  EvidenceService,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { Module } from "@nestjs/common";
import { EvidenceExampleInitializer } from "./evidence-example.initializer.js";
import { EvidenceController } from "./evidence.controller.js";

const evidenceRepositoryToken = Symbol("EvidenceRepository");

@Module({
  controllers: [EvidenceController],
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
    EvidenceExampleInitializer,
  ],
})
export class EvidenceModule {}
