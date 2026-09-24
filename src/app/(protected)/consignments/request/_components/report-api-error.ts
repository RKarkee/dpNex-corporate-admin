import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

/**
 * Reports a failed write exactly once.
 *
 * The workflow services call the API `silent`, so something here has to speak.
 * A 422 naming a field the dialog renders lands on that field, where the fix
 * is made; anything it cannot place — another field, or no field at all — is
 * toasted instead. Never both, and never neither: a message about a field that
 * is not on screen is exactly how a save ends up looking like it did nothing.
 *
 * `visible` is the list of fields the calling form actually renders right now.
 */
export function reportApiError<F extends string>(
  error: unknown,
  visible: readonly F[],
  setFieldError: (field: F, message: string) => void,
  title: string,
): void {
  if (!isApiError(error)) {
    toast.error(error);
    return;
  }

  const shown = new Set<string>(visible);
  let placed = false;

  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    const message = messages[0];
    // Laravel reports nested rules as `parent.child`; the form binds the parent.
    const root = field.split(".")[0] ?? field;
    if (message && shown.has(root)) {
      setFieldError(root as F, message);
      placed = true;
    }
  }

  if (!placed) toast.error({ title, message: error.message });
}
