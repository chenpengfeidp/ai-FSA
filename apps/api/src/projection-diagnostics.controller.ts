import { AnalysisProjectionReplayPort } from "@fas/analysis";
import {
  runProjectionDiagnosticsReport,
  type ProjectionDiagnosticsReport,
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
 * P2I Projection Diagnostics — read-only root-cause analysis over sealed
 * Evaluation History replay outcomes. Never mutates History, Evidence, or
 * Projection; never tunes parameters.
 */
@ApiTags("Projection Diagnostics")
@Controller("api/projection-diagnostics")
export class ProjectionDiagnosticsController {
  readonly #replayPort = new AnalysisProjectionReplayPort();

  constructor(
    private readonly evaluationHistoryRepository: EvaluationHistoryRepositoryBridge,
    private readonly projectionReplaySidecarRepository: ProjectionReplaySidecarRepositoryBridge,
  ) {}

  @Get()
  @Bind(Query())
  @ApiOperation({
    summary:
      "Compute the deterministic Projection Diagnostics report (P2I) from Evaluation History replay",
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
      "Failure distribution, script/football-state/rule/confidence diagnostics. Insufficient samples are flagged, never estimated.",
  })
  async report(
    query: Readonly<Record<string, string | string[] | undefined>>,
  ): Promise<ProjectionDiagnosticsReport> {
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

    const result = await runProjectionDiagnosticsReport({
      repository: this.evaluationHistoryRepository,
      sidecarRepository: this.projectionReplaySidecarRepository,
      replayPort: this.#replayPort,
      computedAt: new Date().toISOString(),
      query: filter,
    });

    return result.report;
  }
}
