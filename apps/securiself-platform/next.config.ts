import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root so Next.js does not infer an unrelated parent
    // lockfile outside this monorepo.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
