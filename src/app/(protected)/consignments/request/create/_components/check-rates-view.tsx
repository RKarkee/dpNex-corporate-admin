"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PackageSearch, Search } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { useCheckRates } from "../../_hooks/use-check-rates";
import { FieldGroup, FieldShell } from "../../_components/field-shell";
import { LocationFields } from "../../_components/location-fields";
import { packageTypeFetcher } from "../../_components/lookup-fetchers";
import { RateOptionCard } from "../../_components/rate-cards";
import type { RateOption } from "../../types";
import {
  checkRatesSchema,
  newRateCheckBox,
  sumBoxWeights,
  type CheckRatesFormInput,
  type CheckRatesFormValues,
} from "./check-rates-schema";
import { RateCheckBoxes } from "./rate-check-boxes";

/**
 * Step one of creating a request: price the destination, then pick a rate.
 *
 * A separate step rather than a section of the main form because the answer
 * decides the rest — the routing codes, the carrier and the price all come
 * from the quote the user selects, and none of the consignment details can be
 * priced without a destination and a weight first.
 *
 * The selection is carried to step two through the URL. It is bulky for a
 * query string, but it survives a refresh and a back-navigation, which a
 * module-level variable or a context would not — and losing a chosen quote
 * halfway through a long form is worse than a long URL.
 */

