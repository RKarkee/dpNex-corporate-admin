"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthUser } from "@/shared/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** False until the persisted store has rehydrated on the client. */
  hydrated: boolean;
  isAuthenticated: () => boolean;
  setSession: (payload: { user: AuthUser; token: string }) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

/**
 * App-wide session. Lives in shared/ because the protected shell (sidebar role
 * filtering, user menu) and the login flow both depend on it.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hydrated: false,
      isAuthenticated: () => Boolean(get().token),
      setSession: ({ user, token }) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: "dpnex.auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
