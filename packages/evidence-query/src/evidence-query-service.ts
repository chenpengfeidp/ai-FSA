import type { Evidence, EvidenceRepository, EvidenceType } from "@fas/evidence";

type MatchId = NonNullable<Evidence["matchId"]>;

export type Result<Value, Failure> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ error: Failure; ok: false }>;

export interface EvidenceQueryError {
  readonly code: "REPOSITORY_FAILED";
  readonly message: string;
}

export type EvidenceQueryResult<Value> = Result<Value, EvidenceQueryError>;

function success<Value>(value: Value): Readonly<{ ok: true; value: Value }> {
  return Object.freeze({ ok: true, value });
}

function repositoryFailure(): Readonly<{
  error: EvidenceQueryError;
  ok: false;
}> {
  return Object.freeze({
    error: Object.freeze({
      code: "REPOSITORY_FAILED",
      message: "Evidence repository query failed.",
    }),
    ok: false,
  });
}

export class EvidenceQueryService {
  readonly #repository: EvidenceRepository;

  constructor(repository: EvidenceRepository) {
    this.#repository = repository;
  }

  findById(id: string): EvidenceQueryResult<Evidence | undefined> {
    try {
      return success(this.#repository.findById(id));
    } catch {
      return repositoryFailure();
    }
  }

  findByMatch(matchId: MatchId): EvidenceQueryResult<readonly Evidence[]> {
    return this.#queryAll((evidence) => evidence.matchId === matchId);
  }

  findByType(type: EvidenceType): EvidenceQueryResult<readonly Evidence[]> {
    return this.#queryAll((evidence) => evidence.type === type);
  }

  findAll(): EvidenceQueryResult<readonly Evidence[]> {
    return this.#queryAll();
  }

  #queryAll(
    predicate?: (evidence: Evidence) => boolean,
  ): EvidenceQueryResult<readonly Evidence[]> {
    try {
      const evidence = this.#repository.findAll();
      const matches =
        predicate === undefined ? [...evidence] : evidence.filter(predicate);

      return success(Object.freeze(matches));
    } catch {
      return repositoryFailure();
    }
  }
}
