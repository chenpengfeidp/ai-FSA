import {
  createEvidence,
  type Evidence,
  type EvidenceRepository,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { EvidenceImportPipeline } from "@fas/evidence-import";
import { FixtureEvidenceNormalizer } from "@fas/evidence-normalizer";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  CompositeMatchProvider,
  RecordedOddsSnapshotSource,
} from "@fas/provider-odds";
import { describe, expect, it, vi } from "vitest";
import { ImportMatchUseCase, type ImportMatchResult } from "../src/index.js";

const evidence = createEvidence({
  id: "evidence-application-test",
  source: "fixture",
  sourceId: "fixture-match-example",
  type: "MATCH_INFO",
  collectedAt: "2026-07-17T09:00:00Z",
  eventTime: "2026-08-01T19:30:00Z",
  freshness: "fresh",
  quality: "unverified",
  provenance: {
    collector: "@fas/application",
    method: "test",
  },
  payload: {
    home: "Liverpool",
    away: "Chelsea",
    kickoff: "2026-08-01T19:30:00Z",
  },
});

/** Legacy single-record provider shape used to exercise the non-set import path. */
const matchInfoOnlyProvider = {
  getMatch(matchId: string): unknown {
    const match = new FixtureProvider().getMatch(matchId);

    if (match === undefined) {
      return undefined;
    }

    return Object.freeze({
      matchId: match.matchId,
      home: match.home,
      away: match.away,
      kickoff: match.kickoff,
    });
  },
};

function requireEvidence(result: ImportMatchResult): Evidence {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected successful use case: ${result.error.code}`);
  }

  return result.value;
}

describe("ImportMatchUseCase", () => {
  it("coordinates provider lookup and Evidence import", async () => {
    const normalize = vi.fn((_input: unknown) => ({
      ok: true as const,
      value: evidence,
    }));
    const pipeline = new EvidenceImportPipeline({ normalize });
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    const result = await useCase.execute("match-example");

    expect(requireEvidence(result)).toBe(evidence);
    expect(normalize).toHaveBeenCalledWith({
      matchId: "match-example",
      home: "Liverpool",
      away: "Chelsea",
      kickoff: "2026-08-01T19:30:00Z",
    });
  });

  it("imports the full fixture evidence set idempotently", async () => {
    const repository = new InMemoryEvidenceRepository();
    const pipeline = new EvidenceImportPipeline(
      new FixtureEvidenceNormalizer({ collectedAt: "2026-07-17T10:00:00Z" }),
      repository,
    );
    const useCase = new ImportMatchUseCase(new FixtureProvider(), pipeline);

    const first = await useCase.execute("match-example");
    const second = await useCase.execute("match-example");

    expect(requireEvidence(first).type).toBe("MATCH_INFO");
    expect(requireEvidence(second).id).toBe(requireEvidence(first).id);
    await expect(repository.findAll()).resolves.toHaveLength(7);
    const all = await repository.findAll();
    expect(all.some((item) => item.type === "HEAD_TO_HEAD")).toBe(true);
    expect(all.some((item) => item.type === "ODDS")).toBe(true);
  });

  it("imports ODDS with non-fixture provenance from a recorded odds overlay", async () => {
    const repository = new InMemoryEvidenceRepository();
    const pipeline = new EvidenceImportPipeline(
      new FixtureEvidenceNormalizer({ collectedAt: "2026-07-17T10:00:00Z" }),
      repository,
    );
    const useCase = new ImportMatchUseCase(
      new CompositeMatchProvider(
        new FixtureProvider(),
        new RecordedOddsSnapshotSource(),
      ),
      pipeline,
    );

    const result = await useCase.execute("match-example");

    expect(result.ok).toBe(true);
    const odds = (await repository.findAll()).find((item) => item.type === "ODDS");

    expect(odds?.source).toBe("the-odds-api");
    expect(odds?.provenance.method).toBe("recorded-snapshot");
    expect(odds?.source).not.toBe("fixture");
  });

  it("returns a typed failure when the provider has no match", async () => {
    const importEvidence = vi.fn();
    const useCase = new ImportMatchUseCase(new FixtureProvider(), {
      importEvidence,
    });

    const result = await useCase.execute("match-unknown");

    expect(result).toEqual({
      ok: false,
      error: {
        code: "MATCH_NOT_FOUND",
        message: 'Match "match-unknown" was not found.',
      },
    });
    expect(importEvidence).not.toHaveBeenCalled();
  });

  it("returns normalization failures from the import pipeline", async () => {
    const pipeline = new EvidenceImportPipeline({
      normalize: () => ({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Provider payload is malformed.",
        },
      }),
    });
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    await expect(useCase.execute("match-example")).resolves.toEqual({
      ok: false,
      error: {
        code: "NORMALIZATION_FAILED",
        message: "Evidence normalization failed.",
        normalizerError: {
          code: "INVALID_INPUT",
          message: "Provider payload is malformed.",
        },
      },
    });
  });

  it("returns duplicate Evidence failures from the import pipeline", async () => {
    const repository = new InMemoryEvidenceRepository();
    await repository.save(evidence);
    const pipeline = new EvidenceImportPipeline(
      {
        normalize: () => ({ ok: true, value: evidence }),
      },
      repository,
    );
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    await expect(useCase.execute("match-example")).resolves.toEqual({
      ok: false,
      error: {
        code: "DUPLICATE_EVIDENCE",
        message: `Evidence "${evidence.id}" already exists.`,
      },
    });
  });

  it("returns repository failures from the import pipeline", async () => {
    const repository: EvidenceRepository = {
      findAll: () => Promise.resolve([]),
      findById: () => Promise.resolve(undefined),
      findByMatch: () => Promise.resolve([]),
      save: () => Promise.reject(new Error("repository unavailable")),
    };
    const pipeline = new EvidenceImportPipeline(
      {
        normalize: () => ({ ok: true, value: evidence }),
      },
      repository,
    );
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    await expect(useCase.execute("match-example")).resolves.toEqual({
      ok: false,
      error: {
        code: "REPOSITORY_FAILED",
        message: "Evidence repository persistence failed.",
      },
    });
  });

  it("returns immutable Result and Evidence objects", async () => {
    const pipeline = new EvidenceImportPipeline({
      normalize: () => ({ ok: true, value: evidence }),
    });
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    const result = await useCase.execute("match-example");
    const importedEvidence = requireEvidence(result);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(importedEvidence)).toBe(true);
    expect(Object.isFrozen(importedEvidence.payload)).toBe(true);
  });

  it("converts unexpected dependency exceptions into typed failures", async () => {
    const providerFailure = new ImportMatchUseCase(
      {
        getMatch: () => {
          throw new Error("provider unavailable");
        },
      },
      {
        importEvidence: () => {
          throw new Error("must not be called");
        },
      },
    );
    const importFailure = new ImportMatchUseCase(matchInfoOnlyProvider, {
      importEvidence: () => {
        throw new Error("import unavailable");
      },
    });

    await expect(providerFailure.execute("match-example")).resolves.toEqual({
      ok: false,
      error: {
        code: "PROVIDER_FAILED",
        message: "provider unavailable",
      },
    });
    await expect(importFailure.execute("match-example")).resolves.toEqual({
      ok: false,
      error: {
        code: "EVIDENCE_IMPORT_FAILED",
        message: "Evidence import failed unexpectedly.",
      },
    });
  });
});
