import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import {
  DuplicateEvaluationHistoryError,
  type EvaluationHistoryQuery,
  type EvaluationHistoryRepository,
} from "./evaluation-history-repository.js";

function matchesFilter(
  record: EvaluationHistoryRecord,
  filter: EvaluationHistoryQuery,
): boolean {
  if (filter.matchId !== undefined && record.matchId !== filter.matchId) {
    return false;
  }

  if (
    filter.competitionId !== undefined &&
    record.competitionId !== filter.competitionId
  ) {
    return false;
  }

  if (
    filter.competitionName !== undefined &&
    record.competitionName !== filter.competitionName
  ) {
    return false;
  }

  if (filter.season !== undefined && record.season !== filter.season) {
    return false;
  }

  const matchMs = Date.parse(record.matchDate);

  if (filter.fromMatchDate !== undefined) {
    const fromMs = Date.parse(filter.fromMatchDate);

    if (Number.isNaN(fromMs) || matchMs < fromMs) {
      return false;
    }
  }

  if (filter.toMatchDate !== undefined) {
    const toMs = Date.parse(filter.toMatchDate);

    if (Number.isNaN(toMs) || matchMs > toMs) {
      return false;
    }
  }

  return true;
}

function byMatchDateDesc(
  left: EvaluationHistoryRecord,
  right: EvaluationHistoryRecord,
): number {
  return Date.parse(right.matchDate) - Date.parse(left.matchDate);
}

export class InMemoryEvaluationHistoryRepository
  implements EvaluationHistoryRepository
{
  readonly #records = new Map<string, EvaluationHistoryRecord>();

  async save(record: EvaluationHistoryRecord): Promise<EvaluationHistoryRecord> {
    const existing = this.#records.get(record.historyId);

    if (existing !== undefined) {
      if (existing.checksum === record.checksum) {
        return existing;
      }

      throw new DuplicateEvaluationHistoryError(record.historyId);
    }

    this.#records.set(record.historyId, record);
    return record;
  }

  async findByHistoryId(
    historyId: string,
  ): Promise<EvaluationHistoryRecord | undefined> {
    return this.#records.get(historyId);
  }

  async findByMatch(matchId: string): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ matchId });
  }

  async findByCompetition(
    competitionId: string,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ competitionId });
  }

  async findBySeason(season: string): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ season });
  }

  async findByDateRange(
    fromMatchDate: string,
    toMatchDate: string,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ fromMatchDate, toMatchDate });
  }

  async query(
    filter: EvaluationHistoryQuery,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return Object.freeze(
      [...this.#records.values()]
        .filter((record) => matchesFilter(record, filter))
        .sort(byMatchDateDesc),
    );
  }
}
