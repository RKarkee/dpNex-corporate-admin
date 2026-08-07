/** Roles recognised by the admin panel. Extend as the backend grows. */
export type Role =
  | "super-admin"
  | "admin"
  | "operations"
  | "agent"
  | "customer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}
