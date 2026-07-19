"use client";

import type { ReactElement } from "react";
import type { AnalysisReportDto } from "../types/analysis";
import type { EvidenceDto } from "../types/evidence";
import { AnalysisCard } from "./analysis-card";
import { EmptyState } from "./empty-state";
import { EvidenceCard } from "./evidence-card";
import { FeatureCard } from "./feature-card";
import { RawJsonPanel } from "./raw-json-panel";
import { RuleCard } from "./rule-card";
import { SummaryPanel } from "./summary-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export function MatchDetailPanels({
  evidence,
  report,
}: Readonly<{
  evidence: readonly EvidenceDto[];
  report: AnalysisReportDto;
}>): ReactElement {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Match detail sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="evidence">Evidence</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
        <TabsTrigger value="rules">Rules</TabsTrigger>
        <TabsTrigger value="report">Report</TabsTrigger>
        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <SummaryPanel summary={report.summary} />
      </TabsContent>

      <TabsContent value="evidence">
        {evidence.length > 0 ? (
          <div className="space-y-4">
            {evidence.map((item) => (
              <EvidenceCard evidence={item} key={item.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            description="No evidence records were returned for this match."
            title="No evidence available"
          />
        )}
      </TabsContent>

      <TabsContent value="features">
        {report.features.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {report.features.map((feature) => (
              <FeatureCard feature={feature} key={feature.featureId} />
            ))}
          </div>
        ) : (
          <EmptyState
            description="No features were extracted for this match."
            title="No features available"
          />
        )}
      </TabsContent>

      <TabsContent value="rules">
        {report.rules.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {report.rules.map((rule) => (
              <RuleCard key={rule.ruleId} rule={rule} />
            ))}
          </div>
        ) : (
          <EmptyState
            description="No rules were evaluated for this match."
            title="No rules available"
          />
        )}
      </TabsContent>

      <TabsContent value="report">
        <AnalysisCard report={report} />
      </TabsContent>

      <TabsContent value="raw">
        <RawJsonPanel report={report} />
      </TabsContent>
    </Tabs>
  );
}
