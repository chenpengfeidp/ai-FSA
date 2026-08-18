import {
  createEvidence,
  type Evidence,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId, type MatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  AnalyzeMatchUseCase,
  buildSealedPredictionInputFromAnalysis,
  computeFootballState,
  computeMatchProjection,
  createFootballStateReportMetadata,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  PROJECTION_MODEL_VERSION,
} from "../src/index.js";

function baseEvidence(
  id: string,
  type: Evidence["type"],
  matchId: MatchId,
  payload: Evidence["payload"],
): Evidence {
  return createEvidence({
    id,
    source: "fixture",
    sourceId: `${id}-source`,
    type,
    matchId,
    collectedAt: "2026-07-17T10:00:00Z",
    eventTime: "2026-08-01T19:30:00Z",
    freshness: "fresh",
    quality: "verified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "fixture",
    },
    payload,
  });
}

function coreEvidenceSet(matchId: MatchId): Evidence[] {
  const form = (side: "away" | "home") =>
    baseEvidence(`evidence-form-${side}`, "TEAM_FORM", matchId, {
      teamSide: side,
      window: 5,
      results: ["W", "W", "D", "W", "L"],
      goalsFor: [2, 3, 1, 2, 0],
      goalsAgainst: [0, 1, 1, 1, 1],
    });
  const stats = (side: "away" | "home") =>
    baseEvidence(`evidence-stats-${side}`, "STATISTICS", matchId, {
      teamSide: side,
      windowMatches: 5,
      shotsForPerMatch: side === "home" ? 15 : 10,
      shotsAgainstPerMatch: side === "home" ? 9 : 14,
      xgForPerMatch: side === "home" ? 1.8 : 1.0,
      xgAgainstPerMatch: side === "home" ? 1.0 : 1.7,
    });

  return [
    baseEvidence("evidence-match", "MATCH_INFO", matchId, {
      home: "Home FC",
      away: "Away United",
      kickoff: "2026-08-01T19:30:00Z",
    }),
    form("home"),
    form("away"),
    stats("home"),
    stats("away"),
  ];
}

function managerEvidence(
  matchId: MatchId,
  side: "away" | "home",
  input: {
    readonly tenureDays: number;
    readonly age?: number;
    readonly previousClubs?: readonly string[];
    readonly interimManagerStatus?: string;
  },
): Evidence {
  return baseEvidence(`evidence-manager-${side}`, "MANAGER_INTELLIGENCE", matchId, {
    teamId: `${side}-team`,
    teamName: side === "home" ? "Home FC" : "Away United",
    teamSide: side,
    managerName: side === "home" ? "Stable Coach" : "Interim Coach",
    ...(input.age === undefined ? {} : { age: input.age }),
    tenureDays: input.tenureDays,
    ...(input.previousClubs === undefined
      ? {}
      : { previousClubs: Object.freeze([...input.previousClubs]) }),
    matchManagerConfirmed: true,
    ...(input.interimManagerStatus === undefined
      ? {}
      : { interimManagerStatus: input.interimManagerStatus }),
    observedAt: "2026-07-17T10:00:00Z",
  });
}

async function analyzeWithEvidence(
  matchId: MatchId,
  evidences: readonly Evidence[],
) {
  const repository = new InMemoryEvidenceRepository();
  for (const evidence of evidences) {
    await repository.save(evidence);
  }

  const analyzeMatch = new AnalyzeMatchUseCase(
    {
      execute: async () =>
        Object.freeze({
          ok: true,
          value: evidences[0] as Evidence,
        }),
    },
    new EvidenceQueryService(repository),
    new FeatureExtractor(),
    new RuleEvaluator(),
    undefined,
    "v2",
  );

  const result = await analyzeMatch.execute(matchId);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("analyzeMatch failed");
  }

  return result.value;
}

