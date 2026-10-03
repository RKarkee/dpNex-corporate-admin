"use client";

import * as React from "react";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import { formatFileSize } from "../../_lib/download-file";
import { BULK_UPLOAD_ACCEPT, BULK_UPLOAD_MAX_BYTES } from "../../services/bulk-upload.service";

/** Why a file can't be used, or null when it's fine. Checked before uploading. */
export function validateBulkFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!BULK_UPLOAD_ACCEPT.some((ext) => name.endsWith(ext))) {
    return `Use an Excel or CSV file (${BULK_UPLOAD_ACCEPT.join(", ")}).`;
  }
  if (file.size > BULK_UPLOAD_MAX_BYTES) {
    return `The file is ${formatFileSize(file.size)} — the limit is 10 MB.`;
  }
  if (file.size === 0) return "The file is empty.";
  return null;
}

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

/**
 * Drag a file onto the box or click it to browse. Once a file is chosen the
 * box turns into a file chip with its name, size and a Remove button.
 */
export function FileDropzone({ file, onFileChange, disabled }: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const pick = (files: FileList | null) => {
    if (files && files[0]) onFileChange(files[0]);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <FileSpreadsheet className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onFileChange(null)}
          disabled={disabled}
          aria-label="Remove file"
        >
          <X className="size-4" /> Remove
        </Button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) pick(event.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/60",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <UploadCloud className={cn("size-8", dragging ? "text-primary" : "text-muted-foreground")} />
      <p className="text-sm font-medium text-foreground">
        Drop your file here, or <span className="text-primary underline">browse</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Excel or CSV ({BULK_UPLOAD_ACCEPT.join(", ")}), up to 10 MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={BULK_UPLOAD_ACCEPT.join(",")}
        className="hidden"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = ""; // allow picking the same file again
        }}
      />
    </div>
  );
}
