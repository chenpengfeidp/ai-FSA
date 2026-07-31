import { AnalysisProjectionReplayPort } from "@fas/analysis";
import {
  runProjectionReplayReport,
  type ProjectionReplayReport,
} from "@fas/statistics";
import { Bind, Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { EvaluationHistoryRepositoryBridge } from "./evaluation-history-repository.bridge.js";
// biome-ignore lint/style/useImportType: NestJS uses the bridge class as constructor metadata.
import { ProjectionReplaySidecarRepositoryBridge } from "./projection-replay-sidecar-repository.bridge.js";

function optionalQueryString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * P2H Projection Replay Validation — read-only replay of sealed Evaluation
 * History comparing Projection V1 vs V2. Never mutates History, Evidence, or
 * Provider state; never re-fetches external data.
 */
@ApiTags("Projection Replay")
@Controller("api/projection-replay")
export class ProjectionReplayController {
  readonly #replayPort = new AnalysisProjectionReplayPort();

  constructor(
    private readonly evaluationHistoryRepository: EvaluationHistoryRepositoryBridge,
    private readonly projectionReplaySidecarRepository: ProjectionReplaySidecarRepositoryBridge,
  ) {}

  @Get()
  @Bind(Query())
  @ApiOperation({
    summary:
      "Compute the deterministic Projection Replay Validation report (P2H) from Evaluation History",
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
    description:
      "V1 vs V2 replay comparison with script and Football State contribution statistics. Insufficient samples are flagged, never estimated.",
  })
  async report(
    query: Readonly<Record<string, string | string[] | undefined>>,
  ): Promise<ProjectionReplayReport> {
    const competitionId = optionalQueryString(query.competitionId);
    const competitionName = optionalQueryString(query.competitionName);
    const season = optionalQueryString(query.season);
    const from = optionalQueryString(query.from);
    const to = optionalQueryString(query.to);

    const filter = {
      ...(competitionId === undefined ? {} : { competitionId }),
      ...(competitionName === undefined ? {} : { competitionName }),
      ...(season === undefined ? {} : { season }),
      ...(from === undefined ? {} : { fromMatchDate: from }),
      ...(to === undefined ? {} : { toMatchDate: to }),
    };

    const result = await runProjectionReplayReport({
      repository: this.evaluationHistoryRepository,
      sidecarRepository: this.projectionReplaySidecarRepository,
      replayPort: this.#replayPort,
      computedAt: new Date().toISOString(),
      query: filter,
    });

    return result.report;
  }
}
