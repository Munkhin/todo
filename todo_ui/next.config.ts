import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // disable file system cache to prevent ENOENT errors
  experimental: {
    webpackBuildWorker: true,
  },
  // set explicit workspace root to resolve multiple lockfiles warning
  outputFileTracingRoot: path.join(__dirname, '../'),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // disable persistent caching for development
    if (!isServer) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/commons/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        pathname: '/classroom/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        pathname: '/calendar/**',
      },
    ],
  },
  // temporarily disabled CSP for debugging - re-enable after fixing CSS
  // async headers() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://todo.studybar.academy https://accounts.google.com https://oauth2.googleapis.com;",
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;
