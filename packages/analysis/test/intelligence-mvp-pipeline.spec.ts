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
import { AnalyzeMatchUseCase } from "../src/index.js";

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
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "fixture",
    },
    payload,
  });
}

function mvpEvidenceSet(matchId: MatchId): readonly Evidence[] {
  const form = (side: "away" | "home", results: readonly ("D" | "L" | "W")[]) =>
    baseEvidence(`evidence-form-${side}`, "TEAM_FORM", matchId, {
      teamSide: side,
      results,
      goalsFor: [2, 1, 1, 2, 0],
      goalsAgainst: [0, 1, 1, 0, 2],
    });
  const stats = (side: "away" | "home") =>
    baseEvidence(`evidence-stats-${side}`, "STATISTICS", matchId, {
      teamSide: side,
      windowMatches: 5,
      shotsForPerMatch: side === "home" ? 14 : 10,
      shotsAgainstPerMatch: side === "home" ? 9 : 13,
      xgForPerMatch: side === "home" ? 1.6 : 1.1,
      xgAgainstPerMatch: side === "home" ? 1.0 : 1.5,
    });

  return Object.freeze([
    baseEvidence("evidence-match", "MATCH_INFO", matchId, {
      home: "Home FC",
      away: "Away United",
      kickoff: "2026-08-01T19:30:00Z",
    }),
    form("home", ["W", "W", "D", "W", "W"]),
    form("away", ["L", "D", "L", "L", "W"]),
    stats("home"),
    stats("away"),
    baseEvidence("evidence-venue", "VENUE", matchId, {
      name: "Home Park",
      city: "Home City",
    }),
    baseEvidence("evidence-injury-home", "INJURY", matchId, {
      teamSide: "home",
      playerName: "Key Midfielder",
      status: "out",
    }),
  ]);
}

describe("Football Intelligence MVP pipeline", () => {
  it("executes Evidence→Feature→Rule→Projection→Scenario→Confidence via AnalyzeMatchUseCase", async () => {
    const matchId = createMatchId("match-intelligence-mvp");
    const evidences = mvpEvidenceSet(matchId);
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
    );

    const analysis = await analyzeMatch.execute(matchId);
    expect(analysis.ok).toBe(true);
    if (!analysis.ok) {
      return;
    }

    const featureNames = analysis.value.features.map((feature) => feature.name);
    expect(featureNames).toEqual(
      expect.arrayContaining([
        "venueAdvantage",
        "recentFormHome",
        "recentFormAway",
        "availabilityPenaltyHome",
      ]),
    );

    const ruleNames = analysis.value.ruleResults
      .filter((rule) => rule.status === "PASS")
      .map((rule) => rule.ruleName);
    expect(ruleNames).toEqual(
      expect.arrayContaining([
        "VENUE_SUPPORTS_HOME",
        "FORM_HOME_SUPERIOR",
        "AVAILABILITY_HOME_HIT",
      ]),
    );

    const { projection, scenarios, intelligenceConfidence } = analysis.value;
    expect(projection.pHome + projection.pDraw + projection.pAway).toBeCloseTo(1, 9);
    expect(scenarios.mostLikely.slot).toBe("mostLikely");
    expect(scenarios.secondLikely.slot).toBe("secondLikely");
    expect(scenarios.upset.slot).toBe("upset");
    expect(typeof intelligenceConfidence.predictionConfidence).toBe("number");
    expect(intelligenceConfidence.evidenceCompleteness).toBeGreaterThan(0);
  });
});
