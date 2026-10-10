"use client";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
export default function SiteAnalytics() {
  const path = usePathname();
  if (path.startsWith("/account/") || path === "/portal" || path === "/admin")
    return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
