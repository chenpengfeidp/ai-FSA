import type { Evidence } from "@fas/evidence";
import type { EvidenceImportResult } from "@fas/evidence-import";
import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";

export interface MatchProvider {
  getMatch(matchId: string): unknown;
}

export interface EvidenceImporter {
  importEvidence(input: unknown): EvidenceImportResult;
}

export interface EvidenceRecordImporter extends EvidenceImporter {
  importEvidenceRecordIdempotent(evidence: Evidence): EvidenceImportResult;
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

function isRecordImporter(
  importer: EvidenceImporter,
): importer is EvidenceRecordImporter {
  return "importEvidenceRecordIdempotent" in importer;
}

function hasEvidenceSetFields(input: unknown): boolean {
  return (
    typeof input === "object" &&
    input !== null &&
    "teamForm" in input &&
    "statistics" in input
  );
}

export class ImportMatchUseCase {
  readonly #provider: MatchProvider;
  readonly #evidenceImporter: EvidenceImporter;
  readonly #collectedAt: string;

  constructor(
    provider: MatchProvider,
    evidenceImporter: EvidenceImporter,
    collectedAt = "2026-07-17T10:00:00Z",
  ) {
    this.#provider = provider;
    this.#evidenceImporter = evidenceImporter;
    this.#collectedAt = collectedAt;
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

    if (
      hasEvidenceSetFields(providerInput) &&
      isRecordImporter(this.#evidenceImporter)
    ) {
      return this.#importEvidenceSet(providerInput, this.#evidenceImporter);
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

  #importEvidenceSet(
    providerInput: unknown,
    importer: EvidenceRecordImporter,
  ): ImportMatchResult {
    let matchInfo: Evidence | undefined;

    try {
      const normalized = normalizeFixtureEvidenceSet(providerInput, {
        collectedAt: this.#collectedAt,
      });

      if (!normalized.ok) {
        return failure("EVIDENCE_IMPORT_FAILED", "Evidence normalization failed.");
      }

      for (const evidence of normalized.value) {
        const imported = importer.importEvidenceRecordIdempotent(evidence);

        if (!imported.ok) {
          return imported;
        }

        if (evidence.type === "MATCH_INFO") {
          matchInfo = imported.value;
        }
      }
    } catch {
      return failure(
        "EVIDENCE_IMPORT_FAILED",
        "Evidence import failed unexpectedly.",
      );
    }

    if (matchInfo === undefined) {
      return failure(
        "EVIDENCE_IMPORT_FAILED",
        "MATCH_INFO evidence was not imported.",
      );
    }

    return Object.freeze({ ok: true, value: matchInfo });
  }
}
