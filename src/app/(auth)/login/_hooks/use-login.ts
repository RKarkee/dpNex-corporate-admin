"use client";

import { useMutation } from "@tanstack/react-query";

import type { LoginResult } from "@/shared/auth/types";

/** Signs in through our route handler. A hard navigation follows, so the server re-reads the cookie. */
export function useLogin(next?: string) {
  return useMutation({
    mutationFn: async (credentials: FormData): Promise<LoginResult> => {
      let response: Response;
      try {
        response = await fetch("/api/auth/login", {
          method: "POST",
          body: credentials,
        });
      } catch {
        throw new Error(
          "Could not reach the service. Check your connection and try again.",
        );
      }

      const result = (await response.json().catch(() => null)) as
        | LoginResult
        | null;

      if (!result || !result.ok) {
        throw new Error(result?.error ?? "Sign in failed. Please try again.");
      }

      return result;
    },
    onSuccess: () => {
      window.location.assign(next ?? "/dashboard");
    },
  });
}
