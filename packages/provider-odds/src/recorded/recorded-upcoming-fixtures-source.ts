import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  UpcomingFixture,
  UpcomingFixturesSource,
} from "../domain/upcoming-fixture.js";
import { mapTheOddsApiOddsList } from "../mapper/map-the-odds-api-odds-list.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

export class RecordedUpcomingFixturesSource implements UpcomingFixturesSource {
  async listUpcoming(): Promise<readonly UpcomingFixture[]> {
    const raw = readFileSync(join(fixturesDir, "upcoming-soccer-epl.json"), "utf8");
    const body: unknown = JSON.parse(raw);

    return mapTheOddsApiOddsList(body, {
      providerMethod: "recorded-snapshot",
      defaultSportKey: "soccer_epl",
    });
  }
}
