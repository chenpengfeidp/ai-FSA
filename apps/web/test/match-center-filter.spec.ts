import { describe, expect, it } from "vitest";
import {
  earliestMatchLocalDate,
  filterMatchCenterRows,
  formatLocalDate,
  windowEndDate,
} from "../src/lib/match-center-filter";
import type { MatchSummary } from "../src/types/match-center";

function match(
  partial: Partial<MatchSummary> &
    Pick<MatchSummary, "id" | "kickoff" | "providerSource">,
): MatchSummary {
  return Object.freeze({
    homeTeam: "Home",
    awayTeam: "Away",
    kickoffTime: "label",
    competition: "EPL",
    status: "SCHEDULED",
    analyzable: true,
    ...partial,
  });
}

describe("match-center-filter", () => {
  it("builds an inclusive local window end date", () => {
    expect(windowEndDate("2026-07-19", 3)).toBe("2026-07-21");
    expect(windowEndDate("2026-07-19", 1)).toBe("2026-07-19");
  });

  it("keeps odds rows inside the window and drops demos by default", () => {
    const rows = [
      match({
        id: "in-window",
        kickoff: "2026-07-19T12:00:00",
        providerSource: "the-odds-api",
      }),
      match({
        id: "demo",
        kickoff: "2026-07-19T15:00:00",
        providerSource: "fixture",
      }),
      match({
        id: "out-window",
        kickoff: "2026-08-01T12:00:00",
        providerSource: "the-odds-api",
      }),
    ];

    const filtered = filterMatchCenterRows(rows, {
      startDate: "2026-07-19",
      horizonDays: 3,
      includeDemos: false,
    });

    expect(filtered.map((item) => item.id)).toEqual(["in-window"]);
  });

  it("includes demos when requested", () => {
    const rows = [
      match({
        id: "demo",
        kickoff: "2026-07-20T15:00:00",
        providerSource: "fixture",
      }),
    ];

    expect(
      filterMatchCenterRows(rows, {
        startDate: "2026-07-19",
        horizonDays: 3,
        includeDemos: true,
      }),
    ).toHaveLength(1);
  });

  it("sorts analyzable rows before incomplete evidence", () => {
    const rows = [
      match({
        id: "incomplete-early",
        kickoff: "2026-07-19T10:00:00Z",
        providerSource: "the-odds-api",
        analyzable: false,
      }),
      match({
        id: "analyzable-later",
        kickoff: "2026-07-20T12:00:00Z",
        providerSource: "the-odds-api",
        analyzable: true,
      }),
    ];

    expect(
      filterMatchCenterRows(rows, {
        startDate: "2026-07-19",
        horizonDays: 3,
        includeDemos: false,
      }).map((item) => item.id),
    ).toEqual(["analyzable-later", "incomplete-early"]);
  });

  it("formats today's local date stably", () => {
    expect(formatLocalDate(new Date(2026, 6, 19))).toBe("2026-07-19");
  });

  it("finds the earliest non-demo local kickoff date", () => {
    const augKickoff = "2026-08-01T02:00:00Z";
    const rows = [
      match({
        id: "demo",
        kickoff: "2026-07-19T12:00:00Z",
        providerSource: "fixture",
      }),
      match({
        id: "aug",
        kickoff: augKickoff,
        providerSource: "the-odds-api",
      }),
    ];

    expect(
      earliestMatchLocalDate(rows, {
        includeDemos: false,
      }),
    ).toBe(formatLocalDate(new Date(augKickoff)));
  });
});
