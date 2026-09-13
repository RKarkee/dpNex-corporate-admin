"use client";

import { Package, X } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
import { Badge } from "@/shared/components/ui/badge";

import type { PickedConsignment } from "../schema";
import { consignmentFetcher } from "./lookup-fetchers";

/**
 * Choosing the consignment requests a van is being sent for.
 *
 * A checklist, not a select. Every other lookup in this app holds one value, so
 * picking again overwrites the last choice; here the field is a set, and a
 * picker that quietly swapped 101 for 102 would be the worst possible
 * behaviour — you would book a van for one parcel believing you had booked it
 * for three.
 *
 * So the popover stays open and every row keeps a tick: choosing five
 * consignments is five clicks, not five trips through a search box that forgot
 * what you typed. Clicking a ticked row unticks it, and the chips below are the
 * same set from the other direction — useful once the list has scrolled on and
 * the ticks are out of sight.
 */
export interface ConsignmentPickerProps {
  picked: PickedConsignment[];
  onAdd: (option: PickedConsignment) => void;
  onRemove: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function ConsignmentPicker({
  picked,
  onAdd,
  onRemove,
  disabled,
  invalid,
}: ConsignmentPickerProps) {
  const values = picked.map((item) => item.value);

  /** One row clicked: on if it was off, off if it was on. */
  const toggle = (option: PickedConsignment) => {
    if (values.includes(option.value)) onRemove(option.value);
    else onAdd({ value: option.value, label: option.label });
  };

  return (
    <div className="space-y-2">
      <AsyncCombobox
        multiple
        // `value` is meaningless in checklist mode — the set below is what the
        // rows and the trigger read.
        value=""
        selectedValues={values}
        selectedLabel={
          picked.length > 0
            ? `${picked.length} consignment${picked.length === 1 ? "" : "s"} selected`
            : undefined
        }
        onChange={(option) =>
          toggle({ value: option.value, label: option.label })
        }
        fetchPage={consignmentFetcher}
        placeholder="Search and select consignment requests…"
        searchPlaceholder="Search consignments…"
        emptyText="No consignments found"
        disabled={disabled}
        aria-invalid={invalid}
      />

      {picked.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {picked.map((item) => (
            <li key={item.value}>
              <Badge variant="secondary" className="gap-1.5 py-1 pl-2 pr-1">
                <Package aria-hidden className="size-3" />
                <span className="max-w-56 truncate">{item.label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(item.value)}
                  disabled={disabled}
                  aria-label={`Remove ${item.label}`}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nothing chosen yet. Tick every consignment the van should collect on
          this trip — the list stays open while you choose.
        </p>
      )}
    </div>
  );
}
