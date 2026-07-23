import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { configureOpenApi } from "../src/openapi.js";

const importedEvidenceId = "evidence-fixture-match-example";
const demoMatches = [
  {
    matchId: "match-example-1",
    home: "Liverpool",
    away: "Chelsea",
    kickoff: "2026-08-01T19:30:00Z",
  },
  {
    matchId: "match-example-2",
    home: "Arsenal",
    away: "Coventry City",
    kickoff: "2026-08-21T19:00:00Z",
  },
  {
    matchId: "match-example-3",
    home: "Barcelona",
    away: "Real Madrid",
    kickoff: "2026-08-01T20:30:00Z",
  },
  {
    matchId: "match-example-4",
    home: "Bayern Munich",
    away: "Borussia Dortmund",
    kickoff: "2026-08-01T18:30:00Z",
  },
  {
    matchId: "match-example-5",
    home: "PSG",
    away: "Marseille",
    kickoff: "2026-08-01T21:00:00Z",
  },
  {
    matchId: "match-example-6",
    home: "Inter Milan",
    away: "Juventus",
    kickoff: "2026-08-01T19:45:00Z",
  },
] as const;

interface HttpResponse {
  readonly body: unknown;
  readonly status: number;
}

async function request(
  baseUrl: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<HttpResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers:
      body === undefined
        ? undefined
        : {
            "content-type": "application/json",
          },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    body: (await response.json()) as unknown,
    status: response.status,
  };
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a JSON object.");
  }

  return value as Record<string, unknown>;
}

