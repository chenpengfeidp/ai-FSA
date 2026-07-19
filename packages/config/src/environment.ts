import { z } from "zod";

export type RuntimeEnvironment = "development" | "test" | "production";

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface RuntimeConfig {
  readonly environment: RuntimeEnvironment;
}

export interface HttpConfig {
  readonly host: string;
  readonly port: number;
}

export type OddsProviderMode = "fixture" | "live" | "recorded";

export type CalibrationArtifactMode = "identity" | "population_demo_v1";

export interface OddsProviderConfig {
  readonly mode: OddsProviderMode;
  readonly apiKey: string | undefined;
  readonly baseUrl: string;
}

export interface CalibrationConfig {
  readonly artifactMode: CalibrationArtifactMode;
}

export type DatabaseClientMode = "live" | "stub";

export type EvidenceRepositoryMode = "memory" | "postgres";

export interface DatabaseConfig {
  readonly url: string;
  readonly clientMode: DatabaseClientMode;
}

export interface EvidenceRepositoryConfig {
  readonly mode: EvidenceRepositoryMode;
}

export interface ApiConfig {
  readonly runtime: RuntimeConfig;
  readonly http: HttpConfig;
  readonly oddsProvider: OddsProviderConfig;
  readonly calibration: CalibrationConfig;
  readonly database: DatabaseConfig;
  readonly evidenceRepository: EvidenceRepositoryConfig;
}

export interface WorkerConfig {
  readonly runtime: RuntimeConfig;
}

export interface ConfigurationIssue {
  readonly variable: string;
  readonly code: string;
  readonly message: string;
}

const runtimeEnvironmentSchema = z
  .enum(["development", "test", "production"])
  .default("development");

const hostSchema = z
  .string()
  .trim()
  .min(1, { error: "HOST must be a non-empty string." })
  .default("127.0.0.1");

const portSchema = z
  .string()
  .default("3001")
  .refine((value) => /^[0-9]+$/.test(value), {
    error: "PORT must be a base-10 integer from 1 through 65535.",
  })
  .transform(Number)
  .pipe(z.number().int().min(1).max(65535));

const oddsProviderModeSchema = z
  .enum(["fixture", "live", "recorded"])
  .default("recorded");

const oddsApiKeySchema = z.string().optional();

const oddsApiBaseUrlSchema = z
  .string()
  .trim()
  .url({ error: "THE_ODDS_API_BASE_URL must be a valid URL." })
  .default("https://api.the-odds-api.com");

const calibrationArtifactModeSchema = z
  .enum(["identity", "population_demo_v1"])
  .default("population_demo_v1");

const databaseUrlSchema = z
  .string()
  .trim()
  .default("postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local")
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    {
      error: "DATABASE_URL must be a PostgreSQL connection string.",
    },
  );

const databaseClientModeSchema = z.enum(["live", "stub"]).optional();

const evidenceRepositoryModeSchema = z.enum(["memory", "postgres"]).optional();

const apiEnvironmentSchema = z
  .object({
    NODE_ENV: runtimeEnvironmentSchema,
    HOST: hostSchema,
    PORT: portSchema,
    ODDS_PROVIDER_MODE: oddsProviderModeSchema,
    THE_ODDS_API_KEY: oddsApiKeySchema,
    THE_ODDS_API_BASE_URL: oddsApiBaseUrlSchema,
    CALIBRATION_ARTIFACT: calibrationArtifactModeSchema,
    DATABASE_URL: databaseUrlSchema,
    DATABASE_CLIENT_MODE: databaseClientModeSchema,
    EVIDENCE_REPOSITORY_MODE: evidenceRepositoryModeSchema,
  })
  .superRefine((value, context) => {
    if (value.ODDS_PROVIDER_MODE === "live") {
      const apiKey = value.THE_ODDS_API_KEY?.trim() ?? "";

      if (apiKey.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["THE_ODDS_API_KEY"],
          message: "THE_ODDS_API_KEY is required when ODDS_PROVIDER_MODE is live.",
        });
      }
    }

    const evidenceMode = value.EVIDENCE_REPOSITORY_MODE ?? "memory";
    const databaseMode =
      value.DATABASE_CLIENT_MODE ?? (value.NODE_ENV === "test" ? "stub" : "live");

    if (evidenceMode === "postgres" && databaseMode === "stub") {
      context.addIssue({
        code: "custom",
        path: ["EVIDENCE_REPOSITORY_MODE"],
        message:
          "EVIDENCE_REPOSITORY_MODE=postgres requires DATABASE_CLIENT_MODE=live.",
      });
    }
  });

const workerEnvironmentSchema = z.object({
  NODE_ENV: runtimeEnvironmentSchema,
});

interface RuntimeProcess {
  readonly env: EnvironmentSource;
}

function currentEnvironmentSource(): EnvironmentSource {
  const runtime = globalThis as typeof globalThis & {
    readonly process?: RuntimeProcess;
  };

  if (!runtime.process) {
    throw new Error("@fas/config requires a Node.js process environment.");
  }

  return runtime.process.env;
}

