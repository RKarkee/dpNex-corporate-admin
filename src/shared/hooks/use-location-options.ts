"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCitiesOfState,
  getCountries,
  getStatesOfCountry,
} from "@countrystatecity/countries-browser";

import type { ComboboxOption } from "@/shared/components/ui/combobox";

/**
 * Country → state → city, from `@countrystatecity/countries-browser`.
 *
 * **This library fetches its data at runtime, from `cdn.jsdelivr.net`.** The
 * dataset is far too large to bundle — every city on earth — so the package
 * splits it per country and pulls each slice on demand. Two consequences worth
 * knowing:
 *
 * - The dropdowns need that CDN reachable from the user's browser. Behind a
 *   restrictive network they will come up empty, and nothing else on the page
 *   will look wrong.
 * - To self-host, call `configure({ baseURL })` once at app start, pointing at
 *   a copy of the package's `dist/data` directory.
 *
 * What gets *stored* differs by level, and that is deliberate:
 *
 *   country  iso2 code  ("US")   — what the rate and consignment APIs expect
 *   state    iso2 code  ("NY")   — likewise; the readable name rides along in
 *                                  a sibling `*_state_name` field
 *   city     name       ("Reno") — cities have no stable code to send
 *
 * Storing the state as a code is why `useStateOptions` also returns the two
 * lookup maps: callers need to turn a code into a name for display, and a
 * legacy record's name back into a code before it can drive the city list.
 *
 * Backed by React Query rather than `useState` + `useEffect`. Since these are
 * real network reads, caching matters: the two address blocks on the
 * consignment form mount three of these hooks each, and without a shared cache
 * the country list would be fetched once per mount.
 */

export type LocationOption = ComboboxOption;

/** Country borders do not move during a session. Read once, keep. */
const LOCATION_QUERY_OPTIONS = {
  staleTime: Infinity,
  gcTime: 24 * 60 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

const EMPTY: LocationOption[] = [];

/** Every country, keyed by ISO 3166-1 alpha-2. */
export function useCountryOptions() {
  const { data, isPending } = useQuery({
    queryKey: ["locations", "countries"] as const,
    queryFn: async () => {
      const countries = await getCountries();
      return countries.map((country) => ({
        value: country.iso2,
        label: country.name,
      }));
    },
    ...LOCATION_QUERY_OPTIONS,
  });

  return { options: data ?? EMPTY, loading: isPending };
}

/**
 * States of one country, as `{ value: iso2, label: name }`.
 *
 * `iso2ToName` / `nameToIso2` are exposed so callers can move between the two
 * representations — to feed `getCitiesOfState` (which wants the code), or to
 * normalise a record saved back when the field held the full name.
 */
export function useStateOptions(countryCode?: string) {
  const { data, isPending } = useQuery({
    queryKey: ["locations", "states", countryCode] as const,
    queryFn: async () => {
      const states = await getStatesOfCountry(countryCode as string);

      // Built once here rather than in three `useMemo`s downstream — the
      // options and both maps come from the same list and change together.
      return {
        options: states.map((state) => ({
          value: state.iso2,
          label: state.name,
        })),
        iso2ToName: Object.fromEntries(
          states.map((state) => [state.iso2, state.name]),
        ) as Record<string, string>,
        nameToIso2: Object.fromEntries(
          states.map((state) => [state.name, state.iso2]),
        ) as Record<string, string>,
      };
    },
    // Idle until a country is chosen — the state field is disabled until then.
    enabled: Boolean(countryCode),
    ...LOCATION_QUERY_OPTIONS,
  });

  const empty = React.useMemo(() => ({}) as Record<string, string>, []);

  return {
    options: data?.options ?? EMPTY,
    iso2ToName: data?.iso2ToName ?? empty,
    nameToIso2: data?.nameToIso2 ?? empty,
    // Without a country there is nothing to wait for, so this is not "loading".
    loading: Boolean(countryCode) && isPending,
  };
}

/**
 * Cities of one state. Needs the state's iso2 internally — the library's own
 * signature — while the option values are city names, which is what is stored.
 */
export function useCityOptions(countryCode?: string, stateIso2?: string) {
  const enabled = Boolean(countryCode) && Boolean(stateIso2);

  const { data, isPending } = useQuery({
    queryKey: ["locations", "cities", countryCode, stateIso2] as const,
    queryFn: async () => {
      const cities = await getCitiesOfState(
        countryCode as string,
        stateIso2 as string,
      );
      return cities.map((city) => ({ value: city.name, label: city.name }));
    },
    enabled,
    ...LOCATION_QUERY_OPTIONS,
  });

  return { options: data ?? EMPTY, loading: enabled && isPending };
}

/**
 * Resolves a stored state value to its canonical iso2 code.
 *
 * Three cases, in order: already a code (returned as-is, upper-cased), a
 * legacy value saved as the full name (converted), or free text matching
 * nothing (returned verbatim, because the user typed it on purpose).
 *
 * A plain function rather than a hook — it is meant to run once while seeding
 * a form from an existing record, before the values reach the controls.
 */
export async function resolveStateValue(
  countryCode: string,
  state: string,
): Promise<string> {
  if (!state) return state;

  try {
    const states = await getStatesOfCountry(countryCode);

    const byIso2 = states.find(
      (entry) => entry.iso2 === state || entry.iso2 === state.toUpperCase(),
    );
    if (byIso2) return byIso2.iso2;

    const byName = states.find(
      (entry) => entry.name.toLowerCase() === state.trim().toLowerCase(),
    );
    if (byName) return byName.iso2;
  } catch {
    // Fall through — an unresolvable value is still the user's value.
  }

  return state;
}
