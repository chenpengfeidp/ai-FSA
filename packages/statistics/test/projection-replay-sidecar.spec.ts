import { describe, expect, it } from "vitest";
import {
  ConflictProjectionReplaySidecarError,
  InMemoryProjectionReplaySidecarRepository,
  type SealedProjectionReplayContext,
} from "../src/index.js";

function sampleContext(
  overrides: Partial<SealedProjectionReplayContext> = {},
): SealedProjectionReplayContext {
  return Object.freeze({
    matchId: "match-sidecar-1",
    featureModelVersion: "feature.v2.test",
    featureBundleChecksum: "fb-checksum-1",
    featureBundleStatus: "completed_nonempty",
    evidenceRefs: Object.freeze(["ev-1", "ev-2"]),
    features: Object.freeze([
      Object.freeze({ name: "attackRatingHome", value: 1.2 }),
    ]),
    rules: Object.freeze([
      Object.freeze({
        ruleId: "rule-1",
        ruleName: "HOME_ATTACK_EDGE",
        status: "PASS" as const,
        channel: "home+" as const,
        weight: 1,
        score: 0.4,
      }),
    ]),
    requiredEvidencePresentCount: 5,
    generatedAt: "2026-08-12T00:00:00.000Z",
    parameterArtifactId: "artifact-1",
    parameterVersionLabel: "v2.active",
    parameterArtifactChecksum: "param-checksum-1",
    ...overrides,
  });
}

describe("InMemoryProjectionReplaySidecarRepository (P2K-B)", () => {
  it("round-trips context by historyId", async () => {
    const repository = new InMemoryProjectionReplaySidecarRepository();
    const context = sampleContext();

    await repository.save({
      historyId: "hist-1",
      matchId: context.matchId,
      context,
    });

    await expect(repository.findByHistoryId("hist-1")).resolves.toEqual(context);
  });

  it("treats same historyId + same content as idempotent success", async () => {
    const repository = new InMemoryProjectionReplaySidecarRepository();
    const context = sampleContext();

    await repository.save({
      historyId: "hist-idem",
      matchId: context.matchId,
      context,
    });
    await expect(
      repository.save({
        historyId: "hist-idem",
        matchId: context.matchId,
        context,
      }),
    ).resolves.toBeUndefined();

    await expect(repository.findByHistoryId("hist-idem")).resolves.toEqual(context);
  });

  it("fails explicitly when same historyId has different content", async () => {
    const repository = new InMemoryProjectionReplaySidecarRepository();
    const context = sampleContext();

    await repository.save({
      historyId: "hist-conflict",
      matchId: context.matchId,
      context,
    });

    await expect(
      repository.save({
        historyId: "hist-conflict",
        matchId: context.matchId,
        context: sampleContext({ featureBundleChecksum: "different" }),
      }),
    ).rejects.toBeInstanceOf(ConflictProjectionReplaySidecarError);
  });

  it("is not durable across repository instances (memory mode)", async () => {
    const first = new InMemoryProjectionReplaySidecarRepository();
    const context = sampleContext();

    await first.save({
      historyId: "hist-memory",
      matchId: context.matchId,
      context,
    });

    const second = new InMemoryProjectionReplaySidecarRepository();
    await expect(second.findByHistoryId("hist-memory")).resolves.toBeUndefined();
  });

  it("builds sidecar map keyed by historyId and matchId", async () => {
    const repository = new InMemoryProjectionReplaySidecarRepository();
    const context = sampleContext();

    await repository.save({
      historyId: "hist-map",
      matchId: context.matchId,
      context,
    });

    const map = await repository.buildSidecarMap();
    expect(map["hist-map"]).toEqual(context);
    expect(map[context.matchId]).toEqual(context);
  });
});
