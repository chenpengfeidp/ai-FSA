import { describe, expect, it } from "vitest";
import {
  ConfigurationValidationError,
  loadApiConfig,
  loadWorkerConfig,
} from "../src/index.js";

function captureConfigurationError(
  operation: () => unknown,
): ConfigurationValidationError {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigurationValidationError);
    return error as ConfigurationValidationError;
  }

  throw new Error("Expected configuration validation to fail.");
}

describe("@fas/config environment loading", () => {
  it("applies current API defaults", () => {
    expect(loadApiConfig({})).toEqual({
      runtime: {
        environment: "development",
      },
      http: {
        host: "127.0.0.1",
        port: 3001,
      },
      oddsProvider: {
        mode: "recorded",
        apiKey: undefined,
        baseUrl: "https://api.the-odds-api.com",
        sportKeys: undefined,
      },
      footballDataProvider: {
        mode: "recorded",
        apiKey: undefined,
        baseUrl: "https://v3.football.api-sports.io",
        leagueIds: undefined,
        timeoutMs: 10_000,
        maxRetries: 2,
      },
      calibration: {
        artifactMode: "population_demo_v1",
      },
      database: {
        url: "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local",
        clientMode: "live",
      },
      evidenceRepository: {
        mode: "memory",
      },
    });
  });

  it("applies the worker runtime default", () => {
    expect(loadWorkerConfig({})).toEqual({
      runtime: {
        environment: "development",
      },
    });
  });

  it("loads valid API overrides", () => {
    expect(
      loadApiConfig({
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "4100",
        ODDS_PROVIDER_MODE: "fixture",
        DATABASE_URL:
          "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation",
        DATABASE_CLIENT_MODE: "stub",
      }),
    ).toEqual({
      runtime: {
        environment: "production",
      },
      http: {
        host: "0.0.0.0",
        port: 4100,
      },
      oddsProvider: {
        mode: "fixture",
        apiKey: undefined,
        baseUrl: "https://api.the-odds-api.com",
        sportKeys: undefined,
      },
      footballDataProvider: {
        mode: "recorded",
        apiKey: undefined,
        baseUrl: "https://v3.football.api-sports.io",
        leagueIds: undefined,
        timeoutMs: 10_000,
        maxRetries: 2,
      },
      calibration: {
        artifactMode: "population_demo_v1",
      },
      database: {
        url: "postgresql://fas_validation:fas_validation@127.0.0.1:5432/fas_validation",
        clientMode: "stub",
      },
      evidenceRepository: {
        mode: "memory",
      },
    });
  });

  it("defaults database client mode to stub in test", () => {
    expect(
      loadApiConfig({
        NODE_ENV: "test",
      }).database.clientMode,
    ).toBe("stub");
  });

  it("loads live odds mode when an API key is provided", () => {
    expect(
      loadApiConfig({
        ODDS_PROVIDER_MODE: "live",
        THE_ODDS_API_KEY: "test-key",
        THE_ODDS_API_BASE_URL: "https://odds.example.test",
        CALIBRATION_ARTIFACT: "identity",
      }),
    ).toEqual({
      runtime: {
        environment: "development",
      },
      http: {
        host: "127.0.0.1",
        port: 3001,
      },
      oddsProvider: {
        mode: "live",
        apiKey: "test-key",
        baseUrl: "https://odds.example.test",
        sportKeys: undefined,
      },
      footballDataProvider: {
        mode: "recorded",
        apiKey: undefined,
        baseUrl: "https://v3.football.api-sports.io",
        leagueIds: undefined,
        timeoutMs: 10_000,
        maxRetries: 2,
      },
      calibration: {
        artifactMode: "identity",
      },
      database: {
        url: "postgresql://fas_local:change_me_local_only@127.0.0.1:5432/fas_local",
        clientMode: "live",
      },
      evidenceRepository: {
        mode: "memory",
      },
    });
  });

  it("loads live football data mode when an API key is provided", () => {
    expect(
      loadApiConfig({
        FOOTBALL_DATA_PROVIDER_MODE: "live",
        API_FOOTBALL_KEY: "football-key",
        FOOTBALL_DATA_LEAGUE_IDS: "292,98",
      }).footballDataProvider,
    ).toEqual({
      mode: "live",
      apiKey: "football-key",
      baseUrl: "https://v3.football.api-sports.io",
      leagueIds: [292, 98],
      timeoutMs: 10_000,
      maxRetries: 2,
    });
  });

  it("loads live football timeout and retry overrides", () => {
    expect(
      loadApiConfig({
        FOOTBALL_DATA_PROVIDER_MODE: "live",
        API_FOOTBALL_KEY: "football-key",
        API_FOOTBALL_TIMEOUT_MS: "15000",
        API_FOOTBALL_MAX_RETRIES: "1",
      }).footballDataProvider,
    ).toMatchObject({
      timeoutMs: 15_000,
      maxRetries: 1,
    });
  });

  it("rejects invalid API_FOOTBALL_TIMEOUT_MS", () => {
    const error = captureConfigurationError(() =>
      loadApiConfig({
        FOOTBALL_DATA_PROVIDER_MODE: "live",
        API_FOOTBALL_KEY: "football-key",
        API_FOOTBALL_TIMEOUT_MS: "50",
      }),
    );

    expect(error.issues).toEqual([
      {
        variable: "API_FOOTBALL_TIMEOUT_MS",
        code: "INVALID_API_FOOTBALL_TIMEOUT_MS",
        message:
          "API_FOOTBALL_TIMEOUT_MS must be an integer from 1000 through 120000.",
      },
    ]);
  });

  it("rejects live football data mode without API_FOOTBALL_KEY", () => {
    const error = captureConfigurationError(() =>
      loadApiConfig({ FOOTBALL_DATA_PROVIDER_MODE: "live" }),
    );

    expect(error.issues).toEqual([
      {
        variable: "API_FOOTBALL_KEY",
        code: "MISSING_API_FOOTBALL_KEY",
        message:
          "API_FOOTBALL_KEY is required when FOOTBALL_DATA_PROVIDER_MODE is live.",
      },
    ]);
  });

  it("parses ODDS_SPORT_KEYS into a frozen list", () => {
    expect(
      loadApiConfig({
        ODDS_SPORT_KEYS: " soccer_korea_kleague1, soccer_japan_j_league , ",
      }).oddsProvider.sportKeys,
    ).toEqual(["soccer_korea_kleague1", "soccer_japan_j_league"]);
  });

  it("loads postgres evidence repository mode with live database", () => {
    expect(
      loadApiConfig({
        DATABASE_CLIENT_MODE: "live",
        EVIDENCE_REPOSITORY_MODE: "postgres",
      }).evidenceRepository.mode,
    ).toBe("postgres");
  });

  it("rejects postgres evidence mode with stub database", () => {
    const error = captureConfigurationError(() =>
      loadApiConfig({
        DATABASE_CLIENT_MODE: "stub",
        EVIDENCE_REPOSITORY_MODE: "postgres",
      }),
    );

    expect(error.issues).toEqual([
      {
        variable: "EVIDENCE_REPOSITORY_MODE",
        code: "INVALID_EVIDENCE_REPOSITORY_MODE",
        message:
          "EVIDENCE_REPOSITORY_MODE must be memory or postgres, and postgres requires DATABASE_CLIENT_MODE=live.",
      },
    ]);
  });

  it("rejects a non-PostgreSQL DATABASE_URL", () => {
    const error = captureConfigurationError(() =>
      loadApiConfig({ DATABASE_URL: "mysql://localhost/fas" }),
    );

    expect(error.issues).toEqual([
      {
        variable: "DATABASE_URL",
        code: "INVALID_DATABASE_URL",
        message: "DATABASE_URL must be a PostgreSQL connection string.",
      },
    ]);
  });

  it("rejects live odds mode without an API key", () => {
    const error = captureConfigurationError(() =>
      loadApiConfig({ ODDS_PROVIDER_MODE: "live" }),
    );

    expect(error.issues).toEqual([
      {
        variable: "THE_ODDS_API_KEY",
        code: "MISSING_ODDS_API_KEY",
        message: "THE_ODDS_API_KEY is required when ODDS_PROVIDER_MODE is live.",
      },
    ]);
  });

  it("loads valid worker overrides without requiring API variables", () => {
    expect(
      loadWorkerConfig({
        NODE_ENV: "test",
        HOST: "",
        PORT: "invalid",
      }),
    ).toEqual({
      runtime: {
        environment: "test",
      },
    });
  });

  it.each([
    "abc",
    "3001x",
    "1.5",
    "0",
    "-1",
    "65536",
    "Infinity",
  ])("rejects invalid port %s", (port) => {
    const error = captureConfigurationError(() => loadApiConfig({ PORT: port }));

    expect(error.issues).toEqual([
      {
        variable: "PORT",
        code: "INVALID_PORT",
        message: "PORT must be a base-10 integer from 1 through 65535.",
      },
    ]);
  });

  it("rejects an empty host", () => {
    const error = captureConfigurationError(() => loadApiConfig({ HOST: "   " }));

    expect(error.issues).toEqual([
      {
        variable: "HOST",
        code: "INVALID_HOST",
        message: "HOST must be a non-empty string.",
      },
    ]);
  });

  it("rejects unsupported runtime environments without exposing input", () => {
    const canary = "invalid-environment-secret-canary";
    const error = captureConfigurationError(() =>
      loadWorkerConfig({ NODE_ENV: canary }),
    );

    expect(error.issues).toEqual([
      {
        variable: "NODE_ENV",
        code: "INVALID_RUNTIME_ENVIRONMENT",
        message: "NODE_ENV must be development, test, or production.",
      },
    ]);
    expect(error.message).not.toContain(canary);
    expect(error.stack).not.toContain(canary);
    expect(JSON.stringify(error.issues)).not.toContain(canary);
  });

  it("does not expose invalid port input", () => {
    const canary = "invalid-port-secret-canary";
    const error = captureConfigurationError(() => loadApiConfig({ PORT: canary }));

    expect(error.message).not.toContain(canary);
    expect(error.stack).not.toContain(canary);
    expect(JSON.stringify(error.issues)).not.toContain(canary);
  });

  it("does not mutate the supplied source", () => {
    const source = Object.freeze({
      NODE_ENV: "test",
      HOST: "127.0.0.2",
      PORT: "3200",
      UNKNOWN_VALUE: "preserved",
    });
    const before = { ...source };

    loadApiConfig(source);

    expect(source).toEqual(before);
  });

  it("returns deeply frozen configuration objects", () => {
    const apiConfig = loadApiConfig({});
    const workerConfig = loadWorkerConfig({});

    expect(Object.isFrozen(apiConfig)).toBe(true);
    expect(Object.isFrozen(apiConfig.runtime)).toBe(true);
    expect(Object.isFrozen(apiConfig.http)).toBe(true);
    expect(Object.isFrozen(apiConfig.oddsProvider)).toBe(true);
    expect(Object.isFrozen(apiConfig.database)).toBe(true);
    expect(Object.isFrozen(workerConfig)).toBe(true);
    expect(Object.isFrozen(workerConfig.runtime)).toBe(true);
  });

  it("uses each supplied source instead of preserving module state", () => {
    expect(loadApiConfig({ PORT: "3101" }).http.port).toBe(3101);
    expect(loadApiConfig({ PORT: "3102" }).http.port).toBe(3102);
  });
});
