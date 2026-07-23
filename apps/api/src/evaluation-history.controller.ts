import { createMatchId } from "@fas/match";
import type {
  EvaluationHistoryQuery,
  EvaluationHistoryRecord,
} from "@fas/statistics";
import { Bind, Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { EvaluationHistoryRepositoryBridge } from "./evaluation-history-repository.bridge.js";

function optionalQueryString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

@ApiTags("Evaluation History")
@Controller("api/evaluation-history")
export class EvaluationHistoryController {
  constructor(
    private readonly evaluationHistoryRepository: EvaluationHistoryRepositoryBridge,
  ) {}

  @Get("match/:matchId")
  @Bind(Param("matchId"))
  @ApiOperation({
    summary: "List Evaluation History records for a match (read-only)",
  })
  @ApiParam({
    name: "matchId",
    example: "football:100001",
    description: "Domain MatchId",
  })
  @ApiOkResponse({ description: "Append-only Evaluation History rows." })
  async byMatch(matchId: string): Promise<readonly EvaluationHistoryRecord[]> {
    return this.evaluationHistoryRepository.findByMatch(createMatchId(matchId));
  }

  @Get()
  @Bind(Query())
  @ApiOperation({
    summary: "Query Evaluation History by competition, season, or date range",
  })
  @ApiQuery({ name: "competitionId", required: false })
  @ApiQuery({ name: "competitionName", required: false })
  @ApiQuery({ name: "season", required: false })
  @ApiQuery({
    name: "from",
    required: false,
    description: "ISO matchDate lower bound",
  })
  @ApiQuery({
    name: "to",
    required: false,
    description: "ISO matchDate upper bound",
  })
  @ApiOkResponse({
    description: "Matching Evaluation History rows (newest first).",
  })
  async query(
    query: Readonly<Record<string, string | string[] | undefined>>,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    const competitionId = optionalQueryString(query.competitionId);
    const competitionName = optionalQueryString(query.competitionName);
    const season = optionalQueryString(query.season);
    const from = optionalQueryString(query.from);
    const to = optionalQueryString(query.to);

    const filter: EvaluationHistoryQuery = {
      ...(competitionId === undefined ? {} : { competitionId }),
      ...(competitionName === undefined ? {} : { competitionName }),
      ...(season === undefined ? {} : { season }),
      ...(from === undefined ? {} : { fromMatchDate: from }),
      ...(to === undefined ? {} : { toMatchDate: to }),
    };

    return this.evaluationHistoryRepository.query(filter);
  }
}
