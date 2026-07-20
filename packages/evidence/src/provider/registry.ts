import type {
  ProviderCapabilityDeclaration,
  ProviderCapabilityKind,
} from "./capabilities.js";
import type { EvidenceProviderCategory } from "./categories.js";

export interface EvidenceProviderRegistration {
  readonly id: string;
  readonly displayName: string;
  readonly category: EvidenceProviderCategory;
  /** Allowed to be selected by intake policy for this environment. */
  readonly enabled: boolean;
  /**
   * True when FAS has a live adapter path for this provider.
   * F1.1A: only football:api-sports and internal:recorded are connected.
   */
  readonly connected: boolean;
  readonly capabilities: readonly ProviderCapabilityDeclaration[];
}

export class EvidenceProviderRegistry {
  readonly #providers = new Map<string, EvidenceProviderRegistration>();

  register(registration: EvidenceProviderRegistration): void {
    const id = registration.id.trim();

    if (id.length === 0) {
      throw new Error("Provider registration id must not be empty.");
    }

    this.#providers.set(
      id,
      Object.freeze({
        ...registration,
        id,
        capabilities: Object.freeze(
          registration.capabilities.map((capability) =>
            Object.freeze({ ...capability }),
          ),
        ),
      }),
    );
  }

  get(providerId: string): EvidenceProviderRegistration | undefined {
    return this.#providers.get(providerId);
  }

  list(): readonly EvidenceProviderRegistration[] {
    return Object.freeze([...this.#providers.values()]);
  }

  listByCategory(
    category: EvidenceProviderCategory,
  ): readonly EvidenceProviderRegistration[] {
    return Object.freeze(
      [...this.#providers.values()].filter(
        (provider) => provider.category === category,
      ),
    );
  }

  listConnected(): readonly EvidenceProviderRegistration[] {
    return Object.freeze(
      [...this.#providers.values()].filter((provider) => provider.connected),
    );
  }

  supportsCapability(providerId: string, kind: ProviderCapabilityKind): boolean {
    const provider = this.#providers.get(providerId);

    if (provider === undefined) {
      return false;
    }

    return provider.capabilities.some(
      (capability) => capability.kind === kind && capability.supported,
    );
  }

  providersSupporting(
    kind: ProviderCapabilityKind,
  ): readonly EvidenceProviderRegistration[] {
    return Object.freeze(
      [...this.#providers.values()].filter((provider) =>
        provider.capabilities.some(
          (capability) => capability.kind === kind && capability.supported,
        ),
      ),
    );
  }

  getCapability(
    providerId: string,
    kind: ProviderCapabilityKind,
  ): ProviderCapabilityDeclaration | undefined {
    const provider = this.#providers.get(providerId);

    if (provider === undefined) {
      return undefined;
    }

    return provider.capabilities.find((capability) => capability.kind === kind);
  }
}
