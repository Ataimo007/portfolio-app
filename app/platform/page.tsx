import PortfolioMotion from "@/components/portfolio-motion";
import PlatformShowcase from "@/components/platform-showcase";
export const metadata = {
  title: "Inside the platform",
  description:
    "Explore the Ataimo platform architecture and live infrastructure measurements from Prometheus.",
  alternates: { canonical: "/platform" },
};
export default function Page() {
  return (
    <div className="portfolio-home platform-page">
      <PortfolioMotion />
      <PlatformShowcase detailed />
    </div>
  );
}
