import { createEvidence } from "@fas/evidence";
import { createMatchId, type MatchId } from "@fas/match";
import { describe, expect, it, vi } from "vitest";
import { type ImportMatchResult, ImportMatchesUseCase } from "../src/index.js";

function successfulResult(matchId: MatchId): ImportMatchResult {
  return Object.freeze({
    ok: true,
    value: createEvidence({
      id: `evidence-${matchId}`,
      source: "fixture",
      sourceId: `fixture-${matchId}`,
      type: "MATCH_INFO",
      matchId,
      collectedAt: "2026-07-17T09:00:00Z",
      eventTime: "2026-08-01T19:30:00Z",
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/application",
        method: "test",
      },
      payload: {
        kickoff: "2026-08-01T19:30:00Z",
      },
    }),
  });
}

function notFoundResult(matchId: MatchId): ImportMatchResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "MATCH_NOT_FOUND",
      message: `Match "${matchId}" was not found.`,
    }),
  });
}

describe("ImportMatchesUseCase", () => {
  it("aggregates successful imports in input order", async () => {
    const matchIds = Object.freeze([
      createMatchId("match-1"),
      createMatchId("match-2"),
      createMatchId("match-3"),
    ]);
    const execute = vi.fn(async (matchId: MatchId) => successfulResult(matchId));
    const useCase = new ImportMatchesUseCase({ execute });

    const result = await useCase.execute(matchIds);

    expect(result.summary).toEqual({
      failed: 0,
      successful: 3,
      total: 3,
    });
    expect(result.results.map(({ matchId }) => matchId)).toEqual(matchIds);
    expect(result.successfulImports.map(({ matchId }) => matchId)).toEqual(matchIds);
    expect(result.failedImports).toEqual([]);
    expect(execute.mock.calls.map(([matchId]) => matchId)).toEqual(matchIds);
    expect(matchIds).toEqual(["match-1", "match-2", "match-3"]);
  });

  it("continues after failure and reports partial success", async () => {
    const matchIds = [
      createMatchId("match-1"),
      createMatchId("match-missing"),
      createMatchId("match-3"),
    ] as const;
    const execute = vi.fn(
      async (matchId: MatchId): Promise<ImportMatchResult> =>
        matchId === "match-missing"
          ? notFoundResult(matchId)
          : successfulResult(matchId),
    );
    const useCase = new ImportMatchesUseCase({ execute });

    const result = await useCase.execute(matchIds);

    expect(result.summary).toEqual({
      failed: 1,
      successful: 2,
      total: 3,
    });
    expect(result.results.map(({ ok }) => ok)).toEqual([true, false, true]);
    expect(result.failedImports).toEqual([
      {
        matchId: "match-missing",
        ok: false,
        reason: {
          code: "MATCH_NOT_FOUND",
          message: 'Match "match-missing" was not found.',
        },
      },
    ]);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("reports all failures when no import succeeds", async () => {
    const matchIds = [
      createMatchId("match-missing-1"),
      createMatchId("match-missing-2"),
    ] as const;
    const useCase = new ImportMatchesUseCase({
      execute: async (matchId) => notFoundResult(matchId),
    });

    const result = await useCase.execute(matchIds);

    expect(result.summary).toEqual({
      failed: 2,
      successful: 0,
      total: 2,
    });
    expect(result.successfulImports).toEqual([]);
    expect(result.failedImports.map(({ matchId }) => matchId)).toEqual(matchIds);
  });

  it("preserves duplicate Evidence failure reasons", async () => {
    const matchId = createMatchId("match-duplicate");
    const useCase = new ImportMatchesUseCase({
      execute: async () =>
        Object.freeze({
          ok: false,
          error: Object.freeze({
            code: "DUPLICATE_EVIDENCE",
            message: 'Evidence "evidence-match-duplicate" already exists.',
          }),
        }),
    });

    const result = await useCase.execute([matchId]);

    expect(result.failedImports).toEqual([
      {
        matchId,
        ok: false,
        reason: {
          code: "DUPLICATE_EVIDENCE",
          message: 'Evidence "evidence-match-duplicate" already exists.',
        },
      },
    ]);
  });

  it("returns deeply immutable aggregate structures", async () => {
    const useCase = new ImportMatchesUseCase({
      execute: async (matchId) => successfulResult(matchId),
    });

    const result = await useCase.execute([createMatchId("match-immutable")]);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.results)).toBe(true);
    expect(Object.isFrozen(result.successfulImports)).toBe(true);
    expect(Object.isFrozen(result.failedImports)).toBe(true);
    expect(Object.isFrozen(result.summary)).toBe(true);
    expect(Object.isFrozen(result.results[0])).toBe(true);
    expect(Reflect.set(result.summary, "total", 0)).toBe(false);
  });

  it("converts unexpected errors and continues with remaining matches", async () => {
    const matchIds = [
      createMatchId("match-1"),
      createMatchId("match-throws"),
      createMatchId("match-3"),
    ] as const;
    const execute = vi.fn(async (matchId: MatchId): Promise<ImportMatchResult> => {
      if (matchId === "match-throws") {
        throw new Error("unexpected import failure");
      }

      return successfulResult(matchId);
    });
    const useCase = new ImportMatchesUseCase({ execute });

    await expect(useCase.execute(matchIds)).resolves.toBeDefined();

    const result = await useCase.execute(matchIds);

    expect(result.summary).toEqual({
      failed: 1,
      successful: 2,
      total: 3,
    });
    expect(result.results.map(({ matchId }) => matchId)).toEqual(matchIds);
    expect(result.failedImports[0]).toEqual({
      matchId: "match-throws",
      ok: false,
      reason: {
        code: "UNEXPECTED_IMPORT_ERROR",
        message: "Match import failed unexpectedly.",
      },
    });
  });
});
