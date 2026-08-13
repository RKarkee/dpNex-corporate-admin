"use client";

import { useStateOptions } from "@/shared/hooks/use-location-options";
import type { LocationOption } from "@/shared/hooks/use-location-options";

import { Field, Section, yesNo } from "../detail-primitives";

/**
 * Sender or receiver — one component, mounted twice.
 *
 * The two parties carry the same fields under different prefixes, so `prefix`
 * is all that separates them. Reading the record through a prefixed accessor
 * keeps this from becoming two near-identical files that drift.
 *
 * Country and state arrive as ISO codes. The country list is passed down (the
 * parent already holds it, and it is the same list for both parties) while the
 * state list is fetched here, since it depends on this party's country.
 */
export function PartySection({
  title,
  prefix,
  party,
  countryOptions,
}: {
  title: string;
  prefix: "sender" | "receiver";
  party: Record<string, string | undefined>;
  countryOptions: LocationOption[];
}) {
  const field = (key: string) => party[`${prefix}_${key}`];

  const { iso2ToName: stateNames } = useStateOptions(field("country"));

  const countryName = (code?: string) =>
    code
      ? (countryOptions.find((option) => option.value === code)?.label ?? code)
      : undefined;

  const address = [field("address_1"), field("address_2")]
    .filter(Boolean)
    .join(", ");

  return (
    <Section title={title} className="lg:grid-cols-3">
      <Field
        label="Name"
        value={`${field("first_name") ?? ""} ${field("last_name") ?? ""}`.trim()}
      />
      <Field label="Company" value={field("company")} />
      <Field label="Email" value={field("email")} />
      <Field label="Phone" value={field("phone")} />
      <Field label="Country" value={countryName(field("country"))} />
      {/* The API sends the readable name alongside the code; the lookup is the
          fallback for records saved before it did. */}
      <Field
        label="State"
        value={
          field("state_name") || stateNames[field("state") ?? ""] || field("state")
        }
      />
      <Field label="City" value={field("city")} />
      <Field label="ZIP" value={field("zip")} />
      <Field label="Residential" value={yesNo(field("is_resident"))} />
      <Field
        label="Address"
        className="sm:col-span-2 lg:col-span-3"
        value={address}
      />
    </Section>
  );
}
