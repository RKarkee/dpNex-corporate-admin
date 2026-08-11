"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// From `session-config`, not `session` — the latter imports `next/headers`,
// which cannot be pulled into a client bundle.
import {
  SESSION_MAX_AGE_REMEMBER_SECONDS,
  SESSION_MAX_AGE_SECONDS,
} from "./session-config";
import { clearAuthCookies, persistAuthCookies } from "./token-storage";
import type { Corporate, LoginSession, User } from "./types";

/**
 * The whole login response, kept for the life of the session.
 *
 * `privateApiClient`'s request interceptor reads `token` from here on every
 * call — this store is the single source of truth for auth state, and the
 * cookie written alongside it exists only so `proxy.ts` and Server Components
 * can gate routes.
 */

interface AuthState {
  /** Sent as `Authorization: Bearer <token>`. */
  token: string | null;
  user: User | null;
  corporates: Corporate[];
  /** Sent as `X-Corporate-Code`. The API rejects `/corporate/*` without it. */
  activeCorporateCode: string | null;
  /** Epoch ms of the last successful sign-in. */
  loggedInAt: number | null;
  /** Epoch ms past which the session is treated as dead. Our policy — the API
   *  issues no `exp` and no refresh token. */
  expiresAt: number | null;

  setSession: (session: LoginSession, remember?: boolean) => void;
  setActiveCorporate: (code: string) => void;
  /** Merges a richer corporate record over the thin one login provided. */
  upsertCorporate: (corporate: Corporate) => void;
  /** Refreshes the user after a profile edit without touching the rest. */
  patchUser: (patch: Partial<User>) => void;
  clear: () => void;

  isAuthenticated: () => boolean;
}

/** The localStorage key. Declared here so the purge below cannot drift from it. */
export const AUTH_STORAGE_KEY = "dpnex.auth";

/**
 * Removes every trace of the session from storage.
 *
 * Not `persist.clearStorage()` — that only knows the current key, and a
 * `version` bump leaves the previous one behind. This sweeps anything that
 * starts with the key, plus the sessionStorage copy an earlier build wrote.
 */
function purgeAuthStorage(): void {
  if (typeof window === "undefined") return;

  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const stale = Object.keys(store).filter((key) =>
        key.startsWith(AUTH_STORAGE_KEY),
      );
      for (const key of stale) store.removeItem(key);
    } catch {
      // Private mode, or storage disabled. The in-memory clear still stands.
    }
  }
}

/** A fresh object each time, so no two resets share an array. */
function emptyState() {
  return {
    token: null,
    user: null,
    corporates: [],
    activeCorporateCode: null,
    loggedInAt: null,
    expiresAt: null,
  } satisfies Pick<
    AuthState,
    | "token"
    | "user"
    | "corporates"
    | "activeCorporateCode"
    | "loggedInAt"
    | "expiresAt"
  >;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      setSession: (session, remember = false) => {
        const maxAge = remember
          ? SESSION_MAX_AGE_REMEMBER_SECONDS
          : SESSION_MAX_AGE_SECONDS;

        const activeCorporateCode =
          session.activeCorporateCode ?? session.corporates[0]?.corp_code ?? null;

        // Written before the state lands, so a navigation triggered by the
        // state change already sees the cookie.
        persistAuthCookies(session.token, activeCorporateCode, maxAge);

        set({
          token: session.token,
          user: session.user,
          corporates: session.corporates,
          activeCorporateCode,
          loggedInAt: Date.now(),
          expiresAt: Date.now() + maxAge * 1000,
        });
      },

      setActiveCorporate: (code) => {
        const state = get();
        // Guard against a stale link setting a corporate the user cannot access.
        if (!state.corporates.some((c) => c.corp_code === code)) return;
        if (!state.token) return;

        const remaining = state.expiresAt
          ? Math.max(0, Math.floor((state.expiresAt - Date.now()) / 1000))
          : SESSION_MAX_AGE_SECONDS;

        persistAuthCookies(state.token, code, remaining);
        set({ activeCorporateCode: code });
      },

      upsertCorporate: (corporate) =>
        set((state) => {
          const index = state.corporates.findIndex(
            (c) => c.corp_code === corporate.corp_code,
          );

          // Spread the incoming record *over* the stored one rather than
          // replacing it — login's `name` should survive a `/me` payload that
          // happens to omit it.
          const next = [...state.corporates];
          if (index >= 0) next[index] = { ...next[index], ...corporate };
          else next.push(corporate);

          return {
            corporates: next,
            activeCorporateCode: state.activeCorporateCode ?? corporate.corp_code,
          };
        }),

      patchUser: (patch) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, ...patch } });
      },

      /**
       * Full teardown: cookies, in-memory state, and the persisted copy.
       *
       * Order matters and so does the early return. `set()` runs through the
       * persist middleware, which writes localStorage synchronously — so the
       * purge has to come *after* the set, or it removes a key that is
       * immediately rewritten.
       *
       * The early return closes the other half of that trap: `AuthGuard` calls
       * `clear()` again the moment it notices there is no token, and that
       * second `set()` would resurrect `dpnex.auth` as an empty object. Empty
       * state is not sensitive, but a key that reappears after logout is a
       * question nobody should have to answer.
       */
      clear: () => {
        clearAuthCookies();

        const { token, user, corporates } = get();
        const alreadyEmpty = !token && !user && corporates.length === 0;

        if (!alreadyEmpty) set(emptyState());

        purgeAuthStorage();
      },

      isAuthenticated: () => {
        const { token, expiresAt } = get();
        if (!token) return false;
        return !expiresAt || expiresAt > Date.now();
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? // SSR pass: a no-op store, so `persist` does not touch `window`.
            { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : window.localStorage,
      ),
      version: 1,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        corporates: state.corporates,
        activeCorporateCode: state.activeCorporateCode,
        loggedInAt: state.loggedInAt,
        expiresAt: state.expiresAt,
      }),
      // A tab left open overnight rehydrates a token that has already lapsed;
      // drop it here rather than firing a request that is certain to 401.
      onRehydrateStorage: () => (state) => {
        if (state?.expiresAt && state.expiresAt <= Date.now()) state.clear();
      },
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* Non-reactive reads, for interceptors and other non-React callers.          */
/* -------------------------------------------------------------------------- */

export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

export function getActiveCorporateCode(): string | null {
  return useAuthStore.getState().activeCorporateCode;
}

export function getStoredUser(): User | null {
  return useAuthStore.getState().user;
}

export function clearAuthStore(): void {
  useAuthStore.getState().clear();
}
