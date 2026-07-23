import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";

export interface EvaluationHistoryQuery {
  readonly matchId?: string;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly season?: string;
  readonly fromMatchDate?: string;
  readonly toMatchDate?: string;
}

export interface EvaluationHistoryRepository {
  save(record: EvaluationHistoryRecord): Promise<EvaluationHistoryRecord>;
  findByHistoryId(historyId: string): Promise<EvaluationHistoryRecord | undefined>;
  findByMatch(matchId: string): Promise<readonly EvaluationHistoryRecord[]>;
  findByCompetition(
    competitionId: string,
  ): Promise<readonly EvaluationHistoryRecord[]>;
  findBySeason(season: string): Promise<readonly EvaluationHistoryRecord[]>;
  findByDateRange(
    fromMatchDate: string,
    toMatchDate: string,
  ): Promise<readonly EvaluationHistoryRecord[]>;
  query(filter: EvaluationHistoryQuery): Promise<readonly EvaluationHistoryRecord[]>;
}

export class DuplicateEvaluationHistoryError extends Error {
  constructor(historyId: string) {
    super(`Evaluation History "${historyId}" already exists.`);
    this.name = "DuplicateEvaluationHistoryError";
  }
}
