import type { Metadata } from "next";
import { safeNext } from "@/shared/auth/session-config";
import { siteConfig } from "@/shared/config/site";

import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

const highlights = [
  { label: "Secure", dot: "bg-brand-orange" },
  { label: "Reliable", dot: "bg-brand-orange" },
  { label: "Efficient", dot: "bg-brand-orange" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; expired?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const expired = params.expired === "1";

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-card shadow-[0_24px_70px_-30px_rgb(15_23_42/0.45)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-center bg-[linear-gradient(135deg,#0b2545_0%,#2a1030_55%,#7e1230_100%)] p-10 text-white lg:flex xl:p-14">
        <div className="mb-12 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-white/10 backdrop-blur">
            <span className="text-lg font-semibold leading-none">D</span>
          </span>
          <span className="text-sm font-medium tracking-wide text-white/90">
            {siteConfig.name} Logo
          </span>
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-[2.75rem]">
          Welcome to {siteConfig.name}
        </h1>
        <p className="mt-5 max-w-md text-[0.975rem] leading-relaxed text-white/75">
          Your comprehensive cargo management solution. Streamline logistics,
          track shipments, and manage your supply chain with ease.
        </p>

        <ul className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/85">
          {highlights.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className={`size-1.5 rounded-full ${item.dot}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center p-8 sm:p-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Sign In
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Access your cargo management dashboard
            </p>
          </div>

          {expired ? (
            <p
              role="status"
              className="mb-5 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground"
            >
              Your session has ended. Please sign in again.
            </p>
          ) : null}

          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
