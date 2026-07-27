import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";
import { describe, expect, it } from "vitest";
import { mapApiFootballManagerIntelligence } from "../src/mapper/map-api-football-manager-intelligence.js";
import { RecordedFootballCatalog } from "../src/recorded/recorded-football-catalog.js";
import { toEvidenceMatchShape } from "../src/mapper/to-evidence-match.js";

const observedAt = "2026-08-01T12:00:00.000Z";
const baseOptions = {
  teamId: "2766",
  teamName: "FC Seoul",
  teamSide: "home" as const,
  competitionId: "292",
  competitionName: "K League 1",
  season: "2026",
  observedAt,
  providerMethod: "http-live" as const,
};

function coachBody(overrides?: Record<string, unknown>): unknown {
  return {
    response: [
      {
        id: 55,
        name: "Kim Gi-dong",
        age: 52,
        nationality: "South Korea",
        career: [
          { team: { id: 2766, name: "FC Seoul" }, start: "2024-01-15", end: null },
          {
            team: { id: 9001, name: "Suwon FC" },
            start: "2020-01-01",
            end: "2023-12-31",
          },
        ],
        ...overrides,
      },
    ],
  };
}

describe("M1A Manager Intelligence mapping", () => {
  it("maps identity, career appointment, tenure, and previous clubs without fabricating", () => {
    const record = mapApiFootballManagerIntelligence(coachBody(), baseOptions);

    expect(record?.managerId).toBe("55");
    expect(record?.managerName).toBe("Kim Gi-dong");
    expect(record?.nationality).toBe("South Korea");
    expect(record?.age).toBe(52);
    expect(record?.appointmentDate).toBe("2024-01-15");
    expect(record?.tenureDays).toBeGreaterThan(0);
    expect(record?.previousClubs).toEqual(["Suwon FC"]);
    expect(record?.matchManagerConfirmed).toBe(false);
  });

  it("confirms match manager when the lineup coach name matches the season identity", () => {
    const record = mapApiFootballManagerIntelligence(coachBody(), {
      ...baseOptions,
      lineupCoachName: "Kim Gi-dong",
    });

    expect(record?.matchManagerConfirmed).toBe(true);
    expect(record?.managerName).toBe("Kim Gi-dong");
    expect(record?.tenureDays).toBeGreaterThan(0);
  });

  it("reports only the confirmed match-day identity when the lineup shows a different manager", () => {
    const record = mapApiFootballManagerIntelligence(coachBody(), {
      ...baseOptions,
      lineupCoachName: "Caretaker Coach",
    });

    expect(record?.managerName).toBe("Caretaker Coach");
    expect(record?.matchManagerConfirmed).toBe(true);
    expect(record?.nationality).toBeUndefined();
    expect(record?.age).toBeUndefined();
    expect(record?.appointmentDate).toBeUndefined();
    expect(record?.tenureDays).toBeUndefined();
    expect(record?.previousClubs).toBeUndefined();
  });

  it("builds a minimal confirmed identity from the lineup when /coachs is empty", () => {
    const record = mapApiFootballManagerIntelligence(
      { response: [] },
      { ...baseOptions, lineupCoachName: "Lineup-only Coach" },
    );

    expect(record?.managerName).toBe("Lineup-only Coach");
    expect(record?.matchManagerConfirmed).toBe(true);
    expect(record?.nationality).toBeUndefined();
  });

  it("keeps honest absence when neither /coachs nor lineup supply an identity", () => {
    const record = mapApiFootballManagerIntelligence({ response: [] }, baseOptions);

    expect(record).toBeUndefined();
  });

  it("never invents an interim status the provider does not supply", () => {
    const record = mapApiFootballManagerIntelligence(coachBody(), baseOptions);

    expect(record?.interimManagerStatus).toBeUndefined();
  });

  it("emits MANAGER_INTELLIGENCE Evidence from recorded cassette with provenance", () => {
    const catalog = new RecordedFootballCatalog();
    const bundle = catalog.getMatchBundle("football:100001");
    expect(bundle).toBeDefined();
    if (bundle === undefined) {
      return;
    }

    expect(bundle.managerIntelligence.length).toBeGreaterThan(0);

    const normalized = normalizeFixtureEvidenceSet(toEvidenceMatchShape(bundle), {
      collectedAt: "2026-07-24T12:00:00.000Z",
    });

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const managers = normalized.value.filter(
      (item) => item.type === "MANAGER_INTELLIGENCE",
    );
    expect(managers.length).toBe(bundle.managerIntelligence.length);
    expect(managers[0]?.payload).toMatchObject({
      managerName: expect.any(String),
      matchManagerConfirmed: expect.any(Boolean),
    });
    expect(managers[0]?.source).toBe("api-football");
    expect(managers[0]?.provenance.method).toBe("recorded-snapshot");
  });
});
