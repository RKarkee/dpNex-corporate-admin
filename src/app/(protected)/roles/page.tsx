import type { Metadata } from "next";

import { RolesPage } from "./_components/roles-page-content";

export const metadata: Metadata = {
  title: "Roles",
};

export default function Page() {
  return <RolesPage />;
}
