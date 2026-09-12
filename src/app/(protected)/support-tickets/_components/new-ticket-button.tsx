"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { CreateTicketDialog } from "./create-ticket-dialog";

/**
 * "Raise a ticket", and the dialog it opens.
 *
 * A client island so the Server Component page can pass it straight to
 * `PageHeader`'s `actions` slot — the header itself stays a server component,
 * and only this button and its dialog ship as client code.
 */
export function NewTicketButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Raise a ticket
      </Button>

      <CreateTicketDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
