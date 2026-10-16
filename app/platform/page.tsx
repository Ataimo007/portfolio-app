import { pageMetadata } from "@/lib/seo";
import PortfolioMotion from "@/components/portfolio-motion";
import PlatformShowcase from "@/components/platform-showcase";
export const metadata = pageMetadata(
  "Portfolio Platform",
  "Explore the Ataimo portfolio and consultancy platform: Azure K3s architecture, Keycloak SSO, messaging, email and live Prometheus telemetry.",
  "/platform",
);
export default function Page() {
  return (
    <div className="portfolio-home platform-page">
      <PortfolioMotion />
      <PlatformShowcase detailed />
    </div>
  );
}
