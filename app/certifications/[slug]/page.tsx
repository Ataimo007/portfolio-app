import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { certifications } from "@/content/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return certifications.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const credential = certifications.find((item) => item.slug === slug);
  if (!credential) notFound();
  return {
    title: `${credential.title} — Credential`,
    description: `${credential.issuer}: ${credential.title}, earned by Ataimo Edem on ${credential.earned}.`,
    alternates: { canonical: `/certifications/${slug}` },
  };
}
export default async function CredentialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const credential = certifications.find((item) => item.slug === slug);
  if (!credential) notFound();
  return (
    <div className="page credential-page">
      <Link className="credential-back" href="/resume">
        <ArrowLeft size={16} aria-hidden="true" /> Back to résumé
      </Link>
      <header className="credential-header">
        <h1>{credential.title}</h1>
        <p>Microsoft Certified · {credential.level}</p>
      </header>
      <section className="credential-record" aria-label="Credential details">
        <div className="credential-emblem">
          <Image
            src={`/badges/${credential.badge}`}
            width={240}
            height={240}
            priority
            alt={`${credential.issuer} ${credential.level} badge`}
          />
          <p>{credential.issuer}</p>
        </div>
        <div className="credential-information">
          <h2>Earned by Ataimo Edem.</h2>
          <p className="credential-introduction">
            Award details for Microsoft Certified: {credential.title}.
          </p>
          <dl>
            <div>
              <dt>Credential ID</dt>
              <dd className="credential-identifier">
                {credential.credentialId}
              </dd>
            </div>
            <div>
              <dt>Certification number</dt>
              <dd className="credential-identifier">
                {credential.certificationNumber}
              </dd>
            </div>
            <div>
              <dt>Earned on</dt>
              <dd>
                <time dateTime={credential.earnedDate}>
                  {credential.earned}
                </time>
              </dd>
            </div>
            <div>
              <dt>Issued by</dt>
              <dd>Microsoft</dd>
            </div>
          </dl>
        </div>
      </section>
      <section
        className="credential-skills"
        aria-labelledby="credential-skills-heading"
      >
        <div>
          <h2 id="credential-skills-heading">Skills measured.</h2>
          <p>
            The competencies associated with this certification, as listed in
            the supplied credential record.
          </p>
          <a
            className="button"
            href={credential.details}
            target="_blank"
            rel="noreferrer"
          >
            About the certification{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <ul>
          {credential.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </section>
      <nav className="credential-related" aria-label="Other credentials">
        <h2>More credentials.</h2>
        {certifications
          .filter((item) => item.slug !== slug)
          .map((item) => (
            <Link key={item.slug} href={`/certifications/${item.slug}`}>
              {item.title}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ))}
      </nav>
    </div>
  );
}
