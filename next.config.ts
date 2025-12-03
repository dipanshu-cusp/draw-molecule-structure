import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // Empty turbopack config to silence the warning
  turbopack: {},
  
  // Exclude Ketcher packages from server-side bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'ketcher-core', 'ketcher-react', 'ketcher-standalone', 'paper'];
    }
    return config;
  },
};

export default nextConfig;
