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
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { OddsSnapshotPrimerBridge } from "./odds-snapshot-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { ScoresSnapshotPrimerBridge } from "./scores-snapshot-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { UpcomingMatchesBoardBridge } from "./upcoming-matches-board.bridge.js";

@ApiTags("Analysis")
@ApiExtraModels(AnalysisReportDto, AnalysisEndpointErrorResponseDto)
@Controller("api/analyze")
export class AnalysisController {
  constructor(
    private readonly generateMatchReport: GenerateMatchReportUseCase,
    private readonly oddsPrimer: OddsSnapshotPrimerBridge,
    private readonly scoresPrimer: ScoresSnapshotPrimerBridge,
    private readonly upcomingBoard: UpcomingMatchesBoardBridge,
  ) {}

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
  async analyzeMatch(matchId: string): Promise<GenerateMatchReportResult> {
    await this.scoresPrimer.ensureScores();
    // Populate odds-event shells used by EnrichedMatchProvider for odds:* ids.
    await this.upcomingBoard.listUpcoming(); // primes event shells for odds:* ids
    await this.oddsPrimer.ensurePreMatch1x2(matchId);
    return await this.generateMatchReport.execute(createMatchId(matchId));
  }
}
