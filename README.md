# DpNEx Admin — Cargo / Courier Management Panel

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Zustand · TanStack Query

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Any email + a password of 4+ characters signs you in (the auth API is mocked in
`src/shared/auth/auth-api.ts`). Scripts: `dev`, `build`, `start`, `lint`, `typecheck`.

## Folder architecture

Colocation-first. A feature's files live **inside its own route folder**; only
genuinely cross-route code sits in `shared/`.

```
src/
├── app/
│   ├── layout.tsx                    Root layout + providers
│   ├── page.tsx                      Redirects "/" → /dashboard
│   ├── globals.css                   Tailwind v4 + DpNEx design tokens
│   ├── not-found.tsx
│   │
│   ├── (auth)/
│   │   ├── layout.tsx                Centered gradient shell
│   │   └── login/
│   │       ├── page.tsx              Split-panel sign-in
│   │       ├── _components/          login-form.tsx
│   │       └── _hooks/               use-login.ts
│   │
│   └── (protected)/
│       ├── layout.tsx                → <ProtectedLayout>
│       ├── _components/              Shell — used by every protected route
│       │   ├── protected-layout.tsx
│       │   ├── sidebar.tsx           Desktop rail + mobile drawer
│       │   ├── sidebar-nav.tsx       Renders NavItem[], active state, groups
│       │   ├── header.tsx
│       │   ├── user-menu.tsx
│       │   └── brand.tsx
│       ├── _store/
│       │   └── sidebar-store.ts      Shell-only UI state
│       ├── dashboard/
│       │   ├── page.tsx
│       │   └── _components/          stat-card.tsx · quick-actions.tsx
│       ├── users/page.tsx
│       └── consignments/
│           ├── request/page.tsx
│           └── admin/page.tsx
│
└── shared/
    ├── auth/          auth-store · auth-guard · auth-api · types
    ├── components/    page-header.tsx · empty-state.tsx
    │   └── ui/        shadcn primitives
    ├── config/        navigation.ts · site.ts
    ├── hooks/         use-media-query · use-mounted
    ├── lib/           utils.ts (cn, getInitials)
    ├── providers/     app-providers · query-provider
    └── types/         Role · AuthUser
```

### The placement rule

**A folder owns what only it uses. The moment two routes need it, it moves up to
the nearest common parent.**

That is why `login-form.tsx` sits under `login/_components/`, the shell sits under
`(protected)/_components/`, and the session store sits in `shared/auth/` — the
sidebar reads `user.role` for menu filtering and the user menu reads name/email,
so it cannot live inside the `(auth)` group.

When request and admin start sharing a component, create
`consignments/_components/` rather than reaching for `shared/`.

The `_` prefix marks a folder **private** in the App Router — explicitly opted out
of routing, so nothing under `_components` or `_store` can ever become a URL.

## Navigation is the single source of truth

Everything the sidebar renders — desktop rail, collapsed rail tooltips, and the
mobile drawer — is derived from `src/shared/config/navigation.ts`.

```ts
export type NavItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  roles?: Role[]; // for future role-based access
};
```

Add a top-level item:

```ts
export const sidebarNav: NavItem[] = [
  // ...
  { title: "Shipments", href: "/shipments", icon: Truck },
];
```

Add a nested item — just push into `children`. Any parent with `children` renders
as a collapsible group with a chevron automatically.

### Role-based menus

`filterNavByRole(sidebarNav, role)` runs before render in both `Sidebar` and
`MobileSidebar`. An item with no `roles` is visible to everyone; a parent whose
children are all filtered out disappears too.

```ts
{ title: "Roles", href: "/roles", icon: Shield, roles: ["super-admin", "admin"] }
```

The role comes from `useAuthStore((s) => s.user?.role)`, so it starts working the
moment your real login response carries a role.

## Layout system

| Component | Responsibility |
| --- | --- |
| `ProtectedLayout` | Composes guard + providers + sidebar + header + `<main>` |
| `Sidebar` | Fixed desktop rail, `272px` ⇄ `76px` collapsed, tooltips when collapsed |
| `MobileSidebar` | Same nav inside a Radix drawer below `lg` |
| `SidebarNav` | Renders `NavItem[]`, handles active state and collapsible groups |
| `Header` | Sticky, mobile menu button, search, user dropdown + Logout |
| `AuthGuard` | Waits for store rehydration, then redirects unauthenticated users |

Behaviour notes:

- Collapsed state and expanded groups persist to `localStorage` (`dpnex.sidebar`).
- The group owning the current route auto-expands on navigation.
- Active route uses `bg-sidebar-primary` (dark navy) with a nested left rail marker.
- Active matching is prefix-based, so `/consignments/request/42` still highlights
  Consignment Request.

## Design tokens

Defined once in `src/app/globals.css` and exposed to Tailwind through `@theme inline`:

| Token | Value | Used for |
| --- | --- | --- |
| `--primary` | `#0b2545` | Active nav, primary buttons, focus ring |
| `--brand-crimson` | `#8b1538` | "Pending Orders", Generate Report |
| `--brand-orange` | `#e2661a` | "Delivered Today", Manage Clients |
| `--background` | `#f6f8fb` | App canvas |
| `--shadow-card` | soft 2-layer | All cards |

A `.dark` block is already wired up — add a theme toggle whenever you need it.

## Replacing the mock API

`src/shared/auth/auth-api.ts` is the only place with fake data. Swap the function
bodies for `fetch` calls against `NEXT_PUBLIC_API_BASE_URL`; the hooks, stores, and
components above it need no changes.

## Verified

`npm run typecheck`, `npm run lint`, and `npm run build` all pass clean on
Next.js 16.3.0 with `strict`, `noUncheckedIndexedAccess`, and `noUnusedLocals`.
