import type { ReactElement } from "react";
import { formatJsonValue } from "../lib/utils";
import type { FeatureDto } from "../types/analysis";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function FeatureTable({
  features,
}: Readonly<{ features: readonly FeatureDto[] }>): ReactElement {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Features</CardTitle>
        <CardDescription>
          Values extracted directly from source evidence.
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Source Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature) => (
            <TableRow key={feature.featureId}>
              <TableCell className="font-medium text-slate-950">
                {feature.name}
              </TableCell>
              <TableCell>{formatJsonValue(feature.value)}</TableCell>
              <TableCell>
                <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                  {feature.sourceEvidenceId}
                </code>
              </TableCell>
            </TableRow>
          ))}
          {features.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-slate-500" colSpan={3}>
                No features were extracted.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
  );
}
