import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import {
  createFeature,
  FeatureValidationError,
  type CreateFeatureInput,
} from "../src/index.js";

const validInput = {
  featureId: "feature:evidence-1:homeTeam",
  matchId: createMatchId("match-1"),
  name: "homeTeam",
  value: {
    labels: ["Liverpool"],
  },
  sourceEvidenceId: "evidence-1",
  generatedAt: "2026-07-17T10:00:00Z",
} as const satisfies CreateFeatureInput;

describe("Feature", () => {
  it("creates an immutable Feature", () => {
    const feature = createFeature(validInput);

    expect(feature).toEqual(validInput);
    expect(Object.isFrozen(feature)).toBe(true);
    expect(Object.isFrozen(feature.value)).toBe(true);

    if (
      feature.value !== null &&
      typeof feature.value === "object" &&
      !Array.isArray(feature.value)
    ) {
      expect(Object.isFrozen(feature.value.labels)).toBe(true);
    }
  });

  it.each([
    ["featureId", { featureId: " " }],
    ["sourceEvidenceId", { sourceEvidenceId: "" }],
  ] as const)("rejects an empty %s", (_field, override) => {
    expect(() => createFeature({ ...validInput, ...override })).toThrow(
      FeatureValidationError,
    );
  });

  it("rejects an unknown Feature name", () => {
    expect(() => createFeature({ ...validInput, name: "unknown" })).toThrow(
      FeatureValidationError,
    );
  });

  it("rejects an invalid generatedAt timestamp", () => {
    expect(() =>
      createFeature({ ...validInput, generatedAt: "not-a-timestamp" }),
    ).toThrow(FeatureValidationError);
  });

  it("rejects non-JSON numeric values", () => {
    expect(() => createFeature({ ...validInput, value: Number.NaN })).toThrow(
      FeatureValidationError,
    );
  });

  it("does not retain mutable references from its input", () => {
    const value = { labels: ["Liverpool"] };
    const feature = createFeature({ ...validInput, value });

    value.labels[0] = "Changed";

    expect(feature.value).toEqual({ labels: ["Liverpool"] });
  });
});
