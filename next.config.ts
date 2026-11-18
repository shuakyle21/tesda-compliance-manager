import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
