import type { MetadataRoute } from "next";
import { publicURL } from "@/lib/seo";
import { projects, certifications } from "@/content/site";
export default function sitemap(): MetadataRoute.Sitemap {
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
    ...certifications.map((c) => `/certifications/${c.slug}`),
  ].map((p) => ({ url: publicURL(p || "/") }));
}
