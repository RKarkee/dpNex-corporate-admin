"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";

/**
 * Confirmation before something irreversible.
 *
 * `onConfirm` may return a promise — the dialog stays open with the button in
 * a pending state until it settles, and closes only on success. Closing
 * optimistically would hide the error toast behind a list that has not
 * actually changed.
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` paints the confirm button red and adds the warning icon. */
  tone?: "default" | "destructive";
  onConfirm: () => void | Promise<unknown>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false);

  // The dialog can unmount mid-request (route change, parent re-render); a
  // setState after that is a React warning and a memory leak.
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      if (alive.current) onOpenChange(false);
    } catch {
      // The caller's mutation already surfaced this as a toast. Staying open
      // lets the user read it and retry without reopening the dialog.
    } finally {
      if (alive.current) setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      // A click outside must not cancel a request that is already in flight.
      onOpenChange={(next) => !pending && onOpenChange(next)}
    >
      <DialogContent className="max-w-md" showClose={!pending}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {tone === "destructive" ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-[18px]" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <DialogTitle>{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-1.5">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
            className={cn("min-w-24")}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
