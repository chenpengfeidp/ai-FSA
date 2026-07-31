import { describe, expect, it } from "vitest";
import {
  ACTIVE_PROJECTION_PARAMETER_VERSION_LABEL,
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  buildProjectionParameterCatalog,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  getActiveProjectionParameterArtifact,
  getProjectionParameterArtifactByVersionLabel,
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
  PROJECTION_PARAMETER_VERSION_BASELINE,
  PROJECTION_PARAMETER_VERSION_EXPERIMENTAL,
  PROJECTION_PARAMETER_VERSION_REPLAY,
  parameterGroupsForArtifact,
} from "../src/index.js";

describe("P2J Projection Parameter Artifact", () => {
  it("exposes versioned catalog labels baseline / experimental / replay", () => {
    expect(
      getProjectionParameterArtifactByVersionLabel(
        PROJECTION_PARAMETER_VERSION_BASELINE,
      )?.artifactId,
    ).toBe(BASELINE_PROJECTION_PARAMETER_ARTIFACT.artifactId);
    expect(
      getProjectionParameterArtifactByVersionLabel(
        PROJECTION_PARAMETER_VERSION_EXPERIMENTAL,
      )?.artifactId,
    ).toBe(FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT.artifactId);
    expect(
      getProjectionParameterArtifactByVersionLabel(
        PROJECTION_PARAMETER_VERSION_REPLAY,
      )?.artifactId,
    ).toBe(MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.artifactId);
  });

  it("pins active V2 runtime to projection.v3.replay", () => {
    const active = getActiveProjectionParameterArtifact();

    expect(ACTIVE_PROJECTION_PARAMETER_VERSION_LABEL).toBe(
      PROJECTION_PARAMETER_VERSION_REPLAY,
    );
    expect(active.versionLabel).toBe(PROJECTION_PARAMETER_VERSION_REPLAY);
    expect(active.artifactId).toBe(
      MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.artifactId,
    );
  });

  it("externalizes confidence, recommendation, footballState, and matrixMerge groups", () => {
    const artifact = MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT;

    expect(artifact.confidence.alignmentWeight).toBe(0.35);
    expect(artifact.confidence.coverageWeight).toBe(0.3);
    expect(artifact.confidence.strengthWeight).toBe(0.35);
    expect(artifact.recommendation.leanHomeMargin).toBe(0.08);
    expect(artifact.footballState.lowThreshold).toBe(0.34);
    expect(artifact.matrixMerge.algorithm).toBe("convex_cell_merge_v1");
    expect(artifact.matchScript?.catalog.length).toBeGreaterThan(0);
    expect(parameterGroupsForArtifact(artifact)).toEqual([
      "lambda",
      "matchScript",
      "footballState",
      "confidence",
      "recommendation",
      "matrixMerge",
    ]);
  });

  it("builds a deterministic catalog with provenance", () => {
    const catalog = buildProjectionParameterCatalog({
      usedVersionLabel: PROJECTION_PARAMETER_VERSION_REPLAY,
    });

    expect(catalog.modelVersion).toBe("projectionParameterCatalog.v1.p2j");
    expect(catalog.activeVersionLabel).toBe(PROJECTION_PARAMETER_VERSION_REPLAY);
    expect(catalog.artifacts).toHaveLength(3);

    const used = catalog.artifacts.find((row) => row.usedInAnalysis);
    expect(used?.versionLabel).toBe(PROJECTION_PARAMETER_VERSION_REPLAY);
    expect(used?.checksum).toBe(MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT.checksum);
    expect(catalog.limitations.length).toBeGreaterThan(0);
  });

  it("keeps baseline without matchScript group", () => {
    expect(
      parameterGroupsForArtifact(BASELINE_PROJECTION_PARAMETER_ARTIFACT),
    ).toEqual([
      "lambda",
      "footballState",
      "confidence",
      "recommendation",
      "matrixMerge",
    ]);
  });
});
