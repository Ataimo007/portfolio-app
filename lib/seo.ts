import type { Metadata } from "next";

export const siteOrigin = (
  process.env.SITE_URL || "https://ataimo.com"
).replace(/\/$/, "");
export const publicURL = (path = "/") => new URL(path, siteOrigin).href;

export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | Ataimo Edem`,
      description,
      url: publicURL(path),
      type: "website",
      siteName: "Ataimo Edem",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Ataimo Edem`,
      description,
    },
  };
}

export function structuredData(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
