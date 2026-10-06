import { Intro, ProjectList } from "@/components/site";
export const metadata = {
  title: "Projects",
  alternates: { canonical: "/projects" },
};
export default function Page() {
  return (
    <div className="page">
      <Intro
        label="ENGINEERING IN PRACTICE"
        title="Recurring problems. Repeatable solutions."
      >
        Practical tools built at the intersection of API platforms, migrations,
        cloud infrastructure and production troubleshooting.
      </Intro>
      <ProjectList />
      <p className="additional">
        Also on GitHub:{" "}
        <a href="https://github.com/Ataimo007/tyk-automation">
          API Automation Tool ↗
        </a>{" "}
        — Python tooling for Tyk OAS/JWT API provisioning.
      </p>
    </div>
  );
}
