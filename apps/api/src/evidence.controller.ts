// biome-ignore lint/style/useImportType: NestJS uses the service class as constructor metadata.
import { type Evidence, EvidenceService } from "@fas/evidence";
import { Controller, Get } from "@nestjs/common";
import { exampleEvidenceId } from "./evidence-example.initializer.js";

@Controller("api/evidence")
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get("example")
  getExample(): Evidence {
    const evidence = this.evidenceService.findById(exampleEvidenceId);

    if (evidence === undefined) {
      throw new Error("Example evidence was not initialized.");
    }

    return evidence;
  }
}
