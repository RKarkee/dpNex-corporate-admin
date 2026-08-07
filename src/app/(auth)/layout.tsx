import * as React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh place-items-center bg-[linear-gradient(180deg,#eef3fb_0%,#e7eefb_100%)] p-4 sm:p-8">
      {children}
    </div>
  );
}
