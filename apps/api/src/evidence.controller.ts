// biome-ignore lint/style/useImportType: NestJS uses the service class as constructor metadata.
import { type Evidence, EvidenceService } from "@fas/evidence";
// biome-ignore lint/style/useImportType: NestJS uses the service class as constructor metadata.
import { type EvidenceQueryResult, EvidenceQueryService } from "@fas/evidence-query";
import { createMatchId } from "@fas/match";
import { Bind, Controller, Get, Param } from "@nestjs/common";
import { exampleEvidenceId } from "./evidence-example.initializer.js";

@Controller("api/evidence")
export class EvidenceController {
  constructor(
    private readonly evidenceService: EvidenceService,
    private readonly evidenceQuery: EvidenceQueryService,
  ) {}

  @Get("example")
  getExample(): Evidence {
    const evidence = this.evidenceService.findById(exampleEvidenceId);

    if (evidence === undefined) {
      throw new Error("Example evidence was not initialized.");
    }

    return evidence;
  }

  @Get("match/:matchId")
  @Bind(Param("matchId"))
  findByMatch(matchId: string): EvidenceQueryResult<readonly Evidence[]> {
    return this.evidenceQuery.findByMatch(createMatchId(matchId));
  }

  @Get(":id")
  @Bind(Param("id"))
  findById(id: string): EvidenceQueryResult<Evidence | undefined> {
    return this.evidenceQuery.findById(id);
  }
}
