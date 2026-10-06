import type { MetadataRoute } from "next";
import { projects } from "@/content/site";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.SITE_URL || "https://ataimoedem.com";
  return [
    "",
    "/about",
    "/experience",
    "/projects",
    "/platform",
    "/expertise",
    "/resume",
    "/contact",
    "/install",
    "/privacy",
    "/terms",
    ...projects.map((p) => `/projects/${p.slug}`),
  ].map((p) => ({ url: base + p }));
}
