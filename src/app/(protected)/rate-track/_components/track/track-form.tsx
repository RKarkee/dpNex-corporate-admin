"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";
import { FieldShell } from "@/app/(protected)/consignments/request/_components/field-shell";

import type { TrackInput } from "../../types";

/**
 * The tracking lookup form.
 *
 * Type and entry come from `/meta`, which also names each one's default.
 * Until the user touches a select the default is what is used, so nothing has
 * to be copied into state when `/meta` arrives — the override is `null`.
 */
export function TrackForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (input: TrackInput) => void;
}) {
  const meta = useMetaOptions();
  const [trackingNo, setTrackingNo] = React.useState("");
  const [type, setType] = React.useState<string | null>(null);
  const [entry, setEntry] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  const typeValue = type ?? meta.trackingTypeDefault;
  const entryValue = entry ?? meta.trackingEntryDefault;
  const cleaned = trackingNo.trim();
  const missing = touched && cleaned === "";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!cleaned) return;
    onSubmit({
      tracking_no: cleaned,
      type: typeValue || undefined,
      entry: entryValue || undefined,
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <form
        onSubmit={submit}
        noValidate
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] xl:items-end"
      >
        <FieldShell
          className="sm:col-span-2 xl:col-span-1"
          label="Tracking number"
          required
          error={missing ? "Enter a tracking number." : undefined}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              value={trackingNo}
              onChange={(event) => setTrackingNo(event.target.value)}
              placeholder="e.g. R100000107NA"
              autoComplete="off"
              maxLength={60}
              className="h-11 rounded-lg px-3.5"
              aria-invalid={missing || undefined}
              aria-describedby={describedBy}
            />
          )}
        </FieldShell>

        <FieldShell label="Track by">
          {({ id }) => (
            <NativeSelect
              id={id}
              value={typeValue}
              onChange={(event) => setType(event.target.value)}
              options={meta.trackingTypeOptions}
              disabled={meta.trackingTypeOptions.length === 0}
            />
          )}
        </FieldShell>

        <FieldShell label="Entry">
          {({ id }) => (
            <NativeSelect
              id={id}
              value={entryValue}
              onChange={(event) => setEntry(event.target.value)}
              options={meta.trackingEntryOptions}
              disabled={meta.trackingEntryOptions.length === 0}
            />
          )}
        </FieldShell>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-lg px-6 sm:col-span-2 xl:col-span-1 xl:w-auto"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          Track
        </Button>
      </form>
    </Card>
  );
}
