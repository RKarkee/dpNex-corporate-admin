"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, RefreshCw } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";

import {
  fromDateTimeInput,
  requiresForwarder,
  requiresState,
} from "./status-rules";
import { useUpdateConsignmentStatus } from "../_hooks/use-consignment-actions";
import type { NextStatusOption, UpdateStatusPayload } from "../types";
import { FieldShell } from "./field-shell";
import { LocationFields } from "./location-fields";
import { forwarderFetcher } from "./lookup-fetchers";
import { reportApiError } from "./report-api-error";

/**
 * Update Status — `POST …/updatestatus`.
 *
 * A separate action from the Locations tab's "Add location", though it looks
 * alike: this moves the consignment's own status, and only optionally records a
 * place alongside it. So "Record a new location" starts OFF here, where on the
 * Locations tab it starts on.
 *
 * Used from the list's Action column and from the detail page, which is why it
 * lives at the module root rather than inside a tab.
 *
 * Validation is hand-written rather than a resolver for the same reason as the
 * location form: every rule depends on another field (`have_new_location`, the
 * chosen status, the country).
 */

interface FormValues {
  status: string;
  have_new_location: boolean;
  location: string;
  country: string;
  state: string;
  /** The readable state name `LocationFields` mirrors into. */
  state_name: string;
  city: string;
  comments: string;
  forwarder_code: string;
  new_tracking_no: string;
  location_date: string;
  arrived_at: string;
  moved_at: string;
  // Documented on the API but not collected yet — uncomment together with the
  // payload lines in `onSubmit` and the fieldset in the JSX below.
  // type: "" | "CONSIGNMENT" | "REQUEST";
  // tracking_no: string;
}

const EMPTY: FormValues = {
  status: "",
  have_new_location: false,
  location: "",
  country: "",
  state: "",
  state_name: "",
  city: "",
  comments: "",
  forwarder_code: "",
  new_tracking_no: "",
  location_date: "",
  arrived_at: "",
  moved_at: "",
  // type: "",
  // tracking_no: "",
};

