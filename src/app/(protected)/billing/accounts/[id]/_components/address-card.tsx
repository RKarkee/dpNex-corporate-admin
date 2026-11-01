import { Badge } from "@/shared/components/ui/badge";
import { formatDate } from "@/shared/lib/dates";

import {
  addressLines,
  humanize,
  isPrimaryAddress,
  text,
  withExtension,
} from "../../lib/account-format";
import type { BillingAddress } from "../../types";
import { Field } from "./detail-parts";

/** One address of the account: where it is, how to reach it, and when it applies. */
export function AddressCard({ address }: { address: BillingAddress }) {
  const lines = addressLines(address);
  const type = text(address.type);
  const from = text(address.effective_from);
  const to = text(address.effective_to);

  const contacts = [
    { label: "Email", value: text(address.email) },
    { label: "Phone 1", value: text(address.phone_1) },
    { label: "Phone 2", value: text(address.phone_2) },
    {
      label: "Telephone 1",
      value: withExtension(address.telephone_1, address.telephone_1_ext),
    },
    {
      label: "Telephone 2",
      value: withExtension(address.telephone_2, address.telephone_2_ext),
    },
  ].filter((contact) => contact.value);

  const remarks = text(address.remarks);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {type ? humanize(type) : "Address"}
        </span>
        {isPrimaryAddress(address) ? <Badge variant="default">Primary</Badge> : null}
      </div>

      {lines.length > 0 ? (
        <address className="text-sm not-italic leading-relaxed text-foreground">
          {lines.map((line, index) => (
            <span key={index} className="block">
              {line}
            </span>
          ))}
        </address>
      ) : (
        <p className="text-sm text-muted-foreground">No address lines recorded.</p>
      )}

      {contacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <Field key={contact.label} label={contact.label} value={contact.value} />
          ))}
        </div>
      ) : null}

      {from || to ? (
        <Field
          label="Effective"
          value={`${from ? formatDate(from) : "—"} to ${to ? formatDate(to) : "open-ended"}`}
        />
      ) : null}

      {remarks ? <Field label="Remarks" value={remarks} /> : null}
    </div>
  );
}
