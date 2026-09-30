import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function SummaryReportSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-end">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-5 w-28" />
              {Array.from({ length: 4 }).map((__, row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 }).map((_, row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 }).map((_, row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
