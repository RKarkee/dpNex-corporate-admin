"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { login } from "@/shared/auth/auth-api";
import { useAuthStore } from "@/shared/auth/auth-store";
import type { LoginCredentials } from "@/shared/auth/types";
import { routes } from "@/shared/config/site";

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (data) => {
      setSession({ user: data.user, token: data.token });
      router.replace(routes.dashboard);
    },
  });
}
