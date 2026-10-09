import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Prevent lint warnings from crashing the Vercel production build
    ignoreDuringBuilds: true,
  },
  // Produces a self-contained server bundle — no node_modules needed in the image
  output: "standalone",
};

export default nextConfig;
