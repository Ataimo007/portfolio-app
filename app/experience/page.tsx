import { Intro, Experience } from "@/components/site";
export const metadata = {
  title: "Experience",
  alternates: { canonical: "/experience" },
};
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
