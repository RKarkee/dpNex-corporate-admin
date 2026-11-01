import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  async redirects() {
    return [
      // The invoice list moved under the Billing menu; keep old links and
      // bookmarks working. Not permanent while the Billing section is in flux.
      {
        source: "/billing-accounts/:path*",
        destination: "/billing/invoices/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
