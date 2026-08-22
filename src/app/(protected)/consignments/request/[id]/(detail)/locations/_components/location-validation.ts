import { isApiError } from "@/shared/api/errors";

import type { LocationInput } from "../services/locations.service";
import { requiresForwarder } from "../types";

/**
 * Turning a failed save into messages the form can show.
 *
 * The rule this file exists to enforce: **a failure is reported exactly once.**
 * The service calls the API with `silent: true`, so the client's own toast is
 * suppressed and something here has to speak. If the failure names fields the
 * form renders, those fields carry it; otherwise a toast does. Deciding that in
 * one place is what stops a 422 appearing twice, or — worse — a validation error
 * on a field the form does not render disappearing silently, which is exactly
 * how a save can look like it did nothing at all.
 */

/**
 * The fields on screen for a given submission.
 *
 * **Not a fixed list.** Half this form is conditional: the place fields appear
 * only when `have_new_location` is `Y`, and the forwarder pair only for
 * `FORWARDED_WITH`. An earlier version tested a static set of every field name
 * the form *can* render, which quietly broke the one case that matters — a
 * message about a hidden field was treated as "the form will show this", so no
 * toast fired and nothing appeared anywhere.
 *
 * Visibility is decided entirely by the payload being sent, so the hook and the
 * dialog can each compute it from the same input and always agree.
 */
export function visibleLocationFields(input: LocationInput): Set<string> {
  // Always rendered, whatever the rest of the form is doing.
  const fields = new Set(["status", "have_new_location", "comments"]);

  if (input.have_new_location === "Y") {
    for (const field of [
      "location",
      "country",
      "state",
      "city",
      "location_date",
      "arrived_at",
      "moved_at",
    ]) {
      fields.add(field);
    }
  }

  if (requiresForwarder(input.status)) {
    fields.add("forwarder_code");
    fields.add("new_tracking_no");
  }

  return fields;
}

/**
 * Field name → message, for the fields this form can display.
 *
 * Empty means the form has nothing to show and the caller should toast — which
 * is precisely the condition `useSaveConsignmentLocation` tests.
 */
export function locationErrorsFromResponse(
  error: unknown,
  visible: Set<string>,
): Record<string, string> {
  if (!isApiError(error)) return {};

  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    const message = messages[0];
    if (!message) continue;

    // Laravel reports nested rules as `parent.child`; the form binds the parent.
    const root = field.split(".")[0] ?? field;
    if (visible.has(root)) errors[root] ??= message;
  }

  return errors;
}
