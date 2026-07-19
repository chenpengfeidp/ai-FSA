import { ImportMatchUseCase } from "@fas/application";
import {
  createEvidence,
  type Evidence,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { EvidenceImportPipeline } from "@fas/evidence-import";
import { FixtureEvidenceNormalizer } from "@fas/evidence-normalizer";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor, type FeatureBundle } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { FixtureProvider } from "@fas/provider-fixture";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it, vi } from "vitest";
import {
  AnalyzeMatchUseCase,
  type EvidenceByMatchQuery,
  type FeatureExtractionOperation,
  type MatchImportOperation,
  type RuleEvaluationOperation,
} from "../src/index.js";

function makeEvidence(): Evidence {
  return createEvidence({
    id: "evidence-1",
    source: "fixture",
    sourceId: "fixture-match-1",
    type: "MATCH_INFO",
    matchId: createMatchId("match-1"),
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

function createUseCase(
  importMatch: MatchImportOperation,
  evidenceQuery: EvidenceByMatchQuery,
  featureExtractor: FeatureExtractionOperation = new FeatureExtractor(),
  ruleEvaluator: RuleEvaluationOperation = new RuleEvaluator(),
): AnalyzeMatchUseCase {
  return new AnalyzeMatchUseCase(
    importMatch,
    evidenceQuery,
    featureExtractor,
    ruleEvaluator,
  );
}

describe("AnalyzeMatchUseCase", () => {
  it("coordinates the complete deterministic analysis workflow", () => {
    const repository = new InMemoryEvidenceRepository();
    const normalizer = new FixtureEvidenceNormalizer({
      evidenceId: "evidence-fixture-match-example",
      sourceId: "fixture-match-example",
      collectedAt: "2026-07-17T10:00:00Z",
    });
    const importer = new EvidenceImportPipeline(normalizer, repository);
    const importMatch = new ImportMatchUseCase(new FixtureProvider(), importer);
    const useCase = createUseCase(importMatch, new EvidenceQueryService(repository));

    const result = useCase.execute(createMatchId("match-example"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.matchId).toBe("match-example");
      expect(result.value.evidence.type).toBe("MATCH_INFO");
      expect(result.value.evidenceSet).toHaveLength(7);
      expect(result.value.features.map(({ name }) => name)).toEqual(
        expect.arrayContaining([
          "homeTeam",
          "awayTeam",
          "kickoff",
          "attackRatingHome",
          "homeAdvantage",
          "h2hLean",
          "h2hSampleSize",
          "marketLean",
          "marketImpliedHome",
        ]),
      );
      expect(result.value.projection.status).toBe("completed_nonempty");
      expect(
        result.value.projection.pHome +
          result.value.projection.pDraw +
          result.value.projection.pAway,
      ).toBeCloseTo(1, 9);
    }
  });

  it("calls injected operations in workflow order", () => {
    const evidence = makeEvidence();
    const calls: string[] = [];
    const importMatch: MatchImportOperation = {
      execute: vi.fn(() => {
        calls.push("import");
        return { ok: true, value: evidence };
      }),
    };
    const evidenceQuery: EvidenceByMatchQuery = {
      findByMatch: vi.fn(() => {
        calls.push("query");
        return { ok: true, value: Object.freeze([evidence]) };
      }),
    };
    const extractor = new FeatureExtractor();
    const featureExtractor: FeatureExtractionOperation = {
      extractBundle: vi.fn((input) => {
        calls.push("extract");
        return extractor.extractBundle(input);
      }),
    };
    const evaluator = new RuleEvaluator();
    const ruleEvaluator: RuleEvaluationOperation = {
      evaluate: vi.fn((features) => {
        calls.push("evaluate");
        return evaluator.evaluate(features);
      }),
    };
    const useCase = createUseCase(
      importMatch,
      evidenceQuery,
      featureExtractor,
      ruleEvaluator,
    );

    const result = useCase.execute(createMatchId("match-1"));

    expect(calls).toEqual(["import", "query", "extract", "evaluate"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.projection.status).toBe("blocked");
    }
  });

  it("maps import failure", () => {
    const useCase = createUseCase(
      {
        execute: () =>
          Object.freeze({
            ok: false,
            error: Object.freeze({
              code: "MATCH_NOT_FOUND",
              message: "missing",
            }),
          }),
      },
      {
        findByMatch: () => Object.freeze({ ok: true, value: Object.freeze([]) }),
      },
    );

    const result = useCase.execute(createMatchId("match-1"));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "IMPORT_FAILED" },
    });
  });

  it("maps missing MATCH_INFO after query", () => {
    const useCase = createUseCase(
      {
        execute: () =>
          Object.freeze({
            ok: true,
            value: makeEvidence(),
          }),
      },
      {
        findByMatch: () => Object.freeze({ ok: true, value: Object.freeze([]) }),
      },
    );

    const result = useCase.execute(createMatchId("match-1"));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "EVIDENCE_NOT_FOUND" },
    });
  });

  it("maps feature extraction failure", () => {
    const evidence = makeEvidence();
    const useCase = createUseCase(
      {
        execute: () => Object.freeze({ ok: true, value: evidence }),
      },
      {
        findByMatch: () =>
          Object.freeze({ ok: true, value: Object.freeze([evidence]) }),
      },
      {
        extractBundle: () => {
          throw new Error("boom");
        },
      },
    );

    const result = useCase.execute(createMatchId("match-1"));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "FEATURE_EXTRACTION_FAILED" },
    });
  });

  it("maps rule evaluation failure", () => {
    const evidence = makeEvidence();
    const bundle: FeatureBundle = new FeatureExtractor().extractBundle([evidence]);
    const useCase = createUseCase(
      {
        execute: () => Object.freeze({ ok: true, value: evidence }),
      },
      {
        findByMatch: () =>
          Object.freeze({ ok: true, value: Object.freeze([evidence]) }),
      },
      {
        extractBundle: () => bundle,
      },
      {
        evaluate: () => {
          throw new Error("boom");
        },
      },
    );

    const result = useCase.execute(createMatchId("match-1"));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "RULE_EVALUATION_FAILED" },
    });
  });
});