describe("M1B Manager Intelligence end-to-end pipeline", () => {
  it("omits Manager Features and marks Manager Rules INAPPLICABLE when Evidence is absent", async () => {
    const matchId = createMatchId("match-m1b-absent");
    const analysis = await analyzeWithEvidence(matchId, coreEvidenceSet(matchId));

    const managerFeatureNames = analysis.features
      .map((feature) => feature.name)
      .filter((name) => name.startsWith("manager"));
    expect(managerFeatureNames).toEqual([]);

    const managerRules = analysis.ruleResults.filter((rule) =>
      rule.ruleName.startsWith("MANAGER_"),
    );
    expect(managerRules.length).toBeGreaterThan(0);
    for (const rule of managerRules) {
      expect(rule.status).toBe("INAPPLICABLE");
    }

    const footballState = computeFootballState({
      featureBundle: analysis.featureBundle,
      lambdaParameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const report = createFootballStateReportMetadata(footballState);
    const managerRefs = report.dimensions.flatMap((dimension) =>
      dimension.sourceRefs.filter((ref) => ref.startsWith("manager")),
    );
    expect(managerRefs).toEqual([]);
  });

  it("runs MANAGER_INTELLIGENCE → Features → Rules → Football State → Match Script → Projection V2 → Sealed Prediction", async () => {
    const matchId = createMatchId("match-m1b-present");
    const baselineEvidences = coreEvidenceSet(matchId);
    const withManager = Object.freeze([
      ...baselineEvidences,
      managerEvidence(matchId, "home", {
        tenureDays: 900,
        age: 55,
        previousClubs: ["Club A", "Club B"],
      }),
      managerEvidence(matchId, "away", {
        tenureDays: 45,
        age: 38,
        previousClubs: ["A", "B", "C", "D", "E", "F"],
        interimManagerStatus: "interim",
      }),
    ]);

    const baselineAnalysis = await analyzeWithEvidence(
      createMatchId("match-m1b-baseline"),
      coreEvidenceSet(createMatchId("match-m1b-baseline")),
    );
    const managerAnalysis = await analyzeWithEvidence(matchId, withManager);

    expect(managerAnalysis.featureBundle.featureModelVersion).toBe(
      "feature.v2.m1b.manager",
    );
    expect(managerAnalysis.projection.projectionModelVersion).toBe(
      PROJECTION_MODEL_VERSION,
    );

    const managerFeatures = managerAnalysis.features.filter((feature) =>
      feature.name.startsWith("manager"),
    );
    expect(managerFeatures.length).toBeGreaterThanOrEqual(8);
    for (const feature of managerFeatures) {
      expect(feature.sourceEvidenceId).toMatch(/^evidence-manager-/);
    }

    const stabilityEdge = managerAnalysis.ruleResults.find(
      (rule) => rule.ruleName === "MANAGER_STABILITY_EDGE",
    );
    expect(stabilityEdge?.status).toBe("PASS");

    const footballState = computeFootballState({
      featureBundle: managerAnalysis.featureBundle,
      lambdaParameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const pressureRefs = footballState.dimensions.pressureState.sourceRefs;
    const riskRefs = footballState.dimensions.riskState.sourceRefs;
    expect(
      pressureRefs.some((ref) => ref.startsWith("managerTenureStability")),
    ).toBe(true);
    expect(riskRefs.some((ref) => ref.startsWith("managerChangeRisk"))).toBe(true);

    const projection = computeMatchProjection({
      featureBundle: managerAnalysis.featureBundle,
      ruleResults: managerAnalysis.ruleResults,
      requiredEvidencePresentCount: withManager.length,
      projectionPolicyPin: "v2",
    });
    expect(
      projection.projectionFramework?.activeMatchScripts.length,
    ).toBeGreaterThan(0);
    expect(projection.projection.status).toBe("completed_nonempty");
    expect(
      projection.projection.pHome +
        projection.projection.pDraw +
        projection.projection.pAway,
    ).toBeCloseTo(1, 9);

    const sealed = buildSealedPredictionInputFromAnalysis(managerAnalysis);
    expect(sealed.ruleSetVersion).toBe("rule.mvp.m1b.manager");
    expect(sealed.featureNames.some((name) => name.startsWith("manager"))).toBe(
      true,
    );
    expect(
      sealed.rules.some((rule) => rule.ruleName === "MANAGER_STABILITY_EDGE"),
    ).toBe(true);

    expect(managerAnalysis.projection.checksum).not.toBe(
      baselineAnalysis.projection.checksum,
    );
  });
});
