"use client";

import { Loader2, RefreshCw, Tag } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import type { LabelOption } from "../../../../types";

/**
 * One entry of `label_options`: what it is, and its Generate / Regenerate
 * button.
 *
 * An option that needs `additional_fields` is shown but disabled — there is no
 * form for those yet, and sending it without them would only be refused.
 */
export function LabelOptionRow({
  option,
  isGenerated,
  loading,
  disabled,
  onProduce,
}: {
  option: LabelOption;
  /** Regenerate once a label exists, Generate before. */
  isGenerated: boolean;
  /** This row's own request is in flight. */
  loading: boolean;
  /** Another row's request is in flight. */
  disabled: boolean;
  onProduce: (option: LabelOption) => void;
}) {
  const name = option.button_label || option.label;
  const isCarrier = option.type === "INTEGRATOR_API";
  const needsData = option.requires_additional_data === true;
  const route = [option.via_code, option.integrator_code].filter(Boolean).join(" → ");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{option.label}</span>
          <Badge variant={isCarrier ? "default" : "secondary"}>
            {isCarrier ? "Carrier" : "Internal"}
          </Badge>
          {needsData ? <Badge variant="warning">Needs details</Badge> : null}
        </div>
        {route ? <p className="mt-0.5 text-xs text-muted-foreground">{route}</p> : null}
      </div>

      <Button
        size="sm"
        onClick={() => onProduce(option)}
        disabled={disabled || loading || needsData}
        title={needsData ? "This label needs extra details, which are not supported here yet" : undefined}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : isGenerated ? (
          <RefreshCw className="size-4" aria-hidden />
        ) : (
          <Tag className="size-4" aria-hidden />
        )}
        {isGenerated ? `Regenerate ${name}` : `Generate ${name}`}
      </Button>
    </div>
  );
}
