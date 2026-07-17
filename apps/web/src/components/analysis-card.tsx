import { CalendarClock, Hash } from "lucide-react";
import type { ReactElement } from "react";
import { formatTimestamp } from "../lib/utils";
import type { AnalysisReportDto } from "../types/analysis";
import { FeatureTable } from "./feature-table";
import { RawJsonPanel } from "./raw-json-panel";
import { RuleTable } from "./rule-table";
import { SummaryPanel } from "./summary-panel";

export function AnalysisCard({
  report,
}: Readonly<{ report: AnalysisReportDto }>): ReactElement {
  return (
    <section aria-labelledby="analysis-result-heading" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <p
            className="text-sm font-semibold text-blue-950"
            id="analysis-result-heading"
          >
            Analysis complete
          </p>
          <p className="mt-1 text-sm text-blue-700">
            The report is based on deterministic evidence and rule evaluation.
          </p>
        </div>
        <dl className="flex flex-col gap-2 text-sm text-blue-950 sm:items-end">
          <div className="flex items-center gap-2">
            <Hash aria-hidden="true" className="size-4 text-blue-600" />
            <dt className="font-medium">Match ID</dt>
            <dd className="font-mono">{report.matchId}</dd>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock aria-hidden="true" className="size-4 text-blue-600" />
            <dt className="font-medium">Generated</dt>
            <dd>{formatTimestamp(report.generatedAt)} UTC</dd>
          </div>
        </dl>
      </div>

      <SummaryPanel summary={report.summary} />
      <FeatureTable features={report.features} />
      <RuleTable rules={report.rules} />
      <RawJsonPanel report={report} />
    </section>
  );
}
