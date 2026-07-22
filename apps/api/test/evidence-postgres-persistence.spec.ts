import "reflect-metadata";
import { createFasDatabase } from "@fas/database";
import { createEvidence } from "@fas/evidence";
import { createMatchId } from "@fas/match";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { configureOpenApi } from "../src/openapi.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

async function postgresReady(): Promise<boolean> {
  try {
    const database = createFasDatabase(databaseUrl);
    await database.lifecycle.ping();
    await database.lifecycle.disconnect();
    return true;
  } catch {
    return false;
  }
}

const canUsePostgres = await postgresReady();

interface HttpResponse {
  readonly body: unknown;
  readonly status: number;
}

async function request(baseUrl: string, path: string): Promise<HttpResponse> {
  const response = await fetch(`${baseUrl}${path}`);
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

describe.skipIf(!canUsePostgres)(
  "HTTP Evidence persistence with EVIDENCE_REPOSITORY_MODE=postgres",
  () => {
    const previousMode = process.env.EVIDENCE_REPOSITORY_MODE;
    const previousClientMode = process.env.DATABASE_CLIENT_MODE;
    const previousUrl = process.env.DATABASE_URL;
    const runId = `c2-api-${Date.now()}`;
    const matchId = `match-${runId}`;
    const evidenceId = `evidence-${runId}`;

    let app: INestApplication | undefined;
    let baseUrl = "";

    beforeAll(async () => {
      process.env.EVIDENCE_REPOSITORY_MODE = "postgres";
      process.env.DATABASE_CLIENT_MODE = "live";
      process.env.DATABASE_URL = databaseUrl;

      const seeder = createFasDatabase(databaseUrl);
      try {
        await seeder.evidenceRepository.save(
          createEvidence({
            id: evidenceId,
            source: "c2-api-fixture",
            sourceId: `${runId}-source`,
            type: "MATCH_INFO",
            matchId: createMatchId(matchId),
            collectedAt: "2026-07-19T13:00:00.000Z",
            eventTime: "2026-07-19T12:55:00.000Z",
            freshness: "fresh",
            quality: "verified",
            provenance: {
              collector: "@fas/api",
              method: "c2-integration",
            },
            payload: {
              observation: "c2-api-postgres",
            },
          }),
        );
      } finally {
        await seeder.lifecycle.disconnect();
      }

      app = await NestFactory.create(AppModule, { logger: false });
      configureOpenApi(app);
      await app.listen(0, "127.0.0.1");
      baseUrl = await app.getUrl();
    });

    afterAll(async () => {
      await app?.close();

      if (previousMode === undefined) {
        delete process.env.EVIDENCE_REPOSITORY_MODE;
      } else {
        process.env.EVIDENCE_REPOSITORY_MODE = previousMode;
      }

      if (previousClientMode === undefined) {
        delete process.env.DATABASE_CLIENT_MODE;
      } else {
        process.env.DATABASE_CLIENT_MODE = previousClientMode;
      }

      if (previousUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousUrl;
      }
    });

    it("loads persisted Evidence by match id through the HTTP query port", async () => {
      const response = await request(baseUrl, `/api/evidence/match/${matchId}`);
      const body = requireRecord(response.body);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        value: expect.arrayContaining([
          expect.objectContaining({
            id: evidenceId,
            matchId,
            type: "MATCH_INFO",
          }),
        ]),
      });
    });

    it("still serves the same Evidence after API process restart", async () => {
      await app?.close();
      app = await NestFactory.create(AppModule, { logger: false });
      configureOpenApi(app);
      await app.listen(0, "127.0.0.1");
      baseUrl = await app.getUrl();

      const byMatch = await request(baseUrl, `/api/evidence/match/${matchId}`);
      expect(byMatch.status).toBe(200);
      expect(requireRecord(byMatch.body)).toMatchObject({
        ok: true,
        value: expect.arrayContaining([
          expect.objectContaining({
            id: evidenceId,
            matchId,
          }),
        ]),
      });

      const byId = await request(baseUrl, `/api/evidence/${evidenceId}`);
      expect(byId.status).toBe(200);
      expect(requireRecord(byId.body)).toMatchObject({
        ok: true,
        value: expect.objectContaining({
          id: evidenceId,
          matchId,
        }),
      });
    });
  },
);