describe("HTTP import and Evidence query workflow", () => {
  let app: INestApplication | undefined;
  let baseUrl = "";

  beforeEach(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureOpenApi(app);
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app?.close();
  });

  it("serves the interactive Swagger UI", async () => {
    const response = await fetch(`${baseUrl}/docs`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Swagger UI");
  });

  it("imports a fixture Match successfully", async () => {
    const response = await request(
      baseUrl,
      "/api/import/match/match-example",
      "POST",
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      value: {
        id: importedEvidenceId,
        matchId: "match-example",
        source: "fixture",
        type: "MATCH_INFO",
      },
    });
  });

  it("overlays recorded external ODDS provenance for mapped demo matches", async () => {
    await request(baseUrl, "/api/import/match/match-example", "POST");
    const response = await request(baseUrl, "/api/evidence/match/match-example");
    const body = requireRecord(response.body);
    const evidences = body.value;

    expect(response.status).toBe(200);
    expect(Array.isArray(evidences)).toBe(true);

    if (!Array.isArray(evidences)) {
      throw new Error("Expected evidence array.");
    }

    const odds = evidences.find((item) => requireRecord(item).type === "ODDS");

    expect(odds).toMatchObject({
      type: "ODDS",
      source: "the-odds-api",
      provenance: {
        method: "recorded-snapshot",
      },
      payload: {
        asianHandicapLine: -0.75,
        asianHandicapHomeOdds: 1.75,
        asianHandicapAwayOdds: 2.2,
      },
    });
  });

  it("surfaces Asian handicap features for recorded overlay matches", async () => {
    const response = await request(
      baseUrl,
      "/api/analyze/match/match-example",
      "POST",
    );
    const report = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(report.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "asianHandicapLine", value: -0.75 }),
        expect.objectContaining({ name: "asianHandicapLean" }),
      ]),
    );
    expect(report.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleName: "MARKET_AH_LEAN_HOME",
          status: "PASS",
          channel: "none",
        }),
      ]),
    );
  });

  it("runs the complete deterministic analysis and returns AnalysisReport JSON", async () => {
    const response = await request(
      baseUrl,
      "/api/analyze/match/match-example",
      "POST",
    );
    const report = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(report).toMatchObject({
      reportId: "report:match-example:2026-07-17T10:00:00Z",
      matchId: "match-example",
      generatedAt: "2026-07-17T10:00:00Z",
    });
    expect(report.summary).toEqual(
      expect.arrayContaining([
        "Match information is complete.",
        "Home team extracted from MATCH_INFO.",
        "Away team extracted from MATCH_INFO.",
        "Kickoff extracted from MATCH_INFO.",
      ]),
    );
    expect(report.deterministic).toMatchObject({
      status: "completed_nonempty",
      calibrationArtifactId: "calibration:population-demo:v1",
      calibrationStatus: "computed_candidate",
      calibrationQualified: false,
    });
    expect(report.narrative).toMatchObject({
      epistemicKind: "inference",
      providerId: "local_deterministic_v1",
    });
    const narrative = requireRecord(report.narrative);
    expect(narrative.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Overview",
          body: expect.stringContaining("Most Likely"),
        }),
        expect.objectContaining({ title: "Key Factors" }),
        expect.objectContaining({ title: "Recommended Score" }),
      ]),
    );
    expect(report.scenarios).toMatchObject({
      policyVersion: "scenario.mvp.a05",
      mostLikely: expect.objectContaining({ slot: "mostLikely" }),
      secondLikely: expect.objectContaining({ slot: "secondLikely" }),
      upset: expect.objectContaining({ slot: "upset" }),
    });
    expect(report.intelligenceConfidence).toMatchObject({
      policyVersion: "confidence.mvp.a05",
    });
    expect(report.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "homeTeam", value: "Liverpool" }),
        expect.objectContaining({ name: "awayTeam", value: "Chelsea" }),
        expect.objectContaining({
          name: "kickoff",
          value: "2026-08-01T19:30:00Z",
        }),
        expect.objectContaining({ name: "attackRatingHome" }),
        expect.objectContaining({ name: "h2hLean" }),
        expect.objectContaining({ name: "h2hSampleSize", value: 5 }),
        expect.objectContaining({ name: "marketLean" }),
        expect.objectContaining({ name: "marketImpliedHome" }),
      ]),
    );
    expect(report.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleName: "HOME_TEAM_PRESENT",
          status: "PASS",
        }),
        expect.objectContaining({
          ruleName: "AWAY_TEAM_PRESENT",
          status: "PASS",
        }),
        expect.objectContaining({
          ruleName: "KICKOFF_PRESENT",
          status: "PASS",
        }),
        expect.objectContaining({
          ruleName: "H2H_SUPPORTS_HOME",
          status: "PASS",
        }),
        expect.objectContaining({
          ruleName: "MARKET_LEAN_HOME",
          status: "PASS",
        }),
      ]),
    );

    const openApiResponse = await request(baseUrl, "/docs-json");
    const openApi = requireRecord(openApiResponse.body);
    const paths = requireRecord(openApi.paths);
    expect(paths).toHaveProperty("/api/analyze/match/{matchId}");
    expect(paths).toHaveProperty("/api/v1/match-analysis");
    expect(paths).toHaveProperty("/api/matches/upcoming");
  });

  it("analyses IFK Mariehamn vs FC Lahti via POST /api/v1/match-analysis", async () => {
    const response = await request(baseUrl, "/api/v1/match-analysis", "POST", {
      matchId: "football:244001",
    });
    const report = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(report).toMatchObject({
      matchId: "football:244001",
    });
    expect(report.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "homeTeam",
          value: "IFK Mariehamn",
        }),
        expect.objectContaining({
          name: "awayTeam",
          value: "FC Lahti",
        }),
        expect.objectContaining({ name: "recentFormHome" }),
        expect.objectContaining({ name: "recentFormAway" }),
        expect.objectContaining({ name: "venueAdvantage" }),
        expect.objectContaining({ name: "availabilityPenaltyAway" }),
        expect.objectContaining({ name: "momentum" }),
      ]),
    );
    expect(report.features).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "availabilityPenaltyHome" }),
      ]),
    );
    expect(report.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleName: "AVAILABILITY_HOME_UNKNOWN",
          status: "PASS",
        }),
        expect.objectContaining({
          ruleName: "VENUE_SUPPORTS_HOME",
          status: "PASS",
        }),
      ]),
    );
    expect(report.scenarios).toMatchObject({
      policyVersion: "scenario.mvp.a05",
      mostLikely: expect.objectContaining({ slot: "mostLikely" }),
      secondLikely: expect.objectContaining({ slot: "secondLikely" }),
      upset: expect.objectContaining({ slot: "upset" }),
    });
    expect(report.intelligenceConfidence).toMatchObject({
      policyVersion: "confidence.mvp.a05",
    });
    expect(
      typeof requireRecord(report.intelligenceConfidence).predictionConfidence,
    ).toBe("number");
    const narrative = requireRecord(report.narrative);
    expect(narrative.providerId).toBe("local_deterministic_v1");
    expect(narrative.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Overview" }),
        expect.objectContaining({ title: "Key Factors" }),
        expect.objectContaining({ title: "Strength Comparison" }),
        expect.objectContaining({ title: "Risk Analysis" }),
        expect.objectContaining({ title: "Prediction" }),
        expect.objectContaining({ title: "Recommended Score" }),
      ]),
    );
    expect(String(narrative.disclaimer)).toContain("no LLM");
  });

  it("lists upcoming Match Center fixtures from the recorded football-data board", async () => {
    const response = await request(baseUrl, "/api/matches/upcoming");
    const body = requireRecord(response.body);
    const value = body.value;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(value)).toBe(true);
    expect(body.meta).toEqual({
      oddsProviderMode: "recorded",
      footballDataProviderMode: "recorded",
      scheduleSource: "football-data",
      usedRecordedFallback: false,
    });
    expect(value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          matchId: "football:100001",
          homeTeam: "FC Seoul",
          awayTeam: "Ulsan Hyundai FC",
          analyzable: true,
          providerSource: "api-football",
        }),
        expect.objectContaining({
          matchId: "match-example-3",
          analyzable: true,
          providerSource: "fixture",
        }),
      ]),
    );
  });

  it("analyzes a recorded football-data match with shots-based statistics", async () => {
    const response = await request(
      baseUrl,
      "/api/analyze/match/football:100001",
      "POST",
    );
    const report = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(report).toMatchObject({
      matchId: "football:100001",
    });
    expect(report.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "homeTeam", value: "FC Seoul" }),
        expect.objectContaining({ name: "awayTeam", value: "Ulsan Hyundai FC" }),
        expect.objectContaining({ name: "momentumHome" }),
        expect.objectContaining({ name: "attackRatingHome" }),
      ]),
    );
  });

  it("analyzes an odds-event match using scores-backed form and goals-proxy stats", async () => {
    await request(baseUrl, "/api/matches/upcoming");
    const response = await request(
      baseUrl,
      "/api/analyze/match/odds:evt_epl_unmapped_tottenham_everton",
      "POST",
    );
    const report = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(report).toMatchObject({
      matchId: "odds:evt_epl_unmapped_tottenham_everton",
    });
    expect(report.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "homeTeam", value: "Tottenham Hotspur" }),
        expect.objectContaining({ name: "awayTeam", value: "Everton" }),
        expect.objectContaining({ name: "momentumHome" }),
        expect.objectContaining({ name: "attackRatingHome" }),
      ]),
    );
    const deterministic = requireRecord(report.deterministic);
    expect(deterministic.limitations).toEqual(
      expect.arrayContaining([
        "STATISTICS shots/xG fields are goals-implied proxies from Odds API scores; not provider shot/xG measurements.",
      ]),
    );
  });

  it("analyzes every demo fixture through the complete pipeline", async () => {
    for (const match of demoMatches) {
      const response = await request(
        baseUrl,
        `/api/analyze/match/${match.matchId}`,
        "POST",
      );
      const report = requireRecord(response.body);

      expect(response.status).toBe(200);
      expect(report).toMatchObject({
        matchId: match.matchId,
      });
      expect(report.summary).toEqual(
        expect.arrayContaining([
          "Match information is complete.",
          "Home team extracted from MATCH_INFO.",
          "Away team extracted from MATCH_INFO.",
          "Kickoff extracted from MATCH_INFO.",
        ]),
      );
      expect(report.features).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "homeTeam",
            value: match.home,
          }),
          expect.objectContaining({
            name: "awayTeam",
            value: match.away,
          }),
          expect.objectContaining({
            name: "kickoff",
            value: match.kickoff,
          }),
          expect.objectContaining({ name: "attackRatingHome" }),
          expect.objectContaining({ name: "homeAdvantage" }),
          expect.objectContaining({ name: "h2hLean" }),
          expect.objectContaining({ name: "h2hSampleSize" }),
          expect.objectContaining({ name: "marketLean" }),
        ]),
      );
      expect(report.rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleName: "HOME_TEAM_PRESENT",
            status: "PASS",
          }),
          expect.objectContaining({
            ruleName: "AWAY_TEAM_PRESENT",
            status: "PASS",
          }),
          expect.objectContaining({
            ruleName: "KICKOFF_PRESENT",
            status: "PASS",
          }),
          expect.objectContaining({
            ruleName: "HOME_ADVANTAGE_MATERIAL",
          }),
          expect.objectContaining({
            ruleName: "H2H_SUPPORTS_HOME",
          }),
          expect.objectContaining({
            ruleName: "H2H_SUPPORTS_AWAY",
          }),
          expect.objectContaining({
            ruleName: "MARKET_LEAN_HOME",
          }),
          expect.objectContaining({
            ruleName: "MARKET_LEAN_AWAY",
          }),
        ]),
      );
      expect(report.deterministic).toMatchObject({
        status: "completed_nonempty",
        projectionModelVersion: "projection.v2.i2b.market",
      });
      const deterministic = requireRecord(report.deterministic);
      expect(
        Number(deterministic.pHome) +
          Number(deterministic.pDraw) +
          Number(deterministic.pAway),
      ).toBeCloseTo(1, 9);
    }
  });

  it("keeps the market-away conflict fixture cautious under population calibration", async () => {
    const response = await request(
      baseUrl,
      "/api/analyze/match/match-example-1",
      "POST",
    );
    const report = requireRecord(response.body);
    const deterministic = requireRecord(report.deterministic);

    expect(response.status).toBe(200);
    expect(report.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleName: "H2H_SUPPORTS_HOME",
          status: "PASS",
        }),
        expect.objectContaining({
          ruleName: "MARKET_LEAN_AWAY",
          status: "PASS",
        }),
      ]),
    );
    expect(deterministic.recommendation).toBe("cautious");
    expect(deterministic.calibrationArtifactId).toBe(
      "calibration:population-demo:v1",
    );
    expect(deterministic.calibrationStatus).toBe("computed_candidate");
    expect(deterministic.calibrationQualified).toBe(false);
    // Conflict gate uses post-calibration football lean; when multipliers remove
    // the conflict, cautious may come from confidence/policy instead.
    expect(deterministic.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Frequency-ratio 1X2 calibration"),
      ]),
    );
  });

  it("returns a typed failure for an unknown Match", async () => {
    const response = await request(
      baseUrl,
      "/api/import/match/match-unknown",
      "POST",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      error: {
        code: "MATCH_NOT_FOUND",
        message: 'Match "match-unknown" was not found.',
      },
      ok: false,
    });
  });

  it("treats repeated imports as idempotent successes", async () => {
    await request(baseUrl, "/api/import/match/match-example", "POST");

    const response = await request(
      baseUrl,
      "/api/import/match/match-example",
      "POST",
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      value: {
        id: importedEvidenceId,
        matchId: "match-example",
        type: "MATCH_INFO",
      },
    });
  });

  it("queries imported Evidence by id", async () => {
    await request(baseUrl, "/api/import/match/match-example", "POST");

    const response = await request(baseUrl, `/api/evidence/${importedEvidenceId}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      value: {
        id: importedEvidenceId,
        matchId: "match-example",
        type: "MATCH_INFO",
      },
    });
  });

  it("queries imported Evidence by MatchId", async () => {
    await request(baseUrl, "/api/import/match/match-example", "POST");

    const response = await request(baseUrl, "/api/evidence/match/match-example");
    const body = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: importedEvidenceId,
          matchId: "match-example",
          type: "MATCH_INFO",
        }),
      ]),
    );
  });
});
