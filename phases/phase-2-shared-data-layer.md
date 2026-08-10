# Phase 2 — Shared data layer

**Status:** not started. Depends on Phase 1.

Build the components every module will use, once, before any module exists.

## Why first

The reference project's largest ongoing cost is that it did this in the wrong order. It now carries four competing dropdown implementations, two paginators, three data-fetching styles, and two toast systems — all still in use, all needing maintenance. Every one of those started as a module shipping its own version because no shared one existed yet.

## Scope

### `DataTable<T>`

The reference's render-prop contract, which is good:

```ts
interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T, index: number) => ReactNode;
}
```

Plus the two things its version is missing:

- **An honoured `isLoading`.** The reference declares the prop and never reads it. Use the translucent-overlay pattern (`isFetching && !isLoading`) so a stale table stays visible and stable during a refetch instead of collapsing to a spinner.
- **Real pagination**, rather than the bare prev/next it has baked in.

### `Pagination`

Laravel `meta`-native: per-page select (10/25/50/100), an `x–y of N` counter, first/prev/next/last, and jump-to-page. Changing per-page resets to page 1. Consumes the `PageMeta` that `normalizeMeta()` already produces.

### `AsyncCombobox<T>`

Server-paginated searchable select over Popover + Command. Three behaviours from the reference worth copying exactly, because each one is a bug someone already found:

1. 300ms debounce on search.
2. **Stale-response guarding** via a monotonic request-id ref — without it, a slow early response overwrites a fast later one.
3. **Prefill resolution** — in edit mode, look up the current value so the trigger shows a human label rather than a raw code. The reference's `CorporateSelect` skips this and shows "Loading…" forever when the record is not on page 1.

This one component replaces all four of the reference's dropdowns.

### Feedback and errors

- `ErrorState` alongside the existing `EmptyState`.
- An `ErrorBoundary` that is **actually mounted** in the protected layout. The reference has one it never mounts, so uncaught render errors surface as the raw Next error screen.
- `error.tsx` and `loading.tsx` route files — the reference has none anywhere.
- `ConfirmDialog` with a parameterised loading label (the reference hardcodes "Deleting…", so every non-delete confirmation lies).

### Toasts

One system, mounted once, in the root provider stack. Decide the ownership rule now and write it down: **the data layer owns API-result toasts; pages toast only for client-side events.** The reference never decided, so a single failed request can raise three toasts from two stacks in the same corner.

### Query conventions

Codify what Phase 3 onward will copy:

- A key factory per module (`consignmentKeys.list(params)`, `.detail(id)`), so invalidation survives refactors.
- `enabled: Boolean(id)` on detail queries.
- Prefix invalidation after mutations, to catch every paginated variant.
- Server state lives in Query only — never mirrored into `useState` or a store.

## Needs your approval before starting

New dependencies (`INSTRUCTION.md` §1):

| Package | Why |
|---|---|
| `zod` | Schema + inferred form types. The reference's standard across ~17 schema files |
| `react-hook-form` | Forms. ~30 files in the reference |
| `@hookform/resolvers` | Bridges the two |

Alternative: hand-rolled validation with no dependencies. Viable for a login form, painful for the consignment form in Phase 3, which has a nested `boxes[] → items[]` structure that `useFieldArray` handles directly.

## Verify

- Gate green.
- Each component rendered against a hand-written fixture, exercising all four states — loading, empty, error, success (`INSTRUCTION.md` §8).
- `AsyncCombobox`: type fast and confirm no out-of-order result wins; open an edit form with a prefilled value and confirm a human label appears.
- Keyboard: every control reachable and operable, focus ring intact.

## Out of scope

No module pages. No API calls beyond what a fixture needs. If a component cannot be built without a real endpoint, it belongs in Phase 3.
