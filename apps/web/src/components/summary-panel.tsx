import { CheckCircle2 } from "lucide-react";
import type { ReactElement } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function SummaryPanel({
  summary,
}: Readonly<{ summary: readonly string[] }>): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
        <CardDescription>
          Deterministic findings from the current evidence.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {summary.length > 0 ? (
          <ul className="space-y-3">
            {summary.map((item) => (
              <li className="flex gap-3 text-sm leading-6 text-slate-700" key={item}>
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-emerald-600"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No summary is available.</p>
        )}
      </CardContent>
    </Card>
  );
}
