"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { FilterField } from "@/shared/components/ui/filter-bar";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { countActiveFilters } from "../lib/notification-params";
import type { NotificationFilterValues } from "../types";

/**
 * Four controls, all on screen — there is no panel to collapse and nothing
 * worth hiding behind one.
 *
 * The type list comes from `/meta` and is not checked against anything here:
 * the API publishes thirteen types today and adds more, so a copy in this app
 * would quietly drop a filter the server understands. `/meta`'s own labels are
 * used verbatim, because they are written for exactly this dropdown
 * ("Shipment status update (customer)").
 *
 * Applied immediately rather than behind an Apply button: four controls, each
 * one click, and the list is short enough that waiting to be told to refetch
 * would feel slower than the refetch.
 */
export interface NotificationFiltersProps {
  value: NotificationFilterValues;
  onChange: (filters: NotificationFilterValues) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function NotificationFilters({
  value,
  onChange,
  onReset,
  disabled,
}: NotificationFiltersProps) {
  const { notificationTypeOptions } = useMetaOptions();

  const set = <K extends keyof NotificationFilterValues>(
    key: K,
    next: NotificationFilterValues[K],
  ) => onChange({ ...value, [key]: next });

  const activeCount = countActiveFilters(value);

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterField label="Status" htmlFor="notification-read">
          <NativeSelect
            id="notification-read"
            value={value.read}
            disabled={disabled}
            onChange={(event) => set("read", event.target.value)}
            options={[
              { value: "", label: "All" },
              { value: "false", label: "Unread" },
              { value: "true", label: "Read" },
            ]}
          />
        </FilterField>

        <FilterField label="Type" htmlFor="notification-type">
          <NativeSelect
            id="notification-type"
            value={value.type}
            disabled={disabled}
            onChange={(event) => set("type", event.target.value)}
            options={[
              { value: "", label: "All types" },
              ...notificationTypeOptions.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            ]}
          />
        </FilterField>

        <FilterField label="From" htmlFor="notification-from" hint="Inclusive">
          <Input
            id="notification-from"
            type="date"
            value={value.created_from}
            max={value.created_to || undefined}
            disabled={disabled}
            onChange={(event) => set("created_from", event.target.value)}
          />
        </FilterField>

        <FilterField label="To" htmlFor="notification-to">
          <Input
            id="notification-to"
            type="date"
            value={value.created_to}
            // Bounds each other, so the pair cannot be inverted into a range
            // that matches nothing.
            min={value.created_from || undefined}
            disabled={disabled}
            onChange={(event) => set("created_to", event.target.value)}
          />
        </FilterField>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
        {activeCount > 0 ? (
          <Badge variant="secondary">
            {activeCount} filter{activeCount === 1 ? "" : "s"} applied
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            Showing everything you have been sent
          </span>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={onReset}
          disabled={disabled || activeCount === 0}
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>
    </Card>
  );
}
