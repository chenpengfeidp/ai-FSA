// biome-ignore lint/style/useImportType: NestJS uses the use case class as constructor metadata.
import { type ImportMatchResult, ImportMatchUseCase } from "@fas/application";
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
  ImportErrorResponseDto,
  ImportSuccessResponseDto,
} from "./http-response.dto.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { FootballMatchPrimerBridge } from "./football-match-primer.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { OddsSnapshotPrimerBridge } from "./odds-snapshot-primer.bridge.js";

@ApiTags("Evidence import")
@ApiExtraModels(ImportSuccessResponseDto, ImportErrorResponseDto)
@Controller("api/import")
export class ImportController {
  constructor(
    private readonly importMatch: ImportMatchUseCase,
    private readonly footballPrimer: FootballMatchPrimerBridge,
    private readonly oddsPrimer: OddsSnapshotPrimerBridge,
  ) {}

  @Post("match/:matchId")
  @HttpCode(HttpStatus.OK)
  @Bind(Param("matchId"))
  @ApiOperation({
    summary:
      "Import match Evidence from the fixture provider with optional external odds overlay",
  })
  @ApiParam({
    description: "Provider match identifier to import.",
    example: "match-example",
    name: "matchId",
  })
  @ApiOkResponse({
    description:
      "Typed import success or error result. Errors include unknown matches and duplicate Evidence.",
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ImportSuccessResponseDto) },
        { $ref: getSchemaPath(ImportErrorResponseDto) },
      ],
    },
  })
  async importMatchById(matchId: string): Promise<ImportMatchResult> {
    await this.footballPrimer.ensureMatch(matchId);
    await this.oddsPrimer.ensurePreMatch1x2(matchId);
    return await this.importMatch.execute(matchId);
  }
}
