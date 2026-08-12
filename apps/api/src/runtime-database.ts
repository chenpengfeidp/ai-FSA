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
  type ProjectionReplaySidecarRepository,
  InMemoryProjectionReplaySidecarRepository,
} from "@fas/statistics";

let cachedPostgres: FasDatabaseHandle | undefined;
let cachedMemoryEvaluationHistory: EvaluationHistoryRepository | undefined;
let cachedMemoryProjectionReplaySidecar:
  | ProjectionReplaySidecarRepository
  | undefined;

function getPostgresDatabase(): FasDatabaseHandle {
  if (cachedPostgres !== undefined) {
    return cachedPostgres;
  }

  const config = loadApiConfig();
  cachedPostgres = createFasDatabase(config.database.url);
  return cachedPostgres;
}

/**
 * Platform persistence mode (P2K-A): Evidence + Evaluation History + Sidecar.
 * Controlled by EVIDENCE_REPOSITORY_MODE; postgres never silently falls back to memory.
 */
function isPostgresPlatformPersistence(): boolean {
  return loadApiConfig().platformPersistence.mode === "postgres";
}

/** Readiness lifecycle: stub/live client, or shared Postgres handle. */
export function createApiDatabaseLifecycle(): DatabaseClientLifecycle {
  const config = loadApiConfig();

  if (isPostgresPlatformPersistence()) {
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
  if (isPostgresPlatformPersistence()) {
    return getPostgresDatabase().evidenceRepository;
  }

  return new InMemoryEvidenceRepository();
}

/**
 * Evaluation History repository (A1.5 / P2K-A).
 * Follows platformPersistence (EVIDENCE_REPOSITORY_MODE): memory or postgres.
 * Postgres mode uses PrismaEvaluationHistoryRepository — no silent memory fallback.
 * Memory mode is shared for the Nest process so history survives across analyzes.
 */
export function createApiEvaluationHistoryRepository(): EvaluationHistoryRepository {
  if (isPostgresPlatformPersistence()) {
    return getPostgresDatabase().evaluationHistoryRepository;
  }

  if (cachedMemoryEvaluationHistory === undefined) {
    cachedMemoryEvaluationHistory = new InMemoryEvaluationHistoryRepository();
  }

  return cachedMemoryEvaluationHistory;
}

/**
 * Projection replay sidecar store (P2H / P2K-B).
 * Postgres platform mode → durable Prisma adapter.
 * Memory mode → process-local map keyed by historyId/matchId.
 */
export function createApiProjectionReplaySidecarRepository(): ProjectionReplaySidecarRepository {
  if (isPostgresPlatformPersistence()) {
    return getPostgresDatabase().projectionReplaySidecarRepository;
  }

  if (cachedMemoryProjectionReplaySidecar === undefined) {
    cachedMemoryProjectionReplaySidecar =
      new InMemoryProjectionReplaySidecarRepository();
  }

  return cachedMemoryProjectionReplaySidecar;
}

/** Observable platform persistence mode for operators and diagnostics (P2K-A). */
export function getApiPlatformPersistenceMode(): "memory" | "postgres" {
  return loadApiConfig().platformPersistence.mode;
}
