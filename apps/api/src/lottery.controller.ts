import {
  ImportLotteryManifestUseCase,
  LOTTERY_FIXTURE_AUTHORITY,
  LOTTERY_SCHEDULE_SOURCE,
} from "@fas/application";
import { Bind, Body, Controller, Get, Post } from "@nestjs/common";
import { lotteryFixtureRegistry } from "./lottery-fixture-registry.singleton.js";

@Controller("api/lottery")
export class LotteryController {
  readonly #importManifest = new ImportLotteryManifestUseCase(
    lotteryFixtureRegistry,
  );

  @Post("manifest")
  @Bind(Body())
  importManifest(body: unknown): unknown {
    const result = this.#importManifest.execute(body);

    if (!result.ok) {
      return Object.freeze({
        ok: false,
        error: result.error,
      });
    }

    return Object.freeze({
      ok: true,
      registeredCount: result.value.registeredCount,
      matchIds: result.value.matchIds,
    });
  }

  @Get("fixtures")
  listFixtures(): unknown {
    const fixtures = lotteryFixtureRegistry.list();

    return Object.freeze({
      ok: true,
      scheduleSource: LOTTERY_SCHEDULE_SOURCE,
      fixtureAuthority: LOTTERY_FIXTURE_AUTHORITY,
      usedRecordedFallback: false,
      fixtures: fixtures.map((fixture) =>
        Object.freeze({
          matchId: fixture.matchId,
          lotteryMatchCode: fixture.row.lotteryMatchCode,
          homeTeam: fixture.row.homeTeam,
          awayTeam: fixture.row.awayTeam,
          competitionId: fixture.row.competitionId,
          competitionName: fixture.row.competitionName,
          season: fixture.row.season,
          kickoff: fixture.row.kickoff,
          timezone: fixture.row.timezone,
          scheduleSource: fixture.row.scheduleSource,
          fixtureAuthority: fixture.row.fixtureAuthority,
          analyzable: true,
          providerSource: "china-sports-lottery",
          providerMethod: "lottery-manifest",
        }),
      ),
    });
  }
}
