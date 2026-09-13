"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { CreatePickupDialog } from "./create-pickup-dialog";

/**
 * "Request a pickup", and the dialog it opens.
 *
 * A client island so the Server Component page can pass it straight to
 * `PageHeader`'s `actions` slot — the header itself stays a server component.
 */
export function NewPickupButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Request a pickup
      </Button>

      <CreatePickupDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
