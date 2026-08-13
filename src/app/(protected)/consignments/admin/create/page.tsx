import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { CONSIGNMENT_ADMIN_PERMISSIONS } from "../permissions";
import { CreateConsignmentView } from "./_components/create-consignment-view";

export const metadata: Metadata = {
  title: "Create Consignment",
};

export default function CreateConsignmentPage() {
  return (
    <RequirePermission anyOf={CONSIGNMENT_ADMIN_PERMISSIONS.create}>
      <PageHeader
        title="Create Consignment"
        description="Step 2 of 2 — fill in the sender, receiver and contents."
        actions={
          <Button variant="outline" asChild>
            <Link href="/consignments/admin/new">
              <ArrowLeft className="size-4" />
              Back to rates
            </Link>
          </Button>
        }
      />
      {/* `useSearchParams` opts the subtree into client rendering, and Next
          requires the boundary to be explicit. */}
      <Suspense fallback={<CreateSkeleton />}>
        <CreateConsignmentView />
      </Suspense>
    </RequirePermission>
  );
}

function CreateSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </Card>
      {[3, 2, 2].map((rows, card) => (
        <Card key={card} className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2 border-b border-border/70 pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: rows * 3 }).map((_, field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
