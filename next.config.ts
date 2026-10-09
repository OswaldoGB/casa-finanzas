import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.bancoagricola.com",
        pathname: "/multimedia/render/**",
      },
    ],
  },
};

export default nextConfig;
