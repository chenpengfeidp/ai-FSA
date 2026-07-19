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
      },
      calibration: {
        artifactMode: "population_demo_v1",
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
      },
      calibration: {
        artifactMode: "population_demo_v1",
      },
    });
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
      },
      calibration: {
        artifactMode: "identity",
      },
    });
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
    expect(Object.isFrozen(workerConfig)).toBe(true);
    expect(Object.isFrozen(workerConfig.runtime)).toBe(true);
  });

  it("uses each supplied source instead of preserving module state", () => {
    expect(loadApiConfig({ PORT: "3101" }).http.port).toBe(3101);
    expect(loadApiConfig({ PORT: "3102" }).http.port).toBe(3102);
  });
});
