import {
  createEvidence,
  type Evidence,
  type EvidenceRepository,
  type EvidenceType,
  InMemoryEvidenceRepository,
} from "@fas/evidence";
import { createMatchId, type MatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import { EvidenceQueryService } from "../src/index.js";

function makeEvidence(id: string, type: EvidenceType, matchId?: MatchId): Evidence {
  return createEvidence({
    id,
    source: "fixture",
    sourceId: `fixture-${id}`,
    type,
    ...(matchId === undefined ? {} : { matchId }),
    collectedAt: "2026-07-17T09:00:00Z",
    eventTime: "2026-08-01T19:30:00Z",
    freshness: "fresh",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-query",
      method: "test",
    },
    payload: {
      observation: id,
    },
  });
}

async function createSeededRepository(): Promise<{
  readonly evidence: readonly Evidence[];
  readonly repository: InMemoryEvidenceRepository;
}> {
  const matchOne = createMatchId("match-1");
  const evidence = Object.freeze([
    makeEvidence("evidence-1", "MATCH_INFO", matchOne),
    makeEvidence("evidence-2", "ODDS", matchOne),
    makeEvidence("evidence-3", "MATCH_INFO", createMatchId("match-2")),
    makeEvidence("evidence-4", "NEWS"),
  ]);
  const repository = new InMemoryEvidenceRepository();

  for (const item of evidence) {
    await repository.save(item);
  }

  return { evidence, repository };
}

describe("EvidenceQueryService", () => {
  it("finds Evidence by id and reports a missing id", async () => {
    const { evidence, repository } = await createSeededRepository();
    const service = new EvidenceQueryService(repository);

    await expect(service.findById("evidence-2")).resolves.toEqual({
      ok: true,
      value: evidence[1],
    });
    await expect(service.findById("missing")).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("finds all Evidence for a MatchId in repository order", async () => {
    const { evidence, repository } = await createSeededRepository();
    const service = new EvidenceQueryService(repository);

    const result = await service.findByMatch(createMatchId("match-1"));

    expect(result).toEqual({
      ok: true,
      value: [evidence[0], evidence[1]],
    });
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("returns an immutable empty array for a MatchId without Evidence", async () => {
    const { repository } = await createSeededRepository();
    const service = new EvidenceQueryService(repository);

    const result = await service.findByMatch(createMatchId("match-missing"));

    expect(result).toEqual({ ok: true, value: [] });
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("finds all Evidence of a type in repository order", async () => {
    const { evidence, repository } = await createSeededRepository();
    const service = new EvidenceQueryService(repository);

    const result = await service.findByType("MATCH_INFO");

    expect(result).toEqual({
      ok: true,
      value: [evidence[0], evidence[2]],
    });
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("returns an immutable findAll snapshot", async () => {
    const { evidence, repository } = await createSeededRepository();
    const service = new EvidenceQueryService(repository);

    const result = await service.findAll();

    expect(result).toEqual({ ok: true, value: evidence });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
      await repository.save(makeEvidence("evidence-5", "WEATHER"));
      expect(result.value).toEqual(evidence);
    }
  });

  it("converts unknown repository failures into typed Result failures", async () => {
    const repository: EvidenceRepository = {
      findAll: () => Promise.reject(new Error("repository unavailable")),
      findById: () => Promise.reject(new Error("repository unavailable")),
      findByMatch: () => Promise.reject(new Error("repository unavailable")),
      save: (item) => Promise.resolve(item),
    };
    const service = new EvidenceQueryService(repository);
    const expectedFailure = {
      error: {
        code: "REPOSITORY_FAILED",
        message: "Evidence repository query failed.",
      },
      ok: false,
    };

    await expect(service.findById("evidence-1")).resolves.toEqual(expectedFailure);
    await expect(service.findByMatch(createMatchId("match-1"))).resolves.toEqual(
      expectedFailure,
    );
    await expect(service.findByType("MATCH_INFO")).resolves.toEqual(expectedFailure);
    const result = await service.findAll();
    expect(result).toEqual(expectedFailure);
    expect(Object.isFrozen(result)).toBe(true);
    if (!result.ok) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });
});
