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
