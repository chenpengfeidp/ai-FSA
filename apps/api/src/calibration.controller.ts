import {
  computePredictionCalibrationReport,
  type EvaluationHistoryQuery,
  type PredictionCalibrationReport,
} from "@fas/statistics";
import { Bind, Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
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

/**
 * A2 Prediction Calibration — read-only measurement over Evaluation History.
 * Never modifies Provider/Feature/Rule/Projection/sealed Prediction and never
 * estimates missing history; only computes deterministic reliability metrics
 * from whatever Evaluation History rows already exist.
 */
@ApiTags("Calibration")
@Controller("api/calibration")
export class CalibrationController {
  constructor(
    private readonly evaluationHistoryRepository: EvaluationHistoryRepositoryBridge,
  ) {}

  @Get()
  @Bind(Query())
  @ApiOperation({
    summary:
      "Compute the deterministic Prediction Calibration report (A2) from Evaluation History",
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
      "Calibration metrics with provenance and sample sizes. Insufficient samples are flagged, never estimated.",
  })
  async report(
    query: Readonly<Record<string, string | string[] | undefined>>,
  ): Promise<PredictionCalibrationReport> {
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

    const records = await this.evaluationHistoryRepository.query(filter);

    return computePredictionCalibrationReport({
      records,
      computedAt: new Date().toISOString(),
    });
  }
}
