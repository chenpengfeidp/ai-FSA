import type { LotteryFixtureRegistry } from "./lottery/lottery-fixture-registry.js";
import {
  buildRegisteredLotteryFixtures,
  validateLotteryFixtureManifest,
} from "./lottery/validate-lottery-manifest.js";

export type ImportLotteryManifestResult =
  | Readonly<{
      ok: true;
      value: Readonly<{
        registeredCount: number;
        matchIds: readonly string[];
      }>;
    }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: string;
        message: string;
        field?: string;
      }>;
    }>;

export class ImportLotteryManifestUseCase {
  readonly #registry: LotteryFixtureRegistry;

  constructor(registry: LotteryFixtureRegistry) {
    this.#registry = registry;
  }

  execute(input: unknown): ImportLotteryManifestResult {
    const validated = validateLotteryFixtureManifest(input);

    if (!validated.ok) {
      return Object.freeze({
        ok: false,
        error: Object.freeze({
          code: validated.error.code,
          message: validated.error.message,
          ...(validated.error.field === undefined
            ? {}
            : { field: validated.error.field }),
        }),
      });
    }

    const manifest = validated.value;
    const matchIds: string[] = [];

    for (const entry of buildRegisteredLotteryFixtures(manifest)) {
      const registered = this.#registry.register(
        Object.freeze({
          matchId: entry.matchId,
          salesIssueId: entry.salesIssueId,
          row: entry.row,
          ...(manifest.sourceReference === undefined
            ? {}
            : { sourceReference: manifest.sourceReference }),
          ...(manifest.marketPrimaryBook === undefined
            ? {}
            : { marketPrimaryBook: manifest.marketPrimaryBook }),
        }),
      );

      if (!registered.ok) {
        return Object.freeze({
          ok: false,
          error: Object.freeze({
            code: registered.code,
            message: registered.message,
          }),
        });
      }

      matchIds.push(entry.matchId);
    }

    return Object.freeze({
      ok: true,
      value: Object.freeze({
        registeredCount: matchIds.length,
        matchIds: Object.freeze(matchIds),
      }),
    });
  }
}
