import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import {
  createRuleResult,
  type CreateRuleResultInput,
  RuleResultValidationError,
} from "../src/index.js";

const validInput = {
  ruleId: "rule:home-team-present:v1",
  matchId: createMatchId("match-1"),
  ruleName: "HOME_TEAM_PRESENT",
  status: "PASS",
  score: 1,
  explanation: "HOME_TEAM_PRESENT passed because its source Feature is present.",
  sourceFeatureIds: ["feature:evidence-1:homeTeam"],
  evaluatedAt: "2026-07-17T10:00:00Z",
} as const satisfies CreateRuleResultInput;

describe("RuleResult", () => {
  it("creates an immutable RuleResult", () => {
    const result = createRuleResult(validInput);

    expect(result).toEqual(validInput);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sourceFeatureIds)).toBe(true);
  });

  it("does not retain the sourceFeatureIds input reference", () => {
    const sourceFeatureIds = ["feature:evidence-1:homeTeam"];
    const result = createRuleResult({ ...validInput, sourceFeatureIds });

    sourceFeatureIds[0] = "changed";

    expect(result.sourceFeatureIds).toEqual(["feature:evidence-1:homeTeam"]);
  });

  it.each([
    ["ruleId", { ruleId: "unknown" }],
    ["ruleName", { ruleName: "UNKNOWN" }],
    ["status", { status: "UNKNOWN" }],
  ] as const)("rejects an invalid %s", (_field, override) => {
    expect(() => createRuleResult({ ...validInput, ...override })).toThrow(
      RuleResultValidationError,
    );
  });

  it("rejects an empty explanation", () => {
    expect(() => createRuleResult({ ...validInput, explanation: " " })).toThrow(
      RuleResultValidationError,
    );
  });

  it("rejects a score inconsistent with status", () => {
    expect(() => createRuleResult({ ...validInput, score: 0 })).toThrow(
      RuleResultValidationError,
    );
    expect(() =>
      createRuleResult({
        ...validInput,
        status: "FAIL",
        score: 1,
        sourceFeatureIds: [],
      }),
    ).toThrow(RuleResultValidationError);
  });

  it("rejects duplicate source Feature identities", () => {
    expect(() =>
      createRuleResult({
        ...validInput,
        sourceFeatureIds: [
          "feature:evidence-1:homeTeam",
          "feature:evidence-1:homeTeam",
        ],
      }),
    ).toThrow(RuleResultValidationError);
  });

  it("rejects an invalid evaluatedAt timestamp", () => {
    expect(() =>
      createRuleResult({ ...validInput, evaluatedAt: "invalid" }),
    ).toThrow(RuleResultValidationError);
  });
});