export function CheckRatesView() {
  const router = useRouter();
  const checkRates = useCheckRates();

  // The combobox stores the code but the confirm step has to display a name,
  // and it has no list to resolve one from — so the label travels too.
  const [packageTypeLabel, setPackageTypeLabel] = React.useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CheckRatesFormInput, unknown, CheckRatesFormValues>({
    resolver: zodResolver(checkRatesSchema),
    defaultValues: {
      receiver_country: "",
      receiver_state: "",
      receiver_state_name: "",
      receiver_city: "",
      receiver_zip: "",
      receiver_address_1: "",
      receiver_address_2: "",
      package_type: "",
      item_type: "",
      boxes: [{ ...newRateCheckBox }],
    },
  });

  // Total weight is the boxes' summed weight — shown read-only, never typed,
  // so it cannot disagree with the boxes it is sent alongside.
  const watchedBoxes = useWatch({ control, name: "boxes" });
  const totalWeight = sumBoxWeights(watchedBoxes);

  const country = watch("receiver_country");
  const state = watch("receiver_state");

  const rates = checkRates.data?.rates;
  const { rateCheckItemTypeOptions } = useMetaOptions();

  const onSubmit = (values: CheckRatesFormValues) => {
    const { item_type, receiver_address_1, receiver_address_2, boxes, ...rest } = values;
    const address1 = receiver_address_1?.trim();
    const address2 = receiver_address_2?.trim();
    checkRates.mutate({
      ...rest,
      receiver_state_name: values.receiver_state_name ?? "",
      total_weight: sumBoxWeights(boxes),
      boxes,
      // Optional lines and the item type are left out entirely until filled,
      // so a blank never reaches validation.
      ...(address1 ? { receiver_address_1: address1 } : {}),
      ...(address2 ? { receiver_address_2: address2 } : {}),
      ...(item_type ? { item_type } : {}),
    });
  };

  const handleSelect = (rate: RateOption) => {
    const values = getValues();
    const params = new URLSearchParams({
      rate: JSON.stringify(rate),
      receiver_country: values.receiver_country,
      receiver_state: values.receiver_state,
      receiver_state_name: values.receiver_state_name ?? "",
      receiver_city: values.receiver_city,
      receiver_zip: values.receiver_zip,
      receiver_address_1: values.receiver_address_1?.trim() ?? "",
      receiver_address_2: values.receiver_address_2?.trim() ?? "",
      package_type: values.package_type,
      package_type_label: packageTypeLabel,
      // The boxes these rates were priced on — the mutation's own input, not
      // the box inputs as they are now, which may have been edited since.
      boxes: JSON.stringify(checkRates.variables?.boxes ?? []),
    });

    router.push(`/consignments/request/create/confirm?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6 sm:p-8">
          <FieldGroup
            title="Check rates"
            description="Where is this going, and what are you sending?"
            icon={PackageSearch}
          >
            <LocationFields
              control={control}
              setValue={setValue}
              countryName="receiver_country"
              stateName="receiver_state"
              stateNameField="receiver_state_name"
              cityName="receiver_city"
              countryValue={country}
              stateValue={state}
              // A state from the old country cannot survive the change, nor
              // can a city from the old state.
              onCountryChange={() => {
                setValue("receiver_state", "");
                setValue("receiver_state_name", "");
                setValue("receiver_city", "");
              }}
              onStateChange={() => setValue("receiver_city", "")}
              countryError={errors.receiver_country?.message}
              stateError={errors.receiver_state?.message}
              cityError={errors.receiver_city?.message}
              className="contents"
            />

            <FieldShell
              label="ZIP / postal code"
              required
              error={errors.receiver_zip?.message}
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  placeholder="90015"
                  aria-describedby={describedBy}
                  aria-invalid={errors.receiver_zip ? true : undefined}
                  {...register("receiver_zip")}
                />
              )}
            </FieldShell>

            <FieldShell label="Address line 1" error={errors.receiver_address_1?.message}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  placeholder="Street address (optional)"
                  aria-describedby={describedBy}
                  {...register("receiver_address_1")}
                />
              )}
            </FieldShell>

            <FieldShell label="Address line 2" error={errors.receiver_address_2?.message}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  placeholder="Apartment, suite, etc. (optional)"
                  aria-describedby={describedBy}
                  {...register("receiver_address_2")}
                />
              )}
            </FieldShell>

            <FieldShell
              label="Package type"
              required
              error={errors.package_type?.message}
            >
              {() => (
                <Controller
                  control={control}
                  name="package_type"
                  render={({ field }) => (
                    <AsyncCombobox
                      value={field.value}
                      selectedLabel={packageTypeLabel}
                      onChange={(option) => {
                        field.onChange(option.value);
                        setPackageTypeLabel(option.label);
                      }}
                      fetchPage={packageTypeFetcher}
                      placeholder="Select package type"
                      searchPlaceholder="Search package types…"
                      allowCustomValue
                      aria-invalid={Boolean(errors.package_type)}
                    />
                  )}
                />
              )}
            </FieldShell>

            <FieldShell label="Item type" error={errors.item_type?.message}>
              {() => (
                <Controller
                  control={control}
                  name="item_type"
                  render={({ field }) => (
                    <Combobox
                      options={rateCheckItemTypeOptions}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Select item type"
                      searchPlaceholder="Search item types…"
                      allowCustomValue={false}
                    />
                  )}
                />
              )}
            </FieldShell>

            <FieldShell label="Total weight (kg)" hint="The sum of the box weights">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  value={totalWeight || ""}
                  readOnly
                  tabIndex={-1}
                  placeholder="0"
                  aria-describedby={describedBy}
                  className="cursor-not-allowed bg-muted focus-visible:ring-0"
                />
              )}
            </FieldShell>

            <RateCheckBoxes control={control} register={register} errors={errors} />
          </FieldGroup>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={checkRates.isPending} className="min-w-40">
              {checkRates.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {checkRates.isPending ? "Checking rates…" : "Check rates"}
            </Button>
          </div>
        </Card>
      </form>

      {rates && rates.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Available rates
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick one to continue — its carrier, service and price carry
              through to the request.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* Keyed by position: several quotes can share one customer_rate_id
                (same customer rate, different carrier or service). */}
            {rates.map((rate, index) => (
              <RateOptionCard
                key={`${index}-${rate.customer_rate_id}-${rate.integrator_code}-${rate.service_code}`}
                rate={rate}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* An empty result is a real answer — no carrier serves that lane at that
          weight — so it gets its own state rather than looking like a failure. */}
      {rates && rates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary">
            <PackageSearch className="size-6" strokeWidth={2} />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            No rates for this route
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Nothing came back for that destination, package type and weight. Try
            a different combination.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
