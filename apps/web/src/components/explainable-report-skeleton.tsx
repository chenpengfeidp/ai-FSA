import type { ReactElement } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function ExplainableReportSkeleton(): ReactElement {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6 sm:space-y-8">
      <Card className="hover:translate-y-0">
        <CardContent className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="hover:translate-y-0">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </CardHeader>
        </Card>
        <Card className="hover:translate-y-0">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mx-auto h-16 w-32" />
          </CardHeader>
        </Card>
      </div>

      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
