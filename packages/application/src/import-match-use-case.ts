import type { EvidenceImportResult } from "@fas/evidence-import";

export interface MatchProvider {
  getMatch(matchId: string): unknown;
}

export interface EvidenceImporter {
  importEvidence(input: unknown): EvidenceImportResult;
}

export type ImportMatchErrorCode =
  | "EVIDENCE_IMPORT_FAILED"
  | "MATCH_NOT_FOUND"
  | "PROVIDER_FAILED";

export interface ImportMatchError {
  readonly code: ImportMatchErrorCode;
  readonly message: string;
}

export type ImportMatchResult =
  | EvidenceImportResult
  | Readonly<{ error: ImportMatchError; ok: false }>;

function failure(
  code: ImportMatchErrorCode,
  message: string,
): Readonly<{ error: ImportMatchError; ok: false }> {
  return Object.freeze({
    error: Object.freeze({ code, message }),
    ok: false,
  });
}

export class ImportMatchUseCase {
  readonly #provider: MatchProvider;
  readonly #evidenceImporter: EvidenceImporter;

  constructor(provider: MatchProvider, evidenceImporter: EvidenceImporter) {
    this.#provider = provider;
    this.#evidenceImporter = evidenceImporter;
  }

  execute(matchId: string): ImportMatchResult {
    let providerInput: unknown;

    try {
      providerInput = this.#provider.getMatch(matchId);
    } catch {
      return failure("PROVIDER_FAILED", "Match provider lookup failed.");
    }

    if (providerInput === undefined) {
      return failure("MATCH_NOT_FOUND", `Match "${matchId}" was not found.`);
    }

    try {
      return this.#evidenceImporter.importEvidence(providerInput);
    } catch {
      return failure(
        "EVIDENCE_IMPORT_FAILED",
        "Evidence import failed unexpectedly.",
      );
    }
  }
}
