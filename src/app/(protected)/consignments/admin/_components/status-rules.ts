/**
 * The conditional rules and date helpers behind Update Status.
 *
 * They live here rather than in `locations/types.ts` because this module's
 * Locations tab is read-only and deliberately carries no write rules — the
 * Update Status dialog is the only writer, and it sits at the module root.
 */

/** The one status that demands an onward carrier. */
export const FORWARDED_WITH = "FORWARDED_WITH";

export function requiresForwarder(status: string): boolean {
  return status === FORWARDED_WITH;
}

/**
 * Countries where the state is part of a deliverable address, and therefore
 * required whenever a new location is recorded. A whitelist, not a guess.
 */
const STATE_REQUIRED_COUNTRIES = new Set(["NP", "IN"]);

export function requiresState(country: string): boolean {
  return STATE_REQUIRED_COUNTRIES.has(country.toUpperCase());
}

/** `2026-06-05T10:15` (a datetime input) → `2026-06-05 10:15:00` (the API). */
export function fromDateTimeInput(value: string): string | undefined {
  const text = value.trim();
  if (!text) return undefined;
  return `${text.replace("T", " ")}:00`.slice(0, 19);
}