/** `2026-08-19T14:20` for a datetime input, `2026-08-19` for a date one. */
function nowLocal(): { date: string; dateTime: string } {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { date, dateTime: `${date}T${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

/** The fields on screen for a submission — what a 422 may land on. */
function visibleFields(form: FormValues): (keyof FormValues)[] {
  const fields: (keyof FormValues)[] = ["status", "have_new_location", "comments"];
  if (form.have_new_location) {
    fields.push(
      "location",
      "country",
      "state",
      "city",
      "location_date",
      "arrived_at",
      "moved_at",
    );
  }
  if (requiresForwarder(form.status)) fields.push("forwarder_code", "new_tracking_no");
  return fields;
}

export function UpdateStatusDialog({
  consignmentId,
  statuses,
  open,
  onOpenChange,
}: {
  consignmentId: number;
  /** `next_statuses` from the record — the only statuses offered. */
  statuses: NextStatusOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" aria-hidden />
            Update status
          </DialogTitle>
          <DialogDescription>
            Move this consignment to its next status, optionally recording where the
            shipment is.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so every opening starts from a blank form. */}
        {open ? (
          <UpdateStatusForm
            consignmentId={consignmentId}
            statuses={statuses}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function UpdateStatusForm({
  consignmentId,
  statuses,
  onDone,
}: {
  consignmentId: number;
  statuses: NextStatusOption[];
  onDone: () => void;
}) {
  const updateStatus = useUpdateConsignmentStatus(consignmentId);

  const { control, register, setValue, getValues, clearErrors, formState, setError } =
    useForm<FormValues>({ defaultValues: EMPTY });

  const values = useWatch({ control }) as FormValues;
  const hasPlace = values.have_new_location;
  const needsForwarder = requiresForwarder(values.status ?? "");
  const [forwarderLabel, setForwarderLabel] = React.useState("");

  function validate(form: FormValues): boolean {
    const now = nowLocal();
    let ok = true;
    const fail = (field: keyof FormValues, message: string) => {
      setError(field, { message });
      ok = false;
    };

    if (!form.status) fail("status", "Status is required");

    if (form.have_new_location) {
      if (!form.location.trim()) fail("location", "Location name is required");
      if (!form.country) fail("country", "Country is required");
      if (requiresState(form.country) && !form.state) {
        fail("state", "State is required for this country");
      }
      if (!form.location_date) fail("location_date", "Scan date is required");
      if (!form.arrived_at) fail("arrived_at", "Arrival time is required");
      if (form.location_date && form.location_date > now.date) {
        fail("location_date", "The scan date cannot be in the future");
      }
      if (form.arrived_at && form.arrived_at > now.dateTime) {
        fail("arrived_at", "The arrival time cannot be in the future");
      }
      if (form.moved_at && form.arrived_at && form.moved_at < form.arrived_at) {
        fail("moved_at", "Departure cannot be before arrival");
      }
    }

    if (requiresForwarder(form.status)) {
      if (!form.forwarder_code) fail("forwarder_code", "Forwarder is required");
      if (form.forwarder_code && !form.new_tracking_no.trim()) {
        fail("new_tracking_no", "The forwarder's tracking number is required");
      }
    }

    // if (form.tracking_no.trim() && !form.type) fail("type", "Pick which record this number belongs to");
    // if (form.type && !form.tracking_no.trim()) fail("tracking_no", "Tracking number is required");

    return ok;
  }

  /**
   * Submit without `handleSubmit`, as the location form does: every message
   * here is set by hand, and `handleSubmit` refuses to run while any are
   * present — so after one failed attempt the button would go dead.
   */
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateStatus.isPending) return;

    clearErrors();
    const form = getValues();
    if (!validate(form)) return;

    const input: UpdateStatusPayload = {
      status: form.status,
      have_new_location: form.have_new_location ? "Y" : "N",
      comments: form.comments,
      location: form.location,
      country: form.country,
      // The readable name, not the picker's iso2 code — what the API stores.
      state: form.state_name || form.state,
      city: form.city,
      location_date: form.location_date,
      arrived_at: fromDateTimeInput(form.arrived_at),
      moved_at: fromDateTimeInput(form.moved_at),
      forwarder_code: form.forwarder_code,
      new_tracking_no: form.new_tracking_no,
      // type: form.type || undefined,
      // tracking_no: form.tracking_no,
    };

    updateStatus.mutate(input, {
      onSuccess: onDone,
      onError: (error) =>
        reportApiError(
          error,
          visibleFields(form),
          (field, message) => setError(field, { message }),
          "Could not update status",
        ),
    });
  }

  const errors = formState.errors;
  const busy = updateStatus.isPending;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldShell
          label="Status"
          required
          error={errors.status?.message}
          className="sm:col-span-2"
        >
          {({ id }) => (
            <NativeSelect
              id={id}
              placeholder="Select a status"
              disabled={busy || statuses.length === 0}
              options={statuses}
              aria-invalid={Boolean(errors.status)}
              {...register("status")}
            />
          )}
        </FieldShell>

        {statuses.length === 0 ? (
          <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">
            This consignment currently allows no status changes.
          </p>
        ) : null}

        {/* Only for the status that needs an onward carrier. */}
        {needsForwarder ? (
          <>
            <FieldShell label="Forwarder" required error={errors.forwarder_code?.message}>
              {() => (
                <AsyncCombobox
                  value={values.forwarder_code ?? ""}
                  selectedLabel={forwarderLabel || undefined}
                  onChange={(option) => {
                    setValue("forwarder_code", option.value);
                    setForwarderLabel(option.label);
                  }}
                  fetchPage={forwarderFetcher}
                  placeholder="Select a forwarder"
                  searchPlaceholder="Search forwarders…"
                  allowCustomValue={false}
                  disabled={busy}
                  aria-invalid={Boolean(errors.forwarder_code)}
                />
              )}
            </FieldShell>

            <FieldShell
              label="Forwarder tracking no."
              required
              error={errors.new_tracking_no?.message}
              hint="The carrier's own number, not the HAWB"
            >
              {({ id }) => (
                <Input
                  id={id}
                  disabled={busy}
                  placeholder="ARX-99887766"
                  aria-invalid={Boolean(errors.new_tracking_no)}
                  {...register("new_tracking_no")}
                />
              )}
            </FieldShell>
          </>
        ) : null}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/40 p-3">
        <Checkbox
          id="update-status-have-location"
          checked={hasPlace}
          disabled={busy}
          onCheckedChange={(checked) => setValue("have_new_location", checked === true)}
        />
        <div className="space-y-0.5">
          <Label htmlFor="update-status-have-location" className="cursor-pointer">
            Record a new location
          </Label>
          <p className="text-xs text-muted-foreground">
            Leave this off to move the status without logging a place.
          </p>
        </div>
      </div>

      {hasPlace ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <FieldShell
            label="Location"
            required
            error={errors.location?.message}
            className="sm:col-span-2"
          >
            {({ id }) => (
              <Input
                id={id}
                disabled={busy}
                placeholder="Dubai International Airport"
                aria-invalid={Boolean(errors.location)}
                {...register("location")}
              />
            )}
          </FieldShell>

          <LocationFields
            control={control}
            setValue={setValue}
            countryName="country"
            stateName="state"
            stateNameField="state_name"
            cityName="city"
            countryValue={values.country ?? ""}
            stateValue={values.state ?? ""}
            countryError={errors.country?.message}
            stateError={errors.state?.message}
            cityError={errors.city?.message}
            className="contents"
          />

          <FieldShell label="Scan date" required error={errors.location_date?.message}>
            {({ id }) => (
              <Input
                id={id}
                type="date"
                max={nowLocal().date}
                disabled={busy}
                aria-invalid={Boolean(errors.location_date)}
                {...register("location_date")}
              />
            )}
          </FieldShell>

          <FieldShell label="Arrived at" required error={errors.arrived_at?.message}>
            {({ id }) => (
              <Input
                id={id}
                type="datetime-local"
                max={nowLocal().dateTime}
                disabled={busy}
                aria-invalid={Boolean(errors.arrived_at)}
                {...register("arrived_at")}
              />
            )}
          </FieldShell>

          <FieldShell
            label="Moved at"
            hint="Optional — when it left again"
            error={errors.moved_at?.message}
          >
            {({ id }) => (
              <Input
                id={id}
                type="datetime-local"
                disabled={busy}
                aria-invalid={Boolean(errors.moved_at)}
                {...register("moved_at")}
              />
            )}
          </FieldShell>
        </div>
      ) : null}

      {/* Tracking reference — documented, not collected yet. Uncomment together
          with `type`/`tracking_no` in FormValues, EMPTY, validate and onSubmit.
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldShell label="Record type" error={errors.type?.message}>
          {({ id }) => (
            <NativeSelect
              id={id}
              placeholder="Select type"
              options={[
                { value: "CONSIGNMENT", label: "Consignment" },
                { value: "REQUEST", label: "Request" },
              ]}
              {...register("type")}
            />
          )}
        </FieldShell>
        <FieldShell label="Tracking number" error={errors.tracking_no?.message}>
          {({ id }) => <Input id={id} {...register("tracking_no")} />}
        </FieldShell>
      </div>
      */}

      <FieldShell label="Comments" error={errors.comments?.message}>
        {({ id }) => (
          <Textarea
            id={id}
            rows={3}
            disabled={busy}
            maxLength={255}
            placeholder="Package arrived in good condition"
            {...register("comments")}
          />
        )}
      </FieldShell>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || statuses.length === 0}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Update status
        </Button>
      </DialogFooter>
    </form>
  );
}
