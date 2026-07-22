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

  async findById(id: string): Promise<EvidenceQueryResult<Evidence | undefined>> {
    try {
      return success(await this.#repository.findById(id));
    } catch {
      return repositoryFailure();
    }
  }

  async findByMatch(
    matchId: MatchId,
  ): Promise<EvidenceQueryResult<readonly Evidence[]>> {
    try {
      return success(
        Object.freeze([...(await this.#repository.findByMatch(matchId))]),
      );
    } catch {
      return repositoryFailure();
    }
  }

  findByType(type: EvidenceType): Promise<EvidenceQueryResult<readonly Evidence[]>> {
    return this.#queryAll((evidence) => evidence.type === type);
  }

  findAll(): Promise<EvidenceQueryResult<readonly Evidence[]>> {
    return this.#queryAll();
  }

  async #queryAll(
    predicate?: (evidence: Evidence) => boolean,
  ): Promise<EvidenceQueryResult<readonly Evidence[]>> {
    try {
      const evidence = await this.#repository.findAll();
      const matches =
        predicate === undefined ? [...evidence] : evidence.filter(predicate);

      return success(Object.freeze(matches));
    } catch {
      return repositoryFailure();
    }
  }
}
