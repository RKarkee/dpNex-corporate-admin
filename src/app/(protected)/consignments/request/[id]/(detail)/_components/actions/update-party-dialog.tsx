"use client";

import * as React from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { Loader2, UserPen } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { AddressFields } from "../../../../_components/address-fields";
import { reportApiError } from "../../../../_components/report-api-error";
import {
  useUpdateRequestReceiver,
  useUpdateRequestSender,
} from "../../../../_hooks/use-consignment-actions";
import {
  mapDetailToFormValues,
  toReceiverInfo,
  toSenderInfo,
} from "../../../../mappers";
import {
  receiverSchema,
  senderSchema,
  type ConsignmentFormInput,
  type ConsignmentFormValues,
} from "../../../../schema";
import type { ConsignmentDetailResult } from "../../../../types";

/**
 * Update Sender / Update Receiver — `POST …/updateSender` / `…/updateReceiver`.
 *
 * One dialog for both parties, the way `PartySection` and `AddressFields`
 * already serve both: `party` is the only thing that differs.
 *
 * It reuses the consignment form's own `AddressFields`, so a party is edited
 * with exactly the controls it was created with — including the country →
 * state → city cascade and the receiver's coordinates. To do that the form is
 * the full consignment form shape, seeded from the record by the same mapper
 * the edit page uses; only the chosen party is validated and sent.
 *
 * The payload goes through the same `toSenderInfo` / `toReceiverInfo` as a
 * create, so `*_state` carries the code and `*_state_name` the readable name,
 * exactly as the API already stores them.
 */

type Party = "sender" | "receiver";

/** Wire keys of one party — what a 422 names. */
const PARTY_KEYS = [
  "first_name",
  "last_name",
  "company",
  "email",
  "country",
  "state",
  "city",
  "zip",
  "address_1",
  "address_2",
  "phone",
  "telephone",
  "telephone_ext",
  "is_resident",
  "address_type",
  "latitude",
  "longitude",
] as const;

export function UpdatePartyDialog({
  requestId,
  party,
  detail,
  open,
  onOpenChange,
}: {
  requestId: number;
  party: Party;
  /** The loaded record — seeds the form. */
  detail: ConsignmentDetailResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const title = party === "sender" ? "Update sender" : "Update receiver";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPen className="size-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>
            Correct the {party}&apos;s contact details and address.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so each opening is seeded from the record as it is now. */}
        {open ? (
          <UpdatePartyForm
            requestId={requestId}
            party={party}
            detail={detail}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function UpdatePartyForm({
  requestId,
  party,
  detail,
  onDone,
}: {
  requestId: number;
  party: Party;
  detail: ConsignmentDetailResult;
  onDone: () => void;
}) {
  const updateSender = useUpdateRequestSender(requestId);
  const updateReceiver = useUpdateRequestReceiver(requestId);
  const busy = updateSender.isPending || updateReceiver.isPending;

  const defaultValues = React.useMemo(
    () => mapDetailToFormValues(detail.request, detail.boxes),
    [detail],
  );

  const { control, register, setValue, getValues, clearErrors, setError, formState } =
    useForm<ConsignmentFormInput, unknown, ConsignmentFormValues>({ defaultValues });

  const country = useWatch({ control, name: `${party}.country` }) as string;
  const state = useWatch({ control, name: `${party}.state` }) as string;

  const fieldPath = (key: string) => `${party}.${key}` as Path<ConsignmentFormInput>;

  const setFieldError = (key: string, message: string) =>
    setError(fieldPath(key), { message });

  /**
   * Validated by hand against this party's own schema — the form holds the
   * whole consignment, but only this half is being submitted, so running the
   * full schema would fail on boxes this dialog never shows.
   */
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    clearErrors();
    const raw = getValues(party);
    const onError = (error: unknown) =>
      reportApiError(
        error,
        PARTY_KEYS.map((key) => `${party}_${key}`),
        (field, message) => setFieldError(field.slice(party.length + 1), message),
        `Could not update ${party}`,
      );

    if (party === "sender") {
      const parsed = senderSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          setFieldError(String(issue.path[0] ?? ""), issue.message);
        }
        return;
      }
      updateSender.mutate(toSenderInfo(parsed.data), { onSuccess: onDone, onError });
      return;
    }

    const parsed = receiverSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setFieldError(String(issue.path[0] ?? ""), issue.message);
      }
      return;
    }
    updateReceiver.mutate(toReceiverInfo(parsed.data), { onSuccess: onDone, onError });
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <AddressFields
        namePrefix={party}
        control={control}
        register={register}
        setValue={setValue}
        errors={formState.errors}
        countryValue={country ?? ""}
        stateValue={state ?? ""}
        // A state or city from the old country cannot survive the change.
        onCountryChange={() => {
          setValue(fieldPath("state"), "");
          setValue(fieldPath("state_name"), "");
          setValue(fieldPath("city"), "");
        }}
        onStateChange={() => setValue(fieldPath("city"), "")}
        showGeo={party === "receiver"}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save {party}
        </Button>
      </DialogFooter>
    </form>
  );
}
