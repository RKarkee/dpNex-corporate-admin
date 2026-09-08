/**
 * Shared by the list table and the detail page, so a bill reads the same
 * amount and the same date regardless of which screen it's on.
 */

/** Every amount on this resource arrives as a decimal string (`"62.0000"`), never a JSON number. */
export function formatInvoiceAmount(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";

  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(numeric)) return String(amount);

  // `Intl.NumberFormat` needs a real ISO 4217 code; anything shorter falls
  // back to a plain number with the raw currency text prefixed instead of
  // thrown away.
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(numeric);
    } catch {
      // Falls through to the plain-number formatting below.
    }
  }

  const formatted = numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currency ? `${currency} ${formatted}` : formatted;
}

export function formatInvoiceDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** A bare quantity/rate figure — no currency symbol, trailing zeros trimmed. */
export function formatInvoiceNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";

  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);

  return numeric.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

/** `"BANK_TRANSFER"` → `"Bank Transfer"` — every screaming-snake-case enum this resource sends reads this way. */
export function formatEnumLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}
