import type { NarrativePromptComposition } from "@fas/prompt";
import type { NarrativeDraft } from "./narrative-draft.js";

/** Inward-facing port for narrative generation. Adapters implement this. */
export interface NarrativeGenerator {
  generate(
    composition: NarrativePromptComposition,
    generatedAt: string,
  ): NarrativeDraft;
}
