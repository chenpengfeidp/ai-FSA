import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import {
  buildLambdasV2,
  computeLambdas,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
} from "../src/index.js";

function makeFoundationEvidenceSet(matchId = createMatchId("match-xg-1")) {
  const makeSide = (side: "home" | "away", type: "STATISTICS" | "TEAM_FORM") => {
    if (type === "TEAM_FORM") {
      return createEvidence({
        id: `evidence-form-${side}`,
        source: "fixture",
        sourceId: `fixture-form-${side}`,
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
        payload: {
          teamSide: side,
          window: 5,
          results: ["W", "W", "D", "W", "L"],
          goalsFor: [2, 3, 1, 2, 0],
          goalsAgainst: [0, 1, 1, 1, 1],
        },
      });
    }

    return createEvidence({
      id: `evidence-stats-${side}`,
      source: "fixture",
      sourceId: `fixture-stats-${side}`,
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
      payload: {
        teamSide: side,
        windowMatches: 5,
        shotsForPerMatch: side === "home" ? 15 : 10,
        shotsAgainstPerMatch: side === "home" ? 9 : 14,
      },
    });
  };

  return Object.freeze([
    createEvidence({
      id: "evidence-1",
      source: "fixture",
      sourceId: "fixture-match-1",
      type: "MATCH_INFO",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        away: "Chelsea",
        home: "Liverpool",
        kickoff: "2026-08-01T19:30:00Z",
      },
    }),
    makeSide("home", "TEAM_FORM"),
    makeSide("away", "TEAM_FORM"),
    makeSide("home", "STATISTICS"),
    makeSide("away", "STATISTICS"),
  ]);
}

describe("Projection V2 feature-enriched lambda", () => {
  it("applies xG group contributions when EXPECTED_GOALS Evidence is present", () => {
    const matchId = createMatchId("match-xg-1");
    const withoutXg = new FeatureExtractor().extractBundle(
      makeFoundationEvidenceSet(matchId),
    );
    const withXg = new FeatureExtractor().extractBundle(
      Object.freeze([
        ...makeFoundationEvidenceSet(matchId),
        createEvidence({
          id: "evidence-xg-home",
          source: "fixture",
          sourceId: "fixture-xg-home",
          type: "EXPECTED_GOALS",
          matchId,
          collectedAt: "2026-07-17T10:00:00Z",
          eventTime: "2026-08-01T19:30:00Z",
          freshness: "fresh",
          quality: "unverified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method: "fixture",
          },
          payload: {
            teamSide: "home",
            window: "overall",
            metrics: { xg: 2.6, xga: 0.6 },
          },
        }),
        createEvidence({
          id: "evidence-xg-away",
          source: "fixture",
          sourceId: "fixture-xg-away",
          type: "EXPECTED_GOALS",
          matchId,
          collectedAt: "2026-07-17T10:00:00Z",
          eventTime: "2026-08-01T19:30:00Z",
          freshness: "fresh",
          quality: "unverified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method: "fixture",
          },
          payload: {
            teamSide: "away",
            window: "overall",
            metrics: { xg: 0.7, xga: 2.2 },
          },
        }),
      ]),
    );
    const baseline = buildLambdasV2({
      featureBundle: withoutXg,
      parameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const enriched = buildLambdasV2({
      featureBundle: withXg,
      parameters: FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda,
    });
    const features = new Map(
      withXg.features.map((feature) => [feature.name, feature]),
    );
    const v1 = computeLambdas({
      attackRatingHome: features.get("attackRatingHome")?.value as number,
      defenseRatingAway: features.get("defenseRatingAway")?.value as number,
      attackRatingAway: features.get("attackRatingAway")?.value as number,
      defenseRatingHome: features.get("defenseRatingHome")?.value as number,
      homeAdvantage: features.get("homeAdvantage")?.value as number,
    });

    expect(enriched.groupContributions.some((entry) => entry.group === "xg")).toBe(
      true,
    );
    expect(enriched.lambdaHome).not.toBeCloseTo(baseline.lambdaHome, 4);
    expect(enriched.lambdaHome).not.toBeCloseTo(v1.lambdaHome, 4);
  });

  it("governs all coefficients through ProjectionParameterArtifact", () => {
    const artifact = FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.lambda;

    expect(artifact.baseRate).toBe(1.3);
    expect(artifact.featureWeights.length).toBeGreaterThan(0);
    expect(
      artifact.featureWeights.every((entry) => entry.weight !== undefined),
    ).toBe(true);
  });
});
