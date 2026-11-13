import type { NextConfig } from "next";

// Static export: every tool runs in the browser, so there is no server code (see architecture.md in the planning folder).
const nextConfig: NextConfig = {
  output: "export",
  // `npm run build:check` builds into .next-build so it never clobbers a running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { unoptimized: true },
};

export default nextConfig;
