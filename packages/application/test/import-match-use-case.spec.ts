import {
  createEvidence,
  type Evidence,
  type EvidenceRepository,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { EvidenceImportPipeline } from "@fas/evidence-import";
import { FixtureEvidenceNormalizer } from "@fas/evidence-normalizer";
import { FixtureProvider } from "@fas/provider-fixture";
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
  it("coordinates provider lookup and Evidence import", () => {
    const normalize = vi.fn((_input: unknown) => ({
      ok: true as const,
      value: evidence,
    }));
    const pipeline = new EvidenceImportPipeline({ normalize });
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    const result = useCase.execute("match-example");

    expect(requireEvidence(result)).toBe(evidence);
    expect(normalize).toHaveBeenCalledWith({
      matchId: "match-example",
      home: "Liverpool",
      away: "Chelsea",
      kickoff: "2026-08-01T19:30:00Z",
    });
  });

  it("imports the full fixture evidence set idempotently", () => {
    const repository = new InMemoryEvidenceRepository();
    const pipeline = new EvidenceImportPipeline(
      new FixtureEvidenceNormalizer({ collectedAt: "2026-07-17T10:00:00Z" }),
      repository,
    );
    const useCase = new ImportMatchUseCase(new FixtureProvider(), pipeline);

    const first = useCase.execute("match-example");
    const second = useCase.execute("match-example");

    expect(requireEvidence(first).type).toBe("MATCH_INFO");
    expect(requireEvidence(second).id).toBe(requireEvidence(first).id);
    expect(repository.findAll()).toHaveLength(6);
    expect(
      repository.findAll().some((evidence) => evidence.type === "HEAD_TO_HEAD"),
    ).toBe(true);
  });

  it("returns a typed failure when the provider has no match", () => {
    const importEvidence = vi.fn();
    const useCase = new ImportMatchUseCase(new FixtureProvider(), {
      importEvidence,
    });

    const result = useCase.execute("match-unknown");

    expect(result).toEqual({
      ok: false,
      error: {
        code: "MATCH_NOT_FOUND",
        message: 'Match "match-unknown" was not found.',
      },
    });
    expect(importEvidence).not.toHaveBeenCalled();
  });

  it("returns normalization failures from the import pipeline", () => {
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

    expect(useCase.execute("match-example")).toEqual({
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

  it("returns duplicate Evidence failures from the import pipeline", () => {
    const repository = new InMemoryEvidenceRepository();
    repository.save(evidence);
    const pipeline = new EvidenceImportPipeline(
      {
        normalize: () => ({ ok: true, value: evidence }),
      },
      repository,
    );
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    expect(useCase.execute("match-example")).toEqual({
      ok: false,
      error: {
        code: "DUPLICATE_EVIDENCE",
        message: `Evidence "${evidence.id}" already exists.`,
      },
    });
  });

  it("returns repository failures from the import pipeline", () => {
    const repository: EvidenceRepository = {
      findAll: () => [],
      findById: () => undefined,
      save: () => {
        throw new Error("repository unavailable");
      },
    };
    const pipeline = new EvidenceImportPipeline(
      {
        normalize: () => ({ ok: true, value: evidence }),
      },
      repository,
    );
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    expect(useCase.execute("match-example")).toEqual({
      ok: false,
      error: {
        code: "REPOSITORY_FAILED",
        message: "Evidence repository persistence failed.",
      },
    });
  });

  it("returns immutable Result and Evidence objects", () => {
    const pipeline = new EvidenceImportPipeline({
      normalize: () => ({ ok: true, value: evidence }),
    });
    const useCase = new ImportMatchUseCase(matchInfoOnlyProvider, pipeline);

    const result = useCase.execute("match-example");
    const importedEvidence = requireEvidence(result);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(importedEvidence)).toBe(true);
    expect(Object.isFrozen(importedEvidence.payload)).toBe(true);
  });

  it("converts unexpected dependency exceptions into typed failures", () => {
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

    expect(providerFailure.execute("match-example")).toEqual({
      ok: false,
      error: {
        code: "PROVIDER_FAILED",
        message: "Match provider lookup failed.",
      },
    });
    expect(importFailure.execute("match-example")).toEqual({
      ok: false,
      error: {
        code: "EVIDENCE_IMPORT_FAILED",
        message: "Evidence import failed unexpectedly.",
      },
    });
  });
});
