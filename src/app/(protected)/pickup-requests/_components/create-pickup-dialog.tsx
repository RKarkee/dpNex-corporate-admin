"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Truck } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/form-field";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";

import { useCreatePickupRequest } from "../_hooks/use-create-pickup-request";
import {
  emptyPickupForm,
  pickupSchema,
  REMARKS_MAX,
  type PickedConsignment,
  type PickupFormValues,
} from "../schema";
import { pickupRefusalReason } from "../services/pickup-request.service";
import { humanize, VEHICLE_TYPES } from "../types";
import { ConsignmentPicker } from "./consignment-picker";

/**
 * Booking a pickup.
 *
 * The three rules that matter — one customer or corporate across the whole set,
 * nothing already collected, nothing already on an open pickup — belong to rows
 * this app cannot see. Guessing at them would either block a valid booking or
 * promise one the server refuses, so the form checks shape only and hands the
 * server's own sentence back against the picker when it says no.
 */

const VEHICLE_OPTIONS = VEHICLE_TYPES.map((value) => ({
  value,
  label: humanize(value),
}));

export interface CreatePickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePickupDialog({
  open,
  onOpenChange,
}: CreatePickupDialogProps) {
  const createPickup = useCreatePickupRequest();

  /**
   * The picked labels live beside the form, not inside it.
   *
   * Only the ids are submitted, and carrying the labels through the schema
   * would mean validating — and then stripping — data the API never sees.
   */
  const [picked, setPicked] = React.useState<PickedConsignment[]>([]);
  const [refusal, setRefusal] = React.useState<string | null>(null);

  const form = useForm<PickupFormValues>({
    resolver: zodResolver(pickupSchema),
    defaultValues: emptyPickupForm(),
    mode: "onSubmit",
  });

  const { errors } = form.formState;
  const remarks = useWatch({ control: form.control, name: "remarks" });

  /* A fresh form each time it opens — otherwise an abandoned booking, and the
     errors it collected, greet the next one. */
  React.useEffect(() => {
    if (open) {
      form.reset(emptyPickupForm());
      setPicked([]);
      setRefusal(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const addConsignment = (option: PickedConsignment) => {
    // Picking the same one twice is a slip, not an instruction to send it twice.
    if (picked.some((item) => item.value === option.value)) return;

    const next = [...picked, option];
    setPicked(next);
    form.setValue(
      "consignment_request_ids",
      next.map((item) => item.value),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const removeConsignment = (value: string) => {
    const next = picked.filter((item) => item.value !== value);
    setPicked(next);
    form.setValue(
      "consignment_request_ids",
      next.map((item) => item.value),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setRefusal(null);

    try {
      await createPickup.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      if (!isApiError(error) || !error.isValidationError) return;

      // Field-shaped complaints land on their field; everything else — which
      // is where the three set-level rules turn up — goes above the picker.
      let handled = false;
      for (const [key, messages] of Object.entries(error.fieldErrors ?? {})) {
        const message = messages?.[0];
        if (!message) continue;

        if (key === "pickup_date" || key === "pickup_time" || key === "vehicle_type" || key === "remarks") {
          form.setError(key as keyof PickupFormValues, {
            type: "server",
            message,
          });
          handled = true;
        }
      }

      if (!handled) setRefusal(pickupRefusalReason(error) ?? null);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a pickup</DialogTitle>
          <DialogDescription>
            Book a van to collect consignments that are ready. Everything on one
            request is collected on the same trip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            label="Consignment requests"
            required
            error={errors.consignment_request_ids?.message}
          >
            {() => (
              <ConsignmentPicker
                picked={picked}
                onAdd={addConsignment}
                onRemove={removeConsignment}
                disabled={createPickup.isPending}
                invalid={Boolean(errors.consignment_request_ids)}
              />
            )}
          </Field>

          {/* The server's own words, above the field they are about. These are
              the rules the browser cannot check: same customer, not already
              collected, not already on another open pickup. */}
          {refusal ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {refusal}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Pickup date"
              required
              error={errors.pickup_date?.message}
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="date"
                  aria-invalid={Boolean(errors.pickup_date)}
                  aria-describedby={describedBy}
                  {...form.register("pickup_date")}
                />
              )}
            </Field>

            <Field
              label="Pickup time"
              error={errors.pickup_time?.message}
              hint="Optional"
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="time"
                  aria-invalid={Boolean(errors.pickup_time)}
                  aria-describedby={describedBy}
                  {...form.register("pickup_time")}
                />
              )}
            </Field>

            <Field
              label="Vehicle"
              required
              error={errors.vehicle_type?.message}
              hint="Big enough for the whole load"
            >
              {({ id }) => (
                <NativeSelect
                  id={id}
                  options={VEHICLE_OPTIONS}
                  {...form.register("vehicle_type")}
                />
              )}
            </Field>
          </div>

          <Field
            label="Remarks"
            error={errors.remarks?.message}
            // The counter only appears once it could plausibly matter.
            hint={
              remarks && remarks.length > REMARKS_MAX - 200
                ? `${remarks.length} / ${REMARKS_MAX}`
                : "Gate codes, contact on site, anything the driver needs"
            }
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={REMARKS_MAX}
                placeholder="Call before arriving, gate code 4471"
                aria-invalid={Boolean(errors.remarks)}
                aria-describedby={describedBy}
                {...form.register("remarks")}
              />
            )}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createPickup.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPickup.isPending}>
              <Truck className="size-4" />
              {createPickup.isPending ? "Requesting…" : "Request pickup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
