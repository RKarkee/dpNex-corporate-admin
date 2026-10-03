"use client";

import * as React from "react";
import { Controller, useWatch, type FieldErrors, type Path } from "react-hook-form";
import {
  getCitiesOfState,
  getCountryByCode,
  getStatesOfCountry,
} from "@countrystatecity/countries-browser";

import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import type { ConsignmentAdminFormInput } from "../schema";
import { FieldShell } from "./field-shell";
import type {
  AdminControl,
  AdminErrors,
  AdminRegister,
  AdminSetValue,
} from "./form-types";
import { LocationFields } from "./location-fields";
import {
  COORD_DECIMALS,
  truncateDecimals,
  truncateInputDecimals,
} from "@/shared/lib/number-input";

/**
 * One party's contact and address block. Serves both sender and receiver.
 *
 * This resource keeps the prefix *inside* the object — `sender.sender_zip`, not
 * `sender.zip` — so unlike the Consignment Request form, the two parties do not
 * share a field shape. `path()` rebuilds the doubled prefix from `party`, which
 * is the one place that repetition has to be spelled out.
 */

/** `"sender", "zip"` → `"sender.sender_zip"`. */
type PartyName = "sender" | "receiver";

export interface AddressFieldsProps {
  party: PartyName;
  control: AdminControl;
  register: AdminRegister;
  setValue: AdminSetValue;
  errors: AdminErrors;
  countryValue: string;
  stateValue: string;
  onCountryChange: () => void;
  onStateChange: () => void;
  /** Receiver only — the API takes coordinates for the delivery address. */
  showGeo?: boolean;
}

