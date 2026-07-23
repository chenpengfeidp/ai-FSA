import type { EvidenceRepository } from "@fas/evidence";
import type { EvaluationHistoryRepository } from "@fas/statistics";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaEvidenceRepository } from "./prisma-evidence-repository.js";
import { PrismaEvaluationHistoryRepository } from "./prisma-evaluation-history-repository.js";

export interface DatabaseClientLifecycle {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Verifies the connection can execute a trivial query. */
  ping(): Promise<void>;
}

export interface FasDatabaseHandle {
  readonly lifecycle: DatabaseClientLifecycle;
  readonly evidenceRepository: EvidenceRepository;
  readonly evaluationHistoryRepository: EvaluationHistoryRepository;
}

function createPrismaClient(connectionString: string): PrismaClient {
  if (connectionString.trim().length === 0) {
    throw new Error("A non-empty database connection string is required.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function toLifecycle(client: PrismaClient): DatabaseClientLifecycle {
  return Object.freeze({
    connect: () => client.$connect(),
    disconnect: () => client.$disconnect(),
    ping: async () => {
      await client.$queryRaw`SELECT 1`;
    },
  });
}

export function createDatabaseClient(
  connectionString: string,
): DatabaseClientLifecycle {
  return toLifecycle(createPrismaClient(connectionString));
}

/** Shared Prisma client for readiness ping and durable Evidence repository. */
export function createFasDatabase(connectionString: string): FasDatabaseHandle {
  const client = createPrismaClient(connectionString);

  return Object.freeze({
    lifecycle: toLifecycle(client),
    evidenceRepository: new PrismaEvidenceRepository(client),
    evaluationHistoryRepository: new PrismaEvaluationHistoryRepository(client),
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
