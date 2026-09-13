import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { ChannelPreferences } from "../_components/channel-preferences";
import { DeviceTokensSection } from "../_components/device-tokens-section";

export const metadata: Metadata = {
  title: "Notification settings",
};

export default function NotificationSettingsPage() {
  return (
    <>
      <PageHeader
        title="Notification settings"
        description="Choose how we reach you, and manage the devices signed in to your account."
        actions={
          <Button variant="outline" asChild>
            <Link href="/notifications">
              <ArrowLeft className="size-4" />
              Notifications
            </Link>
          </Button>
        }
      />

      <div className="space-y-8">
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Channels</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Turn a channel off and we stop using it for your notifications.
            </p>
          </div>
          <ChannelPreferences />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Devices</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Devices registered to receive push notifications.
            </p>
          </div>
          <DeviceTokensSection />
        </section>
      </div>
    </>
  );
}
