import type { MatchId } from "@fas/match";
import type { ImportMatchResult } from "./import-match-use-case.js";

type ImportMatchSuccess = Extract<ImportMatchResult, { ok: true }>;
type ImportMatchFailure = Extract<ImportMatchResult, { ok: false }>;

export interface ImportMatchOperation {
  execute(matchId: MatchId): Promise<ImportMatchResult>;
}

export interface UnexpectedImportFailureReason {
  readonly code: "UNEXPECTED_IMPORT_ERROR";
  readonly message: string;
}

export type ImportMatchesFailureReason =
  | ImportMatchFailure["error"]
  | UnexpectedImportFailureReason;

export interface SuccessfulMatchImport {
  readonly evidence: ImportMatchSuccess["value"];
  readonly matchId: MatchId;
  readonly ok: true;
}

export interface FailedMatchImport {
  readonly matchId: MatchId;
  readonly ok: false;
  readonly reason: ImportMatchesFailureReason;
}

export type MatchImportResult = FailedMatchImport | SuccessfulMatchImport;

export interface ImportMatchesSummary {
  readonly failed: number;
  readonly successful: number;
  readonly total: number;
}

export interface ImportMatchesResult {
  readonly failedImports: ReadonlyArray<FailedMatchImport>;
  readonly results: ReadonlyArray<MatchImportResult>;
  readonly successfulImports: ReadonlyArray<SuccessfulMatchImport>;
  readonly summary: ImportMatchesSummary;
}

const unexpectedImportReason = Object.freeze({
  code: "UNEXPECTED_IMPORT_ERROR" as const,
  message: "Match import failed unexpectedly.",
});

export class ImportMatchesUseCase {
  readonly #importMatch: ImportMatchOperation;

  constructor(importMatch: ImportMatchOperation) {
    this.#importMatch = importMatch;
  }

  async execute(matchIds: readonly MatchId[]): Promise<ImportMatchesResult> {
    const results: MatchImportResult[] = [];
    const successfulImports: SuccessfulMatchImport[] = [];
    const failedImports: FailedMatchImport[] = [];

    for (const matchId of matchIds) {
      try {
        const result = await this.#importMatch.execute(matchId);

        if (result.ok) {
          const successfulImport = Object.freeze({
            evidence: result.value,
            matchId,
            ok: true as const,
          });
          results.push(successfulImport);
          successfulImports.push(successfulImport);
        } else {
          const failedImport = Object.freeze({
            matchId,
            ok: false as const,
            reason: result.error,
          });
          results.push(failedImport);
          failedImports.push(failedImport);
        }
      } catch {
        const failedImport = Object.freeze({
          matchId,
          ok: false as const,
          reason: unexpectedImportReason,
        });
        results.push(failedImport);
        failedImports.push(failedImport);
      }
    }

    return Object.freeze({
      failedImports: Object.freeze(failedImports),
      results: Object.freeze(results),
      successfulImports: Object.freeze(successfulImports),
      summary: Object.freeze({
        failed: failedImports.length,
        successful: successfulImports.length,
        total: results.length,
      }),
    });
  }
}
