import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapTheOddsApiH2h } from "../src/index.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("mapTheOddsApiH2h", () => {
  it("maps a recorded home-favored cassette to a 1X2 overlay", () => {
    const raw = JSON.parse(
      readFileSync(join(fixturesDir, "match-example.json"), "utf8"),
    ) as unknown;

    expect(mapTheOddsApiH2h(raw, { providerMethod: "recorded-snapshot" })).toEqual({
      homeOdds: 1.55,
      drawOdds: 4.2,
      awayOdds: 5.8,
      observedAt: "2026-07-18T12:00:00Z",
      providerSource: "the-odds-api",
      providerSourceId: "evt_match_example_liverpool_chelsea:pinnacle:h2h",
      providerMethod: "recorded-snapshot",
    });
  });

  it("maps the conflict cassette to away-favored prices", () => {
    const raw = JSON.parse(
      readFileSync(join(fixturesDir, "match-example-1.json"), "utf8"),
    ) as unknown;

    const overlay = mapTheOddsApiH2h(raw, {
      providerMethod: "recorded-snapshot",
    });

    expect(overlay?.awayOdds).toBe(2.05);
    expect(overlay?.homeOdds).toBe(3.6);
    expect(overlay?.providerMethod).toBe("recorded-snapshot");
  });

  it("returns undefined for malformed payloads", () => {
    expect(
      mapTheOddsApiH2h({ id: "x" }, { providerMethod: "http-live" }),
    ).toBeUndefined();
  });
});
