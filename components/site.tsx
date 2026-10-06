import Link from "next/link";
import { ArrowUpRight, ArrowRight, Download } from "lucide-react";
import { profile, projects, roles, expertise } from "@/content/site";
export function SocialLinks() {
  return (
    <div className="social">
      <a href={profile.github}>
        GitHub <ArrowUpRight size={14} />
      </a>
      <a href={profile.linkedin}>
        LinkedIn <ArrowUpRight size={14} />
      </a>
      <a href={`mailto:${profile.email}`}>
        Email <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
export function DownloadResume() {
  return (
    <a className="button" href="/resume/ataimo-edem-resume.pdf" download>
      <Download size={16} /> Download Resume
    </a>
  );
}
export function Intro({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{label}</p>
      <h1>{title}</h1>
      {children && <div className="lede">{children}</div>}
    </header>
  );
}
export function ProjectList({ limit = 5 }: { limit?: number }) {
  return (
    <div className="project-list">
      {projects.slice(0, limit).map((p, i) => (
        <Link href={`/projects/${p.slug}`} className="project-row" key={p.slug}>
          <span className="index">0{i + 1}</span>
          <div>
            <p className="eyebrow">{p.category}</p>
            <h3>{p.title}</h3>
            <p>{p.summary}</p>
            {p.private && (
              <span className="disclosure">
                Private source · Public PoC available
              </span>
            )}
          </div>
          <span className="project-language">{p.language}</span>
          <ArrowUpRight className="project-arrow" />
        </Link>
      ))}
    </div>
  );
}
export function Experience() {
  return (
    <div className="timeline">
      {roles.map((r, i) => (
        <article key={r.title}>
          <div className="role-date">
            <span className="eyebrow">{r.dates}</span>
            <p>{r.company}</p>
          </div>
          <div>
            <h2>{r.title}</h2>
            <p className="location">{r.location}</p>
            <p>{r.summary}</p>
            <details open={i === 0}>
              <summary>Ownership & technical focus</summary>
              <ul>
                {r.themes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </details>
          </div>
        </article>
      ))}
    </div>
  );
}
export function Expertise() {
  return (
    <div className="expertise-grid">
      {expertise.map((e, i) => (
        <details key={e.title} open className="expertise-cluster">
          <summary>
            <span className="index">0{i + 1}</span> {e.title}
          </summary>
          <p>{e.use}</p>
          <div className="tags">
            {e.items.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
export function Flow({ steps }: { steps: string[] }) {
  return (
    <ol className="flow" aria-label="Architecture flow">
      {steps.map((s, i) => (
        <li key={s}>
          <span>{String(i + 1).padStart(2, "0")}</span>
          {s}
          {i < steps.length - 1 && <ArrowRight size={16} aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
