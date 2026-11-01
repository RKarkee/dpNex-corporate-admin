"use client";

import * as React from "react";

import {
  AsyncCombobox,
  type AsyncComboboxOption,
} from "@/shared/components/ui/async-combobox";

import {
  agentFetcher,
  batchFetcher,
  branchFetcher,
  corporateFetcher,
  customerFetcher,
  makeIntegratorFetcher,
  serviceFetcher,
  userFetcher,
  viaFetcher,
} from "./filter-lookups";

export interface SingleFilterComboboxProps {
  value: string;
  onChange: (option: AsyncComboboxOption) => void;
  selectedLabel?: string;
}

type Fetcher = (page: number, query: string) => Promise<any>;

function makeSingle(
  fetchPage: Fetcher,
  placeholder: string,
  searchPlaceholder: string,
  emptyText: string,
) {
  const Cmp: React.FC<SingleFilterComboboxProps> = ({
    value,
    onChange,
    selectedLabel,
  }) => (
    <AsyncCombobox
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      fetchPage={fetchPage}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      clearable
      clearLabel={placeholder}
    />
  );
  return Cmp;
}

export const ViaFilterCombobox = makeSingle(
  viaFetcher,
  "Any via",
  "Search vias…",
  "No vias found.",
);
export const AgentFilterCombobox = makeSingle(
  agentFetcher,
  "Any agent",
  "Search agents…",
  "No agents found.",
);
export const ServiceFilterCombobox = makeSingle(
  serviceFetcher,
  "Any service",
  "Search services…",
  "No services found.",
);
export const CustomerFilterCombobox = makeSingle(
  customerFetcher,
  "Any customer",
  "Search customers…",
  "No customers found.",
);
export const CorporateFilterCombobox = makeSingle(
  corporateFetcher,
  "Any corporate",
  "Search corporates…",
  "No corporates found.",
);
export const UserFilterCombobox = makeSingle(
  userFetcher,
  "Any user",
  "Search users…",
  "No users found.",
);
export const BranchFilterCombobox = makeSingle(
  branchFetcher,
  "Any branch",
  "Search branches…",
  "No branches found.",
);
export const BatchFilterCombobox = makeSingle(
  batchFetcher,
  "Any batch",
  "Search batches…",
  "No batches found.",
);

export interface IntegratorMultiFilterProps {
  value: string[];
  onChange: (next: string[]) => void;
  onLabel?: (value: string, label: string) => void;
  viaCode?: string;
}

/** Multiselect integrator, scoped to the chosen via (or the master list). */
export const IntegratorMultiFilter: React.FC<IntegratorMultiFilterProps> = ({
  value,
  onChange,
  onLabel,
  viaCode,
}) => {
  const fetchPage = React.useMemo(
    () => makeIntegratorFetcher(viaCode),
    [viaCode],
  );
  const toggle = (option: AsyncComboboxOption) => {
    onLabel?.(option.value, option.label);
    onChange(
      value.includes(option.value)
        ? value.filter((v) => v !== option.value)
        : [...value, option.value],
    );
  };
  return (
    <AsyncCombobox
      multiple
      value=""
      selectedValues={value}
      selectedLabel={value.length ? `${value.length} selected` : undefined}
      onChange={toggle}
      fetchPage={fetchPage}
      placeholder="Any integrator"
      searchPlaceholder="Search integrators…"
      emptyText="No integrators found."
    />
  );
};
