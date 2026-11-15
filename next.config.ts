import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

function buildCommitSha() {
  const deployedSha = process.env.NEXT_PUBLIC_BUILD_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
  if (deployedSha) return deployedSha;

  try {
    return execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_COMMIT_SHA: buildCommitSha() },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "multimedia.bancocuscatlan.com",
        pathname: "/strapi-media/Tarjetas_VISA_MASTECARD_10_d9e065a424.png",
      },
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
