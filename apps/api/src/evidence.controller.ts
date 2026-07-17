// biome-ignore lint/style/useImportType: NestJS uses the service class as constructor metadata.
import { type Evidence, EvidenceService } from "@fas/evidence";
// biome-ignore lint/style/useImportType: NestJS uses the service class as constructor metadata.
import { type EvidenceQueryResult, EvidenceQueryService } from "@fas/evidence-query";
import { createMatchId } from "@fas/match";
import { Bind, Controller, Get, Param } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { exampleEvidenceId } from "./evidence-example.initializer.js";
import {
  EvidenceByIdSuccessResponseDto,
  EvidenceDto,
  EvidenceListSuccessResponseDto,
  EvidenceQueryErrorResponseDto,
} from "./http-response.dto.js";

@ApiTags("Evidence queries")
@ApiExtraModels(
  EvidenceByIdSuccessResponseDto,
  EvidenceListSuccessResponseDto,
  EvidenceQueryErrorResponseDto,
)
@Controller("api/evidence")
export class EvidenceController {
  constructor(
    private readonly evidenceService: EvidenceService,
    private readonly evidenceQuery: EvidenceQueryService,
  ) {}

  @Get("example")
  @ApiOperation({ summary: "Get the bootstrap example Evidence" })
  @ApiOkResponse({
    description: "Bootstrap example Evidence.",
    type: EvidenceDto,
  })
  getExample(): Evidence {
    const evidence = this.evidenceService.findById(exampleEvidenceId);

    if (evidence === undefined) {
      throw new Error("Example evidence was not initialized.");
    }

    return evidence;
  }

  @Get("match/:matchId")
  @Bind(Param("matchId"))
  @ApiOperation({ summary: "Find Evidence associated with a match" })
  @ApiParam({
    description: "Match identifier associated with the Evidence.",
    example: "match-example",
    name: "matchId",
  })
  @ApiOkResponse({
    description: "Typed query success or repository error result.",
    schema: {
      oneOf: [
        { $ref: getSchemaPath(EvidenceListSuccessResponseDto) },
        { $ref: getSchemaPath(EvidenceQueryErrorResponseDto) },
      ],
    },
  })
  findByMatch(matchId: string): EvidenceQueryResult<readonly Evidence[]> {
    return this.evidenceQuery.findByMatch(createMatchId(matchId));
  }

  @Get(":id")
  @Bind(Param("id"))
  @ApiOperation({ summary: "Find Evidence by its immutable identifier" })
  @ApiParam({
    description: "Immutable Evidence identifier.",
    example: "evidence-fixture-match-example",
    name: "id",
  })
  @ApiOkResponse({
    description:
      "Typed query success (with an optional Evidence value) or repository error result.",
    schema: {
      oneOf: [
        { $ref: getSchemaPath(EvidenceByIdSuccessResponseDto) },
        { $ref: getSchemaPath(EvidenceQueryErrorResponseDto) },
      ],
    },
  })
  findById(id: string): EvidenceQueryResult<Evidence | undefined> {
    return this.evidenceQuery.findById(id);
  }
}
