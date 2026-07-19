import { describe, expect, it } from "vitest";
import { composeNarrativePrompt, PromptCompositionError } from "../src/index.js";

const validInput = Object.freeze({
  reportId: "report:match-example:2026-07-17T10:00:00Z",
  matchId: "match-example",
  homeTeam: "Liverpool",
  awayTeam: "Chelsea",
  recommendation: "lean_home",
  pHome: 0.48,
  pDraw: 0.26,
  pAway: 0.26,
  confidence: 0.72,
  limitations: Object.freeze(["Uncalibrated baseline."]),
  matchedRuleNames: Object.freeze(["HOME_ATTACK_EDGE", "MARKET_LEAN_HOME"]),
  marketConflict: false,
  calibrationArtifactId: "calibration:identity:v1",
  calibrationStatus: "uncalibrated_baseline",
  calibrationQualified: false,
  deterministicChecksum: "checksum-1",
});

describe("composeNarrativePrompt", () => {
  it("builds a reproducible manifest from sealed inputs", () => {
    const first = composeNarrativePrompt(validInput);
    const second = composeNarrativePrompt(validInput);

    expect(first.manifest.checksum).toBe(second.manifest.checksum);
    expect(first.manifest.manifestId).toBe(second.manifest.manifestId);
    expect(first.rendered.sealedContext).toContain("H=0.480");
    expect(first.rendered.systemInstruction).toContain("Do not invent");
    expect(Object.isFrozen(first.manifest)).toBe(true);
  });

  it("rejects empty sealed checksums", () => {
    expect(() =>
      composeNarrativePrompt({
        ...validInput,
        deterministicChecksum: " ",
      }),
    ).toThrow(PromptCompositionError);
  });
});
