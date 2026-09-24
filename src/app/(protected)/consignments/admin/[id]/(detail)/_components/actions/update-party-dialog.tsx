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
  useUpdateConsignmentReceiver,
  useUpdateConsignmentSender,
} from "../../../../_hooks/use-consignment-actions";
import {
  mapDetailToFormValues,
  toReceiverPayload,
  toSenderPayload,
} from "../../../../mappers";
import {
  receiverSchema,
  senderSchema,
  type ConsignmentAdminFormInput,
  type ConsignmentAdminFormValues,
} from "../../../../schema";
import type { ConsignmentDetailResult } from "../../../../types";

/**
 * Update Sender / Update Receiver — `POST …/updateSender` / `…/updateReceiver`.
 *
 * One dialog for both parties, the way `PartySection` and `AddressFields`
 * already serve both: `party` is the only thing that differs.
 *
 * It reuses this module's own `AddressFields`, so a party is edited with the
 * controls it was created with — the country → state → city cascade and the
 * receiver's coordinates included. The form is therefore the full consignment
 * form shape, seeded by the same mapper the edit page uses; only the chosen
 * party is validated and sent, through the same payload builders a create uses
 * (`*_state` the code, `*_state_name` the readable name).
 *
 * Unlike the request module, this form keeps the API's prefixes
 * (`sender.sender_first_name`), so a 422's field name maps straight onto it.
 */

type Party = "sender" | "receiver";

/** Suffixes of one party — prefixed, they are both the wire key and the form key. */
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
  consignmentId,
  party,
  detail,
  open,
  onOpenChange,
}: {
  consignmentId: number;
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
            consignmentId={consignmentId}
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
  consignmentId,
  party,
  detail,
  onDone,
}: {
  consignmentId: number;
  party: Party;
  detail: ConsignmentDetailResult;
  onDone: () => void;
}) {
  const updateSender = useUpdateConsignmentSender(consignmentId);
  const updateReceiver = useUpdateConsignmentReceiver(consignmentId);
  const busy = updateSender.isPending || updateReceiver.isPending;

  const defaultValues = React.useMemo(
    () => mapDetailToFormValues(detail.consignment, detail.boxes),
    [detail],
  );

  const { control, register, setValue, getValues, clearErrors, setError, formState } =
    useForm<ConsignmentAdminFormInput, unknown, ConsignmentAdminFormValues>({
      defaultValues,
    });

  /** `sender.sender_city` — the prefixed key under its party. */
  const fieldPath = (key: string) =>
    `${party}.${key}` as Path<ConsignmentAdminFormInput>;

  const country = useWatch({ control, name: fieldPath(`${party}_country`) }) as string;
  const state = useWatch({ control, name: fieldPath(`${party}_state`) }) as string;

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
        setFieldError,
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
      updateSender.mutate(toSenderPayload(parsed.data), { onSuccess: onDone, onError });
      return;
    }

    const parsed = receiverSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setFieldError(String(issue.path[0] ?? ""), issue.message);
      }
      return;
    }
    updateReceiver.mutate(toReceiverPayload(parsed.data), { onSuccess: onDone, onError });
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <AddressFields
        party={party}
        control={control}
        register={register}
        setValue={setValue}
        errors={formState.errors}
        countryValue={country ?? ""}
        stateValue={state ?? ""}
        // A state or city from the old country cannot survive the change.
        onCountryChange={() => {
          setValue(fieldPath(`${party}_state`), "");
          setValue(fieldPath(`${party}_state_name`), "");
          setValue(fieldPath(`${party}_city`), "");
        }}
        onStateChange={() => setValue(fieldPath(`${party}_city`), "")}
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
