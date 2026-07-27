import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

const collectedAt = "2026-07-24T12:00:00.000Z";

function baseShape(options?: {
  readonly managerIntelligence?: readonly Record<string, unknown>[];
}): Record<string, unknown> {
  return {
    matchId: "football:manager-1",
    home: "Home FC",
    away: "Away FC",
    kickoff: "2026-08-01T10:00:00.000Z",
    teamForm: [
      {
        teamSide: "home",
        window: 1,
        results: ["W"],
        goalsFor: [1],
        goalsAgainst: [0],
      },
      {
        teamSide: "away",
        window: 1,
        results: ["L"],
        goalsFor: [0],
        goalsAgainst: [1],
      },
    ],
    statistics: [
      {
        teamSide: "home",
        windowMatches: 5,
        shotsForPerMatch: 12,
        shotsAgainstPerMatch: 9,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
      },
      {
        teamSide: "away",
        windowMatches: 5,
        shotsForPerMatch: 10,
        shotsAgainstPerMatch: 11,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
      },
    ],
    ...(options?.managerIntelligence === undefined
      ? {}
      : { managerIntelligence: options.managerIntelligence }),
  };
}

describe("M1A MANAGER_INTELLIGENCE Evidence normalization", () => {
  it("preserves provider manager identity and career facts with provenance", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        managerIntelligence: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            managerId: "55",
            managerName: "Alex Manager",
            competitionId: "292",
            competitionName: "K League 1",
            season: "2026",
            nationality: "South Korea",
            age: 52,
            appointmentDate: "2024-01-15",
            tenureDays: 928,
            previousClubs: ["Suwon FC", "Pohang Steelers"],
            matchManagerConfirmed: true,
            observedAt: "2026-08-01T10:00:00.000Z",
            providerSource: "api-football",
            providerSourceId: "api-football:1:manager:home",
            providerMethod: "recorded-snapshot",
          },
        ],
      }),
      { collectedAt },
    );

    if (!result.ok) {
      throw new Error(JSON.stringify(result.error));
    }

    const manager = result.value.find(
      (item) => item.type === "MANAGER_INTELLIGENCE",
    );
    expect(manager?.payload).toMatchObject({
      teamSide: "home",
      managerId: "55",
      managerName: "Alex Manager",
      competitionName: "K League 1",
      season: "2026",
      nationality: "South Korea",
      age: 52,
      appointmentDate: "2024-01-15",
      tenureDays: 928,
      previousClubs: ["Suwon FC", "Pohang Steelers"],
      matchManagerConfirmed: true,
    });
    expect(manager?.payload).not.toHaveProperty("interimManagerStatus");
    expect(manager?.source).toBe("api-football");
    expect(manager?.provenance.method).toBe("recorded-snapshot");
  });

  it("preserves honest absence of interim status and previous clubs when unknown", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        managerIntelligence: [
          {
            teamId: "20",
            teamName: "Away FC",
            teamSide: "away",
            managerName: "Caretaker Coach",
            matchManagerConfirmed: true,
            observedAt: "2026-08-01T10:00:00.000Z",
            providerMethod: "recorded-snapshot",
          },
        ],
      }),
      { collectedAt },
    );

    if (!result.ok) {
      throw new Error(JSON.stringify(result.error));
    }

    const manager = result.value.find(
      (item) => item.type === "MANAGER_INTELLIGENCE",
    );
    expect(manager?.payload).toMatchObject({
      teamSide: "away",
      managerName: "Caretaker Coach",
      matchManagerConfirmed: true,
    });
    expect(manager?.payload).not.toHaveProperty("nationality");
    expect(manager?.payload).not.toHaveProperty("age");
    expect(manager?.payload).not.toHaveProperty("tenureDays");
    expect(manager?.payload).not.toHaveProperty("previousClubs");
    expect(manager?.payload).not.toHaveProperty("interimManagerStatus");
  });

  it("omits Manager Intelligence when array is absent (honest absence)", () => {
    const result = normalizeFixtureEvidenceSet(baseShape(), { collectedAt });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "MANAGER_INTELLIGENCE")).toBe(
      false,
    );
  });

  it("rejects an entry missing a required managerName", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        managerIntelligence: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            matchManagerConfirmed: false,
            observedAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(false);
  });
});
