/**
 * P2K-G3 — Validation Evidence / Prediction Distribution Audit (READ-ONLY).
 *
 * Consumes Expansion V2 SEALED cohort + durable A/C Replay Runs + History/Sidecar.
 * Recomputes Match Script / Projection / λ in-memory for diagnosis only.
 *
 * Does NOT:
 * - mutate History / Sidecar / cohort / Replay Run / Evaluation
 * - re-execute P2K-E / P2K-F / P2K-G persistence
 * - promote Candidate C / change production Match Script
 * - authorize or start P2K-H / calibration
 */
import {
  buildFeatureBundleFromSealedReplayContext,
  buildRuleResultsFromSealedReplayContext,
  checksumForProjectionParameterPayload,
  computeMatchProjection,
  createProjectionParameterArtifact,
  getProjectionParameterArtifactByVersionLabel,
  GOVERNED_MATCH_SCRIPT_PARAMETER_SET,
  MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET,
  MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET,
  R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE,
  resolveOfflineMatchScriptParameterSet,
  runOfflineMatchScriptReplay,
} from "../../../../packages/analysis/dist/index.js";
import { createFasDatabase } from "../../../../packages/database/dist/src/index.js";
import {
  computeReplayCohortMembershipDigestSha256,
  goalRangeBucket,
  predictedGoalRangeBucket,
  predictedWinnerFromProbs,
  validateSealedCohortForOfflineRun,
} from "../../../../packages/statistics/dist/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

const COHORT_ID = "p2k.e.validation.expansion.v2.analyzematch.v1";
const EXPECTED_DIGEST =
  "03b52d71078dee7746796fd1de722e22e2a66382ea7202556299990a5714e997";
const BASELINE_RUN_ID = "run.p2k.f.validation.expansion.v2.analyzematch.v1.a";
const CANDIDATE_RUN_ID = "run.p2k.f.validation.expansion.v2.analyzematch.v1.c";
const EVALUATION_RUN_ID = "eval.p2k.g.validation.expansion.v2.analyzematch.v1";
const EXPECTED_MEMBER_COUNT = 30;
const MATCH_ID_PREFIX = "match-p2kg-expansion-v2-";
const BASELINE_LABEL = "r1b.candidate.a.baseline";
const CANDIDATE_LABEL = "r1b.candidate.c.sideAwareOpen";

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

function profileKey(prediction) {
  return [prediction.pHome, prediction.pDraw, prediction.pAway]
    .map(round6)
    .join("|");
}

function increment(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function sortedEntries(counter) {
  return Object.entries(counter).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0]);
  });
}

function nearlyEqual(left, right, eps = 1e-9) {
  return Math.abs(left - right) <= eps;
}

function scriptsSignature(scripts) {
  return [...scripts]
    .map((script) => `${script.scriptId}:${round6(script.weight)}`)
    .sort()
    .join(",");
}

function topScripts(scripts, limit = 3) {
  return [...scripts]
    .sort((left, right) => right.weight - left.weight)
    .slice(0, limit)
    .map((script) => ({
      scriptId: script.scriptId,
      weight: round6(script.weight),
      lambdaHome: round6(script.lambdaHome),
      lambdaAway: round6(script.lambdaAway),
    }));
}

function footballStateSignature(dimensions) {
  return [...dimensions]
    .map((dimension) => {
      const id = dimension.dimensionId ?? dimension.id;
      return `${id}:${dimension.level}`;
    })
    .sort()
    .join(",");
}

function buildOfflineParameters(base, matchScript, calibrationLabel) {
  const checksum = checksumForProjectionParameterPayload({
    versionLabel: base.versionLabel,
    lambda: base.lambda,
    matchScript,
    footballState: base.footballState,
    confidence: base.confidence,
    recommendation: base.recommendation,
    matrixMerge: base.matrixMerge,
  });

  return createProjectionParameterArtifact({
    artifactId: `offline.p2k.d:${base.artifactId}:${calibrationLabel}`,
    versionLabel: base.versionLabel,
    policyVersion: base.policyVersion,
    frameworkVersion: base.frameworkVersion,
    status: base.status,
    qualified: false,
    checksum,
    limitations: Object.freeze([
      ...base.limitations,
      "P2K-G3 audit-only offline Match Script override (not persisted).",
    ]),
    lambda: base.lambda,
    footballState: base.footballState,
    confidence: base.confidence,
    recommendation: base.recommendation,
    matrixMerge: base.matrixMerge,
    matchScript,
  });
}

