import type { ReactElement } from "react";
import { Card, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function MatchDetailSkeleton(): ReactElement {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-72" />
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardHeader>
      </Card>

      <Skeleton className="h-11 w-full rounded-xl" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
