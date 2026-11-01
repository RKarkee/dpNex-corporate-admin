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
  BatchFilterCombobox,
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
  type ConsignmentAdminFilterValues,
} from "./admin-filter-params";

interface MetaOption {
  key: string;
  label: string;
}

export interface ConsignmentAdminFiltersProps {
  value: ConsignmentAdminFilterValues;
  onChange: (next: ConsignmentAdminFilterValues) => void;
  onReset: () => void;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
}

export function ConsignmentAdminFilters({
  value,
  onChange,
  onReset,
  perPage,
  onPerPageChange,
}: ConsignmentAdminFiltersProps) {
  const meta = useConsignmentMeta();
  const statusOptions: MetaOption[] = meta?.consignment_statuses?.values ?? [];
  const settlementOptions: MetaOption[] =
    meta?.consignment_settlement_statuses?.values ?? [];
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

  const set = (patch: Partial<ConsignmentAdminFilterValues>) =>
    onChange({ ...value, ...patch });

  const single =
    (field: keyof ConsignmentAdminFilterValues) =>
    (option: AsyncComboboxOption) => {
      remember(option.value, option.label);
      set({ [field]: option.value } as Partial<ConsignmentAdminFilterValues>);
    };

  const toggleIn = (field: "status" | "settlement_status") => (key: string) =>
    set({
      [field]: value[field].includes(key)
        ? value[field].filter((s) => s !== key)
        : [...value[field], key],
    } as Partial<ConsignmentAdminFilterValues>);

  const activeCount = countActiveFilters(value);

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1">
          <DebouncedInput
            value={value.search}
            onCommit={(v) => set({ search: v })}
            placeholder="Search HAWB, request no., carrier no., shipper ref…"
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
        onToggle={toggleIn("status")}
        options={statusOptions}
      />

      {open ? (
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <GroupTitle>Identifiers</GroupTitle>
          <Field label="HAWB (tracking no.)">
            <DebouncedInput
              value={value.tracking_no}
              onCommit={(v) => set({ tracking_no: v })}
              placeholder="DPX00001"
              maxLength={40}
            />
          </Field>
          <Field label="Booking no.">
            <DebouncedInput
              value={value.request_tracking_id}
              onCommit={(v) => set({ request_tracking_id: v })}
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
          <Field label="Forwarding no.">
            <DebouncedInput
              value={value.new_tracking_no}
              onCommit={(v) => set({ new_tracking_no: v })}
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
          <Field label="CIF number">
            <DebouncedInput
              value={value.cif_id}
              onCommit={(v) => set({ cif_id: v })}
              placeholder="CIFC-000012"
              maxLength={30}
            />
          </Field>

          {settlementOptions.length > 0 ? (
            <>
              <GroupTitle>Settlement status</GroupTitle>
              <div className="sm:col-span-2 lg:col-span-3">
                <ChipMultiSelect
                  value={value.settlement_status}
                  onToggle={toggleIn("settlement_status")}
                  options={settlementOptions}
                />
              </div>
            </>
          ) : null}

          <GroupTitle>Parties</GroupTitle>
          <Field label="Customer">
            <CustomerFilterCombobox
              value={value.customer_id}
              selectedLabel={labelOf(value.customer_id)}
              onChange={single("customer_id")}
            />
          </Field>
          <Field label="Corporate">
            <CorporateFilterCombobox
              value={value.corporate_id}
              selectedLabel={labelOf(value.corporate_id)}
              onChange={single("corporate_id")}
            />
          </Field>
          <Field label="Booked by (user)">
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
          <Field label="Batch">
            <BatchFilterCombobox
              value={value.batch_id}
              selectedLabel={labelOf(value.batch_id)}
              onChange={single("batch_id")}
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
          <Field label="Has batch">
            <TriState
              value={value.has_batch}
              onChange={(v) => set({ has_batch: v })}
            />
          </Field>
          <Field label="Has label">
            <TriState
              value={value.has_label}
              onChange={(v) => set({ has_label: v })}
            />
          </Field>
          <Field label="Has invoice">
            <TriState
              value={value.has_invoice}
              onChange={(v) => set({ has_invoice: v })}
            />
          </Field>
          <Field label="Has active invoice">
            <TriState
              value={value.has_active_invoice}
              onChange={(v) => set({ has_active_invoice: v })}
            />
          </Field>
          <Field label="Forwarded">
            <TriState
              value={value.is_forwarded}
              onChange={(v) => set({ is_forwarded: v })}
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

          <GroupTitle>HAWB range</GroupTitle>
          <Field label="HAWB from">
            <DebouncedInput
              value={value.hawb_from}
              onCommit={(v) => set({ hawb_from: v })}
              placeholder="DPX000100"
              maxLength={40}
            />
          </Field>
          <Field label="HAWB to">
            <DebouncedInput
              value={value.hawb_to}
              onCommit={(v) => set({ hawb_to: v })}
              placeholder="DPX000200"
              maxLength={40}
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
