"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Star, StarOff } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import {
  DefaultAccountDialog,
  type DefaultAccountAction,
} from "../_components/default-account-dialog";
import { useBillingAccount } from "../_hooks/use-billing-account";
import { accountTitle } from "../lib/account-format";
import { BILLING_ACCOUNT_VIEW_PERMISSIONS } from "../permissions";
import { canBecomeDefault, isDefaultAccount } from "../types";
import { AccountDetail, AccountDetailSkeleton } from "./_components/account-detail";
import { AccountNotFound } from "./_components/account-not-found";

export default function BillingAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  const query = useBillingAccount(id);
  const account = query.data;

  const [pendingAction, setPendingAction] = React.useState<DefaultAccountAction | null>(
    null,
  );

  if (query.isError && !account) return <AccountNotFound />;

  // Same rules as the table row: remove only on the default itself, since the
  // endpoint clears whichever account is default.
  const showMakeDefault = Boolean(account && canBecomeDefault(account));
  const showRemoveDefault = Boolean(account && isDefaultAccount(account));

  return (
    <RequirePermission anyOf={BILLING_ACCOUNT_VIEW_PERMISSIONS}>
      <PageHeader
        title={account ? accountTitle(account) : "Billing account"}
        description="Account details, tax numbers and addresses."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/billing/accounts">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            {account && showMakeDefault ? (
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => setPendingAction({ kind: "mark", account })}
              >
                <Star className="size-4" />
                Make default
              </Button>
            ) : null}

            {account && showRemoveDefault ? (
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
                onClick={() => setPendingAction({ kind: "remove", account })}
              >
                <StarOff className="size-4" />
                Remove default
              </Button>
            ) : null}
          </>
        }
      />

      {query.isPending || !account ? (
        <AccountDetailSkeleton />
      ) : (
        <AccountDetail account={account} />
      )}

      <DefaultAccountDialog action={pendingAction} onClose={() => setPendingAction(null)} />
    </RequirePermission>
  );
}
