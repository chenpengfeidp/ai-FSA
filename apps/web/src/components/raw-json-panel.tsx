"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { Braces, ChevronDown } from "lucide-react";
import type { ReactElement } from "react";
import type { AnalysisReportDto } from "../types/analysis";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function RawJsonPanel({
  report,
}: Readonly<{ report: AnalysisReportDto }>): ReactElement {
  return (
    <Collapsible.Root asChild>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Raw Report</CardTitle>
            <CardDescription>
              Complete read-only AnalysisReport response.
            </CardDescription>
          </div>
          <Collapsible.Trigger asChild>
            <Button
              aria-label="Toggle raw report"
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronDown aria-hidden="true" className="size-4" />
            </Button>
          </Collapsible.Trigger>
        </CardHeader>
        <Collapsible.Content>
          <CardContent>
            <div className="relative">
              <Braces
                aria-hidden="true"
                className="absolute right-4 top-4 size-5 text-slate-500"
              />
              <pre className="max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 pr-12 font-mono text-xs leading-6 text-slate-100">
                <code>{JSON.stringify(report, null, 2)}</code>
              </pre>
            </div>
          </CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  );
}
