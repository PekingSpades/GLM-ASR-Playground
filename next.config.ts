import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Static export.
  output: 'export',

  // GitHub Pages deployment config.
  basePath: isProd ? '/GLM-ASR-Playground' : '',
  assetPrefix: isProd ? '/GLM-ASR-Playground/' : '',

  // Expose basePath to the client.
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? '/GLM-ASR-Playground' : '',
  },

  // Turbopack config (Next.js 16 default).
  turbopack: {},

  // Webpack config (fallback).
  webpack: (config, { isServer }) => {
    // Enable async WASM.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle WASM assets.
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Client-specific fallbacks.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
