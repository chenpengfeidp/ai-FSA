import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CompletedScoreline,
  ScoresSnapshotPrimer,
  ScoresSnapshotSource,
} from "../domain/scores.js";
import { mapTheOddsApiScores } from "../mapper/map-the-odds-api-scores.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

export class RecordedScoresSnapshotSource
  implements ScoresSnapshotSource, ScoresSnapshotPrimer
{
  readonly #scorelines: readonly CompletedScoreline[];

  constructor() {
    const raw = readFileSync(join(fixturesDir, "scores-soccer-epl.json"), "utf8");
    this.#scorelines = mapTheOddsApiScores(JSON.parse(raw), "recorded-snapshot");
  }

  getCompletedScorelines(): readonly CompletedScoreline[] {
    return this.#scorelines;
  }

  async ensureScores(): Promise<void> {
    // Cassette is loaded at construction.
  }

  providerMethod(): "recorded-snapshot" {
    return "recorded-snapshot";
  }
}
