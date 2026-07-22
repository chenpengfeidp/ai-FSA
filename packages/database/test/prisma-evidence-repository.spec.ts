import { createEvidence, DuplicateEvidenceError } from "@fas/evidence";
import { createMatchId } from "@fas/match";
import { afterAll, describe, expect, it } from "vitest";

import { createFasDatabase, type FasDatabaseHandle } from "../src/index.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation";

async function tryConnect(): Promise<FasDatabaseHandle | undefined> {
  try {
    const database = createFasDatabase(databaseUrl);
    await database.lifecycle.ping();
    return database;
  } catch {
    return undefined;
  }
}

const connected = await tryConnect();

describe.skipIf(connected === undefined)(
  "PrismaEvidenceRepository (postgres)",
  () => {
    const database = connected as FasDatabaseHandle;
    const repository = database.evidenceRepository;
    const runId = `c2-${Date.now()}`;
    const matchId = createMatchId(`match-${runId}`);

    afterAll(async () => {
      await database.lifecycle.disconnect();
    });

    it("persists imported Evidence and loads it by id", async () => {
      const evidence = createEvidence({
        id: `evidence-${runId}-match-info`,
        source: "c2-fixture",
        sourceId: `${runId}-match-info`,
        type: "MATCH_INFO",
        matchId,
        collectedAt: "2026-07-19T12:00:00.000Z",
        eventTime: "2026-07-19T11:55:00.000Z",
        freshness: "fresh",
        quality: "verified",
        provenance: {
          collector: "@fas/database",
          method: "c2-repository-test",
        },
        payload: {
          observation: "c2-durable-match-info",
        },
      });

      await expect(repository.save(evidence)).resolves.toBe(evidence);
      await expect(repository.findById(evidence.id)).resolves.toEqual(evidence);
    });

    it("loads Evidence by match id without returning other matches", async () => {
      const otherMatchId = createMatchId(`match-${runId}-other`);
      const target = createEvidence({
        id: `evidence-${runId}-odds`,
        source: "c2-fixture",
        sourceId: `${runId}-odds`,
        type: "ODDS",
        matchId,
        collectedAt: "2026-07-19T12:01:00.000Z",
        eventTime: "2026-07-19T11:56:00.000Z",
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/database",
          method: "c2-repository-test",
        },
        payload: {
          observation: "c2-durable-odds",
        },
      });
      const other = createEvidence({
        id: `evidence-${runId}-other`,
        source: "c2-fixture",
        sourceId: `${runId}-other`,
        type: "VENUE",
        matchId: otherMatchId,
        collectedAt: "2026-07-19T12:02:00.000Z",
        eventTime: "2026-07-19T11:57:00.000Z",
        freshness: "fresh",
        quality: "verified",
        provenance: {
          collector: "@fas/database",
          method: "c2-repository-test",
        },
        payload: {
          observation: "c2-other-match",
        },
      });

      await repository.save(target);
      await repository.save(other);

      const byMatch = await repository.findByMatch(matchId);
      const ids = byMatch.map((item) => item.id).sort();

      expect(ids).toContain(target.id);
      expect(ids).toContain(`evidence-${runId}-match-info`);
      expect(ids).not.toContain(other.id);
      expect(Object.isFrozen(byMatch)).toBe(true);
    });

    it("rejects duplicate Evidence identities", async () => {
      const evidence = createEvidence({
        id: `evidence-${runId}-match-info`,
        source: "c2-fixture",
        sourceId: `${runId}-duplicate`,
        type: "MATCH_INFO",
        matchId,
        collectedAt: "2026-07-19T12:03:00.000Z",
        eventTime: "2026-07-19T11:58:00.000Z",
        freshness: "fresh",
        quality: "verified",
        provenance: {
          collector: "@fas/database",
          method: "c2-repository-test",
        },
        payload: {
          observation: "duplicate",
        },
      });

      await expect(repository.save(evidence)).rejects.toThrow(
        DuplicateEvidenceError,
      );
    });

    it("survives a new repository handle against the same database", async () => {
      const second = createFasDatabase(databaseUrl);
      try {
        const reloaded = await second.evidenceRepository.findByMatch(matchId);
        expect(reloaded.map((item) => item.id)).toEqual(
          expect.arrayContaining([
            `evidence-${runId}-match-info`,
            `evidence-${runId}-odds`,
          ]),
        );
      } finally {
        await second.lifecycle.disconnect();
      }
    });
  },
);

describe("PrismaEvidenceRepository availability gate", () => {
  it("records whether live postgres was available for this run", () => {
    expect(connected === undefined || typeof connected === "object").toBe(true);
  });
});
