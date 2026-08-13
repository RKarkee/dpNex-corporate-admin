"use client";

import * as React from "react";
import { Save } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useFileUrl } from "@/shared/hooks/use-file-url";

import { useSaveKycDocument } from "../_hooks/use-kyc-documents";
import { missingKycFiles } from "../services/kyc.service";
import {
  documentTypeLabel,
  kycRequiresFrontBack,
  type KycDocument,
} from "../types";
import {
  KycDocumentForm,
  type KycDocumentFormValues,
} from "./kyc-document-form";
import { KycStatusBadge } from "./kyc-status-badge";
import {
  kycErrorsFromResponse,
  validateKycValues,
  withoutField,
} from "./kyc-validation";

/* -------------------------------------------------------------------------- */
/* View                                                                       */
/* -------------------------------------------------------------------------- */

export function KycViewDialog({
  document: doc,
  open,
  onOpenChange,
}: {
  document: KycDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {doc ? documentTypeLabel(doc.document_type) : "Document"}
          </DialogTitle>
          <DialogDescription>
            {doc ? `Document number ${doc.document_number}` : null}
          </DialogDescription>
        </DialogHeader>

        {doc ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <KycStatusBadge status={doc.status} />
            </div>

            {doc.remarks ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  Reviewer note
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {doc.remarks}
                </p>
              </div>
            ) : null}

            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Issued country" value={doc.issued_country} />
              <Detail label="Issue date" value={doc.issue_date} />
              <Detail label="Expiry date" value={doc.expiry_date} />
              <Detail label="Issued by" value={doc.issued_by} />
              <Detail label="Issued place" value={doc.issued_place} />
            </dl>

            <div className="grid gap-4 sm:grid-cols-2">
              <StoredScan
                label={
                  kycRequiresFrontBack(doc.document_type)
                    ? "Front side"
                    : "Document"
                }
                reference={doc.file_path}
              />
              {kycRequiresFrontBack(doc.document_type) ? (
                <StoredScan label="Back side" reference={doc.back_file_path} />
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value?.trim() || "—"}</dd>
    </div>
  );
}

/** A stored scan, resolved through the authenticated file endpoint. */
function StoredScan({
  label,
  reference,
}: {
  label: string;
  reference?: string | null;
}) {
  const { src, isLoading } = useFileUrl(reference);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="grid h-48 place-items-center overflow-hidden rounded-lg border border-border bg-secondary/40">
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : src ? (
          <img
            src={src}
            alt={`${label} scan`}
            className="size-full object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Not available</span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit                                                                       */
/* -------------------------------------------------------------------------- */

function toFormValues(doc: KycDocument): KycDocumentFormValues {
  return {
    document_type: doc.document_type,
    document_number: doc.document_number,
    issue_date: doc.issue_date,
    expiry_date: doc.expiry_date ?? "",
    issued_country: doc.issued_country,
    issued_by: doc.issued_by ?? "",
    issued_place: doc.issued_place ?? "",
  };
}

export function KycEditDialog({
  document: doc,
  open,
  onOpenChange,
}: {
  document: KycDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            {doc ? documentTypeLabel(doc.document_type) : null}
          </DialogDescription>
        </DialogHeader>

        {/* Keyed by id so opening a different document remounts the body with
            fresh state. An effect that reset the fields would run a render
            late, briefly showing the previous document's values. */}
        {doc ? (
          <KycEditForm key={doc.id} document={doc} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function KycEditForm({
  document: doc,
  onDone,
}: {
  document: KycDocument;
  onDone: () => void;
}) {
  const saveDocument = useSaveKycDocument();

  // Seeded once, at mount — the parent's `key` guarantees a new document gets
  // a new instance rather than a stale one patched by an effect.
  const [values, setValues] = React.useState<KycDocumentFormValues>(() =>
    toFormValues(doc),
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [frontFile, setFrontFile] = React.useState<File | null>(null);
  const [backFile, setBackFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function handleFileChange(
    slot: "file" | "front_file" | "back_file",
    next: File | null,
  ) {
    if (slot === "file") setFile(next);
    if (slot === "front_file") setFrontFile(next);
    if (slot === "back_file") setBackFile(next);
    // Picking a different scan answers whatever the last save said about this
    // slot, so the stale message goes with it.
    setErrors((current) => withoutField(current, slot));
  }

  const selection = { file, front_file: frontFile, back_file: backFile };

  // The same guard the service enforces, read here so the button can be
  // disabled before the user fills anything in — the requirement is visible on
  // open rather than sprung at submit.
  const blocked = missingKycFiles(values.document_type, selection).length > 0;
  const twoSided = kycRequiresFrontBack(values.document_type);

  function handleSave() {
    const problems = validateKycValues(values, selection);
    setErrors(problems);
    if (Object.keys(problems).length) return;

    saveDocument.mutate(
      {
        id: doc.id,
        input: {
          document_type: values.document_type,
          document_number: values.document_number,
          issue_date: values.issue_date,
          expiry_date: values.expiry_date || undefined,
          issued_country: values.issued_country,
          issued_by: values.issued_by || undefined,
          issued_place: values.issued_place || undefined,
        },
        selection,
      },
      {
        onSuccess: onDone,
        // The dialog stays open on failure so the message sits next to the
        // input that has to change.
        onError: (error) =>
          setErrors(kycErrorsFromResponse(error, values.document_type)),
      },
    );
  }

  return (
    <>
      {/* Stated up front, not on failure. The stored scans cannot be carried
          over because the API's preservation behaviour is unverified. */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-sm font-medium text-foreground">Re-upload required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {twoSided
            ? "Saving this document re-sends both scans, so the front and back must be selected again"
            : "Saving this document re-sends its scan, so the file must be selected again"}
          {" — even if only a text field changed."}
        </p>
      </div>

      <KycDocumentForm
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        file={file}
        frontFile={frontFile}
        backFile={backFile}
        onFileChange={handleFileChange}
        existingFile={doc.file_path}
        existingBackFile={doc.back_file_path}
        reuploadRequired
        disabled={saveDocument.isPending}
        errors={errors}
      />

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onDone}
          disabled={saveDocument.isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saveDocument.isPending || blocked}>
          <Save className="size-4" aria-hidden />
          {saveDocument.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
