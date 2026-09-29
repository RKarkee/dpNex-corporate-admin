"use client";

import * as React from "react";
import { Download, Loader2, Tag } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDateTime } from "@/shared/lib/dates";

import {
  useLabelFile,
  useLabelOptions,
  useLabelState,
  useProduceLabel,
} from "../../../../_hooks/use-labels";
import { formatFileSize } from "../../../../_lib/download-file";
import type { ConsignmentRequestDetail, LabelOption } from "../../../../types";
import { LabelOptionRow } from "./label-option-row";

/** Stable key for an option — its type plus the carrier's label id, if any. */
const optionKey = (option: LabelOption) => `${option.type}-${option.label_api_id ?? "own"}`;

/**
 * Labels — one row per entry in `label/options`, exactly as the API returns
 * them: our INTERNAL label always, a carrier (INTEGRATOR_API) label only when
 * the request has one. Nothing is added or assumed on this side.
 *
 * - Before a label exists each row offers **Generate**; after, **Regenerate**,
 *   confirmed first — the previous version keeps its file.
 * - The header shows the current version with **Download label**.
 *
 * No permission gate: none is published for labels, so the API decides.
 */
export function LabelOptionsSection({ request }: { request: ConsignmentRequestDetail }) {
  const trackingId = request.request_tracking_id;

  const options = useLabelOptions(request.id);
  const { currentVersion, current, isGenerated } = useLabelState(request);
  const produce = useProduceLabel(request.id, trackingId);
  const file = useLabelFile(trackingId);

  const [confirming, setConfirming] = React.useState<LabelOption | null>(null);

  const labelOptions = options.data ?? request.label_options ?? [];
  const producingKey =
    produce.isPending && produce.variables ? optionKey(produce.variables.option) : null;

  const onProduce = (option: LabelOption) => {
    if (isGenerated) setConfirming(option);
    else produce.mutate({ option, regenerate: false });
  };

  const downloading = current !== undefined && file.busyId === current.id;

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Tag className="size-4 text-primary" aria-hidden />
            Labels
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {currentVersion
              ? `Current: v${currentVersion.version} · ${currentVersion.file_name || "label"} · ${formatFileSize(
                  currentVersion.file_size,
                )} · ${formatDateTime(currentVersion.generated_at ?? currentVersion.created_at)}`
              : isGenerated
                ? "A label has been generated."
                : "No label generated yet."}
          </p>
        </div>

        {isGenerated ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => current && file.download(current)}
            disabled={!current || downloading}
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            Download label
          </Button>
        ) : null}
      </div>

      {options.isPending && labelOptions.length === 0 ? (
        <Skeleton className="h-14 w-full" />
      ) : options.isError && labelOptions.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="text-destructive">Could not load the label options.</p>
          <Button size="sm" variant="outline" onClick={() => void options.refetch()}>
            Retry
          </Button>
        </div>
      ) : labelOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No labels can be produced for this request.</p>
      ) : (
        <div className="space-y-2">
          {labelOptions.map((option) => (
            <LabelOptionRow
              key={optionKey(option)}
              option={option}
              isGenerated={isGenerated}
              loading={producingKey === optionKey(option)}
              disabled={produce.isPending}
              onProduce={onProduce}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        tone="default"
        title={`Regenerate ${confirming ? confirming.button_label || confirming.label : "label"}?`}
        description={
          <>
            A new version will be produced and become the current label.
            {currentVersion
              ? ` Version ${currentVersion.version} keeps its file and stays in the history.`
              : ""}
          </>
        }
        confirmLabel="Regenerate"
        onConfirm={() =>
          confirming ? produce.mutateAsync({ option: confirming, regenerate: true }) : undefined
        }
      />
    </Card>
  );
}
