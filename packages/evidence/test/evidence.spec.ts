import { createMatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import {
  createEvidence,
  type EvidenceType,
  EvidenceValidationError,
} from "../src/index.js";

const evidenceTypes = [
  "MATCH_INFO",
  "ODDS",
  "TEAM_FORM",
  "HEAD_TO_HEAD",
  "LINEUP",
  "INJURY",
  "WEATHER",
  "NEWS",
  "RANKING",
  "STATISTICS",
] as const satisfies ReadonlyArray<EvidenceType>;

const validInput = {
  id: "evidence-example",
  source: "fixture",
  sourceId: "fixture-match-001",
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
    score: {
      away: 0,
      home: 0,
    },
  },
} as const;

describe("Evidence", () => {
  it("creates an immutable evidence value with all required fields", () => {
    const evidence = createEvidence(validInput);

    expect(evidence).toEqual(validInput);
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(Object.isFrozen(evidence.provenance)).toBe(true);
    expect(Object.isFrozen(evidence.payload)).toBe(true);
    expect(Object.isFrozen(evidence.payload.score)).toBe(true);
    expect(evidence.payload).not.toHaveProperty("matchId");
  });

  it("supports evidence without a match relationship", () => {
    const { matchId, ...inputWithoutMatch } = validInput;
    const evidence = createEvidence(inputWithoutMatch);

    expect(matchId).toBe(createMatchId("match-example"));
    expect(evidence).not.toHaveProperty("matchId");
  });

  it.each(evidenceTypes)("accepts the %s evidence type", (type) => {
    expect(createEvidence({ ...validInput, type }).type).toBe(type);
  });

  it("rejects unknown evidence types", () => {
    expect(() => createEvidence({ ...validInput, type: "UNKNOWN" })).toThrow(
      EvidenceValidationError,
    );
  });

  it("serializes its classification and match relationship", () => {
    const evidence = createEvidence(validInput);

    expect(JSON.parse(JSON.stringify(evidence))).toEqual(validInput);
  });

  it("rejects missing identity and invalid timestamps", () => {
    expect(() => createEvidence({ ...validInput, id: " " })).toThrow(
      EvidenceValidationError,
    );
    expect(() =>
      createEvidence({ ...validInput, collectedAt: "not-a-timestamp" }),
    ).toThrow(EvidenceValidationError);
  });

  it("rejects an empty source", () => {
    expect(() => createEvidence({ ...validInput, source: "   " })).toThrow(
      EvidenceValidationError,
    );
  });

  it("rejects invalid event timestamps", () => {
    expect(() => createEvidence({ ...validInput, eventTime: "2026-07-16" })).toThrow(
      EvidenceValidationError,
    );
  });

  it("defensively copies and deeply freezes the payload", () => {
    const payload = {
      score: {
        away: 0,
        home: 0,
      },
    };
    const evidence = createEvidence({ ...validInput, payload });

    payload.score.home = 2;

    expect(evidence.payload).toEqual({
      score: {
        away: 0,
        home: 0,
      },
    });
    expect(Object.isFrozen(evidence.payload.score)).toBe(true);
    expect(Reflect.set(evidence.payload.score as object, "home", 3)).toBe(false);
  });

  it("prevents mutation of the evidence object", () => {
    const evidence = createEvidence(validInput);

    expect(Reflect.set(evidence, "type", "ODDS")).toBe(false);
    expect(evidence.type).toBe("MATCH_INFO");
  });
});
