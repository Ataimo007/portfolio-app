import RouteDemo from "@/components/route-demo";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { projects } from "@/content/site";
import { Intro, Flow } from "@/components/site";
export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = projects.find((p) => p.slug === slug);
  return {
    title: p?.title,
    description: p?.summary,
    alternates: { canonical: `/projects/${slug}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = projects.find((p) => p.slug === slug);
  if (!p) notFound();
  const source = await readFile(
    path.join(process.cwd(), "content/projects", `${p.slug}.mdx`),
    "utf8",
  );
  return (
    <div className="page case-study">
      <Link className="text-link" href="/projects">
        ← All projects
      </Link>
      <Intro label={p.category} title={p.title}>
        {p.summary}
      </Intro>
      <div className="case-meta">
        <div className="tags">
          {p.tech.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <a className="button primary" href={p.url}>
          {p.private ? "Explore public PoC" : "View repository"} ↗
        </a>
      </div>
      {p.private && (
        <p className="disclosure">
          Private source · Public PoC available. The full migration platform
          source is not publicly available.
        </p>
      )}
      <Flow steps={p.flow} />
      <article className="prose">
        <MDXRemote source={source} />
        {p.slug === "route-collision-analyzer" && <RouteDemo />}
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: p.title,
            description: p.summary,
            author: { "@type": "Person", name: "Ataimo Edem" },
            url: `${process.env.SITE_URL || "https://ataimoedem.com"}/projects/${p.slug}`,
            codeRepository: p.private ? undefined : p.url,
          }),
        }}
      />
    </div>
  );
}
