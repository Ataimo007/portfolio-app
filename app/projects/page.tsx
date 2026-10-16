import { pageMetadata } from "@/lib/seo";
import { Intro, ProjectList } from "@/components/site";
export const metadata = pageMetadata(
  "Projects",
  "Explore engineering case studies in API portal migration, Kubernetes automation, production diagnostics and the Ataimo consultancy platform.",
  "/projects",
);
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
