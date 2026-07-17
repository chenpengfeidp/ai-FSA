import { ImportMatchUseCase } from "@fas/application";
import {
  createEvidence,
  type Evidence,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { EvidenceImportPipeline } from "@fas/evidence-import";
import { FixtureEvidenceNormalizer } from "@fas/evidence-normalizer";
import { EvidenceQueryService } from "@fas/evidence-query";
import { FeatureExtractor } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { FixtureProvider } from "@fas/provider-fixture";
import { RuleEvaluator } from "@fas/rule";
import { describe, expect, it, vi } from "vitest";
import {
  AnalyzeMatchUseCase,
  type EvidenceByIdQuery,
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
  evidenceQuery: EvidenceByIdQuery,
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

    expect(result).toMatchObject({
      ok: true,
      value: {
        matchId: "match-example",
        evidence: {
          id: "evidence-fixture-match-example",
          type: "MATCH_INFO",
        },
        generatedAt: "2026-07-17T10:00:00Z",
      },
    });
    if (result.ok) {
      expect(result.value.features.map(({ name }) => name)).toEqual([
        "homeTeam",
        "awayTeam",
        "kickoff",
      ]);
      expect(result.value.ruleResults.every(({ status }) => status === "PASS")).toBe(
        true,
      );
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
    const evidenceQuery: EvidenceByIdQuery = {
      findById: vi.fn(() => {
        calls.push("query");
        return { ok: true, value: evidence };
      }),
    };
    const extractor = new FeatureExtractor();
    const featureExtractor: FeatureExtractionOperation = {
      extract: vi.fn((input) => {
        calls.push("extract");
        return extractor.extract(input);
      }),
    };
    const evaluator = new RuleEvaluator();
    const ruleEvaluator: RuleEvaluationOperation = {
      evaluate: vi.fn((features) => {
        calls.push("evaluate");
        return evaluator.evaluate(features);
      }),
    };

    const result = createUseCase(
      importMatch,
      evidenceQuery,
      featureExtractor,
      ruleEvaluator,
    ).execute(createMatchId("match-1"));

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["import", "query", "extract", "evaluate"]);
  });

  it("returns immutable and deterministic Analysis results", () => {
    const evidence = makeEvidence();
    const useCase = createUseCase(
      { execute: () => ({ ok: true, value: evidence }) },
      { findById: () => ({ ok: true, value: evidence }) },
    );

    const first = useCase.execute(createMatchId("match-1"));
    const second = useCase.execute(createMatchId("match-1"));

    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    if (first.ok) {
      expect(Object.isFrozen(first.value)).toBe(true);
      expect(Object.isFrozen(first.value.features)).toBe(true);
      expect(Object.isFrozen(first.value.ruleResults)).toBe(true);
    }
  });

  it("preserves typed import failures", () => {
    const useCase = createUseCase(
      {
        execute: () => ({
          ok: false,
          error: {
            code: "MATCH_NOT_FOUND",
            message: 'Match "match-missing" was not found.',
          },
        }),
      },
      { findById: () => ({ ok: true, value: undefined }) },
    );

    expect(useCase.execute(createMatchId("match-missing"))).toEqual({
      error: {
        cause: {
          code: "MATCH_NOT_FOUND",
          message: 'Match "match-missing" was not found.',
        },
        code: "IMPORT_FAILED",
        message: "Match import failed.",
      },
      ok: false,
    });
  });

  it("preserves typed Evidence query failures", () => {
    const evidence = makeEvidence();
    const useCase = createUseCase(
      { execute: () => ({ ok: true, value: evidence }) },
      {
        findById: () => ({
          ok: false,
          error: {
            code: "REPOSITORY_FAILED",
            message: "Evidence repository query failed.",
          },
        }),
      },
    );

    expect(useCase.execute(createMatchId("match-1"))).toEqual({
      error: {
        cause: {
          code: "REPOSITORY_FAILED",
          message: "Evidence repository query failed.",
        },
        code: "EVIDENCE_QUERY_FAILED",
        message: "Evidence query failed.",
      },
      ok: false,
    });
  });

  it("fails explicitly when imported Evidence cannot be queried", () => {
    const evidence = makeEvidence();
    const useCase = createUseCase(
      { execute: () => ({ ok: true, value: evidence }) },
      { findById: () => ({ ok: true, value: undefined }) },
    );

    expect(useCase.execute(createMatchId("match-1"))).toEqual({
      error: {
        code: "EVIDENCE_NOT_FOUND",
        message: 'Imported Evidence "evidence-1" was not found.',
      },
      ok: false,
    });
  });

  it("converts unexpected import and query exceptions", () => {
    const evidence = makeEvidence();
    const importFailure = createUseCase(
      {
        execute: () => {
          throw new Error("import failed");
        },
      },
      { findById: () => ({ ok: true, value: evidence }) },
    );
    const queryFailure = createUseCase(
      { execute: () => ({ ok: true, value: evidence }) },
      {
        findById: () => {
          throw new Error("query failed");
        },
      },
    );

    expect(() => importFailure.execute(createMatchId("match-1"))).not.toThrow();
    expect(importFailure.execute(createMatchId("match-1"))).toMatchObject({
      error: { code: "IMPORT_FAILED" },
      ok: false,
    });
    expect(() => queryFailure.execute(createMatchId("match-1"))).not.toThrow();
    expect(queryFailure.execute(createMatchId("match-1"))).toMatchObject({
      error: { code: "EVIDENCE_QUERY_FAILED" },
      ok: false,
    });
  });

  it("converts Feature extraction and Rule evaluation exceptions", () => {
    const evidence = makeEvidence();
    const extractionFailure = createUseCase(
      { execute: () => ({ ok: true, value: evidence }) },
      { findById: () => ({ ok: true, value: evidence }) },
      {
        extract: () => {
          throw new Error("extraction failed");
        },
      },
    );
    const evaluationFailure = createUseCase(
      { execute: () => ({ ok: true, value: evidence }) },
      { findById: () => ({ ok: true, value: evidence }) },
      new FeatureExtractor(),
      {
        evaluate: () => {
          throw new Error("evaluation failed");
        },
      },
    );

    expect(extractionFailure.execute(createMatchId("match-1"))).toMatchObject({
      error: { code: "FEATURE_EXTRACTION_FAILED" },
      ok: false,
    });
    expect(evaluationFailure.execute(createMatchId("match-1"))).toMatchObject({
      error: { code: "RULE_EVALUATION_FAILED" },
      ok: false,
    });
  });

  it("never modifies queried Evidence", () => {
    const evidence = makeEvidence();
    const snapshot = JSON.stringify(evidence);
    const useCase = createUseCase(
      { execute: () => ({ ok: true, value: evidence }) },
      { findById: () => ({ ok: true, value: evidence }) },
    );

    useCase.execute(createMatchId("match-1"));

    expect(JSON.stringify(evidence)).toBe(snapshot);
  });
});
