import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/projects',
        destination: '/goals',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
