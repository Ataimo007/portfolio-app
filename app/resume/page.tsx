import {
  Intro,
  DownloadResume,
  Experience,
  Expertise,
  ProjectList,
} from "@/components/site";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { profile, certifications } from "@/content/site";
export const metadata = {
  title: "Resume",
  alternates: { canonical: "/resume" },
};
export default function Page() {
  return (
    <div className="page resume">
      <Intro label="WEB RESUME" title="Ataimo Edem">
        <p>{profile.summary}</p>
        <p>
          <a href="mailto:contact@ataimo.com">contact@ataimo.com</a>
        </p>
        <DownloadResume />
      </Intro>
      <section>
        <h2>Professional summary</h2>
        <p>
          Customer-facing technical engineer and solutions architect
          specialising in API Management, cloud-native platforms and enterprise
          integration. At Tyk, I own post-sales technical success across EMEA,
          from architecture reviews and migrations to production
          troubleshooting, security and product escalation.
        </p>
      </section>
      <section>
        <h2>Professional experience</h2>
        <Experience />
      </section>
      <section>
        <h2>Selected projects</h2>
        <ProjectList />
        <article className="resume-platform-project">
          <h3>Ataimo Portfolio &amp; Consultancy Platform</h3>
          <p>
            Designed, built and deployed this full-stack platform on Azure K3s,
            integrating federated identity, PostgreSQL-backed consultation
            bookings, engagement tracking, private chat, an owner mailbox and
            PWA notifications. Redpanda powers background events; Prometheus and
            Grafana provide live telemetry. Terraform, Ansible, Helm and GitHub
            Actions automate infrastructure and Docker Hub image delivery, with
            Envoy Gateway and cert-manager handling routing and TLS.
          </p>
          <p>
            <a href="/platform">Explore the platform architecture</a> ·{" "}
            <a href="https://github.com/Ataimo007/portfolio-app">
              View the source repository
            </a>
          </p>
        </article>
      </section>
      <section>
        <h2>Technical expertise</h2>
        <Expertise />
      </section>
      <section>
        <h2>Certifications</h2>
        <p className="location">
          Historical credentials from the supplied resume; current renewal
          status is not asserted.
        </p>
        <ul className="certification-grid">
          {certifications.map((certificate) => (
            <li key={certificate.title} className="certification-card">
              <div className="certification-badge">
                <Image
                  src={`/badges/${certificate.badge}`}
                  alt={`${certificate.issuer} ${certificate.level} badge`}
                  width={112}
                  height={112}
                />
              </div>
              <div className="certification-details">
                <p className="certification-issuer">{certificate.issuer}</p>
                <h3>{certificate.title}</h3>
                <span className="certification-level">{certificate.level}</span>
              </div>
              <div className="certification-footer">
                {certificate.date ? (
                  <time dateTime={certificate.date}>
                    Issued {certificate.issued}
                  </time>
                ) : (
                  <span>Microsoft Certified · Expert</span>
                )}
                <a
                  href={certificate.details}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${certificate.title} credential details on Microsoft Learn (opens in a new tab)`}
                >
                  Details <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Education</h2>
        <p>
          Federal University of Technology Minna · Bachelor’s degree, Computer
          Engineering · 2012 – 2018
        </p>
      </section>
    </div>
  );
}
