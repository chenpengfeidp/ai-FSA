import type { ReactElement } from "react";
import { cn } from "../lib/utils";
import type { RuleResultDto } from "../types/analysis";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function RuleTable({
  rules,
}: Readonly<{ rules: readonly RuleResultDto[] }>): ReactElement {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Rules</CardTitle>
        <CardDescription>
          Deterministic checks evaluated against extracted features.
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.ruleId}>
              <TableCell className="font-medium text-slate-950">
                {rule.ruleName}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                    rule.status === "PASS"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800",
                  )}
                >
                  {rule.status}
                </span>
              </TableCell>
              <TableCell>{rule.explanation}</TableCell>
            </TableRow>
          ))}
          {rules.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-slate-500" colSpan={3}>
                No rules were evaluated.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
  );
}
