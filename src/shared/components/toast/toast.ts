import { isApiError } from "@/shared/api/errors";

import { toastStore, type ToastInput } from "./toast-store";

/**
 * The imperative API. Import this anywhere — components, hooks, services,
 * interceptors — and call it. Nothing here touches React.
 *
 *   toast.success("Consignment request submitted");
 *   toast.error(error);
 */

type Message = string | ToastInput;

function normalize(message: Message): ToastInput {
  return typeof message === "string" ? { message } : message;
}

export const toast = {
  success(message: Message) {
    return toastStore.getState().add({ ...normalize(message), variant: "success" });
  },

  /** Accepts an `ApiError` or any thrown value and pulls a safe message out of it. */
  error(message: Message | unknown) {
    return toastStore
      .getState()
      .add({ ...normalizeError(message), variant: "error" });
  },

  info(message: Message) {
    return toastStore.getState().add({ ...normalize(message), variant: "info" });
  },

  warning(message: Message) {
    return toastStore.getState().add({ ...normalize(message), variant: "warning" });
  },

  dismiss(id: string) {
    toastStore.getState().dismiss(id);
  },

  clear() {
    toastStore.getState().clear();
  },
};

const FALLBACK = "Something went wrong. Please try again.";

function normalizeError(value: Message | unknown): ToastInput {
  if (typeof value === "string") return { message: value };

  if (isApiError(value)) {
    // A 422 already renders inline on the form; the toast just says so.
    return { message: value.message };
  }

  if (value instanceof Error) {
    return { message: value.message || FALLBACK };
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  ) {
    return value as ToastInput;
  }

  return { message: FALLBACK };
}
