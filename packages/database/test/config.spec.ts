import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createDatabaseClient,
  createStubDatabaseClient,
  evidenceIdToUuid,
} from "../src/index.js";

const schemaPath = fileURLToPath(
  new URL("../prisma/schema.prisma", import.meta.url),
);
const generatedClientPath = fileURLToPath(
  new URL("../generated/prisma/client.ts", import.meta.url),
);
const migrationPath = fileURLToPath(
  new URL(
    "../prisma/migrations/20260719120000_p2_evidence_persistence/migration.sql",
    import.meta.url,
  ),
);

describe("@fas/database P.2 persistence contract", () => {
  it("keeps the Prisma schema PostgreSQL-only with Evidence/Match models", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain('provider = "prisma-client"');
    expect(schema).toContain('output   = "../generated/prisma"');
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain("model EvidenceItem");
    expect(schema).toContain("model Match");
    expect(schema).toContain("externalKey");
    expect(schema).toContain('@@map("evidence_items")');
  });

  it("ships the first Evidence persistence migration", async () => {
    const migration = await readFile(migrationPath, "utf8");

    expect(migration).toContain('CREATE TABLE "evidence_items"');
    expect(migration).toContain('CREATE TABLE "matches"');
    expect(migration).toContain('"external_key"');
  });

  it("generates the client inside the database package", async () => {
    await expect(access(generatedClientPath)).resolves.toBeUndefined();
  });

  it("constructs only a side-effect-free lifecycle boundary", async () => {
    const lifecycle = createDatabaseClient(
      "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation",
    );

    expect(Object.keys(lifecycle).sort()).toEqual(["connect", "disconnect", "ping"]);
    await expect(lifecycle.disconnect()).resolves.toBeUndefined();
  });

  it("provides a stub lifecycle that pings without a network", async () => {
    const lifecycle = createStubDatabaseClient();

    await expect(lifecycle.connect()).resolves.toBeUndefined();
    await expect(lifecycle.ping()).resolves.toBeUndefined();
    await expect(lifecycle.disconnect()).resolves.toBeUndefined();
  });

  it("rejects an empty connection string without exposing it", () => {
    expect(() => createDatabaseClient("   ")).toThrow(
      "A non-empty database connection string is required.",
    );
  });

  it("maps domain Evidence ids to stable UUID v5 values", () => {
    expect(evidenceIdToUuid("evidence-fixture-match-example")).toBe(
      evidenceIdToUuid("evidence-fixture-match-example"),
    );
    expect(evidenceIdToUuid("evidence-a")).not.toBe(evidenceIdToUuid("evidence-b"));
    expect(evidenceIdToUuid("evidence-fixture-match-example")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });
});
