import type { NarrativePromptComposition } from "@fas/prompt";
import {
  LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID,
  type NarrativeDraft,
  NarrativeGenerationError,
} from "../domain/narrative-draft.js";

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Local deterministic narrator for private V1.
 * Explains sealed projection values only; never calls a network provider SDK.
 */
export class LocalDeterministicNarrativeAdapter {
  generate(
    composition: NarrativePromptComposition,
    generatedAt: string,
  ): NarrativeDraft {
    if (composition.rendered.manifestId !== composition.manifest.manifestId) {
      throw new NarrativeGenerationError(
        "Rendered request manifestId does not match prompt manifest.",
      );
    }

    const input = composition.input;
    const overview = [
      `${input.homeTeam} vs ${input.awayTeam}: sealed recommendation is ${input.recommendation}.`,
      `Model 1X2 is Home ${percent(input.pHome)}, Draw ${percent(input.pDraw)}, Away ${percent(input.pAway)} with confidence ${percent(input.confidence)}.`,
      "These values are copied from the sealed deterministic projection and were not recomputed by this narrator.",
    ].join(" ");

    const evidenceBody = [
      input.matchedRuleNames.length > 0
        ? `Matched findings include ${input.matchedRuleNames.join(", ")}.`
        : "No football/market findings were matched.",
      input.marketConflict
        ? "Market lean conflicts with the football-model directional lean, so caution is emphasized."
        : "No market-vs-model directional conflict was recorded.",
      `Calibration artifact ${input.calibrationArtifactId} is ${input.calibrationStatus} (qualified=${input.calibrationQualified}).`,
    ].join(" ");

    const limitationsBody =
      input.limitations.length > 0
        ? input.limitations.join(" ")
        : "No explicit limitations were attached to the sealed projection.";

    return Object.freeze({
      epistemicKind: "inference",
      providerId: LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID,
      promptManifestId: composition.manifest.manifestId,
      promptManifestChecksum: composition.manifest.checksum,
      sections: Object.freeze([
        Object.freeze({ title: "Overview", body: overview }),
        Object.freeze({ title: "Evidence reading", body: evidenceBody }),
        Object.freeze({ title: "Limitations", body: limitationsBody }),
      ]),
      disclaimer:
        "Inference draft only. Not fact, not market truth, not wagering advice. Numbers come from the sealed deterministic projection.",
      generatedAt,
    });
  }
}
