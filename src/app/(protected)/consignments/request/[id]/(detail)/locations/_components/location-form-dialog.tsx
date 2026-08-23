"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, MapPin } from "lucide-react";

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
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import { useLookupLabel } from "@/shared/hooks/use-lookup-label";

import { FieldShell } from "../../../../_components/field-shell";
import { forwarderFetcher } from "../../../../_components/lookup-fetchers";
import { LocationFields } from "../../../../_components/location-fields";
import type { NextStatusOption } from "../../../../types";
import {
  useConsignmentLocation,
  useSaveConsignmentLocation,
} from "../_hooks/use-consignment-locations";
import type { LocationInput } from "../services/locations.service";
import {
  locationErrorsFromResponse,
  visibleLocationFields,
} from "./location-validation";
import {
  fromDateTimeInput,
  requiresForwarder,
  requiresState,
  statusOptionsFor,
  toDateInput,
  toDateTimeInput,
  type ConsignmentLocation,
} from "../types";

/**
 * Add or edit one tracking location, in a modal.
 *
 * react-hook-form rather than the plain `useState` the box dialog uses, for one
 * reason: `LocationFields` — the shared country → state → city cascade — takes
 * a `control` and a `setValue`. Rebuilding that cascade against local state to
 * avoid the dependency would be a far worse trade than adopting the form
 * library the rest of the app already uses.
 *
 * Validation is hand-written in `validate` rather than a resolver, because
 * every rule here is conditional on another field: which fields are required
 * depends on `have_new_location`, on the chosen `status`, and on the country.
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
}

const EMPTY: FormValues = {
  status: "",
  have_new_location: true,
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
};

/** `2026-08-19T14:20` for a datetime input, `2026-08-19` for a date one. */
function nowLocal(): { date: string; dateTime: string } {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { date, dateTime: `${date}T${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

export function LocationFormDialog({
  requestId,
  location: row,
  statuses,
  open,
  onOpenChange,
}: {
  requestId: string;
  /** Absent for a create. */
  location: ConsignmentLocation | null;
  /** `next_statuses` from the parent request — the only statuses allowed. */
  statuses: NextStatusOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(row);
  const detail = useConsignmentLocation(requestId, row?.id, row ?? undefined);
  const record = (detail.data as ConsignmentLocation | undefined) ?? row;

  // Held back until the detail settles, so the form is never seeded from a
  // partial list row and then rewritten a render later.
  const ready = !isEdit || (Boolean(record) && !detail.isPending);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" aria-hidden />
            {isEdit ? "Update location" : "Add location"}
          </DialogTitle>
          <DialogDescription>
            Record where the shipment reached and the status it moves to.
          </DialogDescription>
        </DialogHeader>

        {/* Keyed so opening a different row remounts with fresh state rather
            than patching the previous row's values a render late. */}
        {ready ? (
          <LocationForm
            key={record?.id ?? "create"}
            requestId={requestId}
            record={record ?? null}
            statuses={statuses}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LocationForm({
  requestId,
  record,
  statuses,
  onDone,
}: {
  requestId: string;
  record: ConsignmentLocation | null;
  statuses: NextStatusOption[];
  onDone: () => void;
}) {
  const saveLocation = useSaveConsignmentLocation(requestId);

  const {
    control,
    register,
    setValue,
    getValues,
    clearErrors,
    formState,
    setError,
  } = useForm<FormValues>({
      defaultValues: record
        ? {
            ...EMPTY,
            status: record.status,
            // An existing row always describes a place, so the toggle starts on.
            have_new_location: true,
            location: record.location,
            country: record.country,
            // The API stores the state NAME. Seeding both fields with it keeps
            // the picker showing something true and round-trips the same value
            // back out if the user never touches it.
            state: record.state ?? "",
            state_name: record.state ?? "",
            city: record.city ?? "",
            comments: record.comments ?? "",
            forwarder_code: record.forwarder_code ?? "",
            new_tracking_no: record.new_tracking_no ?? "",
            location_date: toDateInput(record.location_date ?? record.arrived_at),
            arrived_at: toDateTimeInput(record.arrived_at),
            moved_at: toDateTimeInput(record.moved_at),
          }
        : { ...EMPTY, status: statuses[0]?.value ?? "" },
    });

  /**
   * The record's own status is folded in when `next_statuses` omits it, so an
   * edit opens on the value it actually holds instead of silently adopting the
   * first allowed transition. On a create there is no record, so this is just
   * `next_statuses`.
   */
  const statusOptions = React.useMemo(
    () => statusOptionsFor(statuses, record?.status),
    [statuses, record?.status],
  );

  const values = useWatch({ control }) as FormValues;
  const hasPlace = values.have_new_location;
  const needsForwarder = requiresForwarder(values.status ?? "");

  const forwarderLabel = useLookupLabel("forwarder", values.forwarder_code);
  const [forwarderPicked, setForwarderPicked] = React.useState("");

  /**
   * Conditional rules, in one place.
   *
   * Mirrors the API's own conditions exactly — anything looser lets the user
   * submit a request the server will reject with a message they cannot act on.
   */
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

      // The API rejects future scans; catching it here saves a round trip and
      // names the field, which a 422 on a nested rule often will not.
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
      // Required *because* a forwarder was supplied — the two always travel
      // together, so this is checked against the forwarder, not the status.
      if (form.forwarder_code && !form.new_tracking_no.trim()) {
        fail("new_tracking_no", "The forwarder's tracking number is required");
      }
    }

    return ok;
  }

  /**
   * Submit, without `handleSubmit`.
   *
   * react-hook-form's `handleSubmit` will not invoke its callback while
   * `formState.errors` is non-empty. Every message here is set manually — by
   * `validate` or by the server — so after one failed attempt those errors
   * persisted and `handleSubmit` swallowed every subsequent click: the button
   * looked alive but the form could only ever be submitted once.
   *
   * Clearing inside the callback cannot fix it, because the callback is what
   * stops running. So the gate is removed: this reads the values directly,
   * clears last attempt's messages first, and runs the same conditional rules
   * — which is all `handleSubmit` was doing for a form with no resolver.
   */
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    clearErrors();
    onSubmit(getValues());
  }

  function onSubmit(form: FormValues) {
    if (!validate(form)) return;

    const input: LocationInput = {
      status: form.status,
      have_new_location: form.have_new_location ? "Y" : "N",
      location: form.location,
      country: form.country,
      // The readable name, not the picker's code — the API stores and returns
      // names here (`CALIFORNIA`), and echoing back a code would change the
      // value on every save.
      state: form.state_name || form.state,
      city: form.city,
      comments: form.comments,
      forwarder_code: form.forwarder_code,
      new_tracking_no: form.new_tracking_no,
      location_date: form.location_date,
      arrived_at: fromDateTimeInput(form.arrived_at),
      moved_at: fromDateTimeInput(form.moved_at),
    };

    saveLocation.mutate(
      { id: record?.id, input },
      {
        onSuccess: onDone,
        /**
         * A 422 lands on the field it names, so the fix is made where the
         * message is shown; the dialog stays open.
         *
         * Anything this cannot place is already being toasted by the hook,
         * which tests the same mapper — so nothing is reported twice and
         * nothing is lost.
         */
        onError: (error) => {
          // The same input the hook tests, so the two always agree on which
          // fields are on screen — and a message about a hidden one is toasted
          // there rather than set on an invisible field here.
          for (const [field, message] of Object.entries(
            locationErrorsFromResponse(error, visibleLocationFields(input)),
          )) {
            setError(field as keyof FormValues, { message });
          }
        },
      },
    );
  }

  const errors = formState.errors;
  const busy = saveLocation.isPending;

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
              disabled={busy || statusOptions.length === 0}
              options={statusOptions}
              {...register("status")}
            />
          )}
        </FieldShell>

        {statusOptions.length === 0 ? (
          <p className="sm:col-span-2 -mt-2 text-xs text-muted-foreground">
            This request currently allows no status changes, so a location
            cannot be recorded against it.
          </p>
        ) : null}

        {/* Only shown for the status that needs it — an always-visible carrier
            field would read as required on every scan. */}
        {needsForwarder ? (
          <>
            <FieldShell
              label="Forwarder"
              required
              error={errors.forwarder_code?.message}
            >
              {() => (
                <AsyncCombobox
                  value={values.forwarder_code ?? ""}
                  selectedLabel={forwarderPicked || forwarderLabel}
                  onChange={(option) => {
                    setValue("forwarder_code", option.value);
                    setForwarderPicked(option.label);
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
          id="have_new_location"
          checked={hasPlace}
          disabled={busy}
          onCheckedChange={(checked) =>
            setValue("have_new_location", checked === true)
          }
        />
        <div className="space-y-0.5">
          <Label htmlFor="have_new_location" className="cursor-pointer">
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

          {/* The shared cascade — same control the sender and receiver
              addresses use, so country/state/city behave identically here. */}
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

          <FieldShell
            label="Scan date"
            required
            error={errors.location_date?.message}
          >
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

          <FieldShell
            label="Arrived at"
            required
            error={errors.arrived_at?.message}
          >
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

      <FieldShell label="Comments" error={errors.comments?.message}>
        {({ id }) => (
          <Textarea
            id={id}
            rows={3}
            disabled={busy}
            placeholder="Package arrived in good condition"
            {...register("comments")}
          />
        )}
      </FieldShell>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        {/* Blocked only when there is genuinely nothing to choose — a record
            whose own status is folded in always has at least one option. */}
        <Button type="submit" disabled={busy || statusOptions.length === 0}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {record ? "Save changes" : "Add location"}
        </Button>
      </DialogFooter>
    </form>
  );
}
