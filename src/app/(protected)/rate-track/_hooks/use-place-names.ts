"use client";

import { useQuery } from "@tanstack/react-query";
import { getCountries, getStatesOfCountry } from "@countrystatecity/countries-browser";

/**
 * Full names for the codes a tracking response carries: `NP` → "Nepal".
 *
 * Static reference data, cached for the session and shared — a timeline of
 * twenty scans in three countries fetches three state lists, not twenty. A
 * value that is not a known code is shown as it came.
 */
export function usePlaceNames(country?: string | null, state?: string | null) {
  const countries = useQuery({
    queryKey: ["reference", "countries"],
    queryFn: async () => (await getCountries()).map((c) => ({ iso2: c.iso2, name: c.name })),
    staleTime: Infinity,
  });

  const states = useQuery({
    queryKey: ["reference", "states", country],
    queryFn: async () =>
      (await getStatesOfCountry(country as string)).map((s) => ({ iso2: s.iso2, name: s.name })),
    enabled: Boolean(country && state),
    staleTime: Infinity,
  });

  const countryName = country
    ? (countries.data?.find((c) => c.iso2 === country.toUpperCase())?.name ?? country)
    : null;

  const stateName = state
    ? (states.data?.find((s) => s.iso2 === state.toUpperCase())?.name ?? state)
    : null;

  return { country: countryName, state: stateName };
}
