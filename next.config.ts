import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "multimedia.bancocuscatlan.com",
        pathname: "/strapi-media/U_No_clasica_369c77188d.jpg",
      },
      {
        protocol: "https",
        hostname: "multimedia.bancocuscatlan.com",
        pathname: "/strapi-media/U_No_Oro_75560d5e09.jpg",
      },
      {
        protocol: "https",
        hostname: "www.bancoagricola.com",
        pathname: "/multimedia/render/**",
      },
    ],
  },
};

export default nextConfig;
