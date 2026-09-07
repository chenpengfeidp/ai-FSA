import type { PrematchPredictionSeal } from "../domain/prematch-prediction-seal.js";
import { PrematchPredictionSealError } from "../domain/prematch-prediction-seal.js";

export interface PrematchPredictionSealRepository {
  save(seal: PrematchPredictionSeal): Promise<PrematchPredictionSeal>;
  findByOriginalSealId(
    originalSealId: string,
  ): Promise<PrematchPredictionSeal | undefined>;
  findByMatch(matchId: string): Promise<readonly PrematchPredictionSeal[]>;
}

export class SealIdentityConflictError extends PrematchPredictionSealError {
  constructor(originalSealId: string) {
    super(
      "SEAL_IDENTITY_CONFLICT",
      `PRE_MATCH seal "${originalSealId}" already exists with a different sealIdentity.`,
    );
    this.name = "SealIdentityConflictError";
  }
}
