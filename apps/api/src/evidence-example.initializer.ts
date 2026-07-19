// biome-ignore lint/style/useImportType: NestJS uses the service class as constructor metadata.
import { type CreateEvidenceInput, EvidenceService } from "@fas/evidence";
import { createMatchId } from "@fas/match";
import { Injectable, type OnModuleInit } from "@nestjs/common";

export const exampleEvidenceId = "evidence-example";

const exampleEvidenceInput = {
  id: exampleEvidenceId,
  source: "fixture",
  sourceId: "fixture-match-001",
  type: "MATCH_INFO",
  matchId: createMatchId("match-bootstrap-example"),
  collectedAt: "2026-07-16T15:00:00.000Z",
  eventTime: "2026-07-16T14:55:00.000Z",
  freshness: "fresh",
  quality: "verified",
  provenance: {
    collector: "@fas/api",
    method: "fixture",
  },
  payload: {
    kind: "match-status",
    status: "scheduled",
  },
} as const satisfies CreateEvidenceInput;

@Injectable()
export class EvidenceExampleInitializer implements OnModuleInit {
  constructor(private readonly evidenceService: EvidenceService) {}

  onModuleInit(): void {
    this.evidenceService.record(exampleEvidenceInput);
  }
}
