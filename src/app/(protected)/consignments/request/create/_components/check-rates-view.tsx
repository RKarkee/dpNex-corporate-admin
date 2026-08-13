"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PackageSearch, Search } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

import { useCheckRates } from "../../_hooks/use-check-rates";
import { FieldGroup, FieldShell } from "../../_components/field-shell";
import { LocationFields } from "../../_components/location-fields";
import { packageTypeFetcher } from "../../_components/lookup-fetchers";
import { RateOptionCard } from "../../_components/rate-cards";
import type { RateOption } from "../../types";

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

const checkRatesSchema = z.object({
  receiver_country: z.string().min(1, "Country is required"),
  receiver_state: z.string().min(1, "State is required"),
  receiver_state_name: z.string().optional(),
  receiver_city: z.string().min(1, "City is required"),
  receiver_zip: z.string().min(1, "ZIP / postal code is required"),
  package_type: z.string().min(1, "Package type is required"),
  total_weight: z.coerce.number().positive("Weight must be greater than 0"),
});

/**
 * `total_weight` is coerced, so the form holds a string where the validated
 * result holds a number — hence two types rather than one. See the note in
 * `schema.ts`.
 */
type CheckRatesFormInput = z.input<typeof checkRatesSchema>;
type CheckRatesFormValues = z.output<typeof checkRatesSchema>;

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
      package_type: "",
    },
  });

  const country = watch("receiver_country");
  const state = watch("receiver_state");

  const rates = checkRates.data?.rates;

  const onSubmit = (values: CheckRatesFormValues) => {
    checkRates.mutate({
      ...values,
      receiver_state_name: values.receiver_state_name ?? "",
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
      package_type: values.package_type,
      package_type_label: packageTypeLabel,
    });

    router.push(`/consignments/request/create/confirm?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6 sm:p-8">
          <FieldGroup
            title="Check rates"
            description="Where is this going, and how much does it weigh?"
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

            <FieldShell
              label="Total weight (kg)"
              required
              error={errors.total_weight?.message}
              hint="The combined weight of every box"
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="20"
                  aria-describedby={describedBy}
                  aria-invalid={errors.total_weight ? true : undefined}
                  {...register("total_weight")}
                />
              )}
            </FieldShell>
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
            {rates.map((rate) => (
              <RateOptionCard
                key={rate.customer_rate_id}
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
