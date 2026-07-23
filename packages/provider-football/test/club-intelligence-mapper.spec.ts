import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";
import { describe, expect, it } from "vitest";
import { mapApiFootballCoachResponse } from "../src/mapper/map-api-football-coach.js";
import { mapClubIntelligenceFromStandings } from "../src/mapper/map-club-intelligence-from-standings.js";
import { mapApiFootballStandings } from "../src/mapper/map-api-football-standings.js";
import { RecordedFootballCatalog } from "../src/recorded/recorded-football-catalog.js";
import { toEvidenceMatchShape } from "../src/mapper/to-evidence-match.js";

describe("L1A Club Intelligence mapping", () => {
  it("maps standings home/away/form/description without fabricating", () => {
    const standings = mapApiFootballStandings(
      {
        response: [
          {
            league: {
              standings: [
                [
                  {
                    rank: 2,
                    points: 40,
                    goalsDiff: 12,
                    form: "WWDLW",
                    description: "Promotion - Champions League",
                    team: { id: 10, name: "Home FC" },
                    all: {
                      played: 20,
                      win: 12,
                      draw: 4,
                      lose: 4,
                      goals: { for: 30, against: 18 },
                    },
                    home: {
                      played: 10,
                      win: 7,
                      draw: 2,
                      lose: 1,
                      goals: { for: 18, against: 7 },
                    },
                    away: {
                      played: 10,
                      win: 5,
                      draw: 2,
                      lose: 3,
                      goals: { for: 12, against: 11 },
                    },
                  },
                ],
              ],
            },
          },
        ],
      },
      {
        competitionId: "39",
        competitionName: "Premier League",
        season: 2026,
        providerMethod: "http-live",
      },
    );

    expect(standings?.rows[0]?.form).toBe("WWDLW");
    expect(standings?.rows[0]?.home?.won).toBe(7);
    expect(standings?.rows[0]?.description).toBe("Promotion - Champions League");

    const records = mapClubIntelligenceFromStandings(standings, {
      homeTeamId: "10",
      awayTeamId: "20",
      homeTeamName: "Home FC",
      awayTeamName: "Away FC",
      observedAt: "2026-08-01T12:00:00.000Z",
      providerMethod: "http-live",
      managers: [
        {
          teamId: "10",
          teamSide: "home",
          managerName: "Alex Manager",
          managerStartDate: "2025-01-01",
          managerTenureDays: 577,
        },
      ],
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.metrics.leagueRank).toBe(2);
    expect(records[0]?.metrics.currentForm).toBe("WWDLW");
    expect(records[0]?.metrics.homeWins).toBe(7);
    expect(records[0]?.metrics.managerName).toBe("Alex Manager");
    expect(records[0]?.metrics.promotionRelegationStatus).toBe(
      "Promotion - Champions League",
    );
  });

  it("maps coach tenure only when career start is present", () => {
    const manager = mapApiFootballCoachResponse(
      {
        response: [
          {
            name: "Kim Coach",
            career: [
              {
                team: { id: 2766 },
                start: "2024-01-15",
                end: null,
              },
            ],
          },
        ],
      },
      {
        teamId: "2766",
        teamSide: "home",
        observedAt: "2026-07-01T10:00:00.000Z",
      },
    );

    expect(manager?.managerName).toBe("Kim Coach");
    expect(manager?.managerStartDate).toBe("2024-01-15");
    expect(manager?.managerTenureDays).toBe(898);
  });

  it("emits CLUB_INTELLIGENCE Evidence from recorded cassette with provenance", () => {
    const catalog = new RecordedFootballCatalog();
    const bundle = catalog.getMatchBundle("football:100001");
    expect(bundle).toBeDefined();
    if (bundle === undefined) {
      return;
    }

    expect(bundle.clubIntelligence.length).toBe(2);
    expect(bundle.clubIntelligence[0]?.metrics.managerName).toBeDefined();

    const normalized = normalizeFixtureEvidenceSet(toEvidenceMatchShape(bundle), {
      collectedAt: "2026-07-23T12:00:00.000Z",
    });

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const club = normalized.value.filter(
      (item) => item.type === "CLUB_INTELLIGENCE",
    );
    expect(club.length).toBe(2);
    expect(club[0]?.payload).toMatchObject({
      window: "season",
      metrics: expect.objectContaining({
        leagueRank: expect.any(Number),
        leaguePoints: expect.any(Number),
      }),
    });
    expect(club[0]?.source).toBe("api-football");
    expect(club[0]?.provenance.method).toBe("recorded-snapshot");
  });

  it("keeps honest absence when standings are missing", () => {
    const records = mapClubIntelligenceFromStandings(undefined, {
      homeTeamId: "10",
      awayTeamId: "20",
      homeTeamName: "Home FC",
      awayTeamName: "Away FC",
      observedAt: "2026-08-01T12:00:00.000Z",
      providerMethod: "http-live",
    });

    expect(records).toEqual([]);
  });
});
