"use client";

import * as React from "react";
import { FileText, UploadCloud, X } from "lucide-react";

import { Label } from "@/shared/components/ui/label";
import { useFileUrl } from "@/shared/hooks/use-file-url";
import { cn } from "@/shared/lib/utils";

/**
 * One document scan: a dropzone when empty, a preview when filled.
 *
 * A standalone copy of the profile tab's slot, not an import — see the note in
 * `../types.ts` on why the two document features are kept separate.
 *
 * Two kinds of "already has a file" exist here, and they now mean the same
 * thing to the save:
 *
 * - `existingReference` — a scan stored on the server. It satisfies the save,
 *   because `hydrateSelection` re-downloads and re-sends it for any slot the
 *   user leaves alone.
 * - `file` — something the user just picked, which replaces the stored one.
 *
 * That equivalence is why this component no longer carries a `reuploadRequired`
 * state: there is nothing left to warn about.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

export interface DocumentFileSlotProps {
  /** Stable per slot — ties the visible dropzone to its hidden input. */
  id: string;
  label: string;
  required?: boolean;
  /** Small note beside the label, e.g. "Optional" on a back side. */
  hint?: string;
  /** The file the user picked in this session, if any. */
  file: File | null;
  onSelect: (file: File | null) => void;
  /** A scan already stored server-side, as an authenticated reference. */
  existingReference?: string | null;
  disabled?: boolean;
  error?: string;
}

export function DocumentFileSlot({
  id,
  label,
  required = false,
  hint,
  file,
  onSelect,
  existingReference,
  disabled = false,
  error,
}: DocumentFileSlotProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // The stored scan sits behind an authenticated endpoint, so it cannot go
  // straight into an `<img src>`. Skipped once the user picks something.
  const { src: existingUrl, isLoading } = useFileUrl(
    file ? null : existingReference,
  );

  /**
   * The preview is *derived* from the picked file, not stored in state — a
   * `setPreviewUrl` inside an effect would re-render every time the file
   * changed, one render after the file itself did.
   *
   * The URL still has to be revoked, which is what the effect below is for:
   * it owns cleanup only. The resolved `existingUrl` is not revoked here —
   * `useFileUrl` owns that one.
   */
  const previewUrl = React.useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );

  React.useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) return;

    if (!ACCEPTED.includes(picked.type)) {
      setLocalError("Use a JPG, PNG, WebP or PDF file.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setLocalError("That file is larger than 10MB.");
      return;
    }

    setLocalError(null);
    onSelect(picked);
  }

  function clear() {
    setLocalError(null);
    onSelect(null);
    // A file input keeps its value after a programmatic clear, so re-picking
    // the same file would fire no change event without this.
    if (inputRef.current) inputRef.current.value = "";
  }

  // The local check wins: it is set only when the *last* pick was rejected
  // here, which is newer than anything the previous save reported.
  const shownError = localError ?? error;
  const imageUrl = previewUrl ?? (file ? null : existingUrl);
  const hasSomething = Boolean(file || existingUrl);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span aria-hidden className="ml-0.5 text-destructive">
              *
            </span>
          ) : null}
        </Label>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />

      {hasSomething ? (
        <div
          className={cn(
            "relative grid h-56 place-items-center overflow-hidden rounded-xl border border-border bg-secondary/40 shadow-sm",
            shownError && "border-destructive/60",
          )}
        >
          {imageUrl ? (
            // Not `next/image`: the source is a blob or data URL whose
            // dimensions are unknown, and it never benefits from the loader.
            <img
              src={imageUrl}
              alt={`${label} preview`}
              className="size-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="size-10 opacity-60" aria-hidden />
              <span className="max-w-48 truncate px-2 text-sm">
                {file?.name ?? "Stored document"}
              </span>
            </div>
          )}

          {/* Lifts the corner control off a light scan without tinting the
              image itself. Non-interactive, so it never eats the click. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/10 via-transparent to-transparent"
          />

          {/* Clears the slot back to an empty dropzone, whether what is showing
              is a fresh pick or the stored scan.

              Clearing a stored scan is not a delete: it drops this slot out of
              hydration, so the save stops re-sending that file. Nothing changes
              on the record until the form is submitted, and cancelling the
              dialog undoes it. */}
          {disabled ? null : (
            <button
              type="button"
              onClick={clear}
              title={
                file ? "Remove and re-upload" : "Remove this scan and upload another"
              }
              className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-card text-muted-foreground shadow-md transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Remove the {label.toLowerCase()}</span>
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/20 transition-colors hover:border-primary/40 hover:bg-primary/5",
            shownError && "border-destructive/60",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : (
            <>
              <span className="grid size-12 place-items-center rounded-full bg-secondary">
                <UploadCloud className="size-6 text-muted-foreground" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">
                Click to upload
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WebP or PDF · up to 10MB
              </span>
            </>
          )}
        </label>
      )}

      {shownError ? (
        <p role="alert" className="text-xs text-destructive">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}
