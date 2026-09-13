# Phase 10 — Notifications

**Status:** code complete — awaiting your verification (`npm run lint && npm run typecheck && npm run build` has to run on the Mac; the sandboxed workspace was down while this was written).

Ten endpoints answering three different questions, so they get three surfaces — plus a fourth thing that is not a notification at all.

| Question | Surface | Endpoints |
|---|---|---|
| What just happened? | Header bell → panel | `unseen-count`, `notifications` (newest 8), `{id}/read`, `read-all` |
| What happened, all of it? | `/notifications` | `notifications` + filters + pagination |
| What is still open? | Header checklist → attention menu | `attention-summary` |
| How do I get told? | `/notifications/settings` | `notification-preferences`, `device-tokens` |

## Structure

```
src/app/(protected)/notifications/
├── page.tsx · settings/page.tsx
├── types.ts                        record shapes only — no vocabularies
├── lib/notification-routes.ts      entity_type → href, ONE table
├── lib/notification-display.ts     badges, attention rows, grouping, ages
├── lib/notification-params.ts      URL ⇄ filters
├── services/                       notification · preference · device-token · attention-summary
├── _hooks/                         keys, inbox + optimistic writes, preferences, devices
├── _provider/notification-provider.tsx
└── _components/                    bell, attention menu, item, filters, table, view, settings sections
```

Touched: `use-meta-options.ts` (+ `notification_types`, `notification_channels`), `_components/header.tsx` (the two controls), `_components/protected-layout.tsx` (the provider), `nav-constant.ts` (Notifications → Inbox / Settings).

## Decisions

**Nothing enumerates a vocabulary.** No list of notification types or channels exists in this app. Types come from `/meta` for the filter and the tooltips; the badge is the humanised key, so a type shipped after this build still renders with a sensible name. Channels are merged from `/meta` and the preferences response — a channel either source knows about appears. The attention menu is built from the summary's own keys, so a metric the API adds tomorrow shows up without a release here.

**Two controls, two questions.** The bell says what HAPPENED (red badge, unread count); the checklist says what is still OPEN (amber badge, work waiting). `notifications.unread` is excluded from the attention rows and its badge, because one number shown in two places stops meaning either. Subset metrics — `unseen` inside `pending` — are marked and excluded from the attention total rather than counted twice.

**One owner for the state.** The provider starts the three shared queries once, inside `AuthGuard`. Three components fetching for themselves is how the badge, the panel and the inbox end up disagreeing, and how a mark-read in one is never heard by the other two. The inbox runs its own filtered query but under the same cache root, so the optimistic patch reaches it.

**Optimistic mark-read, across every cache.** `setQueriesData` over the `list` prefix patches the row wherever it is held, and the badge is decremented in the same tick — a dot disappearing while the count stays put reads as a bug. A failure restores every patched list and the count together.

**Polling, with the door open for websockets.** 60s against `unseen-count` — the endpoint built for it — with `refetchIntervalInBackground: false`, so a tab left open in another window costs nothing. The inbox page itself does not poll: rows appearing under the cursor while someone works down the list is the opposite of helpful. The admin console runs Laravel Echo with polling as its safety net; adding that here is one client module, two dependencies and env — the provider does not change.

**An unroutable notification is not a link.** `entity_type` → URL lives in one table with normalised keys (`support_ticket`, `SupportTicket`, `support-tickets` all resolve). Anything unmapped renders as plain text with "Support ticket #11" beneath it: a guessed URL is a 404 that reads as a broken notification rather than a screen this portal does not have.

**The type filter cannot be validated here.** The docs list three types, `/meta` publishes thirteen, and live rows carry `OTHER`, which is in neither. So nothing in this app checks the value — and if the endpoint refuses one, the view says so and offers "Clear the type filter" instead of dying. That message disappears on its own the day the two lists agree.

**`is_default` is reported, never offered.** Touching a channel stores a row and the flag goes false; no endpoint puts it back, so there is a "Default" chip and no reset.

## Left out

- **Registering this browser for push.** Needs a Firebase project, a service worker and a permission prompt. The device list and removal are useful without it — that is how someone stops a phone they no longer have from receiving their notifications.
- **Websockets.** See above; deliberately a second step.
- **A dashboard "needs attention" card.** The header menu covers it for now.

## Backend notes worth acting on

1. Support-ticket notifications arrive as `type: "OTHER"` when `SUPPORT_TICKET_UPDATE` exists and describes them exactly — so the most common notification in this portal cannot be filtered for.
2. The list endpoint's documented `type` enum (3 values) disagrees with `/meta` (13).

## The gate

```bash
npm run lint && npm run typecheck && npm run build
```
