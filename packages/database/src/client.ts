import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

export interface DatabaseClientLifecycle {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Verifies the connection can execute a trivial query. */
  ping(): Promise<void>;
}

export function createDatabaseClient(
  connectionString: string,
): DatabaseClientLifecycle {
  if (connectionString.trim().length === 0) {
    throw new Error("A non-empty database connection string is required.");
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });

  return Object.freeze({
    connect: () => client.$connect(),
    disconnect: () => client.$disconnect(),
    ping: async () => {
      await client.$queryRaw`SELECT 1`;
    },
  });
}

/** Offline lifecycle for tests and local analyze without PostgreSQL. */
export function createStubDatabaseClient(): DatabaseClientLifecycle {
  return Object.freeze({
    connect: async () => undefined,
    disconnect: async () => undefined,
    ping: async () => undefined,
  });
}
