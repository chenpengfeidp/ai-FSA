import { describe, expect, it } from "vitest";
import {
  computeSealedCohortPopulationEvaluation,
  InMemoryPopulationEvaluationRepository,
} from "@fas/statistics";

import {
  executeSealedCohortOfflineReplayPair,
  getProductionMatchScriptParameterSet,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
} from "../src/index.js";
import { seedSealedCohortForP2kG } from "./helpers/seed-sealed-cohort-for-p2k-g.js";

describe("P2K-G population evaluation over P2K-F offline runs", () => {
  it("evaluates A/C pair on sealed cohort without promoting Candidate C", async () => {
    const seeded = await seedSealedCohortForP2kG({
      cohortId: "cohort.p2k.g.integration",
      matchIds: ["match-p2k-g-int-a", "match-p2k-g-int-b"],
    });

    const pair = await executeSealedCohortOfflineReplayPair({
      cohortId: "cohort.p2k.g.integration",
      baselineReplayRunId: "run.p2k.g.int.a",
      candidateReplayRunId: "run.p2k.g.int.c",
      cohortRepository: seeded.cohortRepo,
      historyRepository: seeded.historyRepo,
      sidecarRepository: seeded.sidecarRepo,
      replayRunRepository: seeded.replayRunRepo,
      clock: () => "2026-08-12T18:00:00.000Z",
    });
    expect(pair.ok).toBe(true);
    if (!pair.ok) {
      return;
    }

    const evaluationRepo = new InMemoryPopulationEvaluationRepository();
    const evaluation = await computeSealedCohortPopulationEvaluation({
      evaluationRunId: "eval.p2k.g.integration",
      cohortId: "cohort.p2k.g.integration",
      baselineReplayRunId: pair.baseline.replayRunId,
      candidateReplayRunId: pair.candidate.replayRunId,
      computedAt: "2026-08-12T18:05:00.000Z",
      cohortRepository: seeded.cohortRepo,
      replayRunRepository: seeded.replayRunRepo,
      historyRepository: seeded.historyRepo,
      populationEvaluationRepository: evaluationRepo,
    });

    expect(evaluation.ok).toBe(true);
    if (!evaluation.ok) {
      return;
    }

    expect(evaluation.value.membershipDigestSha256).toBe(
      seeded.cohort.membershipDigestSha256,
    );
    expect(evaluation.value.coverage.finalEvaluationSampleSize).toBe(
      seeded.cohort.members.length,
    );
    expect(evaluation.value.candidateCProductionPromoted).toBe(false);
    expect(evaluation.value.productionMatchScriptUnchanged).toBe(true);
    expect(GOVERNED_MATCH_SCRIPT_PARAMETER_SET).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(getProductionMatchScriptParameterSet()).toBe(
      MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
    );
    expect(MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET).not.toBe(
      GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
    );
    expect(
      R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
    ).toBe(false);
  });
});
