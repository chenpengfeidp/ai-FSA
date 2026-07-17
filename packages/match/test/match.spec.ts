import { describe, expect, it } from "vitest";
import {
  createCompetitionId,
  createMatch,
  createMatchId,
  createMatchStatus,
  createTeamId,
  MatchValidationError,
} from "../src/index.js";

const validInput = {
  id: "match-example",
  competitionId: "competition-example",
  homeTeamId: "team-home",
  awayTeamId: "team-away",
  kickoffTime: "2026-08-16T18:30:00.000Z",
  status: "scheduled",
} as const;

describe("Match", () => {
  it("creates a valid immutable match", () => {
    const match = createMatch(validInput);

    expect(match).toEqual(validInput);
    expect(createMatchId(validInput.id)).toBe(validInput.id);
    expect(createCompetitionId(validInput.competitionId)).toBe(
      validInput.competitionId,
    );
    expect(createTeamId(validInput.homeTeamId)).toBe(validInput.homeTeamId);
    expect(createMatchStatus(validInput.status)).toBe(validInput.status);
  });

  it.each([
    "id",
    "competitionId",
    "homeTeamId",
    "awayTeamId",
  ] as const)("rejects an empty %s", (field) => {
    expect(() => createMatch({ ...validInput, [field]: "   " })).toThrow(
      MatchValidationError,
    );
  });

  it("rejects an invalid kickoff time", () => {
    expect(() =>
      createMatch({ ...validInput, kickoffTime: "not-a-timestamp" }),
    ).toThrow(MatchValidationError);
  });

  it("rejects an invalid status", () => {
    expect(() => createMatch({ ...validInput, status: "abandoned" })).toThrow(
      MatchValidationError,
    );
  });

  it("prevents mutation after creation", () => {
    const match = createMatch(validInput);

    expect(Object.isFrozen(match)).toBe(true);
    expect(Reflect.set(match, "status", "completed")).toBe(false);
    expect(match.status).toBe("scheduled");
  });
});
