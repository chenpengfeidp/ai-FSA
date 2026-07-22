// biome-ignore lint/style/useImportType: NestJS uses the use case class as constructor metadata.
import {
  type GenerateMatchReportResult,
  GenerateMatchReportUseCase,
} from "@fas/report";
import { createMatchId } from "@fas/match";
import { Bind, Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  AnalysisEndpointErrorResponseDto,
  AnalysisReportDto,
} from "./http-response.dto.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { FootballMatchPrimerBridge } from "./football-match-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { OddsSnapshotPrimerBridge } from "./odds-snapshot-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { ScoresSnapshotPrimerBridge } from "./scores-snapshot-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { liveFootballProviderFailure } from "./live-football-provider-failure.js";
import type { UpcomingMatchesBoardBridge } from "./upcoming-matches-board.bridge.js";

class MatchAnalysisRequestDto {
  @ApiProperty({
    description: "Existing MatchId to analyse.",
    example: "football:244001",
  })
  declare readonly matchId: string;
}

@ApiTags("Analysis")
@ApiExtraModels(AnalysisReportDto, AnalysisEndpointErrorResponseDto)
@Controller("api/v1")
export class MatchAnalysisController {
  constructor(
    private readonly generateMatchReport: GenerateMatchReportUseCase,
    private readonly oddsPrimer: OddsSnapshotPrimerBridge,
    private readonly scoresPrimer: ScoresSnapshotPrimerBridge,
    private readonly footballPrimer: FootballMatchPrimerBridge,
    private readonly upcomingBoard: UpcomingMatchesBoardBridge,
  ) {}

  @Post("match-analysis")
  @HttpCode(HttpStatus.OK)
  @Bind(Body())
  @ApiOperation({
    summary: "Run Slice-1 football intelligence analysis and seal a Match Report",
  })
  @ApiBody({ type: MatchAnalysisRequestDto })
  @ApiOkResponse({
    description: "Immutable AnalysisReport or typed pipeline failure.",
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AnalysisReportDto) },
        { $ref: getSchemaPath(AnalysisEndpointErrorResponseDto) },
      ],
    },
  })
  async analyzeMatch(
    body: MatchAnalysisRequestDto,
  ): Promise<GenerateMatchReportResult> {
    const matchId = body.matchId;
    await this.scoresPrimer.ensureScores();
    await this.upcomingBoard.listUpcoming();

    try {
      await this.footballPrimer.ensureMatch(matchId);
    } catch (error: unknown) {
      const failure = liveFootballProviderFailure(error);

      if (failure !== undefined) {
        return failure;
      }

      throw error;
    }

    await this.oddsPrimer.ensurePreMatch1x2(matchId);
    return await this.generateMatchReport.execute(createMatchId(matchId));
  }
}
