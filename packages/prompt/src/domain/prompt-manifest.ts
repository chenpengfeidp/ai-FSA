export const PROMPT_COMPOSITION_POLICY_VERSION =
  "prompt.composition.narrative.v1.slice14";
export const PROMPT_BUILDER_VERSION = "prompt.builder.narrative.v1";
export const NARRATIVE_OUTPUT_SCHEMA_VERSION = "narrative.draft.v1";

export interface NarrativeCompositionInput {
  readonly reportId: string;
  readonly matchId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly recommendation: string;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly confidence: number;
  readonly limitations: readonly string[];
  readonly matchedRuleNames: readonly string[];
  readonly marketConflict: boolean;
  readonly calibrationArtifactId: string;
  readonly calibrationStatus: string;
  readonly calibrationQualified: boolean;
  readonly deterministicChecksum: string;
}

export interface PromptManifest {
  readonly manifestId: string;
  readonly compositionPolicyVersion: typeof PROMPT_COMPOSITION_POLICY_VERSION;
  readonly builderVersion: typeof PROMPT_BUILDER_VERSION;
  readonly outputSchemaVersion: typeof NARRATIVE_OUTPUT_SCHEMA_VERSION;
  readonly reportId: string;
  readonly matchId: string;
  readonly deterministicChecksum: string;
  readonly sectionOrder: readonly string[];
  readonly checksum: string;
}

export interface RenderedPromptRequest {
  readonly manifestId: string;
  readonly systemInstruction: string;
  readonly sealedContext: string;
  readonly outputSchemaVersion: typeof NARRATIVE_OUTPUT_SCHEMA_VERSION;
}

export interface NarrativePromptComposition {
  readonly manifest: PromptManifest;
  readonly rendered: RenderedPromptRequest;
  readonly input: NarrativeCompositionInput;
}

export class PromptCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptCompositionError";
  }
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new PromptCompositionError(`${field} must not be empty.`);
  }

  return normalized;
}

function requireProbability(value: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new PromptCompositionError(`${field} must be a finite probability ≥ 0.`);
  }

  return value;
}

function stableChecksum(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function composeNarrativePrompt(
  input: NarrativeCompositionInput,
): NarrativePromptComposition {
  const reportId = requireNonEmpty(input.reportId, "reportId");
  const matchId = requireNonEmpty(input.matchId, "matchId");
  const homeTeam = requireNonEmpty(input.homeTeam, "homeTeam");
  const awayTeam = requireNonEmpty(input.awayTeam, "awayTeam");
  const recommendation = requireNonEmpty(input.recommendation, "recommendation");
  const pHome = requireProbability(input.pHome, "pHome");
  const pDraw = requireProbability(input.pDraw, "pDraw");
  const pAway = requireProbability(input.pAway, "pAway");
  const confidence = requireProbability(input.confidence, "confidence");
  const deterministicChecksum = requireNonEmpty(
    input.deterministicChecksum,
    "deterministicChecksum",
  );
  const calibrationArtifactId = requireNonEmpty(
    input.calibrationArtifactId,
    "calibrationArtifactId",
  );
  const calibrationStatus = requireNonEmpty(
    input.calibrationStatus,
    "calibrationStatus",
  );
  const sectionOrder = Object.freeze([
    "system_policy",
    "sealed_projection",
    "matched_rules",
    "limitations",
    "narrative_task",
  ] as const);

  const sealedContext = [
    `Match: ${homeTeam} vs ${awayTeam} (${matchId})`,
    `Report: ${reportId}`,
    `Sealed deterministic checksum: ${deterministicChecksum}`,
    `1X2: H=${pHome.toFixed(3)} D=${pDraw.toFixed(3)} A=${pAway.toFixed(3)}`,
    `Recommendation: ${recommendation}`,
    `Confidence: ${confidence.toFixed(3)}`,
    `Matched rules: ${input.matchedRuleNames.join(", ") || "(none)"}`,
    `Market conflict: ${input.marketConflict ? "yes" : "no"}`,
    `Calibration: ${calibrationArtifactId} status=${calibrationStatus} qualified=${input.calibrationQualified}`,
    `Limitations:`,
    ...input.limitations.map((line) => `- ${line}`),
  ].join("\n");

  const systemInstruction = [
    "You explain a sealed FAS deterministic football projection.",
    "Treat all numbers as immutable sealed values.",
    "Do not invent, alter, or recompute probabilities, λ, scorelines, confidence, or recommendations.",
    "Label the response as inference/narrative, never as fact or market truth.",
    "If market conflict or uncalibrated baseline is present, state that explicitly.",
  ].join(" ");

  const checksum = stableChecksum(
    [
      PROMPT_COMPOSITION_POLICY_VERSION,
      PROMPT_BUILDER_VERSION,
      NARRATIVE_OUTPUT_SCHEMA_VERSION,
      reportId,
      matchId,
      deterministicChecksum,
      sealedContext,
      systemInstruction,
    ].join("|"),
  );
  const manifestId = `prompt-manifest:${reportId}:${checksum}`;
  const manifest: PromptManifest = Object.freeze({
    manifestId,
    compositionPolicyVersion: PROMPT_COMPOSITION_POLICY_VERSION,
    builderVersion: PROMPT_BUILDER_VERSION,
    outputSchemaVersion: NARRATIVE_OUTPUT_SCHEMA_VERSION,
    reportId,
    matchId,
    deterministicChecksum,
    sectionOrder,
    checksum,
  });
  const rendered: RenderedPromptRequest = Object.freeze({
    manifestId,
    systemInstruction,
    sealedContext,
    outputSchemaVersion: NARRATIVE_OUTPUT_SCHEMA_VERSION,
  });

  return Object.freeze({
    manifest,
    rendered,
    input: Object.freeze({
      ...input,
      reportId,
      matchId,
      homeTeam,
      awayTeam,
      recommendation,
      pHome,
      pDraw,
      pAway,
      confidence,
      limitations: Object.freeze([...input.limitations]),
      matchedRuleNames: Object.freeze([...input.matchedRuleNames]),
      calibrationArtifactId,
      calibrationStatus,
      deterministicChecksum,
    }),
  });
}
