import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeFixtureEvidenceSet } from "../src/index.js";
import { describe, expect, it } from "vitest";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const livManifest = JSON.parse(
  readFileSync(
    join(
      fixtureDir,
      "../../../docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/2026-09-15-liv-tot-lottery-manifest.v1.json",
    ),
    "utf8",
  ),
) as { matches: [{ teamForm: unknown; statistics: unknown }] };

const livCore = {
  teamForm: livManifest.matches[0].teamForm,
  statistics: livManifest.matches[0].statistics,
};

describe("Lottery multi-ODDS evidence identity (PVS-4 remediation)", () => {
  it("T01 same providerSource + different providerSourceId → two ODDS rows", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "lottery:csl:20260915:周二011",
        home: "利物浦",
        away: "热刺",
        kickoff: "2026-09-16T03:00:00+08:00",
        ...livCore,
        odds: {
          homeOdds: 1.62,
          drawOdds: 3.82,
          awayOdds: 4,
          observedAt: "2026-09-15T14:08:00+08:00",
          marketSource: "lottery-official",
          providerSource: "china-sports-lottery",
          providerSourceId: "lottery:20260915:周二011:1x2",
          providerMethod: "lottery-manifest",
        },
        additionalOdds: [
          {
            homeOdds: 2.78,
            drawOdds: 3.65,
            awayOdds: 2.02,
            observedAt: "2026-09-15T14:08:00+08:00",
            marketSource: "lottery-official-handicap-result-minus-one",
            providerSource: "china-sports-lottery",
            providerSourceId: "lottery:20260915:周二011:handicap-result-1",
            providerMethod: "lottery-manifest",
          },
        ],
      },
      { collectedAt: "2026-09-15T14:08:00+08:00" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const odds = result.value.filter((item) => item.type === "ODDS");
    expect(odds).toHaveLength(2);
    expect(new Set(odds.map((item) => item.id)).size).toBe(2);
    expect(odds.map((item) => item.sourceId).sort()).toEqual(
      [
        "lottery:20260915:周二011:1x2",
        "lottery:20260915:周二011:handicap-result-1",
      ].sort(),
    );
  });

  it("T03 handicap-result is not normalized as Asian Handicap", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "lottery:csl:20260915:周二011",
        home: "利物浦",
        away: "热刺",
        kickoff: "2026-09-16T03:00:00+08:00",
        ...livCore,
        odds: {
          homeOdds: 2.78,
          drawOdds: 3.65,
          awayOdds: 2.02,
          observedAt: "2026-09-15T14:08:00+08:00",
          marketSource: "lottery-official-handicap-result-minus-one",
          providerSource: "china-sports-lottery",
          providerSourceId: "lottery:20260915:周二011:handicap-result-1",
          providerMethod: "lottery-manifest",
        },
      },
      { collectedAt: "2026-09-15T14:08:00+08:00" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const handicap = result.value.find((item) => item.type === "ODDS");
    expect(handicap?.payload).not.toHaveProperty("asianHandicapLine");
    expect(handicap?.payload).not.toHaveProperty("asianHandicapHomeOdds");
  });

  it("T05 reordering additionalOdds keeps stable Evidence ids", () => {
    const base = {
      matchId: "lottery:csl:20260915:周二011",
      home: "利物浦",
      away: "热刺",
      kickoff: "2026-09-16T03:00:00+08:00",
      ...livCore,
      odds: {
        homeOdds: 1.62,
        drawOdds: 3.82,
        awayOdds: 4,
        observedAt: "2026-09-15T14:08:00+08:00",
        marketSource: "lottery-official",
        providerSource: "china-sports-lottery",
        providerSourceId: "lottery:20260915:周二011:1x2",
        providerMethod: "lottery-manifest",
      },
    };

    const a = normalizeFixtureEvidenceSet(
      {
        ...base,
        additionalOdds: [
          {
            homeOdds: 2.78,
            drawOdds: 3.65,
            awayOdds: 2.02,
            observedAt: "2026-09-15T14:08:00+08:00",
            marketSource: "lottery-official-handicap-result-minus-one",
            providerSource: "china-sports-lottery",
            providerSourceId: "lottery:20260915:周二011:handicap-result-1",
            providerMethod: "lottery-manifest",
          },
          {
            homeOdds: 1.8,
            drawOdds: 3.75,
            awayOdds: 4.1,
            observedAt: "2026-09-15T14:08:00+08:00",
            marketSource: "oddssafari-efl-cup",
            providerSource: "oddssafari.com",
            providerSourceId: "oddssafari:liverpool-tottenham-efl-cup:2026-09-15",
            providerMethod: "public-odds-comparison-page",
            asianHandicapLine: -1,
            asianHandicapHomeOdds: 2.25,
            asianHandicapAwayOdds: 1.63,
            overUnderLine: 3.5,
            overOdds: 2.25,
            underOdds: 1.67,
          },
        ],
      },
      { collectedAt: "2026-09-15T14:08:00+08:00" },
    );

    const b = normalizeFixtureEvidenceSet(
      {
        ...base,
        additionalOdds: [
          {
            homeOdds: 1.8,
            drawOdds: 3.75,
            awayOdds: 4.1,
            observedAt: "2026-09-15T14:08:00+08:00",
            marketSource: "oddssafari-efl-cup",
            providerSource: "oddssafari.com",
            providerSourceId: "oddssafari:liverpool-tottenham-efl-cup:2026-09-15",
            providerMethod: "public-odds-comparison-page",
            asianHandicapLine: -1,
            asianHandicapHomeOdds: 2.25,
            asianHandicapAwayOdds: 1.63,
            overUnderLine: 3.5,
            overOdds: 2.25,
            underOdds: 1.67,
          },
          {
            homeOdds: 2.78,
            drawOdds: 3.65,
            awayOdds: 2.02,
            observedAt: "2026-09-15T14:08:00+08:00",
            marketSource: "lottery-official-handicap-result-minus-one",
            providerSource: "china-sports-lottery",
            providerSourceId: "lottery:20260915:周二011:handicap-result-1",
            providerMethod: "lottery-manifest",
          },
        ],
      },
      { collectedAt: "2026-09-15T14:08:00+08:00" },
    );

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) {
      return;
    }

    const idsA = a.value
      .filter((e) => e.type === "ODDS")
      .map((e) => e.id)
      .sort();
    const idsB = b.value
      .filter((e) => e.type === "ODDS")
      .map((e) => e.id)
      .sort();
    expect(idsA).toEqual(idsB);
  });

  it("T06 single-ODDS fixture manifest keeps legacy id shape", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "match-example",
        home: "A",
        away: "B",
        kickoff: "2026-08-01T19:30:00Z",
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
            windowMatches: 1,
            shotsForPerMatch: 10,
            shotsAgainstPerMatch: 8,
            xgForPerMatch: 1,
            xgAgainstPerMatch: 1,
          },
          {
            teamSide: "away",
            windowMatches: 1,
            shotsForPerMatch: 8,
            shotsAgainstPerMatch: 10,
            xgForPerMatch: 1,
            xgAgainstPerMatch: 1,
          },
        ],
        odds: {
          homeOdds: 2,
          drawOdds: 3,
          awayOdds: 4,
          observedAt: "2026-07-18T12:00:00Z",
        },
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const odds = result.value.find((item) => item.type === "ODDS");
    expect(odds?.id).toBe("evidence-fixture-match-example-odds");
  });
});
