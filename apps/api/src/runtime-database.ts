import { loadApiConfig } from "@fas/config";
import {
  createDatabaseClient,
  createFasDatabase,
  createStubDatabaseClient,
  type DatabaseClientLifecycle,
  type FasDatabaseHandle,
} from "@fas/database";
import { type EvidenceRepository, InMemoryEvidenceRepository } from "@fas/evidence";
import {
  type EvaluationHistoryRepository,
  InMemoryEvaluationHistoryRepository,
} from "@fas/statistics";

let cachedPostgres: FasDatabaseHandle | undefined;
let cachedMemoryEvaluationHistory: EvaluationHistoryRepository | undefined;

function getPostgresDatabase(): FasDatabaseHandle {
  if (cachedPostgres !== undefined) {
    return cachedPostgres;
  }

  const config = loadApiConfig();
  cachedPostgres = createFasDatabase(config.database.url);
  return cachedPostgres;
}

/** Readiness lifecycle: stub/live client, or shared Postgres handle. */
export function createApiDatabaseLifecycle(): DatabaseClientLifecycle {
  const config = loadApiConfig();

  if (config.evidenceRepository.mode === "postgres") {
    return getPostgresDatabase().lifecycle;
  }

  return config.database.clientMode === "stub"
    ? createStubDatabaseClient()
    : createDatabaseClient(config.database.url);
}

/**
 * Evidence repository for the current Nest app instance.
 * Memory mode returns a fresh in-memory store (test isolation).
 * Postgres mode shares one Prisma-backed repository.
 */
export function createApiEvidenceRepository(): EvidenceRepository {
  const config = loadApiConfig();

  if (config.evidenceRepository.mode === "postgres") {
    return getPostgresDatabase().evidenceRepository;
  }

  return new InMemoryEvidenceRepository();
}

/**
 * Evaluation History repository (A1.5).
 * Follows EVIDENCE_REPOSITORY_MODE: memory (process-local) or postgres.
 * Memory mode is shared for the Nest process so history survives across analyzes.
 */
export function createApiEvaluationHistoryRepository(): EvaluationHistoryRepository {
  const config = loadApiConfig();

  if (config.evidenceRepository.mode === "postgres") {
    return getPostgresDatabase().evaluationHistoryRepository;
  }

  if (cachedMemoryEvaluationHistory === undefined) {
    cachedMemoryEvaluationHistory = new InMemoryEvaluationHistoryRepository();
  }

  return cachedMemoryEvaluationHistory;
}
