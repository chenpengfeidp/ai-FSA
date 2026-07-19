import type { ReactElement } from "react";
import { formatTimestamp } from "../lib/utils";
import type { RuleResultDto } from "../types/analysis";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function RuleCard({ rule }: Readonly<{ rule: RuleResultDto }>): ReactElement {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{rule.ruleName}</CardTitle>
          <CardDescription>
            Evaluated {formatTimestamp(rule.evaluatedAt)} UTC
          </CardDescription>
        </div>
        <Badge variant={rule.status === "PASS" ? "PASS" : "FAIL"}>
          {rule.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-slate-700">{rule.explanation}</p>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Score
          </p>
          <p className="mt-1 text-sm font-medium text-slate-950">{rule.score}</p>
        </div>
      </CardContent>
    </Card>
  );
}
