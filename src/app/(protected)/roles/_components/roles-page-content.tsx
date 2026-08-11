"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRound, Plus, Search, Shield, Users2 } from "lucide-react";

import { countPermissions } from "@/app/(protected)/roles/services/role.service";
import { can } from "@/shared/auth/permissions";
import { RequirePermission } from "@/shared/auth/require-permission";
import { useOptionalSession } from "@/shared/auth/session-context";
import type { Role } from "@/shared/auth/types";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Input } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";

import { useDeleteRole, useRoles } from "../_hooks/use-roles";
import { RolesTable } from "./roles-table";

const PER_PAGE = 10;

export function RolesPageContent() {
  const user = useOptionalSession();
  const canCreate = can(user, "create_role");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [pendingDelete, setPendingDelete] = React.useState<Role | null>(null);

  // Debounced, so typing does not fire a request per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1); // a new query invalidates the current page number
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useRoles({
    page,
    per_page: PER_PAGE,
    search: search || undefined,
  });

  const deleteRole = useDeleteRole();

  const roles = query.data?.items ?? [];
  const meta = query.data?.meta;

  // `isFetching` without `isLoading` means a background refetch — a page change
  // or a new search over rows that are already on screen.
  const refreshing = query.isFetching && !query.isLoading;

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    await deleteRole.mutateAsync(pendingDelete.id);

    // Removing the only row on a trailing page would otherwise leave the user
    // staring at an empty table. Decided here, where we know the row count,
    // rather than reacting to the refetched `meta` — that would be a setState
    // in an effect, and one render later than it needs to be.
    if (roles.length === 1 && page > 1) setPage(page - 1);
  }

  return (
    <>
      <PageHeader
        title="Roles"
        description="Configure roles and the permissions assigned to them."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/roles/create">
                <Plus className="size-4" />
                Add role
              </Link>
            </Button>
          ) : null
        }
      />

      {/* Three across only from `lg` — at `sm` the cards are ~200px wide and
          the hint text wraps to three lines. */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Shield}
          label="Total roles"
          value={meta?.total ?? roles.length}
          hint="In this corporate"
        />
        <StatCard
          icon={KeyRound}
          label="Permissions assigned"
          value={roles.reduce((total, role) => total + countPermissions(role), 0)}
          hint="Across roles on this page"
        />
        <StatCard
          icon={Users2}
          label="On this page"
          value={roles.length}
          hint={meta ? `Page ${meta.page} of ${meta.pageCount}` : "—"}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search roles…"
                aria-label="Search roles"
                className="h-10 pl-9"
              />
            </div>
          </div>

          <RolesTable
            roles={roles}
            loading={query.isLoading}
            refreshing={refreshing}
            error={query.error}
            onDelete={setPendingDelete}
            deletingId={deleteRole.isPending ? deleteRole.variables : null}
          />

          <div className="border-t border-border px-4">
            <Pagination meta={meta} onPageChange={setPage} disabled={refreshing} />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this role?"
        description={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete.label?.trim() || pendingDelete.name}
              </span>{" "}
              will be removed, along with the {countPermissions(pendingDelete)}{" "}
              permissions assigned to it. Anyone holding this role loses the
              access it granted. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete role"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {value}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Route-level guard, so a typed URL is refused the same as a hidden link. */
export function RolesPage() {
  return (
    <RequirePermission anyOf={["corporate_view_any_role", "view_role"]}>
      <RolesPageContent />
    </RequirePermission>
  );
}
