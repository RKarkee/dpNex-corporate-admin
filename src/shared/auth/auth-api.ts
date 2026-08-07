import type { AuthUser } from "@/shared/types";

import type { LoginCredentials, LoginResponse } from "./types";

/**
 * Mock transport. Swap the bodies for real `fetch` calls once the API is live —
 * nothing above this layer needs to change.
 */
const FAKE_LATENCY_MS = 700;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  await delay(FAKE_LATENCY_MS);

  if (!credentials.email || credentials.password.length < 4) {
    throw new Error("Invalid email or password.");
  }

  const namePart = credentials.email.split("@")[0] ?? "user";
  const user: AuthUser = {
    id: "usr_1",
    name: namePart
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    email: credentials.email,
    role: "super-admin",
  };

  return { user, token: "mock.jwt.token" };
}

export async function logout(): Promise<void> {
  await delay(200);
}
