export const LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID = "local_deterministic_v1";

export type NarrativeEpistemicKind = "inference";

export interface NarrativeSection {
  readonly title: string;
  readonly body: string;
}

export interface NarrativeDraft {
  readonly epistemicKind: NarrativeEpistemicKind;
  readonly providerId: typeof LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID;
  readonly promptManifestId: string;
  readonly promptManifestChecksum: string;
  readonly sections: readonly NarrativeSection[];
  readonly disclaimer: string;
  readonly generatedAt: string;
}

export class NarrativeGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NarrativeGenerationError";
  }
}
