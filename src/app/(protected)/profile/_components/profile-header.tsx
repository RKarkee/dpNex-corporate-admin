"use client";

import { Building2, MapPin, Phone, ShieldCheck } from "lucide-react";

import { useSession } from "@/shared/auth/session-context";
import { displayName } from "@/shared/auth/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFileUrl } from "@/shared/hooks/use-file-url";
import { getInitials } from "@/shared/lib/utils";

import type { CustomerProfile, KycStatus } from "../types";
import { KycOverallBadge } from "./kyc-status-badge";

/**
 * The identity card above the tabs.
 *
 * Read-only. The company block is the one addition over the reference layout:
 * a `CRP` user's corporate arrives nested in the profile payload, so showing
 * `corp_code` / PAN / VAT costs no extra request.
 *
 * The avatar is not editable here — user photos are managed under
 * `users/[id]/edit`, and a second upload would give two places to change one
 * thing.
 */

export function ProfileHeaderSkeleton() {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/** The shared pill recipe — icon plus label, never colour alone. */
function StatPill({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

export function ProfileHeader({
  profile,
  documentCount,
  kycStatus,
}: {
  profile: CustomerProfile | null;
  documentCount: number;
  kycStatus: KycStatus | null;
}) {
  const user = useSession();
  const { src: avatarUrl } = useFileUrl(user.image_thumbnail ?? user.image);

  // This is "My profile", so the signed-in person is the title — not the
  // company. An earlier version led with `profile.name` and the card read
  // "ABC corporate" above the user's own email, which made it look like the
  // company's page. The company keeps its own line below.
  const title = displayName(user);
  const addressCount = profile?.addresses.length ?? 0;

  // Nested in the profile payload, and also on the session — either will do.
  const corporate = profile?.corporate ?? user.corporate ?? null;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <Avatar className="size-16 shrink-0 ring-4 ring-primary/10 sm:size-20">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-xl font-bold sm:text-2xl">
            {getInitials(title)}
          </AvatarFallback>
        </Avatar>

        <div className="w-full min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {user.email}
          </p>

          {corporate ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" aria-hidden />
              {/* The account this person belongs to. `profile.name` is the same
                  company under its customer record, so it is not repeated. */}
              <span className="font-medium text-foreground">
                {profile?.name?.trim() ||
                  corporate.registered_name?.trim() ||
                  corporate.name}
              </span>
              <span aria-hidden>·</span>
              <span>{corporate.corp_code}</span>
              {corporate.pan ? (
                <>
                  <span aria-hidden>·</span>
                  <span>PAN {corporate.pan}</span>
                </>
              ) : null}
              {corporate.vat ? (
                <>
                  <span aria-hidden>·</span>
                  <span>VAT {corporate.vat}</span>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <KycOverallBadge status={kycStatus} />

            <StatPill icon={MapPin}>
              {addressCount === 0
                ? "No address"
                : addressCount === 1
                  ? "1 address"
                  : `${addressCount} addresses`}
            </StatPill>

            {profile?.phone_1 ? (
              <StatPill icon={Phone}>{profile.phone_1}</StatPill>
            ) : null}

            {documentCount > 0 ? (
              <StatPill icon={ShieldCheck}>
                {documentCount === 1 ? "1 document" : `${documentCount} documents`}
              </StatPill>
            ) : null}
          </div>
        </div>

        {/* Two variants of the same counts. Below `sm` they sit full-width
            under a divider; from `lg` they sit at the end of the row. Between
            those widths the badge row above already carries the information,
            and a third layout would only crowd it. */}
        <div className="flex w-full justify-around gap-6 border-t border-border pt-3 sm:hidden">
          <Stat value={documentCount} label="Documents" />
          <Stat value={addressCount} label="Addresses" />
        </div>

        <div className="hidden shrink-0 gap-6 text-center lg:flex">
          <Stat value={documentCount} label="Documents" />
          <div className="w-px bg-border" />
          <Stat value={addressCount} label="Addresses" />
        </div>
      </div>
    </Card>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-foreground lg:text-2xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
