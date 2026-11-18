import { toast } from "@/shared/components/toast";

/**
 * A blocked submit's validation errors, as sentences a person can act on.
 *
 * react-hook-form hands the invalid handler a nested error tree —
 * `boxes.0.items.1.quantity.message`. A toast that only says "fix the errors"
 * leaves the user hunting, especially for an error on a field that is off
 * screen or has no visible message. This walks the tree and says, for every
 * error, *where* it is ("Box 1 · Item 2") and *what* it is.
 */

export interface FormProblem {
  /** "Box 1 · Item 2", "Sender", or "" for a top-level field. */
  where: string;
  message: string;
}

/** Keys of a react-hook-form error node that are metadata, not children. */
const META_KEYS = new Set(["message", "type", "ref", "types"]);

function collect(
  node: unknown,
  path: string[],
  out: { path: string[]; message: string }[],
): void {
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    out.push({ path, message: record.message.trim() });
  }

  for (const [key, child] of Object.entries(record)) {
    if (META_KEYS.has(key)) continue;
    // An array's own error (e.g. "Add at least one item") sits under `root`;
    // it belongs to the array, not to a field called "root".
    collect(child, key === "root" ? path : [...path, key], out);
  }
}

function isIndex(value: string | undefined): boolean {
  return value !== undefined && /^\d+$/.test(value);
}

/** `["boxes","0","items","1","quantity"]` → "Box 1 · Item 2". */
function locate(path: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i += 1) {
    const key = path[i];
    if (key === "sender") parts.push("Sender");
    else if (key === "receiver") parts.push("Receiver");
    else if (key === "boxes" && isIndex(path[i + 1])) {
      parts.push(`Box ${Number(path[i + 1]) + 1}`);
      i += 1;
    } else if (key === "items" && isIndex(path[i + 1])) {
      parts.push(`Item ${Number(path[i + 1]) + 1}`);
      i += 1;
    }
  }
  return parts.join(" · ");
}

/** `item_total_amount` → "Total amount", `first_name` → "First name". */
function fieldLabel(key: string): string {
  const text = key.replace(/^(sender|receiver|item)_/, "").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** zod's type messages name no field — "Expected number, received nan". */
function isGeneric(message: string): boolean {
  return /^(expected |invalid input|required$)/i.test(message);
}

export function summarizeFormErrors(errors: unknown): FormProblem[] {
  const found: { path: string[]; message: string }[] = [];
  collect(errors, [], found);

  return found.map(({ path, message }) => {
    const key = [...path].reverse().find((part) => !isIndex(part)) ?? "";
    return {
      where: locate(path),
      message: isGeneric(message) ? `${fieldLabel(key)} is missing or invalid` : message,
    };
  });
}

/** How many problems the toast lists before "…and N more". */
const MAX_LISTED = 5;

/**
 * The invalid-submit handler: one toast naming every problem — where, and
 * what — one per line, on screen long enough to read. Pass it as
 * `handleSubmit(onValid, toastFormErrors)`.
 */
export function toastFormErrors(errors: unknown): void {
  const problems = summarizeFormErrors(errors);
  if (problems.length === 0) return;

  const lines = problems
    .slice(0, MAX_LISTED)
    .map((problem) => `• ${problem.where ? `${problem.where}: ` : ""}${problem.message}`);
  if (problems.length > MAX_LISTED) lines.push(`…and ${problems.length - MAX_LISTED} more`);

  toast.error({
    title:
      problems.length === 1
        ? "Can't save — 1 problem to fix"
        : `Can't save — ${problems.length} problems to fix`,
    message: lines.join("\n"),
    duration: 10_000,
  });
}
