import "reflect-metadata";
import { DiscoverFixtureByTeamsUseCase } from "@fas/application";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnalysisController } from "../src/analysis.controller.js";
import { AppModule } from "../src/app.module.js";
import { configureOpenApi } from "../src/openapi.js";

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

  return value;
}

describe("PVS-1 production prediction vertical slice", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureOpenApi(app);
    await app.listen(0);
    const address = app.getHttpServer().address();

    if (typeof address !== "object" || address === null) {
      throw new Error("Unable to resolve test server address.");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it("resolves DiscoverFixtureByTeamsUseCase through AnalysisController at runtime", () => {
    expect(app.get(DiscoverFixtureByTeamsUseCase)).toBeInstanceOf(
      DiscoverFixtureByTeamsUseCase,
    );
    expect(app.get(AnalysisController)).toBeInstanceOf(AnalysisController);
  });

  it("uses projection policy pin v2 on matchId analyze and exposes V2 provenance", async () => {
    const response = await request(
      baseUrl,
      "/api/analyze/match/football:100001",
      "POST",
    );
    const report = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(report.matchId).toBe("football:100001");

    const provenance = requireRecord(report.analysisProvenance);
    expect(provenance.projectionPolicyPin).toBe("v2");
    expect(report.projectionFramework).toEqual(
      expect.objectContaining({
        parameterVersionLabel: "projection.v3.replay",
        frameworkVersion: expect.any(String),
      }),
    );
    expect(report.footballState).toEqual(
      expect.objectContaining({
        policyVersion: expect.any(String),
        dimensions: expect.any(Array),
      }),
    );

    const deterministic = requireRecord(report.deterministic);
    expect(deterministic.scorelinesBasis).toBe("match_script_merged_v2");
    expect(deterministic.oneXTwoBasis).toBe("post_calibration_only");
  });

  it("discovers a recorded fixture by team names and runs the V2 pipeline end-to-end", async () => {
    const response = await request(baseUrl, "/api/analyze", "POST", {
      homeTeam: "FC Seoul",
      awayTeam: "Ulsan Hyundai FC",
    });
    const report = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(report.matchId).toBe("football:100001");

    const provenance = requireRecord(report.analysisProvenance);
    const fixtureResolution = requireRecord(provenance.fixtureResolution);
    expect(fixtureResolution).toMatchObject({
      requestedHomeTeam: "FC Seoul",
      requestedAwayTeam: "Ulsan Hyundai FC",
      resolvedMatchId: "football:100001",
      resolvedHomeTeam: "FC Seoul",
      resolvedAwayTeam: "Ulsan Hyundai FC",
      scheduleSource: "football-data",
    });
    expect(report.projectionFramework).toBeDefined();
    expect(report.footballState).toBeDefined();
  });

  it("returns explicit fixture-not-found for unknown teams", async () => {
    const response = await request(baseUrl, "/api/analyze", "POST", {
      homeTeam: "Rosenborg",
      awayTeam: "Fredrikstad",
    });
    const body = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.error).toEqual(
      expect.objectContaining({
        code: "FIXTURE_NOT_FOUND",
      }),
    );
  });

  it("keeps calibration candidate1 non-default in the parameter catalog", async () => {
    const response = await request(baseUrl, "/api/projection-parameters");
    const catalog = requireRecord(response.body);

    expect(response.status).toBe(200);
    expect(catalog.activeVersionLabel).toBe("projection.v3.replay");

    const artifacts = catalog.artifacts;

    if (!Array.isArray(artifacts)) {
      throw new Error("Expected artifacts array.");
    }

    const candidate1 = artifacts.find(
      (item) =>
        requireRecord(item).versionLabel === "projection.v3.calibration.candidate1",
    );

    expect(candidate1).toEqual(
      expect.objectContaining({
        isActive: false,
        versionLabel: "projection.v3.calibration.candidate1",
      }),
    );
  });
});
