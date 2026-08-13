"use client";

import * as React from "react";
import { ShieldCheck, TriangleAlert, User } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import { useKycDocuments } from "../_hooks/use-kyc-documents";
import { useProfile } from "../_hooks/use-profile";
import type { ProfileRead } from "../services/profile.service";
import type { KycStatus } from "../types";
import { KycTab, KycTabSkeleton } from "./kyc-tab";
import { ProfileHeader, ProfileHeaderSkeleton } from "./profile-header";
import { ProfileInfoTab, ProfileInfoTabSkeleton } from "./profile-info-tab";

/**
 * Orchestrates the two tabs.
 *
 * The queries are independent on purpose: a KYC failure must not blank the
 * profile form, and vice versa.
 */

export function ProfileView() {
  const profileQuery = useProfile();
  const kycQuery = useKycDocuments();

  const read: ProfileRead | undefined = profileQuery.data;
  const profile = read?.kind === "found" ? read.profile : null;

  // The distinction the whole page rests on. `absent` is the API saying there
  // is no profile — the form opens in create mode. `unreadable` means we could
  // not parse the response, which must never be presented as absence, and must
  // not let the user create a second record on top of one that may exist.
  const unreadable = read?.kind === "unreadable";
  const isCreateMode = read?.kind === "absent";

  const documents = React.useMemo(() => kycQuery.data ?? [], [kycQuery.data]);

  const kycStatus: KycStatus | null =
    profile?.kyc_status ?? deriveKycStatus(documents.map((doc) => doc.status));

  return (
    <div className="space-y-6">
      {profileQuery.isLoading ? (
        <ProfileHeaderSkeleton />
      ) : (
        <ProfileHeader
          profile={profile}
          documentCount={documents.length}
          kycStatus={kycStatus}
        />
      )}

      <Tabs defaultValue="profile" className="flex flex-col gap-4 sm:gap-5">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="profile">
              <User aria-hidden />
              <span className="hidden sm:inline">Profile &amp; addresses</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="kyc">
              <ShieldCheck aria-hidden />
              KYC documents
              {documents.length > 0 ? (
                <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {documents.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          {profileQuery.isLoading ? (
            <ProfileInfoTabSkeleton />
          ) : profileQuery.isError ? (
            // A transport failure is genuinely different: nothing arrived, so
            // there is no form to seed and a retry is the right remedy.
            <LoadError
              title="Could not reach your profile"
              error={profileQuery.error}
              onRetry={() => void profileQuery.refetch()}
            />
          ) : (
            <ProfileInfoTab
              profile={profile}
              isCreateMode={isCreateMode}
              unreadable={unreadable}
            />
          )}
        </TabsContent>

        <TabsContent value="kyc">
          {kycQuery.isLoading ? (
            <KycTabSkeleton />
          ) : kycQuery.isError ? (
            <LoadError
              title="Could not load your documents"
              error={kycQuery.error}
              onRetry={() => void kycQuery.refetch()}
            />
          ) : (
            <KycTab documents={documents} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Reserved for a *transport* failure — no response at all.
 *
 * An unreadable body no longer lands here: that renders the full form with a
 * notice instead, so the page is never replaced by an error card over a
 * parsing disagreement.
 */
function LoadError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" strokeWidth={2} aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {/* `ApiError.message` is already sanitised; a raw upstream body would
          leak stack traces at 5xx. */}
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {isApiError(error)
          ? error.message
          : "Something went wrong. Please try again."}
      </p>
      <Button variant="outline" className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

/** The least-settled status wins, since that is the one needing attention. */
function deriveKycStatus(statuses: KycStatus[]): KycStatus | null {
  if (statuses.length === 0) return null;

  const precedence: KycStatus[] = [
    "REJECTED",
    "EXPIRED",
    "RE_PROCESS",
    "PENDING",
    "APPROVED",
  ];

  return precedence.find((status) => statuses.includes(status)) ?? null;
}
