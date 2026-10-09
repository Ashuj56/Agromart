import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Prevent lint warnings from crashing the Vercel production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
