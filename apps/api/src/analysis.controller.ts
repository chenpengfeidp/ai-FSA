// biome-ignore lint/style/useImportType: NestJS uses the use case class as constructor metadata.
import {
  type GenerateMatchReportResult,
  GenerateMatchReportUseCase,
} from "@fas/report";
import type { DiscoverFixtureByTeamsUseCase } from "@fas/application";
import { loadApiConfig } from "@fas/config";
import { createMatchId } from "@fas/match";
import {
  Bind,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import {
  AnalysisEndpointErrorResponseDto,
  AnalysisReportDto,
  FixtureDiscoveryErrorResponseDto,
} from "./http-response.dto.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { FootballMatchPrimerBridge } from "./football-match-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { OddsSnapshotPrimerBridge } from "./odds-snapshot-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { ScoresSnapshotPrimerBridge } from "./scores-snapshot-primer.bridge.js";
import { liveFootballProviderFailure } from "./live-football-provider-failure.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { UpcomingMatchesBoardBridge } from "./upcoming-matches-board.bridge.js";

class AnalyzeByTeamsRequestDto {
  @ApiProperty({
    description: "Requested home team name.",
    example: "FC Seoul",
  })
  declare readonly homeTeam: string;

  @ApiProperty({
    description: "Requested away team name.",
    example: "Ulsan Hyundai FC",
  })
  declare readonly awayTeam: string;

  @ApiPropertyOptional({
    description: "Optional kickoff date (YYYY-MM-DD) for disambiguation.",
    example: "2026-08-21",
  })
  declare readonly date?: string;
}

@ApiTags("Analysis")
@ApiExtraModels(
  AnalysisReportDto,
  AnalysisEndpointErrorResponseDto,
  FixtureDiscoveryErrorResponseDto,
)
@Controller("api/analyze")
export class AnalysisController {
  constructor(
    private readonly generateMatchReport: GenerateMatchReportUseCase,
    private readonly discoverFixture: DiscoverFixtureByTeamsUseCase,
    private readonly oddsPrimer: OddsSnapshotPrimerBridge,
    private readonly scoresPrimer: ScoresSnapshotPrimerBridge,
    private readonly footballPrimer: FootballMatchPrimerBridge,
    private readonly upcomingBoard: UpcomingMatchesBoardBridge,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Bind(Body())
  @ApiOperation({
    summary:
      "Discover a fixture by team names and run the production analysis pipeline",
  })
  @ApiBody({ type: AnalyzeByTeamsRequestDto })
  @ApiOkResponse({
    description:
      "Immutable AnalysisReport, fixture discovery failure, or typed pipeline failure.",
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AnalysisReportDto) },
        { $ref: getSchemaPath(FixtureDiscoveryErrorResponseDto) },
        { $ref: getSchemaPath(AnalysisEndpointErrorResponseDto) },
      ],
    },
  })
  async analyzeByTeams(
    body: AnalyzeByTeamsRequestDto,
  ): Promise<
    | GenerateMatchReportResult
    | Readonly<{ ok: false; error: Readonly<Record<string, unknown>> }>
  > {
    const config = loadApiConfig();

    if (config.projection.policyPin !== "v2") {
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code: "PROJECTION_POLICY_UNAVAILABLE",
          message:
            'Production analysis requires projectionPolicyPin "v2"; configured policy is unavailable.',
          configuredPolicyPin: config.projection.policyPin,
        }),
      });
    }

    await this.scoresPrimer.ensureScores();
    await this.upcomingBoard.listUpcoming();

    const discovery = await this.discoverFixture.execute({
      homeTeam: body.homeTeam,
      awayTeam: body.awayTeam,
      ...(body.date === undefined ? {} : { date: body.date }),
    });

    if (!discovery.ok) {
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({ ...discovery.error }),
      });
    }

    const matchId = discovery.value.resolvedMatchId;

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

    return await this.generateMatchReport.execute(createMatchId(matchId), {
      fixtureResolution: discovery.value,
    });
  }

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
