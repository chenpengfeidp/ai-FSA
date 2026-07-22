import type { JsonObject } from "@fas/domain";
import { createEvidence, type Evidence, type EvidenceType } from "@fas/evidence";
import { createMatchId, type MatchId } from "@fas/match";
import { describe, expect, it } from "vitest";
import { FeatureExtractionError, FeatureExtractor } from "../src/index.js";

interface EvidenceOptions {
  readonly matchId?: MatchId | null;
  readonly payload?: JsonObject;
  readonly type?: EvidenceType;
}

function makeEvidence(options: EvidenceOptions = {}): Evidence {
  const matchId =
    options.matchId === undefined ? createMatchId("match-1") : options.matchId;

  return createEvidence({
    id: "evidence-1",
    source: "fixture",
    sourceId: "fixture-match-1",
    type: options.type ?? "MATCH_INFO",
    ...(matchId === null ? {} : { matchId }),
    collectedAt: "2026-07-17T10:00:00Z",
    eventTime: "2026-08-01T19:30:00Z",
    freshness: "fresh",
    quality: "unverified",
    provenance: {
      collector: "@fas/evidence-normalizer",
      method: "fixture",
    },
    payload: options.payload ?? {
      away: "Chelsea",
      home: "Liverpool",
      kickoff: "2026-08-01T19:30:00Z",
    },
  });
}

