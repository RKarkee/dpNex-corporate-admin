"use client";

import * as React from "react";
import { ChevronDown, Star, Trash2 } from "lucide-react";
import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";

import { LocationFields } from "@/app/(protected)/consignments/request/_components/location-fields";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { cn } from "@/shared/lib/utils";

import type { ProfileFormValues } from "../schema";
import { ADDRESS_TYPES, addressTypeLabel } from "../types";
import { Field, TelephonePair } from "./form-parts";

/**
 * One row of the address field array — a collapsed summary that opens into the
 * full form.
 *
 * Saved addresses land collapsed so the card reads as a short list rather than
 * a wall of inputs; a row the user just added opens expanded, because it is
 * empty and every required field still needs filling.
 *
 * **Collapsing does not discard anything.** react-hook-form keeps values for
 * unmounted inputs (`shouldUnregister` defaults to `false`), so a closed row
 * still submits exactly what it held. That is load-bearing here — if that
 * default ever changes, collapsing would silently blank the address.
 *
 * `LocationFields` is imported from the consignment route rather than copied:
 * it is generic over the form type precisely so several forms can share it.
 */

const ADDRESS_TYPE_OPTIONS = ADDRESS_TYPES.map((value) => ({
  value,
  label: addressTypeLabel(value),
}));

let rowSequence = 0;

export interface AddressRowProps {
  index: number;
  control: Control<ProfileFormValues>;
  register: UseFormRegister<ProfileFormValues>;
  setValue: UseFormSetValue<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
  onRemove: () => void;
  /** Marks every other row non-primary, since only one may be. */
  onMakePrimary: () => void;
  /** New rows open expanded; rows read back from the API start collapsed. */
  defaultExpanded: boolean;
  /**
   * A 422 message for one field. Laravel names these `addresses.0.city`,
   * matching the RHF path exactly, so the caller's lookup needs no mapping.
   */
  apiFieldError: (name: string) => string | undefined;
}

