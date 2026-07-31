import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  AnalysisReportDto,
  ProjectionFrameworkDto,
  UnifiedMatrixSummaryDto,
} from "../../types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { WorkspaceSection } from "./workspace-section";

function formatWeight(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`;
}

function formatProbability(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatScoreline(
  scoreline: Readonly<{ readonly homeGoals: number; readonly awayGoals: number }>,
): string {
  return `${scoreline.homeGoals}-${scoreline.awayGoals}`;
}

function PerScriptPredictionCard({
  script,
}: Readonly<{
  script: ProjectionFrameworkDto["activeMatchScripts"][number];
}>): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {script.label}
          <span className="ml-2 text-sm font-normal text-zinc-500">
            {script.scriptId}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-700">
        <p>
          <span className="font-medium">{zh.report.matchScriptWeight}: </span>
          {formatWeight(script.weight)}
        </p>
        <p>
          <span className="font-medium">{zh.report.matchScriptLambdas}: </span>
          λ_home {script.lambdaHome.toFixed(3)} · λ_away{" "}
          {script.lambdaAway.toFixed(3)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptWinner}: </span>H{" "}
          {formatProbability(script.pHome)} · D {formatProbability(script.pDraw)} · A{" "}
          {formatProbability(script.pAway)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptMostLikely}: </span>
          {formatScoreline(script.mostLikelyScoreline)} (
          {formatProbability(script.mostLikelyScoreline.probability)})
          {script.secondScoreline !== null ? (
            <>
              {" · "}
              <span className="font-medium">{zh.report.multiScriptSecond}: </span>
              {formatScoreline(script.secondScoreline)} (
              {formatProbability(script.secondScoreline.probability)})
            </>
          ) : null}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptGoalRange}: </span>
          0-1 {formatProbability(script.goalRange.range01)} · 2-3{" "}
          {formatProbability(script.goalRange.range23)} · 4+{" "}
          {formatProbability(script.goalRange.range4Plus)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptBtts}: </span>
          Yes {formatProbability(script.pBttsYes)} · No{" "}
          {formatProbability(script.pBttsNo)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptOverUnder}: </span>
          Over {formatProbability(script.pOver25)} · Under{" "}
          {formatProbability(script.pUnder25)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptContribution}: </span>
          {formatWeight(script.mergeContribution.weight)} × (H{" "}
          {formatProbability(script.pHome)} / D {formatProbability(script.pDraw)} / A{" "}
          {formatProbability(script.pAway)}) → weighted H{" "}
          {formatProbability(script.mergeContribution.weightedPHome)} · D{" "}
          {formatProbability(script.mergeContribution.weightedPDraw)} · A{" "}
          {formatProbability(script.mergeContribution.weightedPAway)}
        </p>
      </CardContent>
    </Card>
  );
}

function UnifiedMatrixSummaryCard({
  unified,
}: Readonly<{
  unified: UnifiedMatrixSummaryDto;
}>): ReactElement {
  const { derived } = unified;

  return (
    <Card className="border-zinc-900/10 bg-zinc-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {zh.report.multiScriptMergedFinal}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-700">
        <p>{unified.explanation}</p>
        <p className="text-xs text-zinc-500">
          {unified.policyVersion} · {unified.mergeAlgorithm} · checksum{" "}
          {unified.matrixChecksum}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptWinner}: </span>H{" "}
          {formatProbability(derived.pHome)} · D {formatProbability(derived.pDraw)} ·
          A {formatProbability(derived.pAway)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptMostLikely}: </span>
          {formatScoreline(derived.mostLikelyScoreline)} (
          {formatProbability(derived.mostLikelyScoreline.probability)})
          {derived.secondScoreline !== null ? (
            <>
              {" · "}
              <span className="font-medium">{zh.report.multiScriptSecond}: </span>
              {formatScoreline(derived.secondScoreline)} (
              {formatProbability(derived.secondScoreline.probability)})
            </>
          ) : null}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptGoalRange}: </span>
          0-1 {formatProbability(derived.goalRange.range01)} · 2-3{" "}
          {formatProbability(derived.goalRange.range23)} · 4+{" "}
          {formatProbability(derived.goalRange.range4Plus)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptBtts}: </span>
          Yes {formatProbability(derived.pBttsYes)} · No{" "}
          {formatProbability(derived.pBttsNo)}
        </p>
        <p>
          <span className="font-medium">{zh.report.multiScriptOverUnder}: </span>
          Over {formatProbability(derived.pOver25)} · Under{" "}
          {formatProbability(derived.pUnder25)}
        </p>
      </CardContent>
    </Card>
  );
}

function DerivedPredictionsCard({
  unified,
  report,
}: Readonly<{
  unified: UnifiedMatrixSummaryDto;
  report: AnalysisReportDto;
}>): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {zh.report.multiScriptDerivedPredictions}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-zinc-700">
        <p>
          <span className="font-medium">
            {zh.report.multiScriptDerivationNotes}:{" "}
          </span>
        </p>
        <ul className="list-disc space-y-1 pl-5 text-zinc-600">
          {unified.derivationNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500">
          {zh.report.multiScriptPostCalibration(
            formatProbability(report.deterministic.pHome),
            formatProbability(report.deterministic.pDraw),
            formatProbability(report.deterministic.pAway),
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export function MultiScriptProjectionSection({
  projectionFramework,
  report,
}: Readonly<{
  projectionFramework: ProjectionFrameworkDto | undefined;
  report: AnalysisReportDto;
}>): ReactElement {
  const scripts = projectionFramework?.activeMatchScripts ?? [];
  const unified = projectionFramework?.unifiedMatrix ?? null;

  return (
    <WorkspaceSection id="multi-script-projection">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.multiScriptProjection}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {zh.report.multiScriptProjectionHint}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {zh.report.multiScriptPipeline}
          </p>
        </div>

        {scripts.length === 0 || unified === null ? (
          <p className="text-sm text-zinc-500">
            {zh.report.multiScriptProjectionUnavailable}
          </p>
        ) : (
          <>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                {zh.report.multiScriptPerScriptMatrix}
              </h3>
              <div className="grid gap-4">
                {scripts.map((script) => (
                  <PerScriptPredictionCard key={script.scriptId} script={script} />
                ))}
              </div>
            </div>

            <UnifiedMatrixSummaryCard unified={unified} />
            <DerivedPredictionsCard unified={unified} report={report} />
          </>
        )}
      </div>
    </WorkspaceSection>
  );
}
