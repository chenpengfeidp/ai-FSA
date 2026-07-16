import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createDatabaseClient } from "../src/index.js";

const schemaPath = fileURLToPath(
  new URL("../prisma/schema.prisma", import.meta.url),
);
const generatedClientPath = fileURLToPath(
  new URL("../generated/prisma/client.ts", import.meta.url),
);

describe("@fas/database bootstrap contract", () => {
  it("keeps the Prisma schema PostgreSQL-only and model-free", async () => {
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain('provider = "prisma-client"');
    expect(schema).toContain('output   = "../generated/prisma"');
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).not.toMatch(/^\s*(model|enum|type)\s+\w+/mu);
  });

  it("generates the client inside the database package", async () => {
    await expect(access(generatedClientPath)).resolves.toBeUndefined();
  });

  it("constructs only a side-effect-free lifecycle boundary", async () => {
    const lifecycle = createDatabaseClient(
      "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation",
    );

    expect(Object.keys(lifecycle).sort()).toEqual(["connect", "disconnect"]);
    await expect(lifecycle.disconnect()).resolves.toBeUndefined();
  });

  it("rejects an empty connection string without exposing it", () => {
    expect(() => createDatabaseClient("   ")).toThrow(
      "A non-empty database connection string is required.",
    );
  });
});
