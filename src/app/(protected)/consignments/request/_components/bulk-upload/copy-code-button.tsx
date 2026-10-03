"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { toast } from "@/shared/components/toast";
import { cn } from "@/shared/lib/utils";

/**
 * Copies a batch code to the clipboard — so it can be pasted into "Check an
 * upload" below. The icon turns into a tick for a moment to confirm.
 */
export function CopyCodeButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the batch code.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : "Copy batch code"}
      aria-label={copied ? "Batch code copied" : "Copy batch code"}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
    </button>
  );
}
