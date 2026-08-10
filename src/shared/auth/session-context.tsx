"use client";

import * as React from "react";

import type { User } from "./types";

/** The signed-in user, resolved on the server. Fixed for the life of a page load. */
const SessionContext = React.createContext<User | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

export function useSession(): User {
  const user = React.useContext(SessionContext);
  if (!user) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return user;
}
