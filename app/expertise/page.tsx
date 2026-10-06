import { Intro, Expertise } from "@/components/site";
export const metadata = {
  title: "Expertise",
  alternates: { canonical: "/expertise" },
};
export default function Page() {
  return (
    <div className="page">
      <Intro
        label="CONNECTED TECHNICAL DISCIPLINES"
        title="Architecture is understanding the connections."
      >
        Four areas of technical depth, connected through hands-on customer work.
        Expand each cluster to explore where these technologies fit.
      </Intro>
      <Expertise />
    </div>
  );
}
