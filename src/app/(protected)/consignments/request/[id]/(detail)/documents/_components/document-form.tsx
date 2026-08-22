"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { metaQuery } from "@/shared/api/services/meta.service";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

import {
  DOCUMENT_TYPE_META_CONTROL,
  DOCUMENT_TYPES,
  documentBackRequired,
  documentRequiresFrontBack,
  documentTypeLabel,
  isDocumentType,
  type DocumentType,
} from "../types";
import { DocumentFileSlot } from "./document-file-slot";

/**
 * The field set for one consignment document.
 *
 * Shared by the draft cards and the edit dialog so the two cannot drift. Fully
 * controlled: the values live in the parent, because a draft list and a dialog
 * both need to own and validate their own state.
 *
 * A standalone copy of the profile tab's form — see `../types.ts`.
 */

export interface DocumentFormValues {
  document_type: DocumentType;
  document_number: string;
  notes: string;
}

export interface DocumentFormProps {
  values: DocumentFormValues;
  onChange: (patch: Partial<DocumentFormValues>) => void;

  file: File | null;
  frontFile: File | null;
  backFile: File | null;
  onFileChange: (
    slot: "file" | "front_file" | "back_file",
    file: File | null,
  ) => void;

  /** Stored scans, when editing. `existingFile` is the front side of a
   *  two-sided document and the only scan of every other type. */
  existingFile?: string | null;
  existingBackFile?: string | null;

  /** Distinguishes the field ids of concurrently mounted drafts. */
  idPrefix?: string;

  disabled?: boolean;
  errors?: Partial<Record<string, string>>;
}

/** Label, control, message — with the required marker inline after the label. */
function Field({
  id,
  label,
  required,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DocumentForm({
  values,
  onChange,
  file,
  frontFile,
  backFile,
  onFileChange,
  existingFile,
  existingBackFile,
  idPrefix = "doc",
  disabled = false,
  errors = {},
}: DocumentFormProps) {
  // `GET /meta` is the real source for these labels; the static union is the
  // fallback while it loads and for any key meta omits.
  const { data: meta } = useQuery(metaQuery);
  const typeOptions = buildTypeOptions(
    meta?.controls?.[DOCUMENT_TYPE_META_CONTROL]?.values,
  );

  const twoSided = documentRequiresFrontBack(values.document_type);
  const backRequired = documentBackRequired(values.document_type);

  const id = (suffix: string) => `${idPrefix}-${suffix}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        id={id("type")}
        label="Document Type"
        required
        error={errors.document_type}
        className="sm:col-span-2"
      >
        <NativeSelect
          id={id("type")}
          options={typeOptions}
          value={values.document_type}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            if (!isDocumentType(next)) return;
            // Changing the type changes which files and dates apply, so the
            // dependent fields are cleared rather than left stale.
            // Only the files are cleared: notes applies to every type here, so
            // carrying it across a type change loses nothing.
            onChange({ document_type: next });
            onFileChange("file", null);
            onFileChange("front_file", null);
            onFileChange("back_file", null);
          }}
        />
      </Field>

      <Field
        id={id("number")}
        label="Document Number"
        required
        error={errors.document_number}
        className="sm:col-span-2"
      >
        <Input
          id={id("number")}
          value={values.document_number}
          disabled={disabled}
          placeholder="Enter document number"
          aria-invalid={Boolean(errors.document_number)}
          aria-describedby={
            errors.document_number ? `${id("number")}-error` : undefined
          }
          onChange={(event) => onChange({ document_number: event.target.value })}
        />
      </Field>

      <Field
        id={id("notes")}
        label="Notes"
        error={errors.notes}
        className="sm:col-span-2"
      >
        <Textarea
          id={id("notes")}
          value={values.notes}
          disabled={disabled}
          rows={3}
          placeholder="Anything worth recording about this document"
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? `${id("notes")}-error` : undefined}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </Field>

      {/* The file mapping in UI terms: for a two-sided document the left slot
          is sent as `file` and the right as `back_file`; for everything else the
          single slot is sent as `file`. See `buildForm`. */}
      {twoSided ? (
        <>
          <DocumentFileSlot
            id={id("front")}
            label="Front Document Side"
            required
            file={frontFile}
            onSelect={(next) => onFileChange("front_file", next)}
            existingReference={existingFile}
            disabled={disabled}
            error={errors.front_file}
          />
          <DocumentFileSlot
            id={id("back")}
            label="Back Document Side"
            required={backRequired}
            hint={backRequired ? undefined : "Optional"}
            file={backFile}
            onSelect={(next) => onFileChange("back_file", next)}
            existingReference={existingBackFile}
            disabled={disabled}
            error={errors.back_file}
          />
        </>
      ) : (
        <div className="sm:col-span-2">
          <DocumentFileSlot
            id={id("file")}
            label="Document File"
            required
            file={file}
            onSelect={(next) => onFileChange("file", next)}
            existingReference={existingFile}
            disabled={disabled}
            error={errors.file}
          />
        </div>
      )}
    </div>
  );
}

/** Meta labels where present, the static union as the floor. */
function buildTypeOptions(
  metaValues: { key: string; label: string }[] | undefined,
): { value: string; label: string }[] {
  const labels = new Map<string, string>();
  for (const entry of metaValues ?? []) {
    if (isDocumentType(entry.key)) labels.set(entry.key, entry.label);
  }

  return DOCUMENT_TYPES.map((value) => ({
    value,
    label: labels.get(value) ?? documentTypeLabel(value),
  }));
}
