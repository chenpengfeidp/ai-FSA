import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";
import { describe, expect, it } from "vitest";
import {
  mapApiFootballMatchContext,
  readApiFootballFixtureContextMeta,
} from "../src/mapper/map-api-football-match-context.js";
import { RecordedFootballCatalog } from "../src/recorded/recorded-football-catalog.js";
import { toEvidenceMatchShape } from "../src/mapper/to-evidence-match.js";
import type { FootballFixture } from "../src/domain/football-models.js";

const fixture: FootballFixture = Object.freeze({
  fixtureId: "555001",
  matchId: "football:555001",
  competitionId: "292",
  competitionName: "K League 1",
  season: 2026,
  kickoff: "2026-07-20T10:00:00.000Z",
  homeTeamId: "10",
  homeTeamName: "Home FC",
  awayTeamId: "20",
  awayTeamName: "Away FC",
  status: "SCHEDULED",
  venue: Object.freeze({
    venueId: "1",
    name: "Live Stadium",
    city: "Seoul",
  }),
  providerMethod: "http-live",
});

function pastBody(teamId: string, dates: readonly string[]): unknown {
  return {
    response: dates.map((date, index) =>
      Object.freeze({
        fixture: Object.freeze({ id: 9000 + index, date }),
        teams: Object.freeze({
          home: Object.freeze({ id: Number(teamId), name: "Team" }),
          away: Object.freeze({ id: 99, name: "Opp" }),
        }),
      }),
    ),
  };
}

function nextBody(teamId: string, dates: readonly string[]): unknown {
  return pastBody(teamId, dates);
}

describe("I1A Match Context provider mapping", () => {
  it("maps schedule facts without inventing travel distance or knockout", () => {
    const meta = readApiFootballFixtureContextMeta({
      league: { type: "League", round: "Regular Season - 24" },
      score: { aggregate: { home: null, away: null } },
    });

    const mapped = mapApiFootballMatchContext({
      fixture,
      homePastFixturesBody: pastBody("10", [
        "2026-07-14T10:00:00.000Z",
        "2026-07-07T10:00:00.000Z",
      ]),
      awayPastFixturesBody: pastBody("20", [
        "2026-07-17T10:00:00.000Z",
        "2026-07-13T10:00:00.000Z",
        "2026-07-08T10:00:00.000Z",
      ]),
      homeNextFixturesBody: nextBody("10", ["2026-07-24T10:00:00.000Z"]),
      awayNextFixturesBody: nextBody("20", ["2026-07-27T10:00:00.000Z"]),
      competitionTypeLabel: meta.competitionTypeLabel,
      roundLabel: meta.roundLabel,
      aggregateScore: meta.aggregateScore,
      providerMethod: "http-live",
    });

    expect(mapped).toHaveLength(2);

    const home = mapped.find((item) => item.teamSide === "home");
    const away = mapped.find((item) => item.teamSide === "away");

    expect(home?.metrics).toMatchObject({
      restDays: 6,
      daysSinceLastMatch: 6,
      daysUntilNextMatch: 4,
      matchesInLast7Days: 1,
      matchesInLast14Days: 2,
      fixtureCongestion: 1,
      homeAwayContext: "home",
      travelContext: "home",
      venueCity: "Seoul",
      competitionKind: "league",
      competitionTypeLabel: "League",
      isKnockout: false,
      roundLabel: "Regular Season - 24",
    });
    expect(home?.metrics.aggregateScore).toBeUndefined();

    expect(away?.metrics).toMatchObject({
      restDays: 3,
      matchesInLast7Days: 2,
      fixtureCongestion: 2,
      homeAwayContext: "away",
      travelContext: "away",
      isKnockout: false,
    });
  });

  it("keeps knockout and aggregate absent unless provider labels supply them", () => {
    const meta = readApiFootballFixtureContextMeta({
      league: { type: "Cup", round: "Semi-finals 1st Leg" },
      score: { aggregate: { home: 1, away: 0 } },
    });

    const mapped = mapApiFootballMatchContext({
      fixture,
      homePastFixturesBody: { response: [] },
      awayPastFixturesBody: { response: [] },
      competitionTypeLabel: meta.competitionTypeLabel,
      roundLabel: meta.roundLabel,
      aggregateScore: meta.aggregateScore,
      providerMethod: "http-live",
    });

    expect(mapped[0]?.metrics).toMatchObject({
      competitionKind: "cup",
      isKnockout: true,
      leg: "first",
      aggregateScore: "1-0",
      matchesInLast7Days: 0,
      matchesInLast14Days: 0,
    });
    expect(mapped[0]?.metrics.restDays).toBeUndefined();
    expect(mapped[0]?.metrics.daysUntilNextMatch).toBeUndefined();
  });

  it("loads recorded Match Context into Evidence without Features", () => {
    const catalog = new RecordedFootballCatalog();
    const bundle = catalog.getMatchBundle("football:100001");

    expect(bundle).toBeDefined();
    if (bundle === undefined) {
      return;
    }

    expect(bundle.matchContext).toHaveLength(2);
    expect(bundle.matchContext[0]?.metrics.restDays).toBe(6);
    expect(bundle.matchContext[1]?.metrics.travelContext).toBe("away");

    const shape = toEvidenceMatchShape(bundle) as {
      readonly matchContext?: readonly unknown[];
    };
    expect(shape.matchContext?.length).toBe(2);

    const normalized = normalizeFixtureEvidenceSet(shape, {
      collectedAt: "2026-07-22T12:00:00.000Z",
    });

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const contextEvidence = normalized.value.filter(
      (item) => item.type === "MATCH_CONTEXT",
    );
    expect(contextEvidence).toHaveLength(2);
    expect(contextEvidence[0]?.payload).toMatchObject({
      teamSide: "home",
      contextType: "match_context",
      metrics: {
        restDays: 6,
        competitionKind: "league",
      },
    });
    expect(contextEvidence[0]?.provenance.collector).toBe(
      "@fas/evidence-normalizer",
    );
  });
});