function computeProjectionTrace(sidecar, calibrationLabel) {
  const resolved = resolveOfflineMatchScriptParameterSet({
    calibrationLabel,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const context = sidecar.context;
  const pinnedLabel = context.parameterVersionLabel?.trim() ?? "";
  const base = getProjectionParameterArtifactByVersionLabel(pinnedLabel);
  if (base === undefined) {
    return {
      ok: false,
      error: {
        code: "MISSING_BASE_ARTIFACT",
        message: `Unknown pin ${pinnedLabel}`,
      },
    };
  }

  const parameters = buildOfflineParameters(base, resolved.value, resolved.label);
  const featureBundle = buildFeatureBundleFromSealedReplayContext(context);
  const ruleResults = buildRuleResultsFromSealedReplayContext(context);
  const projectionResult = computeMatchProjection({
    featureBundle,
    ruleResults,
    requiredEvidencePresentCount: context.requiredEvidencePresentCount,
    projectionPolicyPin: "v2",
    parameters,
  });

  const scripts = projectionResult.projectionFramework?.activeMatchScripts ?? [];
  const footballState = projectionResult.footballState?.dimensions ?? [];

  return {
    ok: true,
    calibrationLabel: resolved.label,
    isProductionDefault: resolved.isProductionDefault,
    parameterArtifactId: parameters.artifactId,
    parameterArtifactChecksum: parameters.checksum,
    lambdaHome: round6(projectionResult.projection.lambdaHome),
    lambdaAway: round6(projectionResult.projection.lambdaAway),
    expectedGoals: round6(
      projectionResult.projection.lambdaHome +
        projectionResult.projection.lambdaAway,
    ),
    pHome: round6(projectionResult.projection.pHome),
    pDraw: round6(projectionResult.projection.pDraw),
    pAway: round6(projectionResult.projection.pAway),
    goalRange: {
      range01: round6(projectionResult.projection.goalRange.range01),
      range23: round6(projectionResult.projection.goalRange.range23),
      range4Plus: round6(projectionResult.projection.goalRange.range4Plus),
    },
    projectionChecksum: projectionResult.projection.checksum,
    predictedWinner: predictedWinnerFromProbs(
      projectionResult.projection.pHome,
      projectionResult.projection.pDraw,
      projectionResult.projection.pAway,
    ),
    predictedGoalRange: predictedGoalRangeBucket(
      projectionResult.projection.goalRange,
    ),
    scriptsSignature: scriptsSignature(scripts),
    topScripts: topScripts(scripts),
    footballStateSignature: footballStateSignature(footballState),
    footballStateLevels: Object.fromEntries(
      footballState.map((dimension) => [
        dimension.dimensionId ?? dimension.id,
        dimension.level,
      ]),
    ),
    featureCount: context.features.length,
    ruleCount: context.rules.length,
    featureModelVersion: context.featureModelVersion,
    ruleSetVersion: context.ruleSetVersion,
    parameterVersionLabel: pinnedLabel,
  };
}

function memberDiffFlags(a, c, persistedA, persistedC) {
  return {
    projectionChecksumDiffers:
      persistedA.projectionChecksum !== persistedC.projectionChecksum,
    profileDiffers:
      profileKey(persistedA.prediction) !== profileKey(persistedC.prediction),
    probabilityDiffers:
      !nearlyEqual(persistedA.prediction.pHome, persistedC.prediction.pHome) ||
      !nearlyEqual(persistedA.prediction.pDraw, persistedC.prediction.pDraw) ||
      !nearlyEqual(persistedA.prediction.pAway, persistedC.prediction.pAway),
    goalRangeMassDiffers:
      !nearlyEqual(
        persistedA.prediction.goalRange.range01,
        persistedC.prediction.goalRange.range01,
      ) ||
      !nearlyEqual(
        persistedA.prediction.goalRange.range23,
        persistedC.prediction.goalRange.range23,
      ) ||
      !nearlyEqual(
        persistedA.prediction.goalRange.range4Plus,
        persistedC.prediction.goalRange.range4Plus,
      ),
    discreteWinnerDiffers:
      predictedWinnerFromProbs(
        persistedA.prediction.pHome,
        persistedA.prediction.pDraw,
        persistedA.prediction.pAway,
      ) !==
      predictedWinnerFromProbs(
        persistedC.prediction.pHome,
        persistedC.prediction.pDraw,
        persistedC.prediction.pAway,
      ),
    discreteGoalRangeDiffers:
      predictedGoalRangeBucket(persistedA.prediction.goalRange) !==
      predictedGoalRangeBucket(persistedC.prediction.goalRange),
    lambdaDiffers:
      a.ok &&
      c.ok &&
      (!nearlyEqual(a.lambdaHome, c.lambdaHome) ||
        !nearlyEqual(a.lambdaAway, c.lambdaAway)),
    scriptsDiffers: a.ok && c.ok && a.scriptsSignature !== c.scriptsSignature,
    footballStateSame:
      a.ok && c.ok && a.footballStateSignature === c.footballStateSignature,
    confidenceBandSame:
      persistedA.prediction.confidenceBand === persistedC.prediction.confidenceBand,
    predictionConfidenceSame: nearlyEqual(
      persistedA.prediction.predictionConfidence,
      persistedC.prediction.predictionConfidence,
    ),
  };
}

async function main() {
  const db = createFasDatabase(databaseUrl);
  await db.lifecycle.ping();

  const loadedCohort = await db.replayCohortRepository.findByCohortId(COHORT_ID);
  const baselineRun =
    await db.replayRunRepository.findByReplayRunId(BASELINE_RUN_ID);
  const candidateRun =
    await db.replayRunRepository.findByReplayRunId(CANDIDATE_RUN_ID);
  const evaluation =
    await db.populationEvaluationRepository.findByEvaluationRunId(EVALUATION_RUN_ID);

  const cohort = validateSealedCohortForOfflineRun(loadedCohort);
  const recomputedDigest = computeReplayCohortMembershipDigestSha256({
    specification: cohort.specification,
    members: cohort.members,
  });

  if (
    baselineRun === undefined ||
    candidateRun === undefined ||
    cohort.membershipDigestSha256 !== EXPECTED_DIGEST ||
    recomputedDigest !== EXPECTED_DIGEST ||
    cohort.members.length !== EXPECTED_MEMBER_COUNT
  ) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          phase: "precondition",
          cohortPresent: loadedCohort !== undefined,
          digest: cohort.membershipDigestSha256,
          baselinePresent: baselineRun !== undefined,
          candidatePresent: candidateRun !== undefined,
        },
        null,
        2,
      ),
    );
    await db.lifecycle.disconnect();
    process.exitCode = 1;
    return;
  }

  const baselineByHistory = new Map(
    baselineRun.results.map((result) => [result.historyId, result]),
  );
  const candidateByHistory = new Map(
    candidateRun.results.map((result) => [result.historyId, result]),
  );

  const members = [];
  const profileCountsA = {};
  const profileCountsC = {};
  const profileToScriptsA = {};
  const profileToScriptsC = {};
  const predictedWinnerA = {};
  const predictedWinnerC = {};
  const predictedRangeA = {};
  const predictedRangeC = {};
  const actualWinner = {};
  const actualRange = {};
  const confidenceBand = {};
  const lambdaBinsA = {};
  const lambdaBinsC = {};
  const topScriptIdA = {};
  const topScriptIdC = {};

  let projectionChecksumDiffCount = 0;
  let profileDiffCount = 0;
  let probabilityDiffCount = 0;
  let goalRangeMassDiffCount = 0;
  let discreteWinnerDiffCount = 0;
  let discreteGoalRangeDiffCount = 0;
  let lambdaDiffCount = 0;
  let scriptsDiffCount = 0;
  let offlineReplayMismatchA = 0;
  let offlineReplayMismatchC = 0;
  let maxAbsPHomeDelta = 0;
  let maxAbsLambdaHomeDelta = 0;
  let maxAbsExpectedGoalsDelta = 0;
  let pDrawNeverMaxCount = 0;
  let range4PlusDominatesCount = 0;

  for (const member of [...cohort.members].sort((left, right) =>
    left.matchId.localeCompare(right.matchId),
  )) {
    const history = await db.evaluationHistoryRepository.findByHistoryId(
      member.historyId,
    );
    const sidecar = await db.projectionReplaySidecarRepository.findRecordByHistoryId(
      member.historyId,
    );
    const persistedA = baselineByHistory.get(member.historyId);
    const persistedC = candidateByHistory.get(member.historyId);

    if (
      history === undefined ||
      sidecar === undefined ||
      persistedA === undefined ||
      persistedC === undefined ||
      persistedA.status !== "success" ||
      persistedC.status !== "success"
    ) {
      throw new Error(`Incomplete durable artifacts for ${member.historyId}`);
    }

    const offlineA = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: BASELINE_LABEL,
    });
    const offlineC = runOfflineMatchScriptReplay({
      history,
      sidecar,
      matchScriptCalibrationLabel: CANDIDATE_LABEL,
    });
    if (!offlineA.ok || !offlineC.ok) {
      throw new Error(
        `Offline recomputation failed for ${member.historyId}: A=${offlineA.ok} C=${offlineC.ok}`,
      );
    }

    if (offlineA.value.projectionChecksum !== persistedA.projectionChecksum) {
      offlineReplayMismatchA += 1;
    }
    if (offlineC.value.projectionChecksum !== persistedC.projectionChecksum) {
      offlineReplayMismatchC += 1;
    }

    const traceA = computeProjectionTrace(sidecar, BASELINE_LABEL);
    const traceC = computeProjectionTrace(sidecar, CANDIDATE_LABEL);
    if (!traceA.ok || !traceC.ok) {
      throw new Error(`Projection trace failed for ${member.historyId}`);
    }

    const flags = memberDiffFlags(traceA, traceC, persistedA, persistedC);
    if (flags.projectionChecksumDiffers) projectionChecksumDiffCount += 1;
    if (flags.profileDiffers) profileDiffCount += 1;
    if (flags.probabilityDiffers) probabilityDiffCount += 1;
    if (flags.goalRangeMassDiffers) goalRangeMassDiffCount += 1;
    if (flags.discreteWinnerDiffers) discreteWinnerDiffCount += 1;
    if (flags.discreteGoalRangeDiffers) discreteGoalRangeDiffCount += 1;
    if (flags.lambdaDiffers) lambdaDiffCount += 1;
    if (flags.scriptsDiffers) scriptsDiffCount += 1;

    const pHomeDelta = Math.abs(
      persistedC.prediction.pHome - persistedA.prediction.pHome,
    );
    const lambdaHomeDelta = Math.abs(traceC.lambdaHome - traceA.lambdaHome);
    const expectedGoalsDelta = Math.abs(traceC.expectedGoals - traceA.expectedGoals);
    maxAbsPHomeDelta = Math.max(maxAbsPHomeDelta, pHomeDelta);
    maxAbsLambdaHomeDelta = Math.max(maxAbsLambdaHomeDelta, lambdaHomeDelta);
    maxAbsExpectedGoalsDelta = Math.max(
      maxAbsExpectedGoalsDelta,
      expectedGoalsDelta,
    );

    const predWinnerA = predictedWinnerFromProbs(
      persistedA.prediction.pHome,
      persistedA.prediction.pDraw,
      persistedA.prediction.pAway,
    );
    const predWinnerC = predictedWinnerFromProbs(
      persistedC.prediction.pHome,
      persistedC.prediction.pDraw,
      persistedC.prediction.pAway,
    );
    const predRangeA = predictedGoalRangeBucket(persistedA.prediction.goalRange);
    const predRangeC = predictedGoalRangeBucket(persistedC.prediction.goalRange);
    const actWinner = history.actualResult.winner;
    const actRange = goalRangeBucket(history.actualResult.totalGoals);

    if (
      persistedA.prediction.pDraw < persistedA.prediction.pHome &&
      persistedA.prediction.pDraw < persistedA.prediction.pAway
    ) {
      pDrawNeverMaxCount += 1;
    }
    if (predRangeA === "range4Plus") {
      range4PlusDominatesCount += 1;
    }

    const keyA = profileKey(persistedA.prediction);
    const keyC = profileKey(persistedC.prediction);
    increment(profileCountsA, keyA);
    increment(profileCountsC, keyC);
    if (profileToScriptsA[keyA] === undefined) {
      profileToScriptsA[keyA] = {
        topScripts: traceA.topScripts,
        lambdaHome: traceA.lambdaHome,
        lambdaAway: traceA.lambdaAway,
        predictedWinner: predWinnerA,
        predictedGoalRange: predRangeA,
        goalRange: persistedA.prediction.goalRange,
      };
    }
    if (profileToScriptsC[keyC] === undefined) {
      profileToScriptsC[keyC] = {
        topScripts: traceC.topScripts,
        lambdaHome: traceC.lambdaHome,
        lambdaAway: traceC.lambdaAway,
        predictedWinner: predWinnerC,
        predictedGoalRange: predRangeC,
        goalRange: persistedC.prediction.goalRange,
      };
    }

    increment(predictedWinnerA, predWinnerA);
    increment(predictedWinnerC, predWinnerC);
    increment(predictedRangeA, predRangeA);
    increment(predictedRangeC, predRangeC);
    increment(actualWinner, actWinner);
    increment(actualRange, actRange);
    increment(confidenceBand, persistedA.prediction.confidenceBand);
    increment(
      lambdaBinsA,
      `eg=${Math.floor(traceA.expectedGoals)}-${Math.floor(traceA.expectedGoals) + 1}`,
    );
    increment(
      lambdaBinsC,
      `eg=${Math.floor(traceC.expectedGoals)}-${Math.floor(traceC.expectedGoals) + 1}`,
    );
    increment(topScriptIdA, traceA.topScripts[0]?.scriptId ?? "none");
    increment(topScriptIdC, traceC.topScripts[0]?.scriptId ?? "none");

    members.push({
      matchId: member.matchId,
      historyId: member.historyId,
      actual: {
        winner: actWinner,
        homeGoals: history.actualResult.homeGoals,
        awayGoals: history.actualResult.awayGoals,
        totalGoals: history.actualResult.totalGoals,
        goalRange: actRange,
      },
      sidecar: {
        contentSha256: sidecar.contentSha256,
        parameterVersionLabel: sidecar.context.parameterVersionLabel,
        featureCount: sidecar.context.features.length,
        ruleCount: sidecar.context.rules.length,
        featureModelVersion: sidecar.context.featureModelVersion,
        ruleSetVersion: sidecar.context.ruleSetVersion,
      },
      historyConfidence: {
        predictionConfidence: history.confidence.predictionConfidence,
        confidenceBand: history.confidence.confidenceBand,
      },
      A: {
        profile: keyA,
        predictedWinner: predWinnerA,
        predictedGoalRange: predRangeA,
        pHome: round6(persistedA.prediction.pHome),
        pDraw: round6(persistedA.prediction.pDraw),
        pAway: round6(persistedA.prediction.pAway),
        goalRange: {
          range01: round6(persistedA.prediction.goalRange.range01),
          range23: round6(persistedA.prediction.goalRange.range23),
          range4Plus: round6(persistedA.prediction.goalRange.range4Plus),
        },
        projectionChecksum: persistedA.projectionChecksum,
        lambdaHome: traceA.lambdaHome,
        lambdaAway: traceA.lambdaAway,
        expectedGoals: traceA.expectedGoals,
        topScripts: traceA.topScripts,
        footballStateLevels: traceA.footballStateLevels,
        offlineParameterArtifactId: offlineA.value.offlineParameterArtifactId,
        offlineParameterArtifactChecksum:
          offlineA.value.offlineParameterArtifactChecksum,
        isProductionDefault: offlineA.value.isProductionDefault,
        productionPromoted: offlineA.value.productionPromoted,
      },
      C: {
        profile: keyC,
        predictedWinner: predWinnerC,
        predictedGoalRange: predRangeC,
        pHome: round6(persistedC.prediction.pHome),
        pDraw: round6(persistedC.prediction.pDraw),
        pAway: round6(persistedC.prediction.pAway),
        goalRange: {
          range01: round6(persistedC.prediction.goalRange.range01),
          range23: round6(persistedC.prediction.goalRange.range23),
          range4Plus: round6(persistedC.prediction.goalRange.range4Plus),
        },
        projectionChecksum: persistedC.projectionChecksum,
        lambdaHome: traceC.lambdaHome,
        lambdaAway: traceC.lambdaAway,
        expectedGoals: traceC.expectedGoals,
        topScripts: traceC.topScripts,
        footballStateLevels: traceC.footballStateLevels,
        offlineParameterArtifactId: offlineC.value.offlineParameterArtifactId,
        offlineParameterArtifactChecksum:
          offlineC.value.offlineParameterArtifactChecksum,
        isProductionDefault: offlineC.value.isProductionDefault,
        productionPromoted: offlineC.value.productionPromoted,
      },
      deltas: {
        pHome: round6(persistedC.prediction.pHome - persistedA.prediction.pHome),
        pDraw: round6(persistedC.prediction.pDraw - persistedA.prediction.pDraw),
        pAway: round6(persistedC.prediction.pAway - persistedA.prediction.pAway),
        lambdaHome: round6(traceC.lambdaHome - traceA.lambdaHome),
        lambdaAway: round6(traceC.lambdaAway - traceA.lambdaAway),
        expectedGoals: round6(traceC.expectedGoals - traceA.expectedGoals),
        range4Plus: round6(
          persistedC.prediction.goalRange.range4Plus -
            persistedA.prediction.goalRange.range4Plus,
        ),
      },
      flags,
    });
  }

  const sharedProfiles = Object.keys(profileCountsA).filter(
    (key) => profileCountsC[key] !== undefined,
  );
  const onlyA = Object.keys(profileCountsA).filter(
    (key) => profileCountsC[key] === undefined,
  );
  const onlyC = Object.keys(profileCountsC).filter(
    (key) => profileCountsA[key] === undefined,
  );

  const downstreamDifferenceMembers = members.filter(
    (member) =>
      member.flags.projectionChecksumDiffers ||
      member.flags.probabilityDiffers ||
      member.flags.lambdaDiffers ||
      member.flags.scriptsDiffers,
  );
  const discreteIdentityMembers = members.filter(
    (member) =>
      !member.flags.discreteWinnerDiffers && !member.flags.discreteGoalRangeDiffers,
  );

  const report = {
    ok: true,
    phase: "p2k-g3-validation-prediction-distribution-audit",
    governance: {
      architectureFreeze: "v0.3",
      productionMatchScript: GOVERNED_MATCH_SCRIPT_PARAMETER_SET.calibrationLabel,
      baselineLabel: MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET.calibrationLabel,
      candidateLabel: MATCH_SCRIPT_R1B_CANDIDATE_C_PARAMETER_SET.calibrationLabel,
      candidateProductionPromoted:
        R1B_MATCH_SCRIPT_CALIBRATION_GOVERNANCE.candidateC.productionPromoted,
      p2kHAuthorized: false,
      mutationPerformed: false,
      auditOnly: true,
    },
    inputs: {
      cohortId: COHORT_ID,
      membershipDigestSha256: cohort.membershipDigestSha256,
      baselineReplayRunId: BASELINE_RUN_ID,
      candidateReplayRunId: CANDIDATE_RUN_ID,
      evaluationRunId: EVALUATION_RUN_ID,
      evaluationPresent: evaluation !== undefined,
      memberCount: members.length,
      allMatchIdsInNamespace: members.every((member) =>
        member.matchId.startsWith(MATCH_ID_PREFIX),
      ),
    },
    coverage: {
      historyLoaded: members.length,
      sidecarLoaded: members.length,
      baselineSuccess: members.length,
      candidateSuccess: members.length,
      offlineReplayChecksumMatchA: offlineReplayMismatchA === 0,
      offlineReplayChecksumMatchC: offlineReplayMismatchC === 0,
      offlineReplayMismatchA,
      offlineReplayMismatchC,
      pipelineTrace:
        "History → Sidecar(Features/Rules/pins) → Football State → Match Script(A|C) → Projection(λ, matrix) → Sealed Prediction",
    },
    differentiationSummary: {
      projectionChecksumDiffCount,
      profileDiffCount,
      probabilityDiffCount,
      goalRangeMassDiffCount,
      discreteWinnerDiffCount,
      discreteGoalRangeDiffCount,
      lambdaDiffCount,
      scriptsDiffCount,
      footballStateSharedAcrossAC: members.every(
        (member) => member.flags.footballStateSame,
      ),
      confidenceCopiedFromHistory: members.every((member) => {
        const aConf = baselineByHistory.get(member.historyId).prediction
          .predictionConfidence;
        const cConf = candidateByHistory.get(member.historyId).prediction
          .predictionConfidence;
        return (
          member.flags.confidenceBandSame &&
          member.flags.predictionConfidenceSame &&
          nearlyEqual(member.historyConfidence.predictionConfidence, aConf) &&
          nearlyEqual(member.historyConfidence.predictionConfidence, cConf) &&
          member.historyConfidence.confidenceBand ===
            baselineByHistory.get(member.historyId).prediction.confidenceBand
        );
      }),
      maxAbsPHomeDelta: round6(maxAbsPHomeDelta),
      maxAbsLambdaHomeDelta: round6(maxAbsLambdaHomeDelta),
      maxAbsExpectedGoalsDelta: round6(maxAbsExpectedGoalsDelta),
      downstreamDifferenceMemberCount: downstreamDifferenceMembers.length,
      discreteIdentityMemberCount: discreteIdentityMembers.length,
      meanAbsPHomeDelta: round6(
        members.reduce((sum, member) => sum + Math.abs(member.deltas.pHome), 0) /
          members.length,
      ),
      meanAbsExpectedGoalsDelta: round6(
        members.reduce(
          (sum, member) => sum + Math.abs(member.deltas.expectedGoals),
          0,
        ) / members.length,
      ),
    },
    distributions: {
      predictedWinnerA: Object.fromEntries(sortedEntries(predictedWinnerA)),
      predictedWinnerC: Object.fromEntries(sortedEntries(predictedWinnerC)),
      predictedGoalRangeA: Object.fromEntries(sortedEntries(predictedRangeA)),
      predictedGoalRangeC: Object.fromEntries(sortedEntries(predictedRangeC)),
      actualWinner: Object.fromEntries(sortedEntries(actualWinner)),
      actualGoalRange: Object.fromEntries(sortedEntries(actualRange)),
      confidenceBand: Object.fromEntries(sortedEntries(confidenceBand)),
      expectedGoalsBinsA: Object.fromEntries(sortedEntries(lambdaBinsA)),
      expectedGoalsBinsC: Object.fromEntries(sortedEntries(lambdaBinsC)),
      dominantScriptA: Object.fromEntries(sortedEntries(topScriptIdA)),
      dominantScriptC: Object.fromEntries(sortedEntries(topScriptIdC)),
    },
    predictionProfiles: {
      distinctCountA: Object.keys(profileCountsA).length,
      distinctCountC: Object.keys(profileCountsC).length,
      sharedProfileCount: sharedProfiles.length,
      onlyInACount: onlyA.length,
      onlyInCCount: onlyC.length,
      countsA: Object.fromEntries(sortedEntries(profileCountsA)),
      countsC: Object.fromEntries(sortedEntries(profileCountsC)),
      profileDetailsA: Object.fromEntries(
        sortedEntries(profileCountsA).map(([key, count]) => [
          key,
          { count, ...profileToScriptsA[key] },
        ]),
      ),
      profileDetailsC: Object.fromEntries(
        sortedEntries(profileCountsC).map(([key, count]) => [
          key,
          { count, ...profileToScriptsC[key] },
        ]),
      ),
    },
    goalRangeDiagnosis: {
      predictedRange4PlusA: predictedRangeA.range4Plus ?? 0,
      predictedRange4PlusC: predictedRangeC.range4Plus ?? 0,
      actualRange4Plus: actualRange.range4Plus ?? 0,
      actualRange23: actualRange.range23 ?? 0,
      actualRange01: actualRange.range01 ?? 0,
      range4PlusDominatesCount,
      meanExpectedGoalsA: round6(
        members.reduce((sum, member) => sum + member.A.expectedGoals, 0) /
          members.length,
      ),
      meanExpectedGoalsC: round6(
        members.reduce((sum, member) => sum + member.C.expectedGoals, 0) /
          members.length,
      ),
      meanRange4PlusMassA: round6(
        members.reduce((sum, member) => sum + member.A.goalRange.range4Plus, 0) /
          members.length,
      ),
      meanRange4PlusMassC: round6(
        members.reduce((sum, member) => sum + member.C.goalRange.range4Plus, 0) /
          members.length,
      ),
      minExpectedGoalsA: Math.min(
        ...members.map((member) => member.A.expectedGoals),
      ),
      maxExpectedGoalsA: Math.max(
        ...members.map((member) => member.A.expectedGoals),
      ),
      membersNotRange4Plus: members
        .filter((member) => member.A.predictedGoalRange !== "range4Plus")
        .map((member) => ({
          matchId: member.matchId,
          predictedGoalRange: member.A.predictedGoalRange,
          expectedGoals: member.A.expectedGoals,
          goalRange: member.A.goalRange,
          topScripts: member.A.topScripts,
        })),
    },
    drawDiagnosis: {
      predictedDrawA: predictedWinnerA.draw ?? 0,
      predictedDrawC: predictedWinnerC.draw ?? 0,
      actualDraw: actualWinner.draw ?? 0,
      pDrawNeverArgmaxCountA: pDrawNeverMaxCount,
      maxPDrawA: round6(Math.max(...members.map((member) => member.A.pDraw))),
      maxPDrawC: round6(Math.max(...members.map((member) => member.C.pDraw))),
      meanPDrawA: round6(
        members.reduce((sum, member) => sum + member.A.pDraw, 0) / members.length,
      ),
      meanPDrawC: round6(
        members.reduce((sum, member) => sum + member.C.pDraw, 0) / members.length,
      ),
      meanPHomeA: round6(
        members.reduce((sum, member) => sum + member.A.pHome, 0) / members.length,
      ),
      meanPAwayA: round6(
        members.reduce((sum, member) => sum + member.A.pAway, 0) / members.length,
      ),
      closestDrawCandidates: [...members]
        .map((member) => ({
          matchId: member.matchId,
          pHome: member.A.pHome,
          pDraw: member.A.pDraw,
          pAway: member.A.pAway,
          marginVsDraw: round6(
            Math.min(
              member.A.pHome - member.A.pDraw,
              member.A.pAway - member.A.pDraw,
            ),
          ),
          predictedWinner: member.A.predictedWinner,
        }))
        .sort((left, right) => right.pDraw - left.pDraw)
        .slice(0, 5),
      note: "predictedWinnerFromProbs uses argmax(pHome,pDraw,pAway); draw requires pDraw >= both sides.",
    },
    candidateCEffectiveness: {
      distinctOfflineParameterArtifacts: new Set(
        members.flatMap((member) => [
          member.A.offlineParameterArtifactId,
          member.C.offlineParameterArtifactId,
        ]),
      ).size,
      allCandidateNonDefault: members.every(
        (member) =>
          member.C.isProductionDefault === false &&
          member.C.productionPromoted === false,
      ),
      allBaselineProductionDefault: members.every(
        (member) => member.A.isProductionDefault === true,
      ),
      scriptsChangedOnAnyMember: scriptsDiffCount > 0,
      lambdaChangedOnAnyMember: lambdaDiffCount > 0,
      probabilitiesChangedOnAnyMember: probabilityDiffCount > 0,
      discreteOutputsChangedOnAnyMember:
        discreteWinnerDiffCount > 0 || discreteGoalRangeDiffCount > 0,
      interpretation:
        scriptsDiffCount > 0 || lambdaDiffCount > 0 || probabilityDiffCount > 0
          ? "Candidate C reaches Match Script → Projection → continuous prediction outputs."
          : "Candidate C parameter override did not alter downstream continuous outputs.",
    },
    membersWithLargestContinuousDiff: [...members]
      .sort(
        (left, right) => Math.abs(right.deltas.pHome) - Math.abs(left.deltas.pHome),
      )
      .slice(0, 8)
      .map((member) => ({
        matchId: member.matchId,
        deltas: member.deltas,
        A: {
          winner: member.A.predictedWinner,
          range: member.A.predictedGoalRange,
          eg: member.A.expectedGoals,
          topScripts: member.A.topScripts,
        },
        C: {
          winner: member.C.predictedWinner,
          range: member.C.predictedGoalRange,
          eg: member.C.expectedGoals,
          topScripts: member.C.topScripts,
        },
        flags: member.flags,
      })),
    members,
  };

  console.log(JSON.stringify(report, null, 2));
  await db.lifecycle.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
