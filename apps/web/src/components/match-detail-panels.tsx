"use client";

import type { ReactElement } from "react";
import { zh } from "../copy/zh";
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
      <TabsList aria-label={zh.matchDetail.tabsAria}>
        <TabsTrigger value="overview">{zh.matchDetail.tabs.overview}</TabsTrigger>
        <TabsTrigger value="evidence">{zh.matchDetail.tabs.evidence}</TabsTrigger>
        <TabsTrigger value="features">{zh.matchDetail.tabs.features}</TabsTrigger>
        <TabsTrigger value="rules">{zh.matchDetail.tabs.rules}</TabsTrigger>
        <TabsTrigger value="report">{zh.matchDetail.tabs.report}</TabsTrigger>
        <TabsTrigger value="raw">{zh.matchDetail.tabs.raw}</TabsTrigger>
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
            description={zh.matchDetail.noEvidenceDescription}
            title={zh.matchDetail.noEvidence}
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
            description={zh.matchDetail.noFeaturesDescription}
            title={zh.matchDetail.noFeatures}
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
            description={zh.matchDetail.noRulesDescription}
            title={zh.matchDetail.noRules}
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
