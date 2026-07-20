"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactElement } from "react";
import { formatTimestamp } from "../lib/utils";
import type { EvidenceDto } from "../types/evidence";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function EvidenceCard({
  evidence,
}: Readonly<{ evidence: EvidenceDto }>): ReactElement {
  return (
    <Collapsible.Root asChild>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{evidence.type}</Badge>
              <Badge>{evidence.providerId}</Badge>
              <Badge>{evidence.source}</Badge>
              <Badge>{evidence.quality}</Badge>
              <Badge>{evidence.freshness}</Badge>
              <Badge>{evidence.confidence}</Badge>
            </div>
            <CardTitle className="font-mono text-sm">{evidence.id}</CardTitle>
            <CardDescription>
              Collected {formatTimestamp(evidence.timestamp ?? evidence.collectedAt)}{" "}
              UTC · {evidence.provenance.method}
            </CardDescription>
          </div>
          <Collapsible.Trigger asChild>
            <Button
              aria-label={`Toggle payload for ${evidence.id}`}
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
            <pre className="overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
              <code>{JSON.stringify(evidence.payload, null, 2)}</code>
            </pre>
          </CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  );
}
