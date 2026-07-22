import { describe, expect, it, vi } from "vitest";
import { FootballProviderError, fetchFootballJson } from "../src/index.js";

describe("fetchFootballJson", () => {
  it("returns JSON on success", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ response: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    await expect(
      fetchFootballJson("https://example.test/fixtures", {
        apiKey: "key",
        fetchImpl,
        maxRetries: 0,
      }),
    ).resolves.toEqual({ response: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries retryable HTTP failures then throws typed HTTP_ERROR", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("nope", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        }),
    );

    await expect(
      fetchFootballJson("https://example.test/fixtures", {
        apiKey: "key",
        fetchImpl,
        maxRetries: 2,
        timeoutMs: 5_000,
      }),
    ).rejects.toMatchObject({
      name: "FootballProviderError",
      code: "HTTP_ERROR",
      status: 503,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable HTTP failures", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("nope", {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        }),
    );

    await expect(
      fetchFootballJson("https://example.test/fixtures", {
        apiKey: "key",
        fetchImpl,
        maxRetries: 3,
      }),
    ).rejects.toBeInstanceOf(FootballProviderError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps abort to TIMEOUT", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    await expect(
      fetchFootballJson("https://example.test/fixtures", {
        apiKey: "key",
        fetchImpl,
        timeoutMs: 20,
        maxRetries: 0,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});
