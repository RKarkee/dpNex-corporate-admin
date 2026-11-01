"use client";

import * as React from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  useMarkBillingAccountPrimary,
  useRemovePrimaryBillingAccount,
} from "../_hooks/use-default-account-mutations";
import { accountTitle } from "../lib/account-format";
import { defaultRefusalReason } from "../services/billing-account.service";
import type { BillingAccount } from "../types";

/** Which default change is being confirmed, and on which account. */
export type DefaultAccountAction =
  | { kind: "mark"; account: BillingAccount }
  | { kind: "remove"; account: BillingAccount };

export interface DefaultAccountDialogProps {
  action: DefaultAccountAction | null;
  onClose: () => void;
}

/**
 * The one confirm dialog for both default changes, shared by the table and
 * the detail page so the wording and the refusal handling cannot drift.
 *
 * A server refusal is shown inside the dialog and re-thrown, which keeps
 * `ConfirmDialog` open with the reason in view.
 */
export function DefaultAccountDialog({ action, onClose }: DefaultAccountDialogProps) {
  const markPrimary = useMarkBillingAccountPrimary();
  const removePrimary = useRemovePrimaryBillingAccount();
  const [refusal, setRefusal] = React.useState<string | null>(null);

  /*
   * The last action is kept for rendering, so the wording does not flip while
   * the dialog animates closed. A fresh action starts with a clean slate —
   * adjusted during render rather than in an effect, so the stale message
   * never paints.
   */
  const [shown, setShown] = React.useState(action);
  if (action && action !== shown) {
    setShown(action);
    setRefusal(null);
  }
  const current = action ?? shown;

  const handleConfirm = async () => {
    if (!action) return;

    try {
      setRefusal(null);
      if (action.kind === "mark") {
        await markPrimary.mutateAsync(action.account.id);
      } else {
        await removePrimary.mutateAsync();
      }
    } catch (error) {
      setRefusal(
        defaultRefusalReason(error) ?? "The default billing account could not be changed.",
      );
      throw error;
    }
  };

  const name = current ? accountTitle(current.account) : "";
  const marking = current?.kind === "mark";

  return (
    <ConfirmDialog
      open={action !== null}
      onOpenChange={(open) => !open && onClose()}
      title={marking ? "Make this the default account?" : "Remove the default account?"}
      tone={marking ? "default" : "destructive"}
      description={
        current ? (
          <>
            <span className="font-medium text-foreground">{name}</span>{" "}
            {marking
              ? "will become your default billing account, replacing the current default if there is one."
              : "will no longer be your default billing account. No account will be the default until you choose one."}
            {refusal ? (
              <span className="mt-2 block text-destructive">{refusal}</span>
            ) : null}
          </>
        ) : null
      }
      confirmLabel={marking ? "Make default" : "Remove default"}
      onConfirm={handleConfirm}
    />
  );
}
