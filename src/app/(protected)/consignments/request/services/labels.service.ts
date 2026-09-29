import { ApiError, extractFieldErrors, isApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";

import type { LabelHistoryItem, LabelOption, RegenerateLabelPayload } from "../types";
import { ENDPOINTS } from "./consignment-request.service";

/**
 * Labels for one consignment request.
 *
 *   GET  …/label/options     what it can produce (INTERNAL, and INTEGRATOR_API when a carrier is set)
 *   GET  …/label             generate the first INTERNAL label → the PDF
 *   POST …/label/regenerate  a carrier label, or any new version → the PDF
 *   GET  …/label/history     every version so far
 *   GET  /labels/{id}/download  one version's file            → the PDF
 *
 * Same contract as the staff console's `/admin/…` routes, under the corporate
 * scope. The three file calls come back as the PDF itself, so they are fetched
 * as a blob through the private client — a plain link or `window.open` on the
 * URL would go out without the bearer token and 401.
 *
 * Everything here is `silent`: the history section renders its own error
 * state, and the mutation hooks toast the file calls with the server's own
 * message — which, for a blob request, only `rethrowBlobError` can read.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * With `responseType: "blob"` an error body arrives as a Blob too, so the
 * client can only offer its generic copy for the status. Reads the JSON back
 * out and rethrows with the server's `message` (and field errors, if any).
 */
async function rethrowBlobError(error: unknown): Promise<never> {
  if (isApiError(error) && error.payload instanceof Blob) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await error.payload.text());
    } catch {
      throw error; // not JSON — the generic message is the best there is
    }
    const message =
      isRecord(parsed) && typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message
        : error.message;
    throw new ApiError(error.status, message, {
      payload: parsed,
      fieldErrors: extractFieldErrors(parsed),
      cause: error.cause,
    });
  }
  throw error;
}

/** A 200 with an empty body is not a label — say so rather than save a 0-byte file. */
function assertFile(blob: unknown): Blob {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new ApiError(502, "The label file came back empty. Please try again.");
  }
  return blob;
}

async function fetchFile(request: () => Promise<Blob>): Promise<Blob> {
  try {
    return assertFile(await request());
  } catch (error) {
    return rethrowBlobError(error);
  }
}

/* -------------------------------------------------------------------------- */

/** `GET …/label/options` — answers `{ label_options: [...] }`. */
export async function fetchLabelOptions(
  id: number,
  signal?: AbortSignal,
): Promise<LabelOption[]> {
  const data = await privateApiClient.get<unknown>(ENDPOINTS.labelOptions(id), {
    silent: true,
    signal,
  });
  const options = isRecord(data) ? data.label_options : data;
  return Array.isArray(options) ? (options as LabelOption[]) : [];
}

/** `GET …/label/history` — answers `{ labels: [...] }`. */
export async function fetchLabelHistory(
  id: number,
  signal?: AbortSignal,
): Promise<LabelHistoryItem[]> {
  const data = await privateApiClient.get<unknown>(ENDPOINTS.labelHistory(id), {
    silent: true,
    signal,
  });
  const labels = isRecord(data) ? data.labels : data;
  return Array.isArray(labels) ? (labels as LabelHistoryItem[]) : [];
}

/** What producing a label answered: the PDF itself, or a JSON acknowledgement. */
export type ProducedLabel = { kind: "file"; blob: Blob } | { kind: "json"; message?: string };

/**
 * A carrier may acknowledge with JSON rather than a file. With
 * `responseType: "blob"` that still arrives as a Blob, typed `application/json`.
 */
async function toProduced(blob: Blob): Promise<ProducedLabel> {
  if (/json/i.test(blob.type)) {
    try {
      const body: unknown = JSON.parse(await blob.text());
      return {
        kind: "json",
        message: isRecord(body) && typeof body.message === "string" ? body.message : undefined,
      };
    } catch {
      /* not JSON after all — treat it as the file */
    }
  }
  return { kind: "file", blob };
}

/**
 * The body that produces one option's label. INTERNAL sends only its type;
 * INTEGRATOR_API also names the carrier's `label_api_id`. `regenerate` is
 * true once a label exists, asking for a fresh version rather than the
 * existing one.
 */
export function labelPayloadFor(option: LabelOption, regenerate: boolean): RegenerateLabelPayload {
  const payload: RegenerateLabelPayload =
    option.type === "INTEGRATOR_API"
      ? { label_type: "INTEGRATOR_API", label_api_id: option.label_api_id ?? undefined }
      : { label_type: "INTERNAL" };
  payload.regenerate = regenerate;
  return payload;
}

/**
 * Produces one option's label.
 *
 * - The first INTERNAL label → `GET …/label`, the documented first-label call.
 * - Everything else — any regenerate, and a carrier label, which `GET …/label`
 *   cannot ask for — → `POST …/label/regenerate` with the option's payload.
 *   The previous version keeps its file and its row in the history.
 */
export async function produceLabel(
  id: number,
  option: LabelOption,
  regenerate: boolean,
): Promise<ProducedLabel> {
  const blob =
    !regenerate && option.type !== "INTEGRATOR_API"
      ? await fetchFile(() =>
          privateApiClient.get<Blob>(ENDPOINTS.label(id), { responseType: "blob", silent: true }),
        )
      : await fetchFile(() =>
          privateApiClient.post<Blob>(
            ENDPOINTS.labelRegenerate(id),
            labelPayloadFor(option, regenerate),
            { responseType: "blob", silent: true },
          ),
        );
  return toProduced(blob);
}

/** `GET /labels/{labelId}/download` — one stored version's file. */
export function downloadLabelFile(labelId: number): Promise<Blob> {
  return fetchFile(() =>
    privateApiClient.get<Blob>(ENDPOINTS.labelDownload(labelId), {
      responseType: "blob",
      silent: true,
    }),
  );
}
