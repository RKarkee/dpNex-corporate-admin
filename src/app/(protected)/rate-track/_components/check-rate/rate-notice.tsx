import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

/**
 * The note above the rate cards: these are quotes, not bookings.
 *
 * Shipping happens from the Consignment Request menu, where the full form
 * (sender, receiver, contents) is filled in — so the note says so and links
 * straight to the create page.
 */

const CREATE_CONSIGNMENT_REQUEST_HREF = "/consignments/request/create";

export function RateNotice() {
  return (
    <div
      role="note"
      className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">These rates are for reference only.</span>{" "}
          To ship, go to <span className="font-medium text-foreground">Consignment Request</span>{" "}
          and fill in the full form to create a new consignment.
        </p>
      </div>

      <Link
        href={CREATE_CONSIGNMENT_REQUEST_HREF}
        className="inline-flex shrink-0 items-center gap-1.5 self-start pl-7 font-medium text-primary underline-offset-4 hover:underline sm:self-auto sm:pl-0"
      >
        Go to Consignment Request
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
