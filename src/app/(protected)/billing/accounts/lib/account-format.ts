import type { BillingAccount, BillingAddress } from "../types";

/** `REGISTERED` → `Registered`, `BILL_TO` → `Bill To`. */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** A trimmed string, or `null` when there is nothing to show. */
export function text(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isPrimaryAddress(address: BillingAddress): boolean {
  return String(address.is_primary ?? "").toUpperCase() === "Y";
}

/** The address flagged primary, else the first one, else nothing. */
export function primaryAddress(account: BillingAccount): BillingAddress | null {
  const addresses = account.addresses ?? [];
  return addresses.find(isPrimaryAddress) ?? addresses[0] ?? null;
}

/** `Sydney, AU` — the two parts the list filters on. */
export function formatLocation(address: BillingAddress | null): string | null {
  if (!address) return null;
  const parts = [text(address.city), text(address.country)].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Street lines, then `City, State ZIP`, then the country — blanks dropped. */
export function addressLines(address: BillingAddress): string[] {
  const locality = [
    text(address.city),
    [text(address.state), text(address.zip)].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [
    text(address.address_line_1),
    text(address.address_line_2),
    locality || null,
    text(address.country),
  ].filter((line): line is string => Boolean(line));
}

/** `+977… ext 12`, or just the number when there is no extension. */
export function withExtension(
  number?: string | null,
  ext?: string | null,
): string | null {
  const main = text(number);
  if (!main) return null;
  const extension = text(ext);
  return extension ? `${main} ext ${extension}` : main;
}

/** The best single name for an account in a sentence or a heading. */
export function accountTitle(account: BillingAccount): string {
  return (
    text(account.account_name) ??
    text(account.billing_account_code) ??
    `Billing account #${account.id}`
  );
}