describe("FeatureExtractor", () => {
  it("extracts ordered MATCH_INFO Features without inference", () => {
    const evidence = makeEvidence();
    const extractor = new FeatureExtractor();

    const features = extractor.extract(evidence);

    expect(features).toEqual([
      {
        featureId: "feature:evidence-1:homeTeam",
        matchId: "match-1",
        name: "homeTeam",
        value: "Liverpool",
        explanation: "Home team extracted from MATCH_INFO.",
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      },
      {
        featureId: "feature:evidence-1:awayTeam",
        matchId: "match-1",
        name: "awayTeam",
        value: "Chelsea",
        explanation: "Away team extracted from MATCH_INFO.",
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      },
      {
        featureId: "feature:evidence-1:kickoff",
        matchId: "match-1",
        name: "kickoff",
        value: "2026-08-01T19:30:00Z",
        explanation: "Kickoff extracted from MATCH_INFO.",
        sourceEvidenceId: "evidence-1",
        generatedAt: "2026-07-17T10:00:00Z",
      },
    ]);
  });

  it("is deterministic for the same Evidence", () => {
    const evidence = makeEvidence();
    const extractor = new FeatureExtractor();

    const first = extractor.extract(evidence);
    const second = extractor.extract(evidence);

    expect(second).toEqual(first);
    expect(second.map(({ featureId }) => featureId)).toEqual(
      first.map(({ featureId }) => featureId),
    );
  });

  it("never mutates source Evidence", () => {
    const evidence = makeEvidence();
    const snapshot = JSON.stringify(evidence);

    new FeatureExtractor().extract(evidence);

    expect(JSON.stringify(evidence)).toBe(snapshot);
  });

  it("returns an immutable empty array for unsupported Evidence types", () => {
    const features = new FeatureExtractor().extract(makeEvidence({ type: "ODDS" }));

    expect(features).toEqual([]);
    expect(Object.isFrozen(features)).toBe(true);
  });

  it("requires MATCH_INFO Evidence to reference a MatchId", () => {
    const extractor = new FeatureExtractor();

    expect(() => extractor.extract(makeEvidence({ matchId: null }))).toThrow(
      FeatureExtractionError,
    );

    try {
      extractor.extract(makeEvidence({ matchId: null }));
    } catch (error: unknown) {
      expect(error).toMatchObject({
        code: "MATCH_ID_REQUIRED",
        field: "matchId",
      });
    }
  });

  it.each([
    "home",
    "away",
    "kickoff",
  ] as const)("rejects an invalid %s payload field", (field) => {
    const payload = {
      away: "Chelsea",
      home: "Liverpool",
      kickoff: "2026-08-01T19:30:00Z",
      [field]: " ",
    };
    const extractor = new FeatureExtractor();

    expect(() => extractor.extract(makeEvidence({ payload }))).toThrow(
      FeatureExtractionError,
    );

    try {
      extractor.extract(makeEvidence({ payload }));
    } catch (error: unknown) {
      expect(error).toMatchObject({
        code: "MATCH_INFO_FIELD_INVALID",
        field,
      });
    }
  });

  it("returns an immutable Feature collection", () => {
    const features = new FeatureExtractor().extract(makeEvidence());

    expect(Object.isFrozen(features)).toBe(true);
    expect(features.every(Object.isFrozen)).toBe(true);
  });

  it("extracts market lean features from ODDS evidence", () => {
    const matchInfo = makeEvidence();
    const odds = createEvidence({
      id: "evidence-odds",
      source: "fixture",
      sourceId: "fixture-match-1-odds",
      type: "ODDS",
      matchId: createMatchId("match-1"),
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        homeOdds: 3.6,
        drawOdds: 3.4,
        awayOdds: 2.05,
        observedAt: "2026-07-18T12:00:00Z",
      },
    });
    const bundle = new FeatureExtractor().extractBundle([matchInfo, odds]);

    expect(bundle.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "marketLean",
          sourceEvidenceId: "evidence-odds",
        }),
        expect.objectContaining({
          name: "marketImpliedAway",
          sourceEvidenceId: "evidence-odds",
        }),
      ]),
    );
    const lean = bundle.features.find((feature) => feature.name === "marketLean");
    expect(typeof lean?.value).toBe("number");
    expect(Number(lean?.value)).toBeLessThan(0);
  });

  it("extracts Asian handicap features when AH fields are present on ODDS", () => {
    const matchInfo = makeEvidence();
    const odds = createEvidence({
      id: "evidence-odds-ah",
      source: "the-odds-api",
      sourceId: "evt:pinnacle:h2h+spreads",
      type: "ODDS",
      matchId: createMatchId("match-1"),
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "recorded-snapshot",
      },
      payload: {
        homeOdds: 1.55,
        drawOdds: 4.2,
        awayOdds: 5.8,
        observedAt: "2026-07-18T12:00:00Z",
        asianHandicapLine: -0.75,
        asianHandicapHomeOdds: 1.75,
        asianHandicapAwayOdds: 2.2,
      },
    });
    const bundle = new FeatureExtractor().extractBundle([matchInfo, odds]);

    expect(bundle.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "asianHandicapLine",
          value: -0.75,
        }),
        expect.objectContaining({
          name: "asianHandicapLean",
          sourceEvidenceId: "evidence-odds-ah",
        }),
      ]),
    );
  });

  it("extracts venueAdvantage, recentForm, and availabilityPenalty for the intelligence MVP", () => {
    const matchId = createMatchId("match-1");
    const matchInfo = makeEvidence();
    const homeForm = createEvidence({
      id: "evidence-form-home",
      source: "fixture",
      sourceId: "fixture-match-1-form-home",
      type: "TEAM_FORM",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "home",
        results: ["W", "W", "D", "W", "L"],
        goalsFor: [2, 1, 1, 3, 0],
        goalsAgainst: [0, 0, 1, 1, 2],
        homeSplit: { results: ["W", "W", "D"], window: 3 },
        awaySplit: { results: ["W", "L"], window: 2 },
        recentShort: { results: ["W", "W", "D"], window: 3 },
        goalsScoredPerMatch: 1.4,
        goalsConcededPerMatch: 0.8,
      },
    });
    const awayForm = createEvidence({
      id: "evidence-form-away",
      source: "fixture",
      sourceId: "fixture-match-1-form-away",
      type: "TEAM_FORM",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "away",
        results: ["L", "D", "L", "W", "L"],
        goalsFor: [0, 1, 0, 2, 1],
        goalsAgainst: [2, 1, 3, 1, 2],
        homeSplit: { results: ["L", "D"], window: 2 },
        awaySplit: { results: ["L", "W", "L"], window: 3 },
        recentShort: { results: ["L", "D", "L"], window: 3 },
        goalsScoredPerMatch: 0.8,
        goalsConcededPerMatch: 1.8,
      },
    });
    const sideStats = (side: "away" | "home", id: string): Evidence =>
      createEvidence({
        id,
        source: "fixture",
        sourceId: `${id}-source`,
        type: "STATISTICS",
        matchId,
        collectedAt: "2026-07-17T10:00:00Z",
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide: side,
          windowMatches: 5,
          shotsForPerMatch: side === "home" ? 14 : 10,
          shotsAgainstPerMatch: side === "home" ? 9 : 13,
          xgForPerMatch: side === "home" ? 1.6 : 1.1,
          xgAgainstPerMatch: side === "home" ? 1.0 : 1.5,
          advanced: {
            scope: "fixture",
            shotsTotal: side === "home" ? 14 : 9,
            shotsOnTarget: side === "home" ? 6 : 3,
            possessionPct: side === "home" ? 58 : 42,
            corners: side === "home" ? 7 : 3,
            dangerousAttacks: side === "home" ? 52 : 35,
            yellowCards: side === "home" ? 1 : 3,
            redCards: 0,
            fouls: side === "home" ? 10 : 14,
          },
        },
      });
    const venue = createEvidence({
      id: "evidence-venue",
      source: "fixture",
      sourceId: "fixture-match-1-venue",
      type: "VENUE",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        name: "Test Stadium",
        city: "Test City",
      },
    });
    const injury = createEvidence({
      id: "evidence-injury-home",
      source: "fixture",
      sourceId: "fixture-match-1-injury-home",
      type: "INJURY",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "home",
        playerName: "Player A",
        status: "out",
      },
    });

    const bundle = new FeatureExtractor().extractBundle([
      matchInfo,
      homeForm,
      awayForm,
      sideStats("home", "evidence-stats-home"),
      sideStats("away", "evidence-stats-away"),
      venue,
      injury,
    ]);

    expect(bundle.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "venueAdvantage",
          value: 8,
          sourceEvidenceId: "evidence-venue",
        }),
        expect.objectContaining({
          name: "recentFormHome",
          sourceEvidenceId: "evidence-form-home",
        }),
        expect.objectContaining({
          name: "recentFormAway",
          sourceEvidenceId: "evidence-form-away",
        }),
        expect.objectContaining({
          name: "formAtHomeHome",
          sourceEvidenceId: "evidence-form-home",
        }),
        expect.objectContaining({
          name: "formOnRoadAway",
          sourceEvidenceId: "evidence-form-away",
        }),
        expect.objectContaining({
          name: "goalsScoredRateHome",
          value: 1.4,
        }),
        expect.objectContaining({
          name: "goalsScoredRateAway",
          value: 0.8,
        }),
        expect.objectContaining({
          name: "attackEfficiencyHome",
          sourceEvidenceId: "evidence-stats-home",
        }),
        expect.objectContaining({
          name: "possessionHome",
          value: 58,
          sourceEvidenceId: "evidence-stats-home",
        }),
        expect.objectContaining({
          name: "chanceCreationAway",
          sourceEvidenceId: "evidence-stats-away",
        }),
        expect.objectContaining({
          name: "disciplineRiskAway",
          sourceEvidenceId: "evidence-stats-away",
        }),
        expect.objectContaining({
          name: "availabilityPenaltyHome",
          value: 8,
          sourceEvidenceId: "evidence-injury-home",
        }),
      ]),
    );
    expect(bundle.featureModelVersion).toBe("feature.v2.f13b.xg");
    expect(
      bundle.features.some((feature) => feature.name === "availabilityPenaltyAway"),
    ).toBe(false);
  });

  it("extracts xG Features from EXPECTED_GOALS Evidence without fabricating", () => {
    const matchInfo = makeEvidence();
    const matchId = createMatchId("match-1");
    const homeForm = createEvidence({
      id: "evidence-form-home",
      source: "fixture",
      sourceId: "fixture-match-1-form-home",
      type: "TEAM_FORM",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "home",
        results: ["W", "W", "D", "W", "L"],
        goalsFor: [2, 1, 1, 3, 0],
        goalsAgainst: [0, 0, 1, 1, 2],
        goalsScoredPerMatch: 1.4,
        goalsConcededPerMatch: 0.8,
      },
    });
    const awayForm = createEvidence({
      id: "evidence-form-away",
      source: "fixture",
      sourceId: "fixture-match-1-form-away",
      type: "TEAM_FORM",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "away",
        results: ["L", "D", "L", "W", "L"],
        goalsFor: [0, 1, 0, 2, 1],
        goalsAgainst: [2, 1, 3, 1, 2],
        goalsScoredPerMatch: 0.8,
        goalsConcededPerMatch: 1.8,
      },
    });
    const sideStats = (side: "away" | "home", id: string): Evidence =>
      createEvidence({
        id,
        source: "fixture",
        sourceId: `${id}-source`,
        type: "STATISTICS",
        matchId,
        collectedAt: "2026-07-17T10:00:00Z",
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide: side,
          windowMatches: 5,
          shotsForPerMatch: side === "home" ? 14 : 10,
          shotsAgainstPerMatch: side === "home" ? 9 : 13,
          xgForPerMatch: 0,
          xgAgainstPerMatch: 0,
        },
      });
    const expectedGoals = (
      side: "away" | "home",
      id: string,
      xg: number,
      xga: number,
    ): Evidence =>
      createEvidence({
        id,
        source: "api-football",
        sourceId: `${id}-source`,
        type: "EXPECTED_GOALS",
        matchId,
        collectedAt: "2026-07-17T10:00:00Z",
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "recorded-snapshot",
        },
        payload: {
          teamId: side === "home" ? "10" : "20",
          teamName: side === "home" ? "Home FC" : "Away FC",
          teamSide: side,
          window: "overall",
          metrics: { xg, xga },
          observedAt: "2026-08-01T19:30:00Z",
        },
      });

    const bundle = new FeatureExtractor().extractBundle([
      matchInfo,
      homeForm,
      awayForm,
      sideStats("home", "evidence-stats-home"),
      sideStats("away", "evidence-stats-away"),
      expectedGoals("home", "evidence-xg-home", 1.6, 1.0),
      expectedGoals("away", "evidence-xg-away", 1.1, 1.5),
    ]);

    expect(bundle.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "xgAttackQualityHome",
          sourceEvidenceId: "evidence-xg-home",
        }),
        expect.objectContaining({
          name: "xgAttackQualityAway",
          sourceEvidenceId: "evidence-xg-away",
        }),
        expect.objectContaining({
          name: "xgDefenseQualityHome",
          sourceEvidenceId: "evidence-xg-home",
        }),
        expect.objectContaining({
          name: "xgDominance",
          value: 0.5,
        }),
        expect.objectContaining({
          name: "finishingEfficiencyHome",
          sourceEvidenceId: "evidence-xg-home",
        }),
      ]),
    );
    expect(bundle.featureModelVersion).toBe("feature.v2.f13b.xg");
  });

  it("keeps xG Features absent when EXPECTED_GOALS Evidence is missing", () => {
    const matchInfo = makeEvidence();
    const matchId = createMatchId("match-1");
    const homeForm = createEvidence({
      id: "evidence-form-home",
      source: "fixture",
      sourceId: "fixture-match-1-form-home",
      type: "TEAM_FORM",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "home",
        results: ["W"],
        goalsFor: [1],
        goalsAgainst: [0],
      },
    });
    const awayForm = createEvidence({
      id: "evidence-form-away",
      source: "fixture",
      sourceId: "fixture-match-1-form-away",
      type: "TEAM_FORM",
      matchId,
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        teamSide: "away",
        results: ["L"],
        goalsFor: [0],
        goalsAgainst: [1],
      },
    });
    const sideStats = (side: "away" | "home", id: string): Evidence =>
      createEvidence({
        id,
        source: "fixture",
        sourceId: `${id}-source`,
        type: "STATISTICS",
        matchId,
        collectedAt: "2026-07-17T10:00:00Z",
        eventTime: "2026-08-01T19:30:00Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide: side,
          windowMatches: 1,
          shotsForPerMatch: 10,
          shotsAgainstPerMatch: 10,
          xgForPerMatch: 0,
          xgAgainstPerMatch: 0,
        },
      });

    const bundle = new FeatureExtractor().extractBundle([
      matchInfo,
      homeForm,
      awayForm,
      sideStats("home", "evidence-stats-home"),
      sideStats("away", "evidence-stats-away"),
    ]);

    expect(bundle.features.some((feature) => feature.name.startsWith("xg"))).toBe(
      false,
    );
    expect(
      bundle.features.some((feature) =>
        feature.name.startsWith("finishingEfficiency"),
      ),
    ).toBe(false);
  });

  it("extracts h2hLean and h2hSampleSize from HEAD_TO_HEAD evidence", () => {
    const matchInfo = makeEvidence();
    const headToHead = createEvidence({
      id: "evidence-h2h",
      source: "fixture",
      sourceId: "fixture-match-1-h2h",
      type: "HEAD_TO_HEAD",
      matchId: createMatchId("match-1"),
      collectedAt: "2026-07-17T10:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        sampleSize: 4,
        meetings: [
          { playedAt: "2025-12-01T15:00:00Z", homeGoals: 2, awayGoals: 0 },
          { playedAt: "2025-05-10T15:00:00Z", homeGoals: 1, awayGoals: 0 },
          { playedAt: "2024-11-20T15:00:00Z", homeGoals: 2, awayGoals: 1 },
          { playedAt: "2024-04-02T15:00:00Z", homeGoals: 1, awayGoals: 1 },
        ],
      },
    });
    const bundle = new FeatureExtractor().extractBundle([matchInfo, headToHead]);

    expect(bundle.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "h2hLean",
          sourceEvidenceId: "evidence-h2h",
        }),
        expect.objectContaining({
          name: "h2hSampleSize",
          value: 4,
          sourceEvidenceId: "evidence-h2h",
        }),
      ]),
    );
  });
});
