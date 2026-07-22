import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import {
  createEvidence,
  DuplicateEvidenceError,
  InMemoryEvidenceRepository,
} from "../src/index.js";

const evidence = createEvidence({
  id: "evidence-repository-test",
  source: "fixture",
  sourceId: "fixture-repository-001",
  type: "MATCH_INFO",
  matchId: createMatchId("match-example"),
  collectedAt: "2026-07-16T15:00:00.000Z",
  eventTime: "2026-07-16T14:55:00.000Z",
  freshness: "fresh",
  quality: "verified",
  provenance: {
    collector: "@fas/evidence",
    method: "fixture",
  },
  payload: {
    observation: "repository-test",
  },
});

describe("InMemoryEvidenceRepository", () => {
  it("stores and retrieves evidence by id", async () => {
    const repository = new InMemoryEvidenceRepository();

    await expect(repository.findById(evidence.id)).resolves.toBeUndefined();
    await expect(repository.findAll()).resolves.toEqual([]);
    await expect(repository.save(evidence)).resolves.toBe(evidence);
    await expect(repository.findById(evidence.id)).resolves.toBe(evidence);
  });

  it("returns an immutable snapshot of stored evidence", async () => {
    const repository = new InMemoryEvidenceRepository();
    await repository.save(evidence);

    const snapshot = await repository.findAll();

    expect(snapshot).toEqual([evidence]);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("loads evidence by match id", async () => {
    const repository = new InMemoryEvidenceRepository();
    const other = createEvidence({
      id: "evidence-repository-other-match",
      source: "fixture",
      sourceId: "fixture-repository-002",
      type: "VENUE",
      matchId: createMatchId("match-other"),
      collectedAt: "2026-07-16T15:00:00.000Z",
      eventTime: "2026-07-16T14:55:00.000Z",
      freshness: "fresh",
      quality: "verified",
      provenance: {
        collector: "@fas/evidence",
        method: "fixture",
      },
      payload: {
        observation: "other-match",
      },
    });

    await repository.save(evidence);
    await repository.save(other);

    const byMatch = await repository.findByMatch(createMatchId("match-example"));

    expect(byMatch).toEqual([evidence]);
    expect(Object.isFrozen(byMatch)).toBe(true);
  });

  it("does not overwrite immutable evidence identities", async () => {
    const repository = new InMemoryEvidenceRepository();
    await repository.save(evidence);

    await expect(repository.save(evidence)).rejects.toThrow(DuplicateEvidenceError);
    await expect(repository.findById(evidence.id)).resolves.toBe(evidence);
  });
});
