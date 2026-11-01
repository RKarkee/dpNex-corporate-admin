# Phase 12 — Billing Accounts

**Status:** code complete — awaiting your verification. `tsc` and `eslint` pass on the source; `npm run build` has to run on the Mac (the sandboxed shell is Linux and `node_modules` carries the macOS SWC binary).

The corporate's own billing accounts: a filtered list, a detail page, and choosing which account is the default.

## Menu restructure (done first)

The old **Billing Accounts** page was really the invoice list. It moved:

| Before | After |
|---|---|
| Sidebar: Billing Accounts → `/billing-accounts` | Sidebar: **Billing → Invoice** → `/billing/invoices` (title "Invoice") |
| — | Sidebar: **Billing → Billing Accounts** → `/billing/accounts` (this phase) |

`next.config.ts` redirects `/billing-accounts/:path*` → `/billing/invoices/:path*` (non-permanent) so old links keep working.

## Structure

```
src/app/(protected)/billing/accounts/
├── page.tsx                      list (RequirePermission + Suspense)
├── [id]/page.tsx                 detail + Make/Remove default
├── [id]/_components/             detail, address card, detail parts, not-found
├── types.ts · permissions.ts
├── lib/                          account-params (URL ⇄ filters), account-format
├── services/billing-account.service.ts
├── _hooks/                       keys, list, detail, default mutations
└── _components/                  view, filters, table, row actions, badges,
                                  default-account-dialog (shared by list + detail)
```

Shared code touched: `nav-constant.ts`, `notifications/lib/notification-routes.ts` (`billingaccount` now opens `/billing/accounts/:id`). The Invoice section gained `permissions.ts`, `_hooks/use-invoice-permissions.ts` and `_components/statement-button.tsx` for its grants.

## Endpoints

```
GET    /corporate/billingaccounts            search, billing_account_code, account_name,
                                             pan, vat, status (A|I), is_primary, country,
                                             city, created_from, created_to, page, per_page
GET    /corporate/billingaccounts/{id}       → data.billingaccount
POST   /corporate/billingaccounts/{id}/primary
DELETE /corporate/billingaccounts/primary    clears the default — takes no id
```

## Decisions

**Filters follow the support-ticket bar.** Search, Status, Default and Rows per page (15 / 25 / 50 / 100, sent as `per_page`, applies at once) are always visible; code, account name, PAN, VAT, country, city and the created range sit behind "More filters", which opens itself when a restored URL carries one. The URL is the source of truth; values the API would reject (bad status, non-ISO-2 country) are dropped on parse. Inputs carry the documented max lengths.

**Remove default is offered only on the default account.** `DELETE /primary` takes no id and clears whichever account is default, so a remove button on any other row would act on something the user was not looking at. Make default is gated on the server's `available_actions.can_mark_primary`, and hidden on the account that is already default.

**One dialog for both actions.** `DefaultAccountDialog` is used by the table and the detail page, so the wording and refusal handling cannot drift. A 422 refusal is shown inside the dialog (which stays open); other failures toast. Success invalidates the whole feature cache — a default change touches two accounts.

**Permissions come from the `billing` group in `/me`.** It carries `view_billing`, `print_billing`, `view_billing_summary`, `view_statement`, `process_online_payments` and `process_cash_payments` — nothing billing-account-specific. So:

| What | Grant |
|---|---|
| Billing → Invoice (menu, list, detail) | `view_billing` |
| Invoice → Download PDF (row menu + detail) | `print_billing` |
| Invoice → summary figures | `view_billing_summary` (not queried without it) |
| Invoice → Bill statement (button + page) | `view_statement` |
| Billing → Billing Accounts (menu, list, detail) | `view_billing` |
| Make / Remove default | no grant — the server's `can_mark_primary`, and its refusal for a removal |

The names live in `billing/invoices/permissions.ts` and `billing/accounts/permissions.ts`; the sidebar entries repeat `view_billing`. A user with no billing grants (the default *Corporate Operations* role) sees no Billing menu at all.

## Left out

- **Enable / disable** — `can_enable` / `can_disable` come back, but no endpoint is published.
- **Create / edit** an account — no endpoints.

## Verify

1. As Corporate Admin, the sidebar shows **Billing → Invoice / Billing Accounts**; Invoice behaves as before. As a user with only Corporate Operations, there is no Billing menu.
2. `/billing/accounts`: filters apply, "More filters" count is right, Clear resets, paging works.
3. Make default on a non-default row → toast, Default badge moves, previous default loses it.
4. Remove default on the default row → toast, no account shows Default.
5. Detail page: same two actions in the header; addresses list, primary first.
6. A refusal (e.g. disabled account) shows the server's message in the dialog.

## The gate

```bash
npm run lint && npm run typecheck && npm run build
```
