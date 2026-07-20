import { describe, expect, it } from "vitest";
import { mapApiFootballSquadResponse } from "../src/index.js";

describe("mapApiFootballSquadResponse (F1.1C-1)", () => {
  it("maps basic squad identity fields only", () => {
    const mapped = mapApiFootballSquadResponse(
      {
        response: [
          {
            team: { id: 2766, name: "FC Seoul" },
            players: [
              {
                id: 11,
                name: "Keeper One",
                age: 28,
                number: 1,
                position: "Goalkeeper",
                photo: "https://media.api-sports.io/football/players/11.png",
                nationality: "Korea Republic",
              },
              {
                id: 12,
                name: "Forward Two",
                number: 9,
                position: "Attacker",
                photo: "https://media.api-sports.io/football/players/12.png",
              },
            ],
          },
        ],
      },
      {
        teamId: "2766",
        teamName: "FC Seoul",
        teamSide: "home",
        providerMethod: "http-live",
      },
    );

    expect(mapped).toEqual([
      {
        playerId: "11",
        name: "Keeper One",
        teamId: "2766",
        teamName: "FC Seoul",
        teamSide: "home",
        position: "Goalkeeper",
        number: 1,
        nationality: "Korea Republic",
        photoUrl: "https://media.api-sports.io/football/players/11.png",
        providerMethod: "http-live",
      },
      {
        playerId: "12",
        name: "Forward Two",
        teamId: "2766",
        teamName: "FC Seoul",
        teamSide: "home",
        position: "Attacker",
        number: 9,
        nationality: undefined,
        photoUrl: "https://media.api-sports.io/football/players/12.png",
        providerMethod: "http-live",
      },
    ]);
  });

  it("respects maxPlayers and returns empty for invalid bodies", () => {
    const capped = mapApiFootballSquadResponse(
      {
        response: [
          {
            players: [
              { id: 1, name: "A" },
              { id: 2, name: "B" },
              { id: 3, name: "C" },
            ],
          },
        ],
      },
      {
        teamId: "1",
        teamName: "Team",
        teamSide: "away",
        providerMethod: "recorded-snapshot",
        maxPlayers: 2,
      },
    );

    expect(capped).toHaveLength(2);
    expect(
      mapApiFootballSquadResponse(
        {},
        {
          teamId: "1",
          teamName: "Team",
          teamSide: "home",
          providerMethod: "http-live",
        },
      ),
    ).toEqual([]);
  });
});
