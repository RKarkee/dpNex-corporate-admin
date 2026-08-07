import * as React from "react";

import { ProtectedLayout } from "./_components/protected-layout";

export default function ProtectedGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
