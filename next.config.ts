import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shopx.lk',
      },
      {
        protocol: 'https',
        hostname: 'vendor.shopx.lk',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'secure.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 's.w.org',
      },
    ],
  },
};

export default nextConfig;
