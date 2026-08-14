"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { metaQuery } from "@/shared/api/services/meta.service";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useCountryOptions } from "@/shared/hooks/use-location-options";
import { cn } from "@/shared/lib/utils";

import {
  DOCUMENT_TYPES,
  documentTypeLabel,
  isDocumentType,
  kycBackRequired,
  kycRequiresExpiry,
  kycRequiresFrontBack,
  type DocumentType,
} from "../types";
import { KycFileSlot } from "./kyc-file-slot";

/**
 * The field set for one KYC document.
 *
 * Shared by the draft cards and the edit dialog so the two cannot drift — the
 * reference app duplicated this block and had to keep both copies in step.
 *
 * Fully controlled: the values live in the parent, because a draft list and a
 * dialog both need to own and validate their own state.
 *
 * Layout follows the reference: one two-column grid, with the fields that carry
 * long values spanning both columns.
 */

export interface KycDocumentFormValues {
  document_type: DocumentType;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  issued_country: string;
  issued_by: string;
  issued_place: string;
}

export interface KycDocumentFormProps {
  values: KycDocumentFormValues;
  onChange: (patch: Partial<KycDocumentFormValues>) => void;

  file: File | null;
  frontFile: File | null;
  backFile: File | null;
  onFileChange: (slot: "file" | "front_file" | "back_file", file: File | null) => void;

  /** Stored scans, when editing. `existingFile` is the front side of a
   *  two-sided document and the only scan of every other type. */
  existingFile?: string | null;
  existingBackFile?: string | null;

  /** Distinguishes the field ids of concurrently mounted drafts. */
  idPrefix?: string;

  disabled?: boolean;
  /** Field-level messages, keyed by field name. */
  errors?: Partial<Record<string, string>>;
}

/** Label, control, message — the reference's field rhythm, with the required
 *  marker inline after the label text rather than at the end of the row. */
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

export function KycDocumentForm({
  values,
  onChange,
  file,
  frontFile,
  backFile,
  onFileChange,
  existingFile,
  existingBackFile,
  idPrefix = "kyc",
  disabled = false,
  errors = {},
}: KycDocumentFormProps) {
  const { options: countryOptions, loading: countriesLoading } =
    useCountryOptions();

  // `GET /meta` is the real source for these labels; the static union is the
  // fallback while it loads and for any key meta omits.
  const { data: meta } = useQuery(metaQuery);
  const typeOptions = buildTypeOptions(meta?.controls?.kyc_document_type?.values);

  const twoSided = kycRequiresFrontBack(values.document_type);
  const backRequired = kycBackRequired(values.document_type);
  const needsExpiry = kycRequiresExpiry(values.document_type);

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
            onChange({
              document_type: next,
              expiry_date: kycRequiresExpiry(next) ? values.expiry_date : "",
            });
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
          aria-describedby={errors.document_number ? `${id("number")}-error` : undefined}
          onChange={(event) => onChange({ document_number: event.target.value })}
        />
      </Field>

      <Field
        id={id("issue-date")}
        label="Issue Date"
        required
        error={errors.issue_date}
      >
        <Input
          id={id("issue-date")}
          type="date"
          value={values.issue_date}
          disabled={disabled}
          aria-invalid={Boolean(errors.issue_date)}
          aria-describedby={errors.issue_date ? `${id("issue-date")}-error` : undefined}
          onChange={(event) => onChange({ issue_date: event.target.value })}
        />
      </Field>

      {needsExpiry ? (
        <Field
          id={id("expiry-date")}
          label="Expiry Date"
          required
          error={errors.expiry_date}
        >
          <Input
            id={id("expiry-date")}
            type="date"
            value={values.expiry_date}
            disabled={disabled}
            aria-invalid={Boolean(errors.expiry_date)}
            aria-describedby={errors.expiry_date ? `${id("expiry-date")}-error` : undefined}
            onChange={(event) => onChange({ expiry_date: event.target.value })}
          />
        </Field>
      ) : null}

      <Field
        id={id("country")}
        label="Issued Country"
        required
        error={errors.issued_country}
      >
        <Combobox
          options={countryOptions}
          value={values.issued_country}
          onChange={(value) => onChange({ issued_country: value })}
          placeholder={countriesLoading ? "Loading countries…" : "Select country"}
          searchPlaceholder="Search country..."
          allowCustomValue={false}
          disabled={disabled || countriesLoading}
          aria-invalid={Boolean(errors.issued_country)}
        />
      </Field>

      <Field id={id("issued-by")} label="Issued By" error={errors.issued_by}>
        <Input
          id={id("issued-by")}
          value={values.issued_by}
          disabled={disabled}
          placeholder="Issuing authority"
          onChange={(event) => onChange({ issued_by: event.target.value })}
        />
      </Field>

      <Field
        id={id("issued-place")}
        label="Issued Place"
        error={errors.issued_place}
        className="sm:col-span-2"
      >
        <Input
          id={id("issued-place")}
          value={values.issued_place}
          disabled={disabled}
          placeholder="Place of issue"
          onChange={(event) => onChange({ issued_place: event.target.value })}
        />
      </Field>

      {/* The file mapping in UI terms: for a two-sided document the left slot
          is sent as `file` and the right as `back_file`; for everything else the
          single slot is sent as `file`. See `buildForm`. */}
      {twoSided ? (
        <>
          <KycFileSlot
            id={id("front")}
            label="Front Document Side"
            required
            file={frontFile}
            onSelect={(next) => onFileChange("front_file", next)}
            existingReference={existingFile}
            disabled={disabled}
            error={errors.front_file}
          />
          <KycFileSlot
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
          <KycFileSlot
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
