import type {
  EvaluationHistoryQuery,
  EvaluationHistoryRecord,
  EvaluationHistoryRepository,
} from "@fas/statistics";

/** Nest-injectable bridge so controllers avoid parameter `@Inject` tokens. */
export class EvaluationHistoryRepositoryBridge
  implements EvaluationHistoryRepository
{
  readonly #inner: EvaluationHistoryRepository;

  constructor(inner: EvaluationHistoryRepository) {
    this.#inner = inner;
  }

  save(record: EvaluationHistoryRecord): Promise<EvaluationHistoryRecord> {
    return this.#inner.save(record);
  }

  findByHistoryId(historyId: string): Promise<EvaluationHistoryRecord | undefined> {
    return this.#inner.findByHistoryId(historyId);
  }

  findByMatch(matchId: string): Promise<readonly EvaluationHistoryRecord[]> {
    return this.#inner.findByMatch(matchId);
  }

  findByCompetition(
    competitionId: string,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return this.#inner.findByCompetition(competitionId);
  }

  findBySeason(season: string): Promise<readonly EvaluationHistoryRecord[]> {
    return this.#inner.findBySeason(season);
  }

  findByDateRange(
    fromMatchDate: string,
    toMatchDate: string,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return this.#inner.findByDateRange(fromMatchDate, toMatchDate);
  }

  query(
    filter: EvaluationHistoryQuery,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return this.#inner.query(filter);
  }
}
