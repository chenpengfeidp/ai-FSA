// biome-ignore lint/style/useImportType: NestJS uses the use case class as constructor metadata.
import {
  type GenerateMatchReportResult,
  GenerateMatchReportUseCase,
} from "@fas/report";
import { createMatchId } from "@fas/match";
import { Bind, Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  AnalysisEndpointErrorResponseDto,
  AnalysisReportDto,
} from "./http-response.dto.js";

@ApiTags("Analysis")
@ApiExtraModels(AnalysisReportDto, AnalysisEndpointErrorResponseDto)
@Controller("api/analyze")
export class AnalysisController {
  constructor(private readonly generateMatchReport: GenerateMatchReportUseCase) {}

  @Post("match/:matchId")
  @HttpCode(HttpStatus.OK)
  @Bind(Param("matchId"))
  @ApiOperation({
    summary: "Run deterministic match analysis and generate a report",
  })
  @ApiParam({
    description: "Provider match identifier to analyze.",
    example: "match-example",
    name: "matchId",
  })
  @ApiOkResponse({
    description: "Immutable AnalysisReport or typed pipeline failure.",
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AnalysisReportDto) },
        { $ref: getSchemaPath(AnalysisEndpointErrorResponseDto) },
      ],
    },
  })
  analyzeMatch(matchId: string): GenerateMatchReportResult {
    return this.generateMatchReport.execute(createMatchId(matchId));
  }
}