function issueDetails(variable: string): Readonly<{
  code: string;
  message: string;
}> {
  switch (variable) {
    case "NODE_ENV":
      return {
        code: "INVALID_RUNTIME_ENVIRONMENT",
        message: "NODE_ENV must be development, test, or production.",
      };
    case "HOST":
      return {
        code: "INVALID_HOST",
        message: "HOST must be a non-empty string.",
      };
    case "PORT":
      return {
        code: "INVALID_PORT",
        message: "PORT must be a base-10 integer from 1 through 65535.",
      };
    case "ODDS_PROVIDER_MODE":
      return {
        code: "INVALID_ODDS_PROVIDER_MODE",
        message: "ODDS_PROVIDER_MODE must be recorded, live, or fixture.",
      };
    case "THE_ODDS_API_KEY":
      return {
        code: "MISSING_ODDS_API_KEY",
        message: "THE_ODDS_API_KEY is required when ODDS_PROVIDER_MODE is live.",
      };
    case "THE_ODDS_API_BASE_URL":
      return {
        code: "INVALID_ODDS_API_BASE_URL",
        message: "THE_ODDS_API_BASE_URL must be a valid URL.",
      };
    case "CALIBRATION_ARTIFACT":
      return {
        code: "INVALID_CALIBRATION_ARTIFACT",
        message: "CALIBRATION_ARTIFACT must be identity or population_demo_v1.",
      };
    case "DATABASE_URL":
      return {
        code: "INVALID_DATABASE_URL",
        message: "DATABASE_URL must be a PostgreSQL connection string.",
      };
    case "DATABASE_CLIENT_MODE":
      return {
        code: "INVALID_DATABASE_CLIENT_MODE",
        message: "DATABASE_CLIENT_MODE must be live or stub.",
      };
    case "EVIDENCE_REPOSITORY_MODE":
      return {
        code: "INVALID_EVIDENCE_REPOSITORY_MODE",
        message:
          "EVIDENCE_REPOSITORY_MODE must be memory or postgres, and postgres requires DATABASE_CLIENT_MODE=live.",
      };
    default:
      return {
        code: "INVALID_CONFIGURATION",
        message: "Environment configuration is invalid.",
      };
  }
}

function toConfigurationIssues(error: z.ZodError): readonly ConfigurationIssue[] {
  const issues = error.issues.map((issue): ConfigurationIssue => {
    const variable =
      typeof issue.path[0] === "string" ? issue.path[0] : "environment";
    const details = issueDetails(variable);

    return Object.freeze({
      variable,
      code: details.code,
      message: details.message,
    });
  });

  return Object.freeze(issues);
}

function parseConfiguration<T>(schema: z.ZodType<T>, source: EnvironmentSource): T {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw new ConfigurationValidationError(toConfigurationIssues(result.error));
  }

  return result.data;
}

export class ConfigurationValidationError extends Error {
  readonly issues: readonly ConfigurationIssue[];

  constructor(issues: readonly ConfigurationIssue[]) {
    const variables = [...new Set(issues.map((issue) => issue.variable))];

    super(`Invalid environment configuration: ${variables.join(", ")}.`);
    this.name = "ConfigurationValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

export function loadApiConfig(source?: EnvironmentSource): ApiConfig {
  const parsed = parseConfiguration(
    apiEnvironmentSchema,
    source ?? currentEnvironmentSource(),
  );

  const apiKey = parsed.THE_ODDS_API_KEY?.trim();
  const clientMode =
    parsed.DATABASE_CLIENT_MODE ?? (parsed.NODE_ENV === "test" ? "stub" : "live");
  const evidenceRepositoryMode = parsed.EVIDENCE_REPOSITORY_MODE ?? "memory";

  return Object.freeze({
    runtime: Object.freeze({
      environment: parsed.NODE_ENV,
    }),
    http: Object.freeze({
      host: parsed.HOST,
      port: parsed.PORT,
    }),
    oddsProvider: Object.freeze({
      mode: parsed.ODDS_PROVIDER_MODE,
      apiKey: apiKey !== undefined && apiKey.length > 0 ? apiKey : undefined,
      baseUrl: parsed.THE_ODDS_API_BASE_URL,
    }),
    calibration: Object.freeze({
      artifactMode: parsed.CALIBRATION_ARTIFACT,
    }),
    database: Object.freeze({
      url: parsed.DATABASE_URL,
      clientMode,
    }),
    evidenceRepository: Object.freeze({
      mode: evidenceRepositoryMode,
    }),
  });
}

export function loadWorkerConfig(source?: EnvironmentSource): WorkerConfig {
  const parsed = parseConfiguration(
    workerEnvironmentSchema,
    source ?? currentEnvironmentSource(),
  );

  return Object.freeze({
    runtime: Object.freeze({
      environment: parsed.NODE_ENV,
    }),
  });
}
