"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Coins, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { FieldShell } from "../../../../_components/field-shell";
import { reportApiError } from "../../../../_components/report-api-error";
import {
  useConsignmentCharge,
  useSaveConsignmentCharge,
} from "../_hooks/use-consignment-charges";
import type { ConsignmentCharge } from "../types";

/**
 * Add or edit one charge, in a modal.
 *
 * Quantity, rate and amount are held and sent as strings — the API's own
 * contract — while the inputs are numeric so the keyboard and validation fit.
 */

const numeric = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number.isFinite(Number(value)), `${label} must be a number`);

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "At most 255 characters"),
  description: z.string().max(255, "At most 255 characters"),
  quantity: numeric("Quantity"),
  quantity_code: z.string().min(1, "Unit is required"),
  rate: numeric("Rate"),
  amount: numeric("Amount"),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "description", "quantity", "quantity_code", "rate", "amount"] as const;

const EMPTY: FormValues = {
  name: "",
  description: "",
  quantity: "",
  quantity_code: "",
  rate: "",
  amount: "",
};

export function ChargeFormDialog({
  requestId,
  charge: row,
  open,
  onOpenChange,
}: {
  requestId: string;
  /** Absent for a create. */
  charge: ConsignmentCharge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(row);
  const detail = useConsignmentCharge(requestId, open ? row?.id : undefined, row ?? undefined);
  const record = detail.data ?? row;

  // Held back until the fresh read settles, so the form is never seeded from a
  // list row and then rewritten a render later.
  const ready = !isEdit || (Boolean(record) && !detail.isPending);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-primary" aria-hidden />
            {isEdit ? "Edit charge" : "Add charge"}
          </DialogTitle>
          <DialogDescription>A cost line on this consignment request.</DialogDescription>
        </DialogHeader>

        {!open ? null : ready ? (
          <ChargeForm
            key={record?.id ?? "create"}
            requestId={requestId}
            record={record ?? null}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChargeForm({
  requestId,
  record,
  onDone,
}: {
  requestId: string;
  record: ConsignmentCharge | null;
  onDone: () => void;
}) {
  const { quantityCodeOptions, isPending: loadingMeta } = useMetaOptions();
  const save = useSaveConsignmentCharge(requestId);

  const { control, register, handleSubmit, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: record
      ? {
          name: record.name,
          description: record.description ?? "",
          quantity: record.quantity,
          quantity_code: record.quantity_code,
          rate: record.rate,
          amount: record.amount,
        }
      : EMPTY,
  });

  const onSubmit = (values: FormValues) => {
    save.mutate(
      { id: record?.id, input: values },
      {
        onSuccess: onDone,
        onError: (error) =>
          reportApiError(
            error,
            FIELDS,
            (field, message) => setError(field, { message }),
            "Could not save charge",
          ),
      },
    );
  };

  const errors = formState.errors;
  const busy = save.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FieldShell label="Name" required error={errors.name?.message}>
        {({ id }) => (
          <Input
            id={id}
            maxLength={255}
            placeholder="Freight"
            disabled={busy}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
        )}
      </FieldShell>

      <FieldShell label="Description" hint="Optional" error={errors.description?.message}>
        {({ id }) => (
          <Textarea
            id={id}
            rows={2}
            maxLength={255}
            placeholder="What this charge covers"
            disabled={busy}
            {...register("description")}
          />
        )}
      </FieldShell>

      <div className="grid gap-5 sm:grid-cols-2">
        <FieldShell label="Quantity" required error={errors.quantity?.message}>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              step="any"
              placeholder="1"
              disabled={busy}
              aria-invalid={Boolean(errors.quantity)}
              {...register("quantity")}
            />
          )}
        </FieldShell>

        <FieldShell label="Unit" required error={errors.quantity_code?.message}>
          {() => (
            <Controller
              control={control}
              name="quantity_code"
              render={({ field }) => (
                <Combobox
                  options={quantityCodeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={loadingMeta ? "Loading units…" : "Select a unit"}
                  searchPlaceholder="Search units…"
                  disabled={busy || loadingMeta}
                  aria-invalid={Boolean(errors.quantity_code)}
                />
              )}
            />
          )}
        </FieldShell>

        <FieldShell label="Rate" required error={errors.rate?.message}>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              step="any"
              placeholder="25.00"
              disabled={busy}
              aria-invalid={Boolean(errors.rate)}
              {...register("rate")}
            />
          )}
        </FieldShell>

        <FieldShell label="Amount" required error={errors.amount?.message}>
          {({ id }) => (
            <Input
              id={id}
              type="number"
              step="any"
              placeholder="25.00"
              disabled={busy}
              aria-invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
          )}
        </FieldShell>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {record ? "Save changes" : "Add charge"}
        </Button>
      </DialogFooter>
    </form>
  );
}
