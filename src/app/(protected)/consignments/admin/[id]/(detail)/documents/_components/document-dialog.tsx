"use client";

import * as React from "react";
import { FileText, Maximize2, Save, ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFileUrl } from "@/shared/hooks/use-file-url";
import { cn } from "@/shared/lib/utils";

import {
  useConsignmentDocument,
  useSaveConsignmentDocument,
} from "../_hooks/use-consignment-documents";
import type { DocumentFileSlot } from "../services/documents.service";
import {
  documentRequiresFrontBack,
  documentTypeLabel,
  type ConsignmentDocument,
} from "../types";
import { DocumentForm, type DocumentFormValues } from "./document-form";
import { DocumentStatusBadge } from "./document-status-badge";
import {
  documentErrorsFromResponse,
  validateDocumentTextValues,
  withoutField,
} from "./document-validation";

/**
 * View and edit, over one consignment document.
 *
 * Both dialogs re-read the record on open rather than trusting the list row: a
 * paginated list response may omit `file_path` / `back_file_path`, and the edit
 * form needs both to preview the stored scans and to re-send them.
 */

/* -------------------------------------------------------------------------- */
/* View                                                                       */
/* -------------------------------------------------------------------------- */

export function DocumentViewDialog({
  consignmentId,
  document: row,
  open,
  onOpenChange,
}: {
  consignmentId: string;
  document: ConsignmentDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useConsignmentDocument(consignmentId, row?.id, row ?? undefined);
  const doc = (detail.data as ConsignmentDocument | undefined) ?? row;

  /**
   * The scan being previewed full size, if any.
   *
   * Held here rather than inside `StoredScan` so only one preview can be open
   * at a time, and so the resolved `src` is passed up instead of resolved a
   * second time.
   */
  const [preview, setPreview] = React.useState<{
    label: string;
    src: string;
  } | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" aria-hidden />
            Document Details
          </DialogTitle>
          <DialogDescription>
            {doc
              ? `${documentTypeLabel(doc.document_type)} · #${doc.document_number}`
              : null}
          </DialogDescription>
        </DialogHeader>

        {doc ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <DocumentStatusBadge status={doc.status} />
            </div>

            {/* `file_path` is the front side of a two-sided document and the
                only scan of everything else — the label says which. */}
            <div
              className={cn(
                "grid gap-3",
                documentRequiresFrontBack(doc.document_type) && "grid-cols-2",
              )}
            >
              <StoredScan
                label={
                  documentRequiresFrontBack(doc.document_type)
                    ? "Front"
                    : "Document"
                }
                reference={doc.file_path}
                onPreview={setPreview}
              />
              {documentRequiresFrontBack(doc.document_type) ? (
                <StoredScan
                  label="Back"
                  reference={doc.back_file_path}
                  onPreview={setPreview}
                />
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <Detail
                label="Type"
                value={documentTypeLabel(doc.document_type)}
              />
              <Detail label="Number" value={doc.document_number} />
              <div className="col-span-2">
                {/* `whitespace-pre-line`: notes are authored in a textarea, so
                    the user's line breaks are part of what they wrote. */}
                <Detail
                  label="Notes"
                  value={doc.notes}
                  className="whitespace-pre-line"
                />
              </div>
            </dl>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Nested inside the details dialog on purpose: closing the preview
          returns the user to the details they opened it from, rather than
          dropping them back to the card grid. */}
      <ScanPreviewDialog scan={preview} onClose={() => setPreview(null)} />
    </Dialog>
  );
}

/**
 * A single scan, as large as the viewport allows.
 *
 * Its own dialog rather than a new browser tab: the resolved value is a `data:`
 * URL, and top-level navigation to one is blocked in every modern browser, so
 * the tab would open blank.
 */
function ScanPreviewDialog({
  scan,
  onClose,
}: {
  scan: { label: string; src: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(scan)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="size-5 text-primary" aria-hidden />
            {scan?.label ?? "Scan"}
          </DialogTitle>
          <DialogDescription>
            Pinch or use your browser zoom for finer detail.
          </DialogDescription>
        </DialogHeader>

        {scan ? (
          <div className="grid max-h-[70vh] place-items-center overflow-auto rounded-xl border border-border bg-secondary/40">
            <img
              src={scan.src}
              alt={`${scan.label} scan, full size`}
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", className)}>
        {value?.trim() || "—"}
      </dd>
    </div>
  );
}

/**
 * A stored scan inside the details dialog, and the trigger for its full-size
 * preview.
 *
 * The tile is only a button once the image has resolved — there is nothing to
 * enlarge while it is loading or after it has failed.
 */
function StoredScan({
  label,
  reference,
  onPreview,
}: {
  label: string;
  reference?: string | null;
  onPreview: (scan: { label: string; src: string }) => void;
}) {
  const { src, isLoading } = useFileUrl(reference);

  const frame =
    "relative grid h-48 w-full place-items-center overflow-hidden rounded-xl border border-border bg-secondary/40";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      {src ? (
        <button
          type="button"
          onClick={() => onPreview({ label, src })}
          title={`Preview the ${label.toLowerCase()} scan`}
          className={cn(frame, "group cursor-pointer")}
        >
          <img
            src={src}
            alt={`${label} scan`}
            className="size-full object-contain"
          />

          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-md">
              <Maximize2 className="size-3.5" aria-hidden />
              Preview
            </span>
          </span>

          <span className="sr-only">Preview the {label.toLowerCase()} scan</span>
        </button>
      ) : (
        <div className={frame}>
          {isLoading ? (
            <Skeleton className="size-full" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="size-8" aria-hidden />
              <span className="text-xs">
                {reference ? "Preview unavailable" : "Not added"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit                                                                       */
/* -------------------------------------------------------------------------- */

function toFormValues(doc: ConsignmentDocument): DocumentFormValues {
  return {
    document_type: doc.document_type,
    document_number: doc.document_number,
    notes: doc.notes ?? "",
  };
}

export function DocumentEditDialog({
  consignmentId,
  document: row,
  open,
  onOpenChange,
}: {
  consignmentId: string;
  document: ConsignmentDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useConsignmentDocument(consignmentId, row?.id, row ?? undefined);
  const doc = (detail.data as ConsignmentDocument | undefined) ?? row;

  // The list row carries no file references on some responses, so the form is
  // held back until the detail read settles rather than seeding previews that
  // would pop in a moment later.
  const ready = Boolean(doc) && !detail.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            Update Document
          </DialogTitle>
          <DialogDescription>
            {doc ? documentTypeLabel(doc.document_type) : null}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed by id so opening a different document remounts the body with
            fresh state. An effect that reset the fields would run a render
            late, briefly showing the previous document's values. */}
        {doc && ready ? (
          <DocumentEditForm
            key={doc.id}
            consignmentId={consignmentId}
            document={doc}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocumentEditForm({
  consignmentId,
  document: doc,
  onDone,
}: {
  consignmentId: string;
  document: ConsignmentDocument;
  onDone: () => void;
}) {
  const saveDocument = useSaveConsignmentDocument(consignmentId);

  // Seeded once, at mount — the parent's `key` guarantees a new document gets
  // a new instance rather than a stale one patched by an effect.
  const [values, setValues] = React.useState<DocumentFormValues>(() =>
    toFormValues(doc),
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [frontFile, setFrontFile] = React.useState<File | null>(null);
  const [backFile, setBackFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  /**
   * Slots the user has cleared in this dialog.
   *
   * A cleared slot must not silently fall back to the stored scan — the user
   * pressed clear precisely because that one is wrong. So it is excluded from
   * hydration and its stored reference is hidden, turning the slot back into an
   * empty dropzone.
   *
   * Nothing is destroyed by clearing on its own: closing the dialog discards
   * this set, and the record is only rewritten on save.
   */
  const [cleared, setCleared] = React.useState<Set<DocumentFileSlot>>(
    () => new Set(),
  );

  function handleFileChange(slot: DocumentFileSlot, next: File | null) {
    if (slot === "file") setFile(next);
    if (slot === "front_file") setFrontFile(next);
    if (slot === "back_file") setBackFile(next);

    setCleared((current) => {
      const updated = new Set(current);
      // Picking a file answers the clear; clearing one re-opens it.
      if (next) updated.delete(slot);
      else updated.add(slot);
      return updated;
    });

    setErrors((current) => withoutField(current, slot));
  }

  const twoSided = documentRequiresFrontBack(values.document_type);
  const frontSlot: DocumentFileSlot = twoSided ? "front_file" : "file";

  /** What the save may fall back on. A cleared slot contributes nothing. */
  const stored = {
    file_path: cleared.has(frontSlot) ? null : doc.file_path,
    back_file_path: cleared.has("back_file") ? null : doc.back_file_path,
  };

  function handleSave() {
    // Files are not validated here: any slot left alone is re-sent from the
    // stored record, so an empty input is not a failure. The service checks the
    // hydrated selection, which is the only point where a truly missing scan is
    // knowable.
    const problems = validateDocumentTextValues(values);
    setErrors(problems);
    if (Object.keys(problems).length) return;

    saveDocument.mutate(
      {
        id: doc.id,
        input: {
          document_type: values.document_type,
          document_number: values.document_number,
          notes: values.notes || undefined,
        },
        selection: { file, front_file: frontFile, back_file: backFile },
        stored,
      },
      {
        onSuccess: onDone,
        // The dialog stays open on failure so the message sits next to the
        // input that has to change.
        onError: (error) =>
          setErrors(documentErrorsFromResponse(error, values.document_type)),
      },
    );
  }

  return (
    <>
      <DocumentForm
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        file={file}
        frontFile={frontFile}
        backFile={backFile}
        onFileChange={handleFileChange}
        existingFile={stored.file_path}
        existingBackFile={stored.back_file_path}
        idPrefix={`doc-edit-${doc.id}`}
        disabled={saveDocument.isPending}
        errors={errors}
      />

      <p className="text-xs text-muted-foreground">
        Scans you leave untouched are kept as they are — you only need to choose
        a file for a side you want to replace.
      </p>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onDone}
          disabled={saveDocument.isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saveDocument.isPending}>
          <Save className="size-4" aria-hidden />
          {saveDocument.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
