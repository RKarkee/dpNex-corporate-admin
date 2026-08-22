import { isApiError } from "@/shared/api/errors";

import {
  missingDocumentFiles,
  type DocumentFileSelection,
  type DocumentFileSlot,
} from "../services/documents.service";
import { documentRequiresFrontBack, type DocumentType } from "../types";

import type { DocumentFormValues } from "./document-form";

/**
 * Client-side checks for one consignment document.
 *
 * Hand-written rather than zod: the drafts list holds a dynamic array of values
 * plus `File` objects, which a resolver would have to be bent around for no
 * gain.
 *
 * Returns a map of field name → message, empty when the document is valid. The
 * file rules delegate to `missingDocumentFiles` so the form, the dialog and the
 * service all read the same rule.
 */
export function validateDocumentValues(
  values: DocumentFormValues,
  selection: DocumentFileSelection,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.document_number.trim()) {
    errors.document_number = "Document number is required.";
  }

  /**
   * Only the number and the scans are checked.
   *
   * `notes` is free text, and there are no dates left on a consignment document
   * to validate or cross-check. The type comes from a select seeded with a
   * closed union, so an invalid one cannot be typed in.
   */

  for (const slot of missingDocumentFiles(values.document_type, selection)) {
    errors[slot] =
      slot === "back_file"
        ? "The back side is required."
        : slot === "front_file"
          ? "The front side is required."
          : "A document file is required.";
  }

  return errors;
}

/**
 * The same checks, minus the file rules.
 *
 * Used when editing: the stored scans are re-sent for any slot the user left
 * alone (`hydrateSelection`), so an empty slot is not a validation failure and
 * flagging it would block a save that is about to succeed. The service still
 * runs `missingDocumentFiles` against the hydrated selection.
 */
export function validateDocumentTextValues(
  values: DocumentFormValues,
): Record<string, string> {
  const errors = validateDocumentValues(values, {});

  for (const slot of ["file", "front_file", "back_file"]) {
    delete errors[slot];
  }

  return errors;
}

/** The same map without one field — a message the user has just acted on. */
export function withoutField(
  errors: Record<string, string>,
  field: string,
): Record<string, string> {
  if (!(field in errors)) return errors;

  const rest = { ...errors };
  delete rest[field];
  return rest;
}

/* -------------------------------------------------------------------------- */
/* Server-side failures, placed on the field that caused them                  */
/* -------------------------------------------------------------------------- */

const FILE_TOO_LARGE =
  "That file is too large for the server. Reduce the image size and upload it again.";

/**
 * A rejected upload body reaches us as a network error, not as its real status.
 *
 * The web server answers an over-limit multipart body with `413` (or drops the
 * connection) *before* the app runs, so the reply carries no CORS headers and
 * the browser refuses to expose the status — the client can only report
 * `ApiError(0)`. Saving a document always posts a file, so on this one request
 * an unreachable-service result is far more often an oversized scan than an
 * outage, and the copy names both so it is never a lie.
 */
const UPLOAD_REJECTED =
  "The upload did not reach the server. The file is probably too large — try a smaller image, or check your connection.";

/** The slots the form actually renders for this document type. */
function fileSlotsFor(type: DocumentType): DocumentFileSlot[] {
  return documentRequiresFrontBack(type)
    ? ["front_file", "back_file"]
    : ["file"];
}

/**
 * The API's field name, translated to the slot the form renders it under.
 *
 * A two-sided document sends its front scan as `file` (see `buildForm`), but
 * the form labels that slot `front_file` — an untranslated key would attach the
 * message to a slot that is not on screen.
 */
function formField(apiField: string, type: DocumentType): string {
  if (apiField === "file" && documentRequiresFrontBack(type)) {
    return "front_file";
  }
  return apiField;
}

function slotErrors(
  type: DocumentType,
  message: string,
): Record<string, string> {
  return Object.fromEntries(fileSlotsFor(type).map((slot) => [slot, message]));
}

/**
 * Turns a failed save into field messages, so the fix is shown where it is made.
 *
 * Empty means the failure has no field to sit under and belongs in a toast —
 * `useSaveConsignmentDocument` uses exactly that rule to decide, so a message
 * can never appear twice or not at all.
 */
export function documentErrorsFromResponse(
  error: unknown,
  type: DocumentType,
): Record<string, string> {
  if (!isApiError(error)) return {};

  if (error.status === 413) return slotErrors(type, FILE_TOO_LARGE);
  if (error.isNetworkError) return slotErrors(type, UPLOAD_REJECTED);

  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    const message = messages[0];
    if (message) errors[formField(field, type)] = message;
  }

  return errors;
}
