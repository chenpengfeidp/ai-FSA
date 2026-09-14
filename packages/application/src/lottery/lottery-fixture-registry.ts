import type { LotteryMatchManifestRow } from "./lottery-manifest-types.js";

export interface RegisteredLotteryFixture {
  readonly matchId: string;
  readonly salesIssueId: string;
  readonly row: LotteryMatchManifestRow;
  readonly sourceReference?: string;
  readonly marketPrimaryBook?: string;
}

function orientationKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam}\u0000${awayTeam}`;
}

export class LotteryFixtureRegistry {
  readonly #byMatchId = new Map<string, RegisteredLotteryFixture>();
  readonly #orientationByCode = new Map<string, string>();

  register(
    fixture: RegisteredLotteryFixture,
  ):
    | Readonly<{ ok: true }>
    | Readonly<{ ok: false; code: string; message: string }> {
    const codeKey = `${fixture.salesIssueId}:${fixture.row.lotteryMatchCode}`;
    const orientation = orientationKey(fixture.row.homeTeam, fixture.row.awayTeam);
    const existingOrientation = this.#orientationByCode.get(codeKey);

    if (existingOrientation !== undefined && existingOrientation !== orientation) {
      return Object.freeze({
        ok: false,
        code: "FIXTURE_ORIENTATION_CONFLICT",
        message: `Orientation conflict for lottery match code "${fixture.row.lotteryMatchCode}".`,
      });
    }

    const existing = this.#byMatchId.get(fixture.matchId);

    if (existing !== undefined) {
      const existingRevision = existing.row.fixtureRevision ?? 1;
      const nextRevision = fixture.row.fixtureRevision ?? 1;

      if (nextRevision < existingRevision) {
        return Object.freeze({
          ok: false,
          code: "INVALID_LOTTERY_MANIFEST",
          message: "fixtureRevision must be monotonic non-decreasing.",
        });
      }

      if (
        existing.row.homeTeam !== fixture.row.homeTeam ||
        existing.row.awayTeam !== fixture.row.awayTeam
      ) {
        return Object.freeze({
          ok: false,
          code: "FIXTURE_ORIENTATION_CONFLICT",
          message:
            "Cannot change home/away orientation for an existing lottery fixture.",
        });
      }
    }

    this.#orientationByCode.set(codeKey, orientation);
    this.#byMatchId.set(fixture.matchId, fixture);

    return Object.freeze({ ok: true });
  }

  get(matchId: string): RegisteredLotteryFixture | undefined {
    return this.#byMatchId.get(matchId);
  }

  list(): readonly RegisteredLotteryFixture[] {
    return Object.freeze([...this.#byMatchId.values()]);
  }

  clear(): void {
    this.#byMatchId.clear();
    this.#orientationByCode.clear();
  }
}
