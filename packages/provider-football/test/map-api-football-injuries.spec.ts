import { describe, expect, it } from "vitest";
import { mapApiFootballInjuriesResponse } from "../src/index.js";

describe("mapApiFootballInjuriesResponse (F1.1D)", () => {
  it("maps injury and suspension rows; skips unknown types", () => {
    const mapped = mapApiFootballInjuriesResponse(
      {
        response: [
          {
            player: { id: 12, name: "Forward One" },
            team: { id: 2766, name: "FC Seoul" },
            type: "Injury",
            reason: "Hamstring Strain",
          },
          {
            player: { id: 14, name: "Defender Two" },
            team: { id: 2765, name: "Ulsan Hyundai FC" },
            type: "Suspension",
            reason: "Suspended 1 match",
          },
          {
            player: { id: 99, name: "Unknown Kind" },
            team: { id: 2766, name: "FC Seoul" },
            type: "Doubtful",
            reason: "Knock",
          },
        ],
      },
      {
        homeTeamId: "2766",
        awayTeamId: "2765",
        providerMethod: "http-live",
      },
    );

    expect(mapped).toEqual([
      {
        playerId: "12",
        playerName: "Forward One",
        teamId: "2766",
        teamName: "FC Seoul",
        teamSide: "home",
        kind: "injury",
        reason: "Hamstring Strain",
        providerMethod: "http-live",
      },
      {
        playerId: "14",
        playerName: "Defender Two",
        teamId: "2765",
        teamName: "Ulsan Hyundai FC",
        teamSide: "away",
        kind: "suspension",
        reason: "Suspended 1 match",
        providerMethod: "http-live",
      },
    ]);
  });

  it("returns empty for invalid or empty bodies", () => {
    expect(
      mapApiFootballInjuriesResponse(
        { response: [] },
        {
          homeTeamId: "1",
          awayTeamId: "2",
          providerMethod: "recorded-snapshot",
        },
      ),
    ).toEqual([]);
    expect(
      mapApiFootballInjuriesResponse(undefined, {
        homeTeamId: "1",
        awayTeamId: "2",
        providerMethod: "recorded-snapshot",
      }),
    ).toEqual([]);
  });
});
