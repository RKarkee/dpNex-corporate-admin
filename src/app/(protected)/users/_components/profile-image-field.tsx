"use client";

import * as React from "react";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { FieldMessage } from "./form-fields";

/**
 * Optional profile photo, with a live preview.
 *
 * Controlled rather than uncontrolled like the rest of the form: a file input
 * cannot be given a value programmatically, so "Remove" has no way to clear
 * itself without React holding the `File`. The parent passes it straight to
 * the mutation.
 *
 * The preview URL is an object URL, revoked whenever the file changes or the
 * field unmounts — without that, every re-pick leaks a blob for the life of
 * the tab. The one exception is `initialPreviewUrl`: on the edit form that is
 * the stored photo's remote URL, which is not ours to revoke, so it is tracked
 * separately from the blob.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

const INPUT_ID = "image";

export function ProfileImageField({
  file,
  onChange,
  disabled = false,
  error,
  initialPreviewUrl = null,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  /** A server-side 422 on this field. */
  error?: string;
  /** The photo already on the record, shown until a new one is picked. */
  initialPreviewUrl?: string | null;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // The stored photo, until the user replaces or removes it. Removing clears
  // it too, so the field does not claim a picture the form is no longer sending.
  const [showStored, setShowStored] = React.useState(true);
  const stored = showStored && !file ? initialPreviewUrl : null;
  const shown = preview ?? stored;

  // The URL is created in the handlers rather than derived in an effect —
  // allocating a blob is a side effect, and doing it during render (or
  // setting state from an effect) means a cascading render per pick.
  const previewRef = React.useRef<string | null>(null);

  const replacePreview = React.useCallback((url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  }, []);

  // Whatever is still held when the form closes would otherwise outlive it.
  React.useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;

    // Checked here as well as on the server: a 10MB upload that fails
    // validation costs the user the whole upload before it is rejected.
    if (!ACCEPTED.includes(selected.type)) {
      setLocalError("Choose a JPG, PNG or WebP image.");
      clearInput();
      return;
    }

    if (selected.size > MAX_BYTES) {
      setLocalError("That image is larger than 10MB.");
      clearInput();
      return;
    }

    setLocalError(null);
    replacePreview(URL.createObjectURL(selected));
    onChange(selected);
  }

  /** The input keeps the rejected file otherwise, so re-picking it fires nothing. */
  function clearInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove() {
    setLocalError(null);
    clearInput();
    replacePreview(null);
    setShowStored(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      {/* `sr-only`, not `hidden`: the input stays in the tab order and keeps its
          accessible name, so the field is reachable without a mouse. The
          visible label below is styled as the button. */}
      <input
        ref={inputRef}
        id={INPUT_ID}
        name={INPUT_ID}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={handleSelect}
        disabled={disabled}
        aria-describedby={`${INPUT_ID}-hint`}
        className="peer sr-only"
      />

      {shown ? (
        <figure className="relative w-full max-w-xs overflow-hidden rounded-xl border border-border bg-secondary">
          {/* A blob URL for a file the user just picked, or the stored photo's
              own URL — nothing for next/image to optimise either way, and it
              cannot know the dimensions. */}
          <img
            src={shown}
            alt={preview ? "Selected profile photo" : "Current profile photo"}
            className="block aspect-4/3 w-full object-cover"
          />

          {/* Top-left, over the image, as on the reference screen. */}
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <OverlayButton
              as="label"
              htmlFor={INPUT_ID}
              disabled={disabled}
              icon={Pencil}
              label="Change"
            />
            <OverlayButton
              onClick={handleRemove}
              disabled={disabled}
              icon={Trash2}
              label="Remove"
              tone="destructive"
            />
          </div>

          <figcaption className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-foreground/75 px-2 py-1 text-xs text-background">
            {file?.name ?? "Current photo"}
          </figcaption>
        </figure>
      ) : (
        <label
          htmlFor={INPUT_ID}
          className={cn(
            "flex w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/50 px-4 py-8 text-center transition-colors",
            "hover:border-brand-orange/50 hover:bg-brand-orange-surface",
            // The input is `sr-only`, so its focus ring has to be drawn here.
            "peer-focus-visible:border-ring/40 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/20",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <span className="grid size-10 place-items-center rounded-full bg-card text-primary">
            <ImagePlus aria-hidden className="size-5" />
          </span>
          <span className="text-sm font-medium text-foreground">
            Upload a photo
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG or WebP · up to 10MB
          </span>
        </label>
      )}

      <FieldMessage
        id={INPUT_ID}
        error={localError ?? error}
        hint="Optional. Shown next to their name across the portal."
      />
    </div>
  );
}

/**
 * A compact control that sits on top of the image.
 *
 * Renders as a `label` for "Change", because pointing at the file input is the
 * only way to reopen the picker without a click handler that fakes it.
 */
function OverlayButton({
  as = "button",
  htmlFor,
  onClick,
  disabled,
  icon: Icon,
  label,
  tone = "default",
}: {
  as?: "button" | "label";
  htmlFor?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  tone?: "default" | "destructive";
}) {
  const className = cn(
    "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    tone === "destructive"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      : "bg-card text-foreground hover:bg-secondary",
    disabled && "pointer-events-none opacity-50",
  );

  if (as === "label") {
    return (
      <label htmlFor={htmlFor} className={className}>
        <Icon aria-hidden className="size-3.5" />
        {label}
      </label>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Icon aria-hidden className="size-3.5" />
      {label}
    </button>
  );
}
