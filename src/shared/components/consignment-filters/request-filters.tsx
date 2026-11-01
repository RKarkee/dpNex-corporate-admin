"use client";

import * as React from "react";
import {
  ChevronDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { cn } from "@/shared/lib/utils";
import type { AsyncComboboxOption } from "@/shared/components/ui/async-combobox";

import { useConsignmentMeta } from "./use-consignment-meta";
import {
  ChipMultiSelect,
  DebouncedInput,
  Field,
  GroupTitle,
  MetaSelect,
  TriState,
} from "./filter-atoms";
import {
  AgentFilterCombobox,
  BranchFilterCombobox,
  CorporateFilterCombobox,
  CustomerFilterCombobox,
  IntegratorMultiFilter,
  ServiceFilterCombobox,
  UserFilterCombobox,
  ViaFilterCombobox,
} from "./filter-comboboxes";
import {
  countActiveFilters,
  countAdvancedFilters,
  PER_PAGE_OPTIONS,
  type ConsignmentRequestFilterValues,
} from "./request-filter-params";

interface MetaOption {
  key: string;
  label: string;
}

export interface ConsignmentRequestFiltersProps {
  value: ConsignmentRequestFilterValues;
  onChange: (next: ConsignmentRequestFilterValues) => void;
  onReset: () => void;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
}

export function ConsignmentRequestFilters({
  value,
  onChange,
  onReset,
  perPage,
  onPerPageChange,
}: ConsignmentRequestFiltersProps) {
  const meta = useConsignmentMeta();
  const statusOptions: MetaOption[] =
    meta?.consignment_request_statuses?.values ?? [];
  const urgencyOptions: MetaOption[] = meta?.consignment_urgency?.values ?? [];
  const productOptions: MetaOption[] =
    meta?.consignment_product_type?.values ?? [];

  const advancedCount = countAdvancedFilters(value);
  const [open, setOpen] = React.useState(advancedCount > 0);

  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const labelOf = (code: string) => labels[code] || code || undefined;
  const remember = (code: string, label?: string) => {
    if (code && label) setLabels((m) => ({ ...m, [code]: label }));
  };

  const set = (patch: Partial<ConsignmentRequestFilterValues>) =>
    onChange({ ...value, ...patch });

  const single =
    (field: keyof ConsignmentRequestFilterValues) =>
    (option: AsyncComboboxOption) => {
      remember(option.value, option.label);
      set({ [field]: option.value } as Partial<ConsignmentRequestFilterValues>);
    };

  const toggleStatus = (key: string) =>
    set({
      status: value.status.includes(key)
        ? value.status.filter((s) => s !== key)
        : [...value.status, key],
    });

  const activeCount = countActiveFilters(value);

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1">
          <DebouncedInput
            value={value.search}
            onCommit={(v) => set({ search: v })}
            placeholder="Search request no., carrier no., shipper ref…"
            maxLength={60}
            icon={<Search className="size-4" />}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((o) => !o)}
          className="gap-1.5"
        >
          <SlidersHorizontal className="size-4" />
          Filters{advancedCount > 0 ? ` (${advancedCount})` : ""}
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          disabled={activeCount === 0}
          className="gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </div>

      <ChipMultiSelect
        value={value.status}
        onToggle={toggleStatus}
        options={statusOptions}
      />

      {open ? (
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <GroupTitle>Identifiers</GroupTitle>
          <Field label="Booking / tracking no.">
            <DebouncedInput
              value={value.request_tracking_id}
              onCommit={(v) => set({ request_tracking_id: v })}
              placeholder="REQ0000001"
              maxLength={40}
            />
          </Field>
          <Field label="Carrier no.">
            <DebouncedInput
              value={value.third_party_tracking}
              onCommit={(v) => set({ third_party_tracking: v })}
              maxLength={40}
            />
          </Field>
          <Field label="Shipper reference">
            <DebouncedInput
              value={value.shipper_reference_code}
              onCommit={(v) => set({ shipper_reference_code: v })}
              maxLength={40}
            />
          </Field>

          <GroupTitle>Parties</GroupTitle>
          <Field label="Customer">
            <CustomerFilterCombobox
              value={value.customer_id}
              selectedLabel={labelOf(value.customer_id)}
              onChange={single("customer_id")}
            />
          </Field>
          <Field label="CIF number">
            <DebouncedInput
              value={value.cif_id}
              onCommit={(v) => set({ cif_id: v })}
              placeholder="CIFC-000012"
              maxLength={30}
            />
          </Field>
          <Field label="Corporate">
            <CorporateFilterCombobox
              value={value.corporate_id}
              selectedLabel={labelOf(value.corporate_id)}
              onChange={single("corporate_id")}
            />
          </Field>
          <Field label="Raised by (user)">
            <UserFilterCombobox
              value={value.user_id}
              selectedLabel={labelOf(value.user_id)}
              onChange={single("user_id")}
            />
          </Field>
          <Field label="Branch">
            <BranchFilterCombobox
              value={value.branch_id}
              selectedLabel={labelOf(value.branch_id)}
              onChange={single("branch_id")}
            />
          </Field>

          <GroupTitle>Routing</GroupTitle>
          <Field label="Via">
            <ViaFilterCombobox
              value={value.via_code}
              selectedLabel={labelOf(value.via_code)}
              onChange={(option) => {
                remember(option.value, option.label);
                set({ via_code: option.value, integrator_code: [] });
              }}
            />
          </Field>
          <Field label="Integrator" className="sm:col-span-2 lg:col-span-1">
            <IntegratorMultiFilter
              value={value.integrator_code}
              onChange={(next) => set({ integrator_code: next })}
              onLabel={remember}
              viaCode={value.via_code || undefined}
            />
          </Field>
          <Field label="Agent">
            <AgentFilterCombobox
              value={value.agent_code}
              selectedLabel={labelOf(value.agent_code)}
              onChange={single("agent_code")}
            />
          </Field>
          <Field label="Service">
            <ServiceFilterCombobox
              value={value.service_code}
              selectedLabel={labelOf(value.service_code)}
              onChange={single("service_code")}
            />
          </Field>

          <GroupTitle>Shipment</GroupTitle>
          <Field label="Product type">
            <MetaSelect
              value={value.product_type}
              onChange={(v) => set({ product_type: v })}
              options={productOptions}
            />
          </Field>
          <Field label="Urgency">
            <MetaSelect
              value={value.urgency}
              onChange={(v) => set({ urgency: v })}
              options={urgencyOptions}
            />
          </Field>
          <Field label="Mode of transport">
            <DebouncedInput
              value={value.mode_of_transport}
              onCommit={(v) => set({ mode_of_transport: v })}
              maxLength={20}
            />
          </Field>
          <Field label="Sender country (ISO2)">
            <DebouncedInput
              value={value.sender_country}
              onCommit={(v) => set({ sender_country: v })}
              maxLength={2}
              transform={(r) => r.toUpperCase()}
            />
          </Field>
          <Field label="Receiver country (ISO2)">
            <DebouncedInput
              value={value.receiver_country}
              onCommit={(v) => set({ receiver_country: v })}
              maxLength={2}
              transform={(r) => r.toUpperCase()}
            />
          </Field>
          <Field label="Receiver city">
            <DebouncedInput
              value={value.receiver_city}
              onCommit={(v) => set({ receiver_city: v })}
              maxLength={60}
            />
          </Field>

          <GroupTitle>Flags</GroupTitle>
          <Field label="Has consignment">
            <TriState
              value={value.has_consignment}
              onChange={(v) => set({ has_consignment: v })}
            />
          </Field>
          <Field label="Needs pickup">
            <TriState
              value={value.need_pickup}
              onChange={(v) => set({ need_pickup: v })}
            />
          </Field>

          <GroupTitle>Weight (kg)</GroupTitle>
          <Field label="Min weight">
            <DebouncedInput
              value={value.weight_min}
              onCommit={(v) => set({ weight_min: v })}
            />
          </Field>
          <Field label="Max weight">
            <DebouncedInput
              value={value.weight_max}
              onCommit={(v) => set({ weight_max: v })}
            />
          </Field>

          <GroupTitle>Dates</GroupTitle>
          <Field label="Created from">
            <Input
              type="date"
              value={value.created_from}
              onChange={(e) => set({ created_from: e.target.value })}
            />
          </Field>
          <Field label="Created to">
            <Input
              type="date"
              value={value.created_to}
              onChange={(e) => set({ created_to: e.target.value })}
            />
          </Field>
          <Field label="Ship date from">
            <Input
              type="date"
              value={value.ship_date_from}
              onChange={(e) => set({ ship_date_from: e.target.value })}
            />
          </Field>
          <Field label="Ship date to">
            <Input
              type="date"
              value={value.ship_date_to}
              onChange={(e) => set({ ship_date_to: e.target.value })}
            />
          </Field>

          <GroupTitle>Display</GroupTitle>
          <Field label="Rows per page">
            <NativeSelect
              value={String(perPage)}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              options={PER_PAGE_OPTIONS.map((o) => ({
                value: String(o),
                label: `${o} / page`,
              }))}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
