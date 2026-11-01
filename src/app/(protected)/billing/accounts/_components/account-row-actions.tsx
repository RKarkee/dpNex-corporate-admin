"use client";

import Link from "next/link";
import { Eye, Star, StarOff } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { accountTitle } from "../lib/account-format";
import { canBecomeDefault, isDefaultAccount, type BillingAccount } from "../types";

export interface AccountRowActionsProps {
  account: BillingAccount;
  onMakeDefault: (account: BillingAccount) => void;
  onRemoveDefault: (account: BillingAccount) => void;
}

/**
 * View, plus at most one of the two default actions.
 *
 * Remove is offered only on the default account itself: the endpoint takes no
 * id and clears whichever account is default, so offering it on any other row
 * would remove something the user was not looking at.
 */
export function AccountRowActions({
  account,
  onMakeDefault,
  onRemoveDefault,
}: AccountRowActionsProps) {
  const name = accountTitle(account);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/billing/accounts/${account.id}`} aria-label={`View ${name}`} title="View">
          <Eye className="size-4" />
        </Link>
      </Button>

      {canBecomeDefault(account) ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMakeDefault(account)}
          aria-label={`Make ${name} the default account`}
          title="Make default"
          className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <Star className="size-4" />
        </Button>
      ) : null}

      {isDefaultAccount(account) ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemoveDefault(account)}
          aria-label={`Remove ${name} as the default account`}
          title="Remove default"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <StarOff className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
