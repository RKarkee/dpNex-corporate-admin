"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { useApprovalPermissions } from "../_hooks/use-approval-permissions";
import { CreateRequestDialog } from "./create-request-dialog";

/**
 * "New request", and the dialog it opens.
 *
 * A client island so the Server Component page can pass it straight to
 * `PageHeader`'s `actions` slot — the header itself stays a server component,
 * and only this button and its dialog ship as client code.
 *
 * Renders nothing without the permission: a button that always ends in a 403
 * is worse than no button.
 */
export function NewRequestButton() {
  const { canCreate } = useApprovalPermissions();
  const [open, setOpen] = React.useState(false);

  if (!canCreate) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New request
      </Button>

      <CreateRequestDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
