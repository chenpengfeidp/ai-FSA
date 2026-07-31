import {
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
  PROJECTION_PARAMETER_VERSION_BASELINE,
  PROJECTION_PARAMETER_VERSION_EXPERIMENTAL,
  PROJECTION_PARAMETER_VERSION_REPLAY,
  type ProjectionParameterArtifact,
  type ProjectionParameterVersionLabel,
} from "./projection-parameter-artifact.js";
import {
  PROJECTION_PARAMETER_GROUP_IDS,
  type ProjectionParameterGroupId,
} from "./projection-parameter-groups.js";

/** Active V2 runtime / replay default — Match Script unified matrix. */
export const ACTIVE_PROJECTION_PARAMETER_VERSION_LABEL: ProjectionParameterVersionLabel =
  PROJECTION_PARAMETER_VERSION_REPLAY;

const REGISTRY: ReadonlyMap<
  ProjectionParameterVersionLabel,
  ProjectionParameterArtifact
> = new Map([
  [PROJECTION_PARAMETER_VERSION_BASELINE, BASELINE_PROJECTION_PARAMETER_ARTIFACT],
  [
    PROJECTION_PARAMETER_VERSION_EXPERIMENTAL,
    FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  ],
  [PROJECTION_PARAMETER_VERSION_REPLAY, MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT],
]);

export function listProjectionParameterArtifacts(): readonly ProjectionParameterArtifact[] {
  return Object.freeze([
    BASELINE_PROJECTION_PARAMETER_ARTIFACT,
    FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
    MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
  ]);
}

export function getProjectionParameterArtifactByVersionLabel(
  versionLabel: string,
): ProjectionParameterArtifact | undefined {
  const normalized = versionLabel.trim();

  if (
    normalized !== PROJECTION_PARAMETER_VERSION_BASELINE &&
    normalized !== PROJECTION_PARAMETER_VERSION_EXPERIMENTAL &&
    normalized !== PROJECTION_PARAMETER_VERSION_REPLAY
  ) {
    return undefined;
  }

  return REGISTRY.get(normalized);
}

export function getActiveProjectionParameterArtifact(): ProjectionParameterArtifact {
  return MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT;
}

export function parameterGroupsForArtifact(
  artifact: ProjectionParameterArtifact,
): readonly ProjectionParameterGroupId[] {
  const groups: ProjectionParameterGroupId[] = [
    "lambda",
    "footballState",
    "confidence",
    "recommendation",
    "matrixMerge",
  ];

  if (artifact.matchScript !== undefined) {
    groups.splice(1, 0, "matchScript");
  }

  return Object.freeze(
    PROJECTION_PARAMETER_GROUP_IDS.filter((groupId) => groups.includes(groupId)),
  );
}

export interface ProjectionParameterArtifactSummary {
  readonly versionLabel: ProjectionParameterVersionLabel;
  readonly artifactId: string;
  readonly checksum: string;
  readonly frameworkVersion: string;
  readonly policyVersion: string;
  readonly status: ProjectionParameterArtifact["status"];
  readonly qualified: boolean;
  readonly isActive: boolean;
  readonly parameterGroups: readonly ProjectionParameterGroupId[];
  readonly limitations: readonly string[];
  readonly usedInAnalysis: boolean;
}

export interface ProjectionParameterCatalog {
  readonly modelVersion: "projectionParameterCatalog.v1.p2j";
  readonly activeVersionLabel: ProjectionParameterVersionLabel;
  readonly artifacts: readonly ProjectionParameterArtifactSummary[];
  readonly limitations: readonly string[];
}

export function buildProjectionParameterCatalog(input?: {
  readonly usedVersionLabel?: string;
}): ProjectionParameterCatalog {
  const usedVersionLabel = input?.usedVersionLabel?.trim();
  const active = getActiveProjectionParameterArtifact();

  return Object.freeze({
    modelVersion: "projectionParameterCatalog.v1.p2j",
    activeVersionLabel: ACTIVE_PROJECTION_PARAMETER_VERSION_LABEL,
    artifacts: Object.freeze(
      listProjectionParameterArtifacts().map((artifact) =>
        Object.freeze({
          versionLabel: artifact.versionLabel,
          artifactId: artifact.artifactId,
          checksum: artifact.checksum,
          frameworkVersion: artifact.frameworkVersion,
          policyVersion: artifact.policyVersion,
          status: artifact.status,
          qualified: artifact.qualified,
          isActive: artifact.versionLabel === active.versionLabel,
          parameterGroups: parameterGroupsForArtifact(artifact),
          limitations: artifact.limitations,
          usedInAnalysis:
            usedVersionLabel !== undefined &&
            usedVersionLabel === artifact.versionLabel,
        }),
      ),
    ),
    limitations: Object.freeze([
      "Parameter artifacts are pinned constants — no ML, no automatic optimization, no online tuning.",
      "Active version is operator/pin governed (projection.v3.replay for V2 analyze + replay).",
      "Dixon–Coles ρ is not present; scorelines remain independent Poisson.",
      "Changing a version label requires a new artifact checksum and explicit pin — never silent mutation.",
    ]),
  });
}
