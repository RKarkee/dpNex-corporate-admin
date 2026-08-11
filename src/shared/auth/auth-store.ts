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
  /** Refreshes the user after a profile edit without touching the rest. */
  patchUser: (patch: Partial<User>) => void;
  clear: () => void;

  isAuthenticated: () => boolean;
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

      patchUser: (patch) => {
        const user = get().user;
        if (!user) return;
        set({ user: { ...user, ...patch } });
      },

      clear: () => {
        clearAuthCookies();
        set(emptyState());
      },

      isAuthenticated: () => {
        const { token, expiresAt } = get();
        if (!token) return false;
        return !expiresAt || expiresAt > Date.now();
      },
    }),
    {
      name: "dpnex.auth",
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