export function AddressFields({
  party,
  control,
  register,
  setValue,
  errors,
  countryValue,
  stateValue,
  onCountryChange,
  onStateChange,
  showGeo = false,
}: AddressFieldsProps) {
  // Sender and receiver carry the same field *suffixes*, so one error shape
  // covers both once the prefix is stripped.
  const partyErrors = (errors[party] ?? {}) as FieldErrors<
    Record<string, unknown>
  >;

  // Every suffix below is a real key on the schema, so the path is valid by
  // construction — but TS cannot narrow a template literal into `Path<T>`.
  const path = (key: string) =>
    `${party}.${party}_${key}` as Path<ConsignmentAdminFormInput>;

  /** The error for one suffix, under its fully prefixed key. */
  const errorFor = (key: string): string | undefined => {
    const entry = partyErrors[`${party}_${key}`];
    return typeof entry?.message === "string" ? entry.message : undefined;
  };

  const cityValue = useWatch({ control, name: path("city") }) as
    | string
    | undefined;

  // Address type — options and default both come from `/meta`
  // (`customer_address_type`).
  const { addressTypeOptions, addressTypeDefault } = useMetaOptions();
  const addressTypeValue = useWatch({ control, name: path("address_type") }) as
    | string
    | undefined;

  // A stored type `/meta` no longer lists stays selectable, so an older record
  // does not open with a blank select.
  const addressTypeSelectOptions = React.useMemo(
    () =>
      addressTypeValue &&
      !addressTypeOptions.some((option) => option.value === addressTypeValue)
        ? [...addressTypeOptions, { value: addressTypeValue, label: addressTypeValue }]
        : addressTypeOptions,
    [addressTypeOptions, addressTypeValue],
  );

  // Meta answers after mount, so its default lands here — only into an empty
  // field: a stored type (edit) or the user's own pick always wins. Living in
  // this component covers every mount: create, edit and the Update Party dialog.
  React.useEffect(() => {
    if (addressTypeDefault && !addressTypeValue) {
      setValue(path("address_type"), addressTypeDefault);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressTypeDefault, addressTypeValue]);

  /**
   * Fills in latitude and longitude from the chosen location.
   *
   * Narrowest match wins: the city's own coordinates, then the state's centre,
   * then the country's. A rough position is enough — the API uses it for zone
   * and distance estimation, not for routing to a doorstep — and it means the
   * fields are never left empty just because a small city is missing from the
   * dataset. Both remain editable.
   */
  React.useEffect(() => {
    if (!showGeo || !countryValue) return;

    let cancelled = false;

    void (async () => {
      let latitude: string | null | undefined;
      let longitude: string | null | undefined;

      if (stateValue && cityValue) {
        const cities = await getCitiesOfState(countryValue, stateValue).catch(
          () => [],
        );
        const match = cities.find((city) => city.name === cityValue);
        latitude = match?.latitude;
        longitude = match?.longitude;
      }

      if (!latitude && stateValue) {
        const states = await getStatesOfCountry(countryValue).catch(() => []);
        const match = states.find((state) => state.iso2 === stateValue);
        latitude = match?.latitude;
        longitude = match?.longitude;
      }

      if (!latitude) {
        const country = await getCountryByCode(countryValue).catch(() => null);
        latitude = country?.latitude;
        longitude = country?.longitude;
      }

      if (cancelled || !latitude || !longitude) return;

      const lat = Number.parseFloat(latitude);
      const lng = Number.parseFloat(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      // At most COORD_DECIMALS (3) places, cut not rounded: 45.34567 -> 45.345.
      setValue("receiver.receiver_latitude", truncateDecimals(lat, COORD_DECIMALS), { shouldDirty: false });
      setValue("receiver.receiver_longitude", truncateDecimals(lng, COORD_DECIMALS), { shouldDirty: false });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGeo, countryValue, stateValue, cityValue]);

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <FieldShell label="First name" required error={errorFor("first_name")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="John"
            aria-describedby={describedBy}
            aria-invalid={errorFor("first_name") ? true : undefined}
            {...register(path("first_name"))}
          />
        )}
      </FieldShell>

      <FieldShell label="Last name" required error={errorFor("last_name")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="Doe"
            aria-describedby={describedBy}
            aria-invalid={errorFor("last_name") ? true : undefined}
            {...register(path("last_name"))}
          />
        )}
      </FieldShell>

      <FieldShell label="Company" hint="Optional">
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="ABC Pvt Ltd"
            aria-describedby={describedBy}
            {...register(path("company"))}
          />
        )}
      </FieldShell>

      {/* Required on this resource, unlike a consignment request — the carrier
          needs a contact for customs correspondence. */}
      <FieldShell label="Email" required error={errorFor("email")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="email"
            placeholder="john@example.com"
            aria-describedby={describedBy}
            aria-invalid={errorFor("email") ? true : undefined}
            {...register(path("email"))}
          />
        )}
      </FieldShell>

      <FieldShell label="Phone" required error={errorFor("phone")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="tel"
            placeholder="9800000000"
            aria-describedby={describedBy}
            aria-invalid={errorFor("phone") ? true : undefined}
            {...register(path("phone"))}
          />
        )}
      </FieldShell>

      <FieldShell label="Telephone" hint="Extension and number">
        {({ id, describedBy }) => (
          <div className="flex gap-2">
            <Input
              id={id}
              placeholder="Ext"
              className="w-20 shrink-0"
              aria-label="Telephone extension"
              aria-describedby={describedBy}
              {...register(path("telephone_ext"))}
            />
            <Input
              placeholder="014000000"
              aria-label="Telephone number"
              {...register(path("telephone"))}
            />
          </div>
        )}
      </FieldShell>

      {/* `contents` so the three location fields sit in this grid rather than
          forming a nested one that would break the column rhythm. */}
      <LocationFields
        control={control}
        setValue={setValue}
        countryName={path("country")}
        stateName={path("state")}
        stateNameField={path("state_name")}
        cityName={path("city")}
        countryValue={countryValue}
        stateValue={stateValue}
        onCountryChange={onCountryChange}
        onStateChange={onStateChange}
        countryError={errorFor("country")}
        stateError={errorFor("state")}
        cityError={errorFor("city")}
        className="contents"
      />

      <FieldShell label="ZIP / postal code" required error={errorFor("zip")}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="44600"
            aria-describedby={describedBy}
            aria-invalid={errorFor("zip") ? true : undefined}
            {...register(path("zip"))}
          />
        )}
      </FieldShell>

      <FieldShell
        label="Address line 1"
        required
        error={errorFor("address_1")}
        className="sm:col-span-2"
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="Street, building, unit"
            aria-describedby={describedBy}
            aria-invalid={errorFor("address_1") ? true : undefined}
            {...register(path("address_1"))}
          />
        )}
      </FieldShell>

      <FieldShell label="Address line 2" hint="Optional">
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="Area, landmark"
            aria-describedby={describedBy}
            {...register(path("address_2"))}
          />
        )}
      </FieldShell>

      <FieldShell
        label="Address type"
        required
        error={errorFor("address_type")}
      >
        {({ id, describedBy }) => (
          <Controller
            control={control}
            name={path("address_type")}
            render={({ field }) => (
              <NativeSelect
                id={id}
                aria-describedby={describedBy}
                aria-invalid={errorFor("address_type") ? true : undefined}
                options={addressTypeSelectOptions}
                placeholder="Select address type"
                value={String(field.value ?? "")}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
              />
            )}
          />
        )}
      </FieldShell>

      {showGeo ? (
        <>
          <FieldShell label="Latitude" hint="Filled in from the location">
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                step="0.001"
                aria-describedby={describedBy}
                {...register("receiver.receiver_latitude")}
                onChange={(event) => {
                  // Typed or pasted: cut to 3 decimals before the form reads it.
                  truncateInputDecimals(event, COORD_DECIMALS);
                  void register("receiver.receiver_latitude").onChange(event);
                }}
              />
            )}
          </FieldShell>
          <FieldShell label="Longitude" hint="Filled in from the location">
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                step="0.001"
                aria-describedby={describedBy}
                {...register("receiver.receiver_longitude")}
                onChange={(event) => {
                  // Typed or pasted: cut to 3 decimals before the form reads it.
                  truncateInputDecimals(event, COORD_DECIMALS);
                  void register("receiver.receiver_longitude").onChange(event);
                }}
              />
            )}
          </FieldShell>
        </>
      ) : null}
    </div>
  );
}
