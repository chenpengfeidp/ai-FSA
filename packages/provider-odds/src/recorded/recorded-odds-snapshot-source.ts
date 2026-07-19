import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findDemoOddsCatalogEntry } from "../catalog/demo-odds-catalog.js";
import type {
  OddsSnapshotSource,
  PreMatchOddsOverlay,
} from "../domain/pre-match-odds.js";
import { mapTheOddsApiH2h } from "../mapper/map-the-odds-api-h2h.js";

function fixturesDirectory(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
}

function loadCassetteJson(cassetteFile: string): unknown {
  const path = join(fixturesDirectory(), cassetteFile);
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export class RecordedOddsSnapshotSource implements OddsSnapshotSource {
  readonly #cache = new Map<string, PreMatchOddsOverlay | undefined>();

  getPreMatch1x2(matchId: string): PreMatchOddsOverlay | undefined {
    if (this.#cache.has(matchId)) {
      return this.#cache.get(matchId);
    }

    const entry = findDemoOddsCatalogEntry(matchId);

    if (entry === undefined) {
      this.#cache.set(matchId, undefined);
      return undefined;
    }

    const overlay = mapTheOddsApiH2h(loadCassetteJson(entry.cassetteFile), {
      providerMethod: "recorded-snapshot",
      preferredBookmakerKey: "pinnacle",
    });

    this.#cache.set(matchId, overlay);
    return overlay;
  }
}
