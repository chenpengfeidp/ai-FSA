import { loadApiConfig } from "@fas/config";
import { Controller, Get } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  UpcomingMatchDto,
  UpcomingMatchesErrorResponseDto,
  UpcomingMatchesSuccessResponseDto,
} from "./http-response.dto.js";
// biome-ignore lint/style/useImportType: NestJS uses the board class as constructor metadata.
import { UpcomingMatchesBoardBridge } from "./upcoming-matches-board.bridge.js";

@ApiTags("Matches")
@ApiExtraModels(
  UpcomingMatchDto,
  UpcomingMatchesSuccessResponseDto,
  UpcomingMatchesErrorResponseDto,
)
@Controller("api/matches")
export class MatchesController {
  constructor(private readonly upcomingBoard: UpcomingMatchesBoardBridge) {}

  @Get("upcoming")
  @ApiOperation({
    summary:
      "List upcoming Match Center fixtures (Football Data primary + optional fixture demos)",
  })
  @ApiOkResponse({
    description: "Merged upcoming board or typed failure.",
    schema: {
      oneOf: [
        { $ref: getSchemaPath(UpcomingMatchesSuccessResponseDto) },
        { $ref: getSchemaPath(UpcomingMatchesErrorResponseDto) },
      ],
    },
  })
  async listUpcoming(): Promise<
    UpcomingMatchesSuccessResponseDto | UpcomingMatchesErrorResponseDto
  > {
    try {
      const board = await this.upcomingBoard.listUpcoming();
      const config = loadApiConfig();

      return Object.freeze({
        ok: true as const,
        value: board.rows,
        meta: Object.freeze({
          oddsProviderMode: config.oddsProvider.mode,
          footballDataProviderMode: config.footballDataProvider.mode,
          scheduleSource: board.scheduleSource,
          usedRecordedFallback: board.usedRecordedFallback,
        }),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Unable to load upcoming matches.";

      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code: "UPCOMING_MATCHES_FAILED",
          message,
        }),
      });
    }
  }
}
