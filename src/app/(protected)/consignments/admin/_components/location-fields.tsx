"use client";

import * as React from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormSetValue,
} from "react-hook-form";

import { Combobox } from "@/shared/components/ui/combobox";
import {
  useCityOptions,
  useCountryOptions,
  useStateOptions,
} from "@/shared/hooks/use-location-options";

import { FieldShell } from "./field-shell";

/**
 * The cascading country → state → city trio.
 *
 * Generic over the form type because it serves both the rate check
 * (`receiver_country`) and the consignment form's two parties
 * (`sender.sender_country`, `receiver.receiver_country`).
 *
 * What it stores, and why the extra machinery exists:
 *
 *   country  iso2 code   — what the API expects
 *   state    iso2 code   — likewise, with the readable name mirrored into a
 *                          sibling field so the payload can carry both
 *   city     name        — cities have no code to send
 *
 * Storing the state as a code creates two problems this solves. The city list
 * needs that code, so a value that arrived as a *name* has to be converted
 * before cities can load — the first effect. And the payload wants the name
 * alongside the code, which nothing else tracks — the second.
 */

export interface LocationFieldsProps<T extends FieldValues> {
  control: Control<T>;
  /** Needed to normalise a legacy state value and to mirror the state name. */
  setValue: UseFormSetValue<T>;
  countryName: Path<T>;
  stateName: Path<T>;
  /**
   * The field receiving the readable state NAME. Defaults to
   * `${stateName}_name`, which suits the flat rate-check form; the consignment
   * form passes `sender.sender_state_name` explicitly.
   */
  stateNameField?: Path<T>;
  cityName: Path<T>;
  countryValue: string;
  stateValue: string;
  onCountryChange?: () => void;
  onStateChange?: () => void;
  countryError?: string;
  stateError?: string;
  cityError?: string;
  /** `contents` lets the three fields join the parent grid directly. */
  className?: string;
}

export function LocationFields<T extends FieldValues>({
  control,
  setValue,
  countryName,
  stateName,
  stateNameField,
  cityName,
  countryValue,
  stateValue,
  onCountryChange,
  onStateChange,
  countryError,
  stateError,
  cityError,
  className,
}: LocationFieldsProps<T>) {
  const { options: countryOptions, loading: countriesLoading } =
    useCountryOptions();
  const {
    options: stateOptions,
    iso2ToName,
    nameToIso2,
    loading: statesLoading,
  } = useStateOptions(countryValue);

  // The stored value is normally already a code, so try it directly first and
  // only fall back to a name lookup — which is what a legacy record, or a
  // free-typed state, will need.
  const stateIso2 = iso2ToName[stateValue]
    ? stateValue
    : (nameToIso2[stateValue] ?? "");

  const { options: cityOptions, loading: citiesLoading } = useCityOptions(
    countryValue,
    stateIso2,
  );

  /**
   * Normalises a state stored as a name ("Bagmati") to its code ("BA").
   *
   * Runs once the state list lands, since that is what makes the conversion
   * possible. `shouldDirty: false` keeps this invisible to dirty tracking — the
   * user changed nothing, the value was already this state under another
   * spelling.
   */
  React.useEffect(() => {
    if (statesLoading || !stateValue) return;

    const trimmed = stateValue.trim();

    const asCode = iso2ToName[trimmed]
      ? trimmed
      : iso2ToName[trimmed.toUpperCase()]
        ? trimmed.toUpperCase()
        : "";

    if (asCode) {
      if (asCode !== stateValue) {
        setValue(stateName, asCode as PathValue<T, Path<T>>, {
          shouldDirty: false,
        });
      }
      return;
    }

    const fromName =
      nameToIso2[trimmed] ??
      Object.entries(nameToIso2).find(
        ([name]) => name.toLowerCase() === trimmed.toLowerCase(),
      )?.[1];

    if (fromName) {
      setValue(stateName, fromName as PathValue<T, Path<T>>, {
        shouldDirty: false,
      });
    }
    // Both maps derive from the same fetch, so one is enough to depend on;
    // `setValue` and `stateName` are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesLoading, stateValue, iso2ToName]);

  /**
   * Mirrors the readable state name into its sibling field.
   *
   * The API wants both representations and nothing else knows the name — the
   * combobox stores only the code. A free-typed value has no code to look up,
   * so it stands in as its own name.
   */
  const nameFieldPath =
    stateNameField ?? (`${String(stateName)}_name` as Path<T>);

  React.useEffect(() => {
    const resolved = stateValue ? (iso2ToName[stateValue] ?? stateValue) : "";
    setValue(nameFieldPath, resolved as PathValue<T, Path<T>>, {
      shouldDirty: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue, iso2ToName, nameFieldPath]);

  return (
    <div className={className ?? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
      <FieldShell label="Country" required error={countryError}>
        {() => (
          <Controller
            control={control}
            name={countryName}
            render={({ field }) => (
              <Combobox
                options={countryOptions}
                value={field.value ?? ""}
                onChange={(value) => {
                  field.onChange(value);
                  onCountryChange?.();
                }}
                placeholder={
                  countriesLoading ? "Loading countries…" : "Select country"
                }
                searchPlaceholder="Search countries…"
                // A typo here would be sent as an ISO code and rejected.
                allowCustomValue={false}
                disabled={countriesLoading}
                aria-invalid={Boolean(countryError)}
              />
            )}
          />
        )}
      </FieldShell>

      <FieldShell label="State / Province" required error={stateError}>
        {() => (
          <Controller
            control={control}
            name={stateName}
            render={({ field }) => (
              <Combobox
                options={stateOptions}
                value={field.value ?? ""}
                onChange={(value) => {
                  field.onChange(value);
                  onStateChange?.();
                }}
                placeholder={
                  statesLoading
                    ? "Loading states…"
                    : countryValue
                      ? "Select state"
                      : "Select a country first"
                }
                searchPlaceholder="Search or type a state…"
                disabled={!countryValue || statesLoading}
                aria-invalid={Boolean(stateError)}
              />
            )}
          />
        )}
      </FieldShell>

      <FieldShell label="City" required error={cityError}>
        {() => (
          <Controller
            control={control}
            name={cityName}
            render={({ field }) => (
              <Combobox
                options={cityOptions}
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder={
                  citiesLoading
                    ? "Loading cities…"
                    : stateValue
                      ? "Select city"
                      : "Select a state first"
                }
                searchPlaceholder="Search or type a city…"
                disabled={!stateValue || citiesLoading}
                aria-invalid={Boolean(cityError)}
              />
            )}
          />
        )}
      </FieldShell>
    </div>
  );
}
