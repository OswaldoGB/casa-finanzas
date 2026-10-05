import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Casa & Finanzas",
    short_name: "Casa & Finanzas",
    description: "El sistema compartido para ordenar las finanzas de tu hogar.",
    lang: "es",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#11111a",
    theme_color: "#6f67e8",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
