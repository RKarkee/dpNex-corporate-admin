"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2 } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { useApprovalPermissions } from "../_hooks/use-approval-permissions";
import { useApprovalRequest } from "../_hooks/use-approval-request";
import { useCancelApprovalRequest } from "../_hooks/use-cancel-approval-request";
import { APPROVAL_LIST_PERMISSIONS } from "../permissions";
import { isCancellable } from "../types";
import {
  ApprovalDetail,
  ApprovalDetailSkeleton,
} from "./_components/approval-detail";
import { ApprovalNotFound } from "./_components/approval-not-found";

export default function ApprovalRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const router = useRouter();

  const query = useApprovalRequest(id);
  const request = query.data;

  const { canCancel } = useApprovalPermissions();
  const cancelRequest = useCancelApprovalRequest();
  const [confirming, setConfirming] = React.useState(false);

  const withdrawable = Boolean(
    request && isCancellable(request) && canCancel(String(request.type)),
  );

  const handleConfirm = async () => {
    if (!request) return;
    await cancelRequest.mutateAsync(request.id);
    // Stays on the page: the record survives as CANCELLED, and the status
    // badge flipping in place is the clearest confirmation there is.
    router.refresh();
  };

  if (query.isError && !request) return <ApprovalNotFound />;

  return (
    <RequirePermission anyOf={APPROVAL_LIST_PERMISSIONS}>
      <PageHeader
        title={request?.request_no ?? "Approval request"}
        description="What was asked for, why, and where it has got to."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/approval-requests">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            {withdrawable ? (
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
                onClick={() => setConfirming(true)}
                disabled={cancelRequest.isPending}
              >
                <Undo2 className="size-4" />
                Withdraw
              </Button>
            ) : null}
          </>
        }
      />

      {query.isPending || !request ? (
        <ApprovalDetailSkeleton />
      ) : (
        <ApprovalDetail request={request} />
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Withdraw this request?"
        description={
          request ? (
            <>
              <span className="font-medium text-foreground">
                {request.request_no}
              </span>{" "}
              will be marked cancelled and nobody will review it. You can raise
              a new request afterwards.
            </>
          ) : null
        }
        confirmLabel="Withdraw request"
        onConfirm={handleConfirm}
      />
    </RequirePermission>
  );
}
