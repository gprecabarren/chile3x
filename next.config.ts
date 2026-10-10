import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // vinext inspects multipart API uploads as progressive server actions before
  // routing. Its 1 MiB default rejected legitimate 1–8 MB media with plain 413.
  // The Worker applies tighter, route-scoped limits before this parser.
  // Keep existing 15 MB private documents and 25 MB reports working too;
  // ordinary forms still have a 1 MiB Worker limit and videos only 8 MB.
  experimental: { serverActions: { bodySizeLimit: "26mb" } },
};

export default nextConfig;
