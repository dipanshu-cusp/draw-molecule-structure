import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
