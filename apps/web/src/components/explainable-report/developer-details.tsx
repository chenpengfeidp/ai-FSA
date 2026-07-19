"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { Braces, ChevronDown } from "lucide-react";
import { type ReactElement, useState } from "react";
import type { AnalysisReportDto } from "../../types/analysis";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function DeveloperDetails({
  report,
}: Readonly<{ report: AnalysisReportDto }>): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby="developer-details-heading"
      className="scroll-mt-28"
      id="developer"
    >
      <Collapsible.Root onOpenChange={setOpen} open={open}>
        <Card className="hover:translate-y-0">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle id="developer-details-heading">Developer Details</CardTitle>
              <p className="mt-1 text-caption text-muted-foreground">
                Raw deterministic report JSON — hidden by default
              </p>
            </div>
            <Collapsible.Trigger asChild>
              <Button
                aria-expanded={open}
                aria-label="Toggle developer details"
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={
                    open
                      ? "size-4 rotate-180 transition-transform duration-200"
                      : "size-4 transition-transform duration-200"
                  }
                />
              </Button>
            </Collapsible.Trigger>
          </CardHeader>
          <Collapsible.Content>
            <CardContent>
              <div className="relative">
                <Braces
                  aria-hidden="true"
                  className="absolute right-4 top-4 size-5 text-subtle"
                />
                <pre className="max-h-[32rem] overflow-auto rounded-xl bg-secondary p-4 pr-12 font-mono text-mono leading-6 text-secondary-foreground">
                  <code>{JSON.stringify(report, null, 2)}</code>
                </pre>
              </div>
            </CardContent>
          </Collapsible.Content>
        </Card>
      </Collapsible.Root>
    </section>
  );
}
