import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage standalone build
  output: "standalone",
};

export default nextConfig;
