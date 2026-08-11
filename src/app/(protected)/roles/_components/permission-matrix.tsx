"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import {
  groupLabel,
  permissionLabel,
  type PermissionGroups,
} from "@/app/(protected)/roles/services/role.service";
import type { RolePermission } from "@/shared/auth/types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { ScrollTabs } from "@/shared/components/ui/scroll-tabs";
import { cn } from "@/shared/lib/utils";

const ALL = "all";

export interface PermissionMatrixProps {
  groups: PermissionGroups;
  /** Selected permission **ids** — what the API wants back. */
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  disabled?: boolean;
}

/**
 * The permission picker: ~70 checkboxes across 9 groups.
 *
 * Three things make that tractable — a group filter, a text search, and a
 * select-all per group. Without the last one, granting a role its whole
 * consignments block is 23 clicks.
 */
export function PermissionMatrix({
  groups,
  selected,
  onChange,
  disabled = false,
}: PermissionMatrixProps) {
  const [activeGroup, setActiveGroup] = React.useState(ALL);
  const [search, setSearch] = React.useState("");

  const groupNames = React.useMemo(
    () => Object.keys(groups).filter((name) => groups[name]?.length).sort(),
    [groups],
  );

  const total = React.useMemo(
    () => groupNames.reduce((sum, name) => sum + (groups[name]?.length ?? 0), 0),
    [groupNames, groups],
  );

  const query = search.trim().toLowerCase();

  /**
   * Filtered once, here, rather than inside each group's render — the search
   * and the group filter compose, and the empty-state needs to know whether
   * *anything* matched across all groups.
   */
  const visible = React.useMemo(() => {
    const result: { name: string; permissions: RolePermission[] }[] = [];

    for (const name of groupNames) {
      if (activeGroup !== ALL && name !== activeGroup) continue;

      const permissions = (groups[name] ?? []).filter((permission) =>
        query
          ? permissionLabel(permission).toLowerCase().includes(query) ||
            permission.name.toLowerCase().includes(query)
          : true,
      );

      if (permissions.length > 0) result.push({ name, permissions });
    }

    return result;
  }, [groupNames, groups, activeGroup, query]);

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  /**
   * Select-all acts on the *whole* group, not the filtered subset. Toggling a
   * box labelled "consignments" while a search is active should not silently
   * skip the permissions the search hid.
   */
  function toggleGroup(name: string) {
    const permissions = groups[name] ?? [];
    const allSelected = permissions.every((p) => selected.has(p.id));

    const next = new Set(selected);
    for (const permission of permissions) {
      if (allSelected) next.delete(permission.id);
      else next.add(permission.id);
    }

    onChange(next);
  }

  function selectAll() {
    onChange(new Set(groupNames.flatMap((n) => (groups[n] ?? []).map((p) => p.id))));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search permissions…"
            aria-label="Search permissions"
            className="h-10 pl-9"
          />
        </div>

        {/* `flex-1 basis-0` so the two buttons split the row evenly on a phone
            instead of hugging one edge, and revert to natural width from lg. */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={disabled || selected.size === total}
            className="flex-1 basis-0 lg:flex-none lg:basis-auto"
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(new Set())}
            disabled={disabled || selected.size === 0}
            className="flex-1 basis-0 lg:flex-none lg:basis-auto"
          >
            <X className="size-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <ScrollTabs
        aria-label="Permission group"
        value={activeGroup}
        onValueChange={setActiveGroup}
        items={[
          { value: ALL, label: "All", count: total },
          ...groupNames.map((name) => ({
            value: name,
            label: groupLabel(name),
            count: groups[name]?.length ?? 0,
          })),
        ]}
      />

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No permissions match “{search}”.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map(({ name, permissions }) => (
            <GroupSection
              key={name}
              name={name}
              permissions={permissions}
              // The full group, for the header count and the select-all state,
              // which must reflect the group rather than the current filter.
              groupSize={groups[name]?.length ?? 0}
              allSelected={(groups[name] ?? []).every((p) => selected.has(p.id))}
              someSelected={(groups[name] ?? []).some((p) => selected.has(p.id))}
              selected={selected}
              onToggle={toggle}
              onToggleGroup={() => toggleGroup(name)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSection({
  name,
  permissions,
  groupSize,
  allSelected,
  someSelected,
  selected,
  onToggle,
  onToggleGroup,
  disabled,
}: {
  name: string;
  permissions: RolePermission[];
  groupSize: number;
  allSelected: boolean;
  someSelected: boolean;
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleGroup: () => void;
  disabled: boolean;
}) {
  const selectedCount = permissions.filter((p) => selected.has(p.id)).length;

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleGroup}
          disabled={disabled}
          aria-label={`Select all ${groupLabel(name)} permissions`}
          // Partial selection reads as "indeterminate" to assistive tech even
          // though the box itself renders unchecked.
          aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
        />
        <h3 className="flex-1 text-sm font-semibold capitalize text-foreground">
          {groupLabel(name)}
        </h3>
        <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
          {selectedCount} / {groupSize}
        </Badge>
      </header>

      <ul className="grid gap-x-6 gap-y-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {permissions.map((permission) => {
          const id = `perm-${permission.id}`;
          const checked = selected.has(permission.id);

          return (
            <li key={permission.id} className="flex items-start gap-2.5">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={() => onToggle(permission.id)}
                disabled={disabled}
                className="mt-0.5"
              />
              <label
                htmlFor={id}
                className={cn(
                  "min-w-0 flex-1 text-sm capitalize leading-snug",
                  checked ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {permissionLabel(permission)}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
