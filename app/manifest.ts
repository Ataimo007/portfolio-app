import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ataimo · Client workspace",
    short_name: "Ataimo",
    description:
      "Consultations, private conversations and your client workspace.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#f5f3ed",
    theme_color: "#2447b9",
    icons: [
      { src: "/brand/pwa-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/brand/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
