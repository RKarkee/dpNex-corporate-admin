"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
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
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { useCreateSupportTicket } from "../_hooks/use-create-support-ticket";
import {
  DESCRIPTION_MAX,
  emptyTicketForm,
  SUBJECT_MAX,
  ticketSchema,
  type TicketFormValues,
} from "../schema";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "../types";
import { consignmentFetcher, customerFetcher } from "./lookup-fetchers";

/**
 * Raising a ticket.
 *
 * Subject and description are required; everything else narrows it. The two
 * optional links — a shipment and a customer — are searchable lists rather than
 * free text, because a ticket attached to the wrong consignment id is worse
 * than one attached to none.
 *
 * `corporate_id` is never asked for or sent: the API takes it from the session
 * on the corporate endpoints and refuses to be told otherwise.
 */

export interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
}: CreateTicketDialogProps) {
  const { ticketCategoryOptions, ticketPriorityOptions } = useMetaOptions();
  const createTicket = useCreateSupportTicket();

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: emptyTicketForm(),
    mode: "onSubmit",
  });

  const { errors } = form.formState;

  // `useWatch` rather than `form.watch`: the latter hands back a new function
  // identity on every render, which makes the React Compiler skip this
  // component entirely.
  const consignmentId = useWatch({ control: form.control, name: "consignment_id" });
  const consignmentLabel = useWatch({
    control: form.control,
    name: "consignment_label",
  });
  const customerId = useWatch({ control: form.control, name: "customer_id" });
  const customerLabel = useWatch({ control: form.control, name: "customer_label" });
  const description = useWatch({ control: form.control, name: "description" });

  /*
   * A fresh form each time the dialog opens — otherwise closing a half-written
   * ticket and opening a new one presents the abandoned draft.
   */
  React.useEffect(() => {
    if (open) form.reset(emptyTicketForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createTicket.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      // A 422 is the server disagreeing about a specific field, so it belongs
      // on that field. Anything else has already been toasted by the hook.
      if (!isApiError(error) || !error.fieldErrors) return;

      for (const [key, messages] of Object.entries(error.fieldErrors)) {
        const message = messages?.[0];
        if (!message) continue;
        if (!(key in emptyTicketForm())) continue;

        form.setError(key as keyof TicketFormValues, {
          type: "server",
          message,
        });
      }
    }
  });

  /** `/meta` supplies the wording; the constants keep the picker usable cold. */
  const categoryOptions =
    ticketCategoryOptions.length > 0
      ? ticketCategoryOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))
      : TICKET_CATEGORIES.map((value) => ({ value, label: value }));

  const priorityOptions =
    ticketPriorityOptions.length > 0
      ? ticketPriorityOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))
      : TICKET_PRIORITIES.map((value) => ({ value, label: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Raise a support ticket</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. The ticket is logged against your account
            and you can follow its status here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Subject" required error={errors.subject?.message}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                maxLength={SUBJECT_MAX}
                placeholder="Parcel has not moved since Tuesday"
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={describedBy}
                {...form.register("subject")}
              />
            )}
          </Field>

          <Field
            label="Description"
            required
            error={errors.description?.message}
            // The counter only appears once it could plausibly matter — a
            // permanent "0 / 5000" is noise on a two-line ticket.
            hint={
              description && description.length > DESCRIPTION_MAX - 500
                ? `${description.length} / ${DESCRIPTION_MAX}`
                : "What happened, and what you expected instead"
            }
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                rows={5}
                maxLength={DESCRIPTION_MAX}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={describedBy}
                {...form.register("description")}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" error={errors.category?.message}>
              {({ id }) => (
                <NativeSelect
                  id={id}
                  options={categoryOptions}
                  {...form.register("category")}
                />
              )}
            </Field>

            <Field
              label="Priority"
              error={errors.priority?.message}
              hint="How much it is holding you up"
            >
              {({ id }) => (
                <NativeSelect
                  id={id}
                  options={priorityOptions}
                  {...form.register("priority")}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="About a shipment"
              error={errors.consignment_id?.message}
              hint="Optional — links the ticket to a consignment"
            >
              {() => (
                <AsyncCombobox
                  value={consignmentId}
                  selectedLabel={consignmentLabel || undefined}
                  onChange={(option) => {
                    form.setValue("consignment_id", option.value, {
                      shouldDirty: true,
                    });
                    form.setValue("consignment_label", option.label, {
                      shouldDirty: true,
                    });
                  }}
                  fetchPage={consignmentFetcher}
                  placeholder="None"
                  searchPlaceholder="Search consignments…"
                  emptyText="No consignments found"
                />
              )}
            </Field>

            <Field
              label="For a customer"
              error={errors.customer_id?.message}
              hint="Optional — if this is on behalf of one of your customers"
            >
              {() => (
                <AsyncCombobox
                  value={customerId}
                  selectedLabel={customerLabel || undefined}
                  onChange={(option) => {
                    form.setValue("customer_id", option.value, {
                      shouldDirty: true,
                    });
                    form.setValue("customer_label", option.label, {
                      shouldDirty: true,
                    });
                  }}
                  fetchPage={customerFetcher}
                  placeholder="None"
                  searchPlaceholder="Search customers…"
                  emptyText="No customers found"
                />
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createTicket.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              <Send className="size-4" />
              {createTicket.isPending ? "Raising…" : "Raise ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
