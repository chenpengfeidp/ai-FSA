import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import { EvidenceService, InMemoryEvidenceRepository } from "../src/index.js";

const input = {
  id: "evidence-service-test",
  source: "fixture",
  sourceId: "fixture-service-001",
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
    status: "scheduled",
  },
} as const;

describe("EvidenceService", () => {
  it("records evidence and makes it available through the repository port", () => {
    const service = new EvidenceService(new InMemoryEvidenceRepository());

    const evidence = service.record(input);

    expect(evidence).toEqual(input);
    expect(service.findById(evidence.id)).toBe(evidence);
  });

  it("returns undefined when evidence does not exist", () => {
    const service = new EvidenceService(new InMemoryEvidenceRepository());

    expect(service.findById("missing")).toBeUndefined();
  });
});
