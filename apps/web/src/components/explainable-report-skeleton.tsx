import type { ReactElement } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function ExplainableReportSkeleton(): ReactElement {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8 sm:space-y-10">
      <Card className="hover:translate-y-0">
        <CardContent className="space-y-6 px-6 py-8 sm:px-10 sm:py-12">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-5 w-80" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="hover:translate-y-0">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
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
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
