import Link from "next/link";
import { Intro } from "@/components/site";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

export default function LegalPage({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <div className="page legal-page">
      <Intro label="ATAIMO EDEM / CLIENT PORTAL" title={title}>
        <p>{summary}</p>
        <p className="legal-date">Effective 5 October 2026</p>
      </Intro>
      <div className="legal-layout">
        <nav className="legal-index" aria-label={`${title} contents`}>
          <p className="eyebrow">ON THIS PAGE</p>
          {sections.map((section, index) => (
            <a key={section.id} href={`#${section.id}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {section.title}
            </a>
          ))}
        </nav>
        <article className="legal-copy">
          {sections.map((section) => (
            <section id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.body}
            </section>
          ))}
          <div className="legal-contact">
            <p className="eyebrow">QUESTIONS OR REQUESTS</p>
            <p>
              Contact Ataimo Edem at{" "}
              <a href="mailto:contact@ataimo.com">contact@ataimo.com</a>.
            </p>
            <Link href="/contact">Contact Ataimo</Link>
          </div>
        </article>
      </div>
    </div>
  );
}
