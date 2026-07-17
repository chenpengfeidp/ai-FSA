import { createEvidence } from "@fas/evidence";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it } from "vitest";
import {
  createAnalysisResult,
  AnalysisResultValidationError,
} from "../src/index.js";

function makeEvidence(matchId = createMatchId("match-1")) {
  return createEvidence({
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
  });
}

describe("AnalysisResult", () => {
  it("creates an immutable result with immutable collection snapshots", () => {
    const matchId = createMatchId("match-1");
    const evidence = makeEvidence(matchId);
    const features = [...new FeatureExtractor().extract(evidence)];
    const ruleResults = [...new RuleEvaluator().evaluate(features)];

    const result = createAnalysisResult({
      matchId,
      evidence,
      features,
      ruleResults,
      generatedAt: "2026-07-17T10:00:00Z",
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.features)).toBe(true);
    expect(Object.isFrozen(result.ruleResults)).toBe(true);
    features.length = 0;
    ruleResults.length = 0;
    expect(result.features).toHaveLength(3);
    expect(result.ruleResults).toHaveLength(3);
  });

  it("rejects empty Feature or RuleResult collections", () => {
    const matchId = createMatchId("match-1");
    const evidence = makeEvidence(matchId);
    const features = new FeatureExtractor().extract(evidence);
    const ruleResults = new RuleEvaluator().evaluate(features);

    expect(() =>
      createAnalysisResult({
        matchId,
        evidence,
        features: [],
        ruleResults,
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ).toThrow(AnalysisResultValidationError);
    expect(() =>
      createAnalysisResult({
        matchId,
        evidence,
        features,
        ruleResults: [],
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ).toThrow(AnalysisResultValidationError);
  });

  it("rejects mismatched Match identities", () => {
    const matchId = createMatchId("match-1");
    const evidence = makeEvidence(createMatchId("match-2"));
    const features = new FeatureExtractor().extract(evidence);
    const ruleResults = new RuleEvaluator().evaluate(features);

    expect(() =>
      createAnalysisResult({
        matchId,
        evidence,
        features,
        ruleResults,
        generatedAt: "2026-07-17T10:00:00Z",
      }),
    ).toThrow(AnalysisResultValidationError);
  });

  it("rejects an invalid generatedAt timestamp", () => {
    const matchId = createMatchId("match-1");
    const evidence = makeEvidence(matchId);
    const features = new FeatureExtractor().extract(evidence);
    const ruleResults = new RuleEvaluator().evaluate(features);

    expect(() =>
      createAnalysisResult({
        matchId,
        evidence,
        features,
        ruleResults,
        generatedAt: "invalid",
      }),
    ).toThrow(AnalysisResultValidationError);
  });
});
