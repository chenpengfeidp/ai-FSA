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
    away: "Manchester City",
    kickoff: "2026-08-01T20:00:00Z",
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
): Promise<HttpResponse> {
  const response = await fetch(`${baseUrl}${path}`, { method });

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
      ]),
    );

    const openApiResponse = await request(baseUrl, "/docs-json");
    const openApi = requireRecord(openApiResponse.body);
    const paths = requireRecord(openApi.paths);
    expect(paths).toHaveProperty("/api/analyze/match/{matchId}");
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
        ]),
      );
      expect(report.deterministic).toMatchObject({
        status: "completed_nonempty",
        projectionModelVersion: "projection.v2.slice1",
      });
      const deterministic = requireRecord(report.deterministic);
      expect(
        Number(deterministic.pHome) +
          Number(deterministic.pDraw) +
          Number(deterministic.pAway),
      ).toBeCloseTo(1, 9);
    }
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
