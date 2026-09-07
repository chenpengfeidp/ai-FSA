import type { PrematchPredictionSeal } from "../domain/prematch-prediction-seal.js";
import { identitiesCanonicallyEqual } from "../seal/create-prematch-prediction-seal.js";
import {
  SealIdentityConflictError,
  type PrematchPredictionSealRepository,
} from "./prematch-prediction-seal-repository.js";

export class InMemoryPrematchPredictionSealRepository
  implements PrematchPredictionSealRepository
{
  readonly #seals = new Map<string, PrematchPredictionSeal>();

  async save(seal: PrematchPredictionSeal): Promise<PrematchPredictionSeal> {
    const existing = this.#seals.get(seal.originalSealId);

    if (existing !== undefined) {
      if (identitiesCanonicallyEqual(existing.sealIdentity, seal.sealIdentity)) {
        return existing;
      }

      throw new SealIdentityConflictError(seal.originalSealId);
    }

    this.#seals.set(seal.originalSealId, seal);
    return seal;
  }

  async findByOriginalSealId(
    originalSealId: string,
  ): Promise<PrematchPredictionSeal | undefined> {
    return this.#seals.get(originalSealId);
  }

  async findByMatch(matchId: string): Promise<readonly PrematchPredictionSeal[]> {
    return Object.freeze(
      [...this.#seals.values()].filter(
        (seal) => seal.sealIdentity.matchId === matchId,
      ),
    );
  }
}
