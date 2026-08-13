"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send, UserRound, UsersRound } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

import {
  consignmentFormSchema,
  type ConsignmentFormInput,
  type ConsignmentFormValues,
} from "../schema";
import { AddressFields } from "./address-fields";
import { BoxesFields } from "./boxes-fields";
import { FieldGroup } from "./field-shell";
import { ShipmentDetailsFields } from "./shipment-details-fields";

/**
 * The consignment form — used to create a request after a rate is chosen, and
 * to edit an existing one.
 *
 * One component for both, because the fields, the validation and the layout
 * are the same in each case. Only the submit label and where "cancel" goes
 * differ, and those are props. The two flows differ *around* the form — create
 * arrives with a quote, edit arrives with a record — and that is handled by
 * the pages, which pass different `defaultValues` and a different `onSubmit`.
 *
 * Controlled by react-hook-form rather than `FormData`, unlike the user form
 * next door: this one has nested arrays (boxes, and items within them) that
 * need add and remove, and a dozen comboboxes that have no DOM value to read
 * back.
 */

export interface ConsignmentFormProps {
  /**
   * The schema's *input* type — what the controls hold. A mapper's output
   * (where every number really is a number) satisfies it.
   */
  defaultValues: ConsignmentFormInput;
  /** Receives the validated output, ready for the payload builders. */
  onSubmit: (values: ConsignmentFormValues) => void;
  submitting: boolean;
  submitLabel: string;
  /** Shown while submitting, in place of `submitLabel`. */
  submittingLabel: string;
  cancelHref: string;
  /** The failed mutation — anything that is not a 422 is summarised above the buttons. */
  error?: unknown;
}

export function ConsignmentForm({
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
  cancelHref,
  error,
}: ConsignmentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    // `<Input, Context, Output>` — see the note on `ConsignmentFormInput`.
  } = useForm<ConsignmentFormInput, unknown, ConsignmentFormValues>({
    resolver: zodResolver(consignmentFormSchema),
    defaultValues,
  });

  const senderCountry = watch("sender.country");
  const senderState = watch("sender.state");
  const receiverCountry = watch("receiver.country");
  const receiverState = watch("receiver.state");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ShipmentDetailsFields
        control={control}
        register={register}
        errors={errors}
        watch={watch}
        setValue={setValue}
      />

      <Card className="p-6 sm:p-8">
        <FieldGroup
          title="Sender"
          description="Where the consignment is collected from."
          icon={UserRound}
          className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1"
        >
          <AddressFields
            namePrefix="sender"
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            countryValue={senderCountry}
            stateValue={senderState}
            // A state from the old country cannot survive the change, and a
            // city cannot survive either — clearing them is the only correct
            // state, and the cascading lists reload from the new country.
            onCountryChange={() => {
              setValue("sender.state", "");
              setValue("sender.state_name", "");
              setValue("sender.city", "");
            }}
            onStateChange={() => setValue("sender.city", "")}
          />
        </FieldGroup>
      </Card>

      <Card className="p-6 sm:p-8">
        <FieldGroup
          title="Receiver"
          description="Where the consignment is delivered."
          icon={UsersRound}
          className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1"
        >
          <AddressFields
            namePrefix="receiver"
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            countryValue={receiverCountry}
            stateValue={receiverState}
            onCountryChange={() => {
              setValue("receiver.state", "");
              setValue("receiver.state_name", "");
              setValue("receiver.city", "");
            }}
            onStateChange={() => setValue("receiver.city", "")}
            showGeo
          />
        </FieldGroup>
      </Card>

      <BoxesFields
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
      />

      {/* A 422 is already spelled out under each field; anything else needs
          saying once, here. */}
      {error && !isApiError(error) && error instanceof Error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={submitting} className="min-w-44">
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
