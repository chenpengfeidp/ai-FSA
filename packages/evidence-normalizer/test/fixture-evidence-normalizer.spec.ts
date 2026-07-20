import type { Evidence } from "@fas/evidence";
import { describe, expect, it } from "vitest";
import {
  type EvidenceNormalizationResult,
  FixtureEvidenceNormalizer,
  normalizeFixtureEvidence,
} from "../src/index.js";

const rawInput = {
  matchId: "match-example",
  home: "Liverpool",
  away: "Chelsea",
  kickoff: "2026-08-01T19:30:00Z",
};

const context = {
  evidenceId: "evidence-fixture-match-example",
  sourceId: "fixture-match-example",
  collectedAt: "2026-07-17T09:00:00Z",
};

function requireEvidence(result: EvidenceNormalizationResult): Evidence {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected successful normalization: ${result.error.code}`);
  }

  return result.value;
}

describe("normalizeFixtureEvidence", () => {
  it("supports an injected immutable context through FixtureEvidenceNormalizer", () => {
    const normalizer = new FixtureEvidenceNormalizer(context);

    const evidence = requireEvidence(normalizer.normalize(rawInput));

    expect(evidence.id).toBe(context.evidenceId);
    expect(evidence.sourceId).toBe(context.sourceId);
    expect(evidence.collectedAt).toBe(context.collectedAt);
  });

  it("derives stable source identities from the provider match id", () => {
    const evidence = requireEvidence(
      normalizeFixtureEvidence(rawInput, {
        collectedAt: context.collectedAt,
      }),
    );

    expect(evidence.id).toBe("evidence-fixture-match-example");
    expect(evidence.sourceId).toBe("fixture-match-example");
  });

  it("normalizes fixture match information into Evidence", () => {
    const result = normalizeFixtureEvidence(rawInput, context);
    const evidence = requireEvidence(result);

    expect(evidence).toMatchObject({
      id: context.evidenceId,
      providerId: "internal:recorded",
      source: "fixture",
      sourceId: context.sourceId,
      type: "MATCH_INFO",
      matchId: "match-example",
      collectedAt: context.collectedAt,
      eventTime: rawInput.kickoff,
      timestamp: context.collectedAt,
      freshness: "fresh",
      confidence: "unknown",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
        providerId: "internal:recorded",
        category: "internal",
      },
      payload: {
        home: "Liverpool",
        away: "Chelsea",
        kickoff: "2026-08-01T19:30:00Z",
      },
    });
  });

  it.each([
    null,
    undefined,
    [],
    "fixture",
    42,
    true,
  ])("rejects malformed non-object input %#", (input) => {
    expect(normalizeFixtureEvidence(input, context)).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Fixture evidence input must be an object.",
      },
    });
  });

  it.each([
    ["matchId", { ...rawInput, matchId: "" }],
    ["home", { ...rawInput, home: "   " }],
    ["away", { ...rawInput, away: 12 }],
    ["kickoff", { ...rawInput, kickoff: null }],
    [
      "matchId",
      { home: rawInput.home, away: rawInput.away, kickoff: rawInput.kickoff },
    ],
  ] as const)("rejects an invalid %s field", (field, input) => {
    const result = normalizeFixtureEvidence(input, context);

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_FIELD",
        field,
      },
    });
  });

  it("returns a typed domain failure for an invalid kickoff", () => {
    expect(
      normalizeFixtureEvidence({ ...rawInput, kickoff: "not-a-timestamp" }, context),
    ).toEqual({
      ok: false,
      error: {
        code: "DOMAIN_VALIDATION_FAILED",
        message: "eventTime must be a valid ISO 8601 timestamp.",
      },
    });
  });

  it("returns a typed domain failure for invalid Evidence context", () => {
    expect(
      normalizeFixtureEvidence(rawInput, { ...context, evidenceId: " " }),
    ).toEqual({
      ok: false,
      error: {
        code: "DOMAIN_VALIDATION_FAILED",
        message: "id must not be empty.",
      },
    });
  });

  it("does not mutate or freeze provider input", () => {
    const input = {
      ...rawInput,
      metadata: {
        sequence: 1,
      },
    };
    const snapshot = structuredClone(input);

    normalizeFixtureEvidence(input, context);

    expect(input).toEqual(snapshot);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(input.metadata)).toBe(false);
  });

  it("returns immutable Result, Evidence, provenance, and payload objects", () => {
    const result = normalizeFixtureEvidence(rawInput, context);
    const evidence = requireEvidence(result);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.provenance)).toBe(true);
    expect(Object.isFrozen(evidence.payload)).toBe(true);
    expect(Reflect.set(evidence, "source", "changed")).toBe(false);
    expect(Reflect.set(evidence.payload, "home", "Changed")).toBe(false);
  });

  it("converts unexpected thrown values into a typed failure", () => {
    const hostileInput = new Proxy(
      {},
      {
        get(): never {
          throw new Error("untrusted getter failure");
        },
      },
    );

    expect(() => normalizeFixtureEvidence(hostileInput, context)).not.toThrow();
    expect(normalizeFixtureEvidence(hostileInput, context)).toEqual({
      ok: false,
      error: {
        code: "UNEXPECTED_ERROR",
        message: "Fixture evidence normalization failed unexpectedly.",
      },
    });
  });
});
