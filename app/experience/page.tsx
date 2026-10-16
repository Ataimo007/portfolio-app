import { pageMetadata } from "@/lib/seo";
import { Intro, Experience } from "@/components/site";
export const metadata = pageMetadata(
  "Experience",
  "Explore Ataimo Edem’s experience in customer engineering, Azure technical support, solutions architecture and enterprise API platforms.",
  "/experience",
);
export default function Page() {
  return (
    <div className="page">
      <Intro
        label="PROFESSIONAL JOURNEY"
        title="From building applications to evolving platforms."
      >
        Software engineering, Azure support, solutions architecture and customer
        engineering. Each discipline informs the next.
      </Intro>
      <Experience />
    </div>
  );
}