export function AddressRow({
  index,
  control,
  register,
  setValue,
  errors,
  onRemove,
  onMakePrimary,
  defaultExpanded,
  apiFieldError,
}: AddressRowProps) {
  const [bodyId] = React.useState(() => `address-body-${++rowSequence}`);
  const [open, setOpen] = React.useState(defaultExpanded);

  /** Zod first, then whatever the server rejected for the same field. */
  const fieldError = (
    key: string,
    local: string | undefined,
  ): string | undefined => local ?? apiFieldError(`addresses.${index}.${key}`);

  // `LocationFields` does not read the form itself — the country and state
  // values are passed in, so the cascade re-renders when they change.
  const country = useWatch({ control, name: `addresses.${index}.country` });
  const state = useWatch({ control, name: `addresses.${index}.state` });
  const stateName = useWatch({ control, name: `addresses.${index}.state_name` });
  const isPrimary = useWatch({ control, name: `addresses.${index}.is_primary` });
  const type = useWatch({ control, name: `addresses.${index}.type` });
  const line1 = useWatch({ control, name: `addresses.${index}.address_line_1` });
  const city = useWatch({ control, name: `addresses.${index}.city` });
  const zip = useWatch({ control, name: `addresses.${index}.zip` });

  const rowErrors = errors.addresses?.[index];

  // A collapsed row would otherwise hide the very fields a failed submit is
  // complaining about.
  const expanded = open || Boolean(rowErrors);

  const summary =
    [line1, city, [stateName || state, zip].filter(Boolean).join(" "), country]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ") || "No details yet";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border",
        rowErrors && "border-destructive/50",
      )}
    >
      <div className="flex items-center justify-between gap-2 bg-secondary/40 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
          <span className="shrink-0 text-sm font-medium text-foreground">
            Address {index + 1}
          </span>
          {type ? (
            <Badge variant="outline" className="shrink-0">
              {addressTypeLabel(type)}
            </Badge>
          ) : null}
          {isPrimary === "Y" ? (
            <Badge variant="warning" className="shrink-0 gap-1">
              <Star className="size-3" aria-hidden />
              Primary
            </Badge>
          ) : null}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {isPrimary === "Y" ? null : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onMakePrimary}
              className="h-7 text-xs text-muted-foreground hover:text-primary"
            >
              <Star className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Make primary</span>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden />
            <span className="sr-only">Remove address {index + 1}</span>
          </Button>
        </div>
      </div>

      {expanded ? (
        <div
          id={bodyId}
          className="grid grid-cols-1 gap-4 border-t border-border p-3 sm:grid-cols-2 sm:p-4 md:grid-cols-3"
        >
          <Field label="Address type">
            {({ id }) => (
              <NativeSelect
                id={id}
                options={ADDRESS_TYPE_OPTIONS}
                {...register(`addresses.${index}.type`)}
              />
            )}
          </Field>

          <Field label="Primary address">
            {({ id }) => (
              <NativeSelect
                id={id}
                options={[
                  { value: "Y", label: "Yes" },
                  { value: "N", label: "No" },
                ]}
                {...register(`addresses.${index}.is_primary`)}
              />
            )}
          </Field>

          {/* `contents` lets the three location fields join this grid rather
              than nesting a second one inside a cell. */}
          <LocationFields
            className="contents"
            control={control}
            setValue={setValue}
            countryName={`addresses.${index}.country`}
            stateName={`addresses.${index}.state`}
            stateNameField={`addresses.${index}.state_name`}
            cityName={`addresses.${index}.city`}
            countryValue={country ?? ""}
            stateValue={state ?? ""}
            // The component does not clear downstream fields itself — which
            // fields depend on which is the form's knowledge, not its own.
            onCountryChange={() => {
              setValue(`addresses.${index}.state`, "");
              setValue(`addresses.${index}.state_name`, "");
              setValue(`addresses.${index}.city`, "");
            }}
            onStateChange={() => setValue(`addresses.${index}.city`, "")}
            countryError={fieldError("country", rowErrors?.country?.message)}
            stateError={fieldError("state", rowErrors?.state?.message)}
            cityError={fieldError("city", rowErrors?.city?.message)}
          />

          <Field
            label="Address line 1"
            required
            error={fieldError("address_line_1", rowErrors?.address_line_1?.message)}
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={Boolean(rowErrors?.address_line_1)}
                {...register(`addresses.${index}.address_line_1`)}
              />
            )}
          </Field>

          <Field label="Address line 2" error={fieldError("address_line_2", rowErrors?.address_line_2?.message)}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                {...register(`addresses.${index}.address_line_2`)}
              />
            )}
          </Field>

          <Field
            label="ZIP / postal code"
            required
            error={fieldError("zip", rowErrors?.zip?.message)}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={Boolean(rowErrors?.zip)}
                {...register(`addresses.${index}.zip`)}
              />
            )}
          </Field>

          <Field label="Email" error={fieldError("email", rowErrors?.email?.message)}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="email"
                aria-describedby={describedBy}
                aria-invalid={Boolean(rowErrors?.email)}
                {...register(`addresses.${index}.email`)}
              />
            )}
          </Field>

          <Field label="Mobile 1" error={fieldError("phone_1", rowErrors?.phone_1?.message)}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="tel"
                placeholder="+977-98XXXXXXXX"
                aria-describedby={describedBy}
                {...register(`addresses.${index}.phone_1`)}
              />
            )}
          </Field>

          <Field label="Mobile 2" error={fieldError("phone_2", rowErrors?.phone_2?.message)}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="tel"
                placeholder="+977-98XXXXXXXX"
                aria-describedby={describedBy}
                {...register(`addresses.${index}.phone_2`)}
              />
            )}
          </Field>

          <TelephonePair
            label="Telephone 1"
            register={register}
            numberName={`addresses.${index}.telephone_1`}
            extName={`addresses.${index}.telephone_1_ext`}
            extWidth="w-16"
          />

          <TelephonePair
            label="Telephone 2"
            register={register}
            numberName={`addresses.${index}.telephone_2`}
            extName={`addresses.${index}.telephone_2_ext`}
            extWidth="w-16"
          />
        </div>
      ) : (
        <p className="truncate px-3 py-3 text-sm text-muted-foreground sm:px-4">
          {summary}
        </p>
      )}
    </div>
  );
}
