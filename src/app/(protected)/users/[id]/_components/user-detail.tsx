"use client";

import * as React from "react";
import { Briefcase, Mail, Phone, ShieldCheck } from "lucide-react";

import {
  displayName,
  initials,
  isDisabled,
  type User,
} from "@/shared/auth/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFileUrl } from "@/shared/hooks/use-file-url";

import { UserStatusBadge } from "../../_components/user-status-badge";
import { UserRolePermissions } from "./user-role-permissions";

/**
 * Everything the directory row could not fit: the person's card on the left,
 * their details grouped on the right.
 *
 * `/login` and `/me` disagree about which fields a user carries, so most of
 * this is optional — a field the API did not send renders an em dash rather
 * than an empty line the reader cannot interpret.
 */
export function UserDetail({ user }: { user: User }) {
  const name = displayName(user);
  const roles = user.roles ?? [];

  // The stored value is an authenticated endpoint, not a file — `useFileUrl`
  // calls it and returns the URL an `<img>` can actually load.
  const { src: photo } = useFileUrl(user.image ?? user.image_thumbnail);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Avatar className="size-28 border-4 border-card shadow-card">
            {photo ? <AvatarImage src={photo} alt="" /> : null}
            <AvatarFallback className="text-2xl">
              {initials(user)}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-foreground">{name}</h2>
            {/* `break-all`: an address long enough to overflow has no space for
                the browser to wrap at. */}
            <p className="break-all text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <UserStatusBadge user={user} />
            <Badge variant="secondary">{user.user_type}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="space-y-8 py-6">
          <Section title="Contact information">
            <Field icon={Mail} label="Email address">
              <span className="break-all">{user.email}</span>
            </Field>
            <Field icon={Phone} label="Phone number">
              {user.phone?.trim() || "—"}
            </Field>
          </Section>

          <Section title="Account information">
            <Field icon={ShieldCheck} label="Status">
              {isDisabled(user) ? "Disabled" : "Active"}
            </Field>
            <Field icon={Briefcase} label="Roles">
              {roles.length === 0
                ? "None assigned"
                : `${roles.length} ${roles.length === 1 ? "role" : "roles"}`}
            </Field>
          </Section>

          {/*
            Full width, outside the two-column `Section` grid: the roles carry
            their permissions with them and a 90-item list does not belong in
            a half-width column beside a phone number.
          */}
          <section>
            <SectionHeading>Roles and permissions</SectionHeading>
            <UserRolePermissions roles={roles} />
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 border-b border-border pb-2 text-base font-semibold text-foreground">
      {children}
    </h3>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon aria-hidden className="size-4" />
        {label}
      </span>
      <p className="font-medium text-foreground">{children}</p>
    </div>
  );
}

/** The same two-card grid with the values blanked. */
export function UserDetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <Skeleton className="size-28 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="space-y-8 py-6">
          {Array.from({ length: 2 }).map((_, section) => (
            <div key={section}>
              <Skeleton className="h-5 w-44" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((__, field) => (
                  <div key={field} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
