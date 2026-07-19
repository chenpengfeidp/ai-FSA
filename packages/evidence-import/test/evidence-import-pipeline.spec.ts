import {
  createEvidence,
  type Evidence,
  type EvidenceRepository,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { normalizeFixtureEvidence } from "@fas/evidence-normalizer";
import { describe, expect, it, vi } from "vitest";
import {
  EvidenceImportPipeline,
  type EvidenceImportResult,
  type EvidenceNormalizer,
} from "../src/index.js";

const evidence = createEvidence({
  id: "evidence-import-test",
  source: "fixture",
  sourceId: "fixture-import-test",
  type: "MATCH_INFO",
  collectedAt: "2026-07-17T09:00:00Z",
  eventTime: "2026-08-01T19:30:00Z",
  freshness: "fresh",
  quality: "unverified",
  provenance: {
    collector: "@fas/evidence-import",
    method: "test",
  },
  payload: {
    home: "Liverpool",
    away: "Chelsea",
    kickoff: "2026-08-01T19:30:00Z",
  },
});

function requireImportedEvidence(result: EvidenceImportResult): Evidence {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected successful import: ${result.error.code}`);
  }

  return result.value;
}

describe("EvidenceImportPipeline", () => {
  it("imports fixture data through a bound normalizer without provider coupling", async () => {
    const repository = new InMemoryEvidenceRepository();
    const pipeline = new EvidenceImportPipeline(
      {
        normalize: (input) =>
          normalizeFixtureEvidence(input, {
            evidenceId: "evidence-fixture-import",
            sourceId: "fixture-match-example",
            collectedAt: "2026-07-17T09:00:00Z",
          }),
      },
      repository,
    );

    const result = await pipeline.importEvidence({
      matchId: "match-example",
      home: "Liverpool",
      away: "Chelsea",
      kickoff: "2026-08-01T19:30:00Z",
    });
    const importedEvidence = requireImportedEvidence(result);

    expect(importedEvidence.type).toBe("MATCH_INFO");
    expect(importedEvidence.matchId).toBe("match-example");
    await expect(repository.findById(importedEvidence.id)).resolves.toBe(
      importedEvidence,
    );
  });

  it("delegates unknown input to the normalizer and persists its Evidence", async () => {
    const input: unknown = {
      providerSpecific: true,
    };
    const normalize = vi.fn((_input: unknown) => ({
      ok: true as const,
      value: evidence,
    }));
    const repository = new InMemoryEvidenceRepository();
    const pipeline = new EvidenceImportPipeline({ normalize }, repository);

    const result = await pipeline.importEvidence(input);

    expect(requireImportedEvidence(result)).toBe(evidence);
    expect(normalize).toHaveBeenCalledOnce();
    expect(normalize).toHaveBeenCalledWith(input);
    await expect(repository.findById(evidence.id)).resolves.toBe(evidence);
  });

  it("returns a typed failure for malformed provider payload", async () => {
    const normalizer: EvidenceNormalizer = {
      normalize: () => ({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Input must be an object.",
        },
      }),
    };
    const pipeline = new EvidenceImportPipeline(normalizer);

    await expect(pipeline.importEvidence(null)).resolves.toEqual({
      ok: false,
      error: {
        code: "NORMALIZATION_FAILED",
        message: "Evidence normalization failed.",
        normalizerError: {
          code: "INVALID_INPUT",
          message: "Input must be an object.",
        },
      },
    });
  });

  it("preserves typed normalizer failure details", async () => {
    const normalizer: EvidenceNormalizer = {
      normalize: () => ({
        ok: false,
        error: {
          code: "INVALID_FIELD",
          field: "kickoff",
          message: "kickoff is invalid.",
        },
      }),
    };
    const pipeline = new EvidenceImportPipeline(normalizer);
    const result = await pipeline.importEvidence({});

    expect(result).toEqual({
      ok: false,
      error: {
        code: "NORMALIZATION_FAILED",
        message: "Evidence normalization failed.",
        normalizerError: {
          code: "INVALID_FIELD",
          field: "kickoff",
          message: "kickoff is invalid.",
        },
      },
    });
    expect(!result.ok && Object.isFrozen(result.error.normalizerError)).toBe(true);
  });

  it("returns a duplicate failure without overwriting repository state", async () => {
    const repository = new InMemoryEvidenceRepository();
    await repository.save(evidence);
    const pipeline = new EvidenceImportPipeline(
      {
        normalize: () => ({ ok: true, value: evidence }),
      },
      repository,
    );

    await expect(pipeline.importEvidence({})).resolves.toEqual({
      ok: false,
      error: {
        code: "DUPLICATE_EVIDENCE",
        message: `Evidence "${evidence.id}" already exists.`,
      },
    });
    await expect(repository.findById(evidence.id)).resolves.toBe(evidence);
  });

  it("converts repository runtime exceptions into typed failures", async () => {
    const repository: EvidenceRepository = {
      findAll: () => Promise.resolve([]),
      findById: () => Promise.resolve(undefined),
      save: () => Promise.reject(new Error("repository unavailable")),
    };
    const pipeline = new EvidenceImportPipeline(
      {
        normalize: () => ({ ok: true, value: evidence }),
      },
      repository,
    );

    await expect(pipeline.importEvidence({})).resolves.toEqual({
      ok: false,
      error: {
        code: "REPOSITORY_FAILED",
        message: "Evidence repository persistence failed.",
      },
    });
  });

  it("imports successfully when the repository is omitted", async () => {
    const pipeline = new EvidenceImportPipeline({
      normalize: () => ({ ok: true, value: evidence }),
    });

    expect(requireImportedEvidence(await pipeline.importEvidence({}))).toBe(
      evidence,
    );
  });

  it("does not mutate input and returns immutable results", async () => {
    const input = {
      nested: {
        providerValue: "unchanged",
      },
    };
    const snapshot = structuredClone(input);
    const pipeline = new EvidenceImportPipeline({
      normalize: () => ({ ok: true, value: evidence }),
    });

    const result = await pipeline.importEvidence(input);
    const importedEvidence = requireImportedEvidence(result);

    expect(input).toEqual(snapshot);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.nested)).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(importedEvidence)).toBe(true);
    expect(Object.isFrozen(importedEvidence.payload)).toBe(true);
  });

  it("converts unexpected normalizer exceptions into typed failures", async () => {
    const pipeline = new EvidenceImportPipeline({
      normalize: () => {
        throw new Error("unexpected normalizer failure");
      },
    });

    await expect(pipeline.importEvidence({})).resolves.toEqual({
      ok: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Evidence normalization failed unexpectedly.",
      },
    });
  });
});
