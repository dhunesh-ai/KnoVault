import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
