"use client";

import { useQuery } from "@tanstack/react-query";

import {
  FieldGroup,
  FieldShell,
} from "@/app/(protected)/consignments/request/_components/field-shell";
import { metaQuery } from "@/shared/api/services/meta.service";
import { Combobox } from "@/shared/components/ui/combobox";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useCountryOptions } from "@/shared/hooks/use-location-options";

import {
  DOCUMENT_TYPES,
  documentTypeLabel,
  isDocumentType,
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

  /** Stored scans, when editing. */
  existingFile?: string | null;
  existingBackFile?: string | null;
  /** True in edit mode: stored scans do not satisfy the save. */
  reuploadRequired?: boolean;

  disabled?: boolean;
  /** Field-level messages, keyed by field name. */
  errors?: Partial<Record<string, string>>;
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
  reuploadRequired = false,
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
  const needsExpiry = kycRequiresExpiry(values.document_type);

  return (
    <div className="space-y-5">
      <FieldGroup title="Document details">
        <FieldShell label="Document type" required error={errors.document_type}>
          {({ id }) => (
            <NativeSelect
              id={id}
              options={typeOptions}
              value={values.document_type}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.value;
                if (!isDocumentType(next)) return;
                // Changing the type changes which files and dates apply, so
                // the dependent fields are cleared rather than left stale.
                onChange({
                  document_type: next,
                  expiry_date: kycRequiresExpiry(next) ? values.expiry_date : "",
                });
                onFileChange("file", null);
                onFileChange("front_file", null);
                onFileChange("back_file", null);
              }}
            />
          )}
        </FieldShell>

        <FieldShell
          label="Document number"
          required
          error={errors.document_number}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              value={values.document_number}
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={Boolean(errors.document_number)}
              onChange={(event) =>
                onChange({ document_number: event.target.value })
              }
            />
          )}
        </FieldShell>

        <FieldShell label="Issued country" required error={errors.issued_country}>
          {() => (
            <Combobox
              options={countryOptions}
              value={values.issued_country}
              onChange={(value) => onChange({ issued_country: value })}
              placeholder={
                countriesLoading ? "Loading countries…" : "Select country"
              }
              searchPlaceholder="Search countries…"
              allowCustomValue={false}
              disabled={disabled || countriesLoading}
              aria-invalid={Boolean(errors.issued_country)}
            />
          )}
        </FieldShell>

        <FieldShell label="Issue date" required error={errors.issue_date}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="date"
              value={values.issue_date}
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={Boolean(errors.issue_date)}
              onChange={(event) => onChange({ issue_date: event.target.value })}
            />
          )}
        </FieldShell>

        {needsExpiry ? (
          <FieldShell label="Expiry date" required error={errors.expiry_date}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="date"
                value={values.expiry_date}
                disabled={disabled}
                aria-describedby={describedBy}
                aria-invalid={Boolean(errors.expiry_date)}
                onChange={(event) =>
                  onChange({ expiry_date: event.target.value })
                }
              />
            )}
          </FieldShell>
        ) : null}

        <FieldShell label="Issued by" error={errors.issued_by}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              value={values.issued_by}
              disabled={disabled}
              aria-describedby={describedBy}
              placeholder="Issuing authority"
              onChange={(event) => onChange({ issued_by: event.target.value })}
            />
          )}
        </FieldShell>

        <FieldShell label="Issued place" error={errors.issued_place}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              value={values.issued_place}
              disabled={disabled}
              aria-describedby={describedBy}
              onChange={(event) => onChange({ issued_place: event.target.value })}
            />
          )}
        </FieldShell>
      </FieldGroup>

      <FieldGroup
        title={twoSided ? "Document scans" : "Document scan"}
        description={
          twoSided
            ? "A citizenship certificate is stored as two separate sides."
            : undefined
        }
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2"
      >
        {twoSided ? (
          <>
            <KycFileSlot
              label="Front side"
              file={frontFile}
              onSelect={(next) => onFileChange("front_file", next)}
              existingReference={existingFile}
              reuploadRequired={reuploadRequired}
              disabled={disabled}
              error={errors.front_file}
            />
            <KycFileSlot
              label="Back side"
              file={backFile}
              onSelect={(next) => onFileChange("back_file", next)}
              existingReference={existingBackFile}
              reuploadRequired={reuploadRequired}
              disabled={disabled}
              error={errors.back_file}
            />
          </>
        ) : (
          <KycFileSlot
            label="Document file"
            file={file}
            onSelect={(next) => onFileChange("file", next)}
            existingReference={existingFile}
            reuploadRequired={reuploadRequired}
            disabled={disabled}
            error={errors.file}
          />
        )}
      </FieldGroup>
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
