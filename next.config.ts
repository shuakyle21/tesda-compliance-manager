import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // Qualification header images: 5 MB bucket limit plus multipart overhead.
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
