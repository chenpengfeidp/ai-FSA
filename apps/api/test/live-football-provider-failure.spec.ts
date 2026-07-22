import { FootballProviderError } from "@fas/provider-football";
import { describe, expect, it } from "vitest";
import { liveFootballProviderFailure } from "../src/live-football-provider-failure.js";

describe("liveFootballProviderFailure", () => {
  it("maps FootballProviderError to IMPORT_FAILED without fabricating Evidence", () => {
    const mapped = liveFootballProviderFailure(
      new FootballProviderError("HTTP_ERROR", "Live football HTTP 503.", 503),
    );

    expect(mapped).toEqual({
      ok: false,
      error: {
        code: "IMPORT_FAILED",
        message: "Live football provider failed.",
        cause: {
          code: "HTTP_ERROR",
          message: "Live football HTTP 503.",
        },
      },
    });
  });

  it("ignores unrelated errors", () => {
    expect(liveFootballProviderFailure(new Error("boom"))).toBeUndefined();
  });
});
