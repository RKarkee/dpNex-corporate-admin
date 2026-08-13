"use client";

import * as React from "react";
import { FileText, UploadCloud, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { useFileUrl } from "@/shared/hooks/use-file-url";
import { cn } from "@/shared/lib/utils";

/**
 * One document scan: dropzone when empty, preview when filled.
 *
 * Two kinds of "already has a file" exist here and they look different on
 * purpose:
 *
 * - `existingReference` — a scan stored on the server. Shown as a preview, but
 *   it does **not** satisfy the save, because the API's file-preservation
 *   behaviour is unverified. The slot says so.
 * - `file` — something the user has just picked. This does satisfy the save.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

export interface KycFileSlotProps {
  label: string;
  /** The file the user picked in this session, if any. */
  file: File | null;
  onSelect: (file: File | null) => void;
  /** A scan already stored server-side, as an authenticated reference. */
  existingReference?: string | null;
  /**
   * True when this slot must receive a file before the form can be saved even
   * though a stored scan exists — the unverified-preservation case.
   */
  reuploadRequired?: boolean;
  disabled?: boolean;
  error?: string;
}

export function KycFileSlot({
  label,
  file,
  onSelect,
  existingReference,
  reuploadRequired = false,
  disabled = false,
  error,
}: KycFileSlotProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // The stored scan sits behind an authenticated endpoint, so it cannot go
  // straight into an `<img src>`.
  const { src: existingUrl } = useFileUrl(file ? null : existingReference);

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
    () =>
      file && file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
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
        <Label>{label}</Label>
        {reuploadRequired ? (
          <span className="text-xs font-medium text-amber-600">
            Re-upload required
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "relative grid h-48 place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/40 transition-colors",
          shownError && "border-destructive/60",
          reuploadRequired && !file && "border-amber-500/60 bg-amber-500/5",
        )}
      >
        {hasSomething ? (
          <>
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
                <FileText className="size-8" aria-hidden />
                <span className="max-w-48 truncate px-2 text-xs">
                  {file?.name ?? "Stored document"}
                </span>
              </div>
            )}

            {file && !disabled ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={clear}
                aria-label={`Remove the ${label.toLowerCase()} you selected`}
                className="absolute right-2 top-2 size-8"
              >
                <X className="size-4" aria-hidden />
              </Button>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-muted-foreground">
            <UploadCloud className="size-8" aria-hidden />
            <span className="text-xs">JPG, PNG, WebP or PDF · up to 10MB</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        id={`kyc-file-${label.replace(/\s+/g, "-").toLowerCase()}`}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full"
      >
        <UploadCloud className="size-4" aria-hidden />
        {file ? "Choose a different file" : hasSomething ? "Re-upload" : "Choose file"}
      </Button>

      {shownError ? (
        <p role="alert" className="text-xs text-destructive">
          {shownError}
        </p>
      ) : reuploadRequired && !file ? (
        <p className="text-xs text-muted-foreground">
          The stored scan cannot be carried over automatically. Select it again
          to save your changes.
        </p>
      ) : null}
    </div>
  );
}
