import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const importedEvidenceId = "evidence-fixture-match-example";

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
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });

  afterEach(async () => {
    await app?.close();
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

  it("returns a typed failure for a duplicate import", async () => {
    await request(baseUrl, "/api/import/match/match-example", "POST");

    const response = await request(
      baseUrl,
      "/api/import/match/match-example",
      "POST",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      error: {
        code: "DUPLICATE_EVIDENCE",
        message: `Evidence "${importedEvidenceId}" already exists.`,
      },
      ok: false,
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
