import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  basePath: '/Songbook',
  assetPrefix: '/Songbook/',
};

export default nextConfig;
