import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";

export interface DatabaseClientLifecycle {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
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
  });
}
