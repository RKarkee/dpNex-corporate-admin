import { redirect } from "next/navigation";

import { routes } from "@/shared/config/site";

export default function RootPage() {
  redirect(routes.dashboard);
}
