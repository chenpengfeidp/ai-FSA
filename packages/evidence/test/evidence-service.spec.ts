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
  it("records evidence and makes it available through the repository port", async () => {
    const service = new EvidenceService(new InMemoryEvidenceRepository());

    const evidence = await service.record(input);

    expect(evidence).toMatchObject({
      ...input,
      providerId: "internal:recorded",
      confidence: "unknown",
      timestamp: input.collectedAt,
      provenance: {
        ...input.provenance,
        providerId: "internal:recorded",
        category: "internal",
      },
    });
    await expect(service.findById(evidence.id)).resolves.toBe(evidence);
  });

  it("returns undefined when evidence does not exist", async () => {
    const service = new EvidenceService(new InMemoryEvidenceRepository());

    await expect(service.findById("missing")).resolves.toBeUndefined();
  });
});
