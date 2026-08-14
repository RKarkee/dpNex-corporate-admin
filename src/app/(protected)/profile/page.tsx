import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { ProfileView } from "./_components/profile-view";

export const metadata: Metadata = {
  title: "Profile",
};

/**
 * The signed-in user's own profile.
 *
 * No `RequirePermission` wrapper: this is the user's own record, not an admin
 * surface, so there is no permission to hold. The API still scopes every call
 * to the caller.
 */
export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="My profile"
      />
      <ProfileView />
    </>
  );
}
