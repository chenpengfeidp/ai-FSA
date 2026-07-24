import {
  computeContributionReport,
  type ContributionReport,
  type EvaluationHistoryQuery,
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
 * O1 Football Intelligence Contribution Analysis — read-only measurement of
 * each Football Intelligence domain's observed historical contribution,
 * computed over Evaluation History. Reuses Evaluation (A1) and Prediction
 * Calibration (A2) metrics; never modifies Provider/Feature/Rule/
 * Projection/Confidence/Evaluation/Calibration and never regenerates
 * predictions. Domains are never ranked and no causation is claimed.
 */
@ApiTags("Contribution")
@Controller("api/contribution")
export class ContributionController {
  constructor(
    private readonly evaluationHistoryRepository: EvaluationHistoryRepositoryBridge,
  ) {}

  @Get()
  @Bind(Query())
  @ApiOperation({
    summary:
      "Compute the deterministic Football Intelligence Contribution report (O1) from Evaluation History",
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
      "Per-domain Coverage, Sample Size, Winner/Draw/Score/Goal-range Accuracy, ECE, Brier Score, Paper ROI, and Qualification status for Venue, Availability, Advanced Statistics, Expected Goals, Match Context, Club, Player, and Market Intelligence, measured against the same sealed historical predictions. Insufficient samples are flagged, never estimated; domains are listed in a fixed order and are never ranked, and no causation is claimed.",
  })
  async report(
    query: Readonly<Record<string, string | string[] | undefined>>,
  ): Promise<ContributionReport> {
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

    return computeContributionReport({
      records,
      computedAt: new Date().toISOString(),
    });
  }
}
