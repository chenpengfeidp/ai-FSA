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
  it("stores and retrieves evidence by id", () => {
    const repository = new InMemoryEvidenceRepository();

    expect(repository.findById(evidence.id)).toBeUndefined();
    expect(repository.save(evidence)).toBe(evidence);
    expect(repository.findById(evidence.id)).toBe(evidence);
  });

  it("does not overwrite immutable evidence identities", () => {
    const repository = new InMemoryEvidenceRepository();
    repository.save(evidence);

    expect(() => repository.save(evidence)).toThrow(DuplicateEvidenceError);
    expect(repository.findById(evidence.id)).toBe(evidence);
  });
});
