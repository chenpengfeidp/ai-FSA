import { composeNarrativePrompt } from "@fas/prompt";
import { describe, expect, it } from "vitest";
import {
  LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID,
  LocalDeterministicNarrativeAdapter,
} from "../src/index.js";

describe("LocalDeterministicNarrativeAdapter", () => {
  it("explains sealed values without inventing probabilities", () => {
    const composition = composeNarrativePrompt({
      reportId: "report:match-example:2026-07-17T10:00:00Z",
      matchId: "match-example",
      homeTeam: "Liverpool",
      awayTeam: "Chelsea",
      recommendation: "cautious",
      pHome: 0.5,
      pDraw: 0.25,
      pAway: 0.25,
      confidence: 0.6,
      limitations: ["Market lean conflicts with football-model directional lean."],
      matchedRuleNames: ["H2H_SUPPORTS_HOME", "MARKET_LEAN_AWAY"],
      marketConflict: true,
      calibrationArtifactId: "calibration:identity:v1",
      calibrationStatus: "uncalibrated_baseline",
      calibrationQualified: false,
      deterministicChecksum: "checksum-1",
    });
    const draft = new LocalDeterministicNarrativeAdapter().generate(
      composition,
      "2026-07-17T10:00:00Z",
    );

    expect(draft.epistemicKind).toBe("inference");
    expect(draft.providerId).toBe(LOCAL_DETERMINISTIC_NARRATIVE_PROVIDER_ID);
    expect(draft.sections[0]?.body).toContain("50.0%");
    expect(draft.sections[0]?.body).toContain("were not recomputed");
    expect(draft.sections[1]?.body).toContain("conflicts");
    expect(draft.disclaimer).toContain("Inference draft only");
  });
});
