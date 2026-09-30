import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function CustomerReportSkeleton() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-end">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="p-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-4 h-9 w-16" />
            <Skeleton className="mt-3 h-4 w-24" />
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 6 }).map((_, row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-32 w-full" />
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
