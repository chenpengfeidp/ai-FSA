import {
  computeValidationReport,
  type EvaluationHistoryQuery,
  type ValidationReport,
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
 * V1A Football Intelligence Validation — read-only comparison of prediction
 * quality across Feature-configuration profiles, computed over Evaluation
 * History. Reuses Evaluation (A1) and Prediction Calibration (A2) metrics;
 * never modifies Provider/Feature/Rule/Projection/Confidence/Evaluation/
 * Calibration and never re-runs prediction under an alternate configuration.
 */
@ApiTags("Validation")
@Controller("api/validation")
export class ValidationController {
  constructor(
    private readonly evaluationHistoryRepository: EvaluationHistoryRepositoryBridge,
  ) {}

  @Get()
  @Bind(Query())
  @ApiOperation({
    summary:
      "Compute the deterministic Football Intelligence Validation report (V1A) from Evaluation History",
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
      "Comparison of Winner/Draw/Score/Goal-range accuracy, Coverage, Paper ROI, and reused Prediction Calibration metrics across Feature-configuration profiles evaluated against the same sealed historical predictions. Insufficient samples are flagged, never estimated; no profile comparison is claimed as an improvement.",
  })
  async report(
    query: Readonly<Record<string, string | string[] | undefined>>,
  ): Promise<ValidationReport> {
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

    return computeValidationReport({
      records,
      computedAt: new Date().toISOString(),
    });
  }
}
