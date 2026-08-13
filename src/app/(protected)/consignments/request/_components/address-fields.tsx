"use client";

import * as React from "react";
import {
  Controller,
  useWatch,
  type FieldErrors,
  type Path,
} from "react-hook-form";
import {
  getCitiesOfState,
  getCountryByCode,
  getStatesOfCountry,
} from "@countrystatecity/countries-browser";

import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";

import type { ConsignmentFormInput } from "../schema";
import { PARTY_ADDRESS_TYPE_OPTIONS, YES_NO_OPTIONS } from "../types";
import { FieldShell } from "./field-shell";
import type {
  ConsignmentControl,
  ConsignmentErrors,
  ConsignmentRegister,
  ConsignmentSetValue,
} from "./form-types";
import { LocationFields } from "./location-fields";

/**
 * One party's contact and address block. Serves both sender and receiver —
 * the schema gives them the same shape precisely so this can be shared.
 *
 * `namePrefix` selects which half of the form the fields bind to, and is the
 * only thing that differs between the two mounts apart from `showGeo`.
 */

export interface AddressFieldsProps {
  namePrefix: "sender" | "receiver";
  control: ConsignmentControl;
  register: ConsignmentRegister;
  setValue: ConsignmentSetValue;
  errors: ConsignmentErrors;
  countryValue: string;
  stateValue: string;
  onCountryChange: () => void;
  onStateChange: () => void;
  /** Receiver only — the API takes coordinates for the delivery address. */
  showGeo?: boolean;
}

export function AddressFields({
  namePrefix,
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
  // Sender and receiver share every field the block below renders; the
  // receiver's extra coordinates are read off `errors.receiver` directly.
  const partyErrors = (errors[namePrefix] ??
    {}) as FieldErrors<ConsignmentFormInput["sender"]>;

  // The prefix is a literal union and every suffix is a known key, so the path
  // is valid by construction — but TS cannot narrow a template literal into
  // `Path<T>` on its own.
  const path = <K extends string>(key: K) =>
    `${namePrefix}.${key}` as Path<ConsignmentFormInput>;

  const cityValue = useWatch({ control, name: path("city") }) as
    | string
    | undefined;

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

      setValue("receiver.latitude", lat, { shouldDirty: false });
      setValue("receiver.longitude", lng, { shouldDirty: false });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGeo, countryValue, stateValue, cityValue]);

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <FieldShell
        label="First name"
        required
        error={partyErrors.first_name?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="John"
            aria-describedby={describedBy}
            aria-invalid={partyErrors.first_name ? true : undefined}
            {...register(path("first_name"))}
          />
        )}
      </FieldShell>

      <FieldShell
        label="Last name"
        required
        error={partyErrors.last_name?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="Doe"
            aria-describedby={describedBy}
            aria-invalid={partyErrors.last_name ? true : undefined}
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

      <FieldShell label="Email" error={partyErrors.email?.message} hint="Optional">
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="email"
            placeholder="john@example.com"
            aria-describedby={describedBy}
            aria-invalid={partyErrors.email ? true : undefined}
            {...register(path("email"))}
          />
        )}
      </FieldShell>

      <FieldShell label="Phone" required error={partyErrors.phone?.message}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="tel"
            placeholder="9800000000"
            aria-describedby={describedBy}
            aria-invalid={partyErrors.phone ? true : undefined}
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
        countryError={partyErrors.country?.message}
        stateError={partyErrors.state?.message}
        cityError={partyErrors.city?.message}
        className="contents"
      />

      <FieldShell
        label="ZIP / postal code"
        required
        error={partyErrors.zip?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="44600"
            aria-describedby={describedBy}
            aria-invalid={partyErrors.zip ? true : undefined}
            {...register(path("zip"))}
          />
        )}
      </FieldShell>

      <FieldShell
        label="Address line 1"
        required
        error={partyErrors.address_1?.message}
        className="sm:col-span-2"
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="Street, building, unit"
            aria-describedby={describedBy}
            aria-invalid={partyErrors.address_1 ? true : undefined}
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

      <FieldShell label="Address type" required>
        {({ id }) => (
          <Controller
            control={control}
            name={path("address_type")}
            render={({ field }) => (
              <NativeSelect
                id={id}
                options={PARTY_ADDRESS_TYPE_OPTIONS}
                value={String(field.value ?? "")}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
              />
            )}
          />
        )}
      </FieldShell>

      <FieldShell
        label="Residential address"
        required
        hint="Carriers price residential deliveries differently"
      >
        {({ id, describedBy }) => (
          <Controller
            control={control}
            name={path("is_resident")}
            render={({ field }) => (
              <NativeSelect
                id={id}
                aria-describedby={describedBy}
                options={YES_NO_OPTIONS}
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
                step="0.0001"
                aria-describedby={describedBy}
                {...register("receiver.latitude")}
              />
            )}
          </FieldShell>
          <FieldShell label="Longitude" hint="Filled in from the location">
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="number"
                step="0.0001"
                aria-describedby={describedBy}
                {...register("receiver.longitude")}
              />
            )}
          </FieldShell>
        </>
      ) : null}
    </div>
  );
}
