"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";

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
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { useApprovalPermissions } from "../_hooks/use-approval-permissions";
import { useCreateApprovalRequest } from "../_hooks/use-create-approval-request";
import {
  approvalRequestSchema,
  emptyApprovalForm,
  REASON_MAX,
  type ApprovalFormValues,
} from "../schema";
import { DEFAULT_APPROVAL_TYPE, type ApprovalType } from "../types";
import { CreditLimitFields } from "./fields/credit-limit-fields";
import { DiscountFields } from "./fields/discount-fields";
import { InfoUpdateFields } from "./fields/info-update-fields";

/**
 * Raising a request.
 *
 * One dialog for all four types: the type is chosen first and the fieldset
 * below it swaps. They are different enough to justify four forms and similar
 * enough that four would drift — same reason, same submit, same error
 * handling, and the type is the only thing that decides what the payload holds.
 *
 * Switching type resets the type-specific fields but keeps the reason, because
 * the reason is about the situation rather than the mechanism, and retyping it
 * after realising you picked the wrong type is pure friction.
 */

export interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** `payload.credit_limit` → `credit_limit`; `payload.pan` → `info.pan`. */
function formFieldFor(
  key: string,
  type: ApprovalType,
): keyof ApprovalFormValues | `info.${string}` | null {
  const name = key.startsWith("payload.") ? key.slice("payload.".length) : key;

  if (name === "type" || name === "reason" || name === "subject_id") {
    return name;
  }
  if (name === "credit_limit" || name === "discount_type" || name === "discount_value") {
    return name;
  }
  if (type === "CORPORATE_INFO_UPDATE" || type === "PROFILE_UPDATE") {
    return `info.${name}`;
  }

  return null;
}

export function CreateRequestDialog({
  open,
  onOpenChange,
}: CreateRequestDialogProps) {
  const { approvalTypeOptions } = useMetaOptions();
  const { allowedTypes } = useApprovalPermissions();
  const createRequest = useCreateApprovalRequest();

  /*
   * The picker only offers what this user may actually raise.
   *
   * Approvals are granted per type — `request_discounts` and the other three —
   * so someone who may only ask for discounts gets a one-option picker rather
   * than four options and a 403 behind three of them. The first allowed type
   * is the form's starting point, since the API's own default may be one they
   * do not hold.
   */
  const initialType: ApprovalType = allowedTypes[0] ?? DEFAULT_APPROVAL_TYPE;

  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalRequestSchema),
    defaultValues: emptyApprovalForm(initialType),
    mode: "onSubmit",
  });

  /*
   * `useWatch` rather than `form.watch`: the latter returns a fresh function
   * identity on every render, which makes the React Compiler skip memoising
   * this whole component. Subscribing to the one field is also less work.
   */
  const type = useWatch({ control: form.control, name: "type" });

  /*
   * A fresh form each time the dialog opens.
   *
   * Without this, closing a half-filled request and opening a new one would
   * present the abandoned draft — including validation errors against fields
   * the new type does not have.
   */
  React.useEffect(() => {
    if (open) form.reset(emptyApprovalForm(initialType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changeType = (next: string) => {
    const chosen = allowedTypes.includes(next as ApprovalType)
      ? (next as ApprovalType)
      : initialType;

    form.reset({ ...emptyApprovalForm(chosen), reason: form.getValues("reason") });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createRequest.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      // A 422 is the server disagreeing about a specific field, so it belongs
      // on that field. Anything else has already been toasted by the hook.
      if (!isApiError(error) || !error.fieldErrors) return;

      for (const [key, messages] of Object.entries(error.fieldErrors)) {
        const field = formFieldFor(key, values.type);
        const message = messages?.[0];
        if (!field || !message) continue;

        form.setError(field as keyof ApprovalFormValues, {
          type: "server",
          message,
        });
      }
    }
  });

  const metaLabels = new Map(
    approvalTypeOptions.map((option) => [option.value, option.label]),
  );

  // `/meta` supplies the wording; the permission set supplies the entries. A
  // cold first paint falls back to the key, so the picker is never empty for
  // someone who does hold a grant.
  const typeOptions = allowedTypes.map((value) => ({
    value,
    label: metaLabels.get(value) ?? value,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New approval request</DialogTitle>
          <DialogDescription>
            Ask for a change to your account. It stays pending until someone
            reviews it, and you can withdraw it before then.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="approval-request-type"
              className="text-sm font-medium text-foreground"
            >
              What are you asking for?
            </label>
            <NativeSelect
              id="approval-request-type"
              value={type}
              options={typeOptions}
              onChange={(event) => changeType(event.target.value)}
            />
          </div>

          {type === "CREDIT_LIMIT_INCREASE" ? (
            <CreditLimitFields form={form} />
          ) : null}
          {type === "DISCOUNT" ? <DiscountFields form={form} /> : null}
          {type === "CORPORATE_INFO_UPDATE" || type === "PROFILE_UPDATE" ? (
            <InfoUpdateFields form={form} type={type} />
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="approval-request-reason"
              className="text-sm font-medium text-foreground"
            >
              Reason
            </label>
            <Textarea
              id="approval-request-reason"
              rows={3}
              maxLength={REASON_MAX}
              placeholder="Peak season volume increase"
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register("reason")}
            />
            {/* Optional on the API, but it is the only context the reviewer
                gets — the copy says so rather than marking it required. */}
            <p className="text-xs text-muted-foreground">
              {form.formState.errors.reason?.message ??
                "Shown to whoever reviews this. Optional, but it is what they decide on."}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createRequest.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRequest.isPending}>
              <Send className="size-4" />
              {createRequest.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
