"use client";

import { useCountryOptions } from "@/shared/hooks/use-location-options";

/**
 * The readable name for a stored `issued_country`.
 *
 * The field holds an iso2 code, so rendering it raw shows "NP" where the form
 * that wrote it showed "Nepal". This resolves it against the same list the
 * combobox uses — one shared query, so a grid of cards costs one fetch.
 *
 * Anything the list does not know comes back unchanged: records written before
 * the field held codes store the full name already, and showing that is right.
 * The code is also what shows for the moment before the list resolves, which
 * beats a blank field on a value the user did enter.
 */
export function useCountryName(code: string | null | undefined): string {
  const { options } = useCountryOptions();

  const trimmed = code?.trim();
  if (!trimmed) return "";

  return options.find((option) => option.value === trimmed)?.label ?? trimmed;
}
