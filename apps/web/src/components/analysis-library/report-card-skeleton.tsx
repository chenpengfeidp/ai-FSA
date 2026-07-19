import type { ReactElement } from "react";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export function ReportCardSkeleton(): ReactElement {
  return (
    <Card className="hover:translate-y-0 hover:shadow-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="ml-auto h-8 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportCardSkeletonGrid({
  count = 6,
}: Readonly<{ count?: number }>): ReactElement {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading reports"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, index) => {
        const skeletonKey = `report-skeleton-${String(index + 1)}`;

        return (
          <li key={skeletonKey}>
            <ReportCardSkeleton />
          </li>
        );
      })}
    </ul>
  );
}
