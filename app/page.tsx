import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import PlatformShowcase from "@/components/platform-showcase";
import PlatformDiagram from "@/components/platform-diagram";
import PortfolioMotion from "@/components/portfolio-motion";
import { SocialLinks } from "@/components/site";
import { projects, profile } from "@/content/site";
export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <div className="portfolio-home">
      <PortfolioMotion />
      <aside className="scene-index" aria-label="Page scenes">
        {[
          ["intro", "Start"],
          ["selected-work", "Work"],
          ["platform", "Platform"],
          ["approach", "Method"],
          ["person", "Person"],
          ["connect", "Connect"],
        ].map(([id, label]) => (
          <a href={`#${id}`} key={id} data-scene-link={id}>
            <span>{label}</span>
          </a>
        ))}
      </aside>
      <section className="hero scene" id="intro" data-scene="Start">
        <div className="hero-copy">
          <p className="hero-name">ATAIMO EDEM · ENGINEERING & ARCHITECTURE</p>
          <h1>
            Complex systems.
            <br />
            <em>Clear thinking.</em>
          </h1>
          <p className="hero-subject">
            Architecture that holds up in the real world.
          </p>
          <p className="hero-description">
            I connect architecture, hands-on engineering and customer ownership
            to make enterprise API platforms work — and keep them working.
          </p>
          <div className="actions">
            <Link className="button primary" href="/projects">
              Explore My Work <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/contact">
              Let’s talk <ArrowRight size={17} />
            </Link>
          </div>
          <SocialLinks />
        </div>
        <div className="topology topology-fallback" aria-hidden="true">
          <PlatformDiagram compact />
        </div>
        <div className="hero-footnote">
          <span>LAGOS, NIGERIA · WORKING GLOBALLY</span>
          <a href="#selected-work">
            SCROLL TO EXPLORE <ArrowRight size={14} />
          </a>
        </div>
      </section>
      <div className="capability-strip">
        {[
          "API Management",
          "Solutions Architecture",
          "Cloud & Kubernetes",
          "Customer Engineering",
        ].map((s, i) => (
          <span key={s}>
            <small>0{i + 1}</small>
            {s}
          </span>
        ))}
      </div>
      <div className="fieldbook">
        <section
          className="section selected-work scene"
          id="selected-work"
          data-scene="Work"
        >
          <div className="section-heading" data-reveal="terminal">
            <div>
              <h2>
                From friction
                <br />
                to <em>forward motion.</em>
              </h2>
            </div>
            <div className="section-aside">
              <p>
                Tools built from the problems
                <br />
                that show up in production.
              </p>
              <Link className="text-link" href="/projects">
                All projects <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className="work-grid">
            {projects.slice(0, 3).map((project, index) => (
              <Link
                className={`work-card work-card-${index}${index === 0 ? " work-card-featured" : ""}`}
                data-reveal="grid-card"
                href={`/projects/${project.slug}`}
                key={project.slug}
                aria-labelledby={`project-title-${project.slug}`}
              >
                <div className="work-art" aria-hidden="true">
                  <span className="diagram-tag">
                    FIG. 0{index + 1} / {project.language.toUpperCase()}
                  </span>
                  <svg viewBox="0 0 400 220" fill="none">
                    {index === 0 ? (
                      <>
                        <path
                          d="M100 90H300M100 140H300"
                          stroke="currentColor"
                          strokeDasharray="4 6"
                        />
                        {[65, 280].map((x) => (
                          <g key={x}>
                            <rect x={x} y="55" width="65" height="115" rx="3" />
                            <path d={`M${x + 14} 78h37m-37 20h37m-37 20h24`} />
                          </g>
                        ))}
                        <circle cx="200" cy="115" r="30" />
                        <path d="M183 115h34m-10-10 10 10-10 10" />
                        <text x="97" y="194">
                          CLASSIC
                        </text>
                        <text x="312" y="194">
                          EDP
                        </text>
                      </>
                    ) : index === 1 ? (
                      <>
                        <path d="M120 70 200 30 280 70v80l-80 40-80-40Z" />
                        <path d="m120 70 80 40 80-40m-80 40v80M120 110l80 40 80-40" />
                        <circle cx="120" cy="70" r="5" />
                        <circle cx="280" cy="70" r="5" />
                        <circle cx="200" cy="190" r="5" />
                        <text x="200" y="214">
                          DISCOVER / TRANSFORM / VALIDATE
                        </text>
                      </>
                    ) : (
                      <>
                        <path
                          d="M55 60h110l60 55h120M55 165h110l60-50M55 112h290"
                          strokeOpacity=".35"
                        />
                        <circle cx="225" cy="115" r="28" />
                        <path d="m212 102 26 26m0-26-26 26" />
                        <path d="M55 60h110l32 29M55 165h110l32-28" />
                        <text x="100" y="196">
                          DOMAIN + PATH
                        </text>
                        <text x="300" y="196">
                          DIAGNOSTICS
                        </text>
                      </>
                    )}
                  </svg>
                  <span className="diagram-caption">
                    {
                      [
                        "PRESERVE IDENTITY. MOVE FORWARD.",
                        "CHANGE THE CLUSTER. KEEP THE INTENT.",
                        "MAKE THE INVISIBLE CONFLICT VISIBLE.",
                      ][index]
                    }
                  </span>
                </div>
                <div className="work-copy">
                  <p className="project-category">{project.category}</p>
                  <h3 id={`project-title-${project.slug}`}>{project.title}</h3>
                  <p>{project.summary}</p>
                  {project.private && (
                    <span className="disclosure">
                      Private source · Public PoC available
                    </span>
                  )}
                  <ul className="work-tech" aria-label="Technologies">
                    {project.tech.slice(0, 3).map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                  <span className="work-link">
                    Explore case study{" "}
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <PlatformShowcase />
        <section
          className="section approach-section scene"
          id="approach"
          data-scene="Method"
        >
          <div data-reveal="terminal">
            <h2>
              See the whole system.
              <br />
              Solve the <em>right problem.</em>
            </h2>
            <p className="approach-intro">
              Good engineering connects the technical detail to the people who
              depend on it.
            </p>
            <Link className="text-link" href="/expertise">
              Explore my expertise <ArrowUpRight size={18} />
            </Link>
          </div>
          <ol className="approach-list">
            {[
              [
                "Understand the context",
                "Start with the customer, the constraints and the system as it actually runs.",
              ],
              [
                "Trace the connections",
                "Follow requests across APIs, identity, infrastructure and data to find the root cause.",
              ],
              [
                "Make change repeatable",
                "Turn the solution into a practical tool, a clear architecture or a dependable migration path.",
              ],
            ].map(([title, description], index) => (
              <li key={title} data-reveal="terminal">
                <span className="index">0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section
          className="section engineer-section scene"
          id="person"
          data-scene="Person"
        >
          <div className="engineer-portrait" data-reveal="grid-card">
            <Image
              src="/images/ataimo-portrait-4x5.webp"
              unoptimized
              alt="Ataimo Edem"
              width={800}
              height={1000}
              sizes="(max-width: 700px) 90vw, 35vw"
            />
            <span>ATAIMO EDEM / LAGOS → GLOBAL</span>
          </div>
          <div className="engineer-copy" data-reveal="terminal">
            <h2>
              Engineering depth.
              <br />
              <em>Human perspective.</em>
            </h2>
            <p>
              I work at the intersection of enterprise customers, complex
              infrastructure and API platforms. My work combines hands-on
              engineering, architecture guidance, production troubleshooting and
              customer advocacy.
            </p>
            <p>
              At Tyk, I support enterprise customers across EMEA — from
              architecture and implementation through upgrades, migrations and
              long-term platform evolution.
            </p>
            <div className="actions">
              <Link className="text-link" href="/about">
                More about me <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/resume">
                View Resume <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </div>
      <section
        className="section contact-callout scene"
        id="connect"
        data-scene="Connect"
      >
        <div className="contact-callout-content" data-reveal="terminal">
          <h2>
            A difficult platform problem?
            <br />
            <em>Let’s think it through.</em>
          </h2>
          <Link
            className="contact-orbit"
            href="/contact"
            aria-label="Contact Ataimo"
          >
            <ArrowUpRight size={38} />
            <span>LET’S TALK</span>
          </Link>
        </div>
        <p className="contact-services">
          Architecture reviews · API platforms · Cloud & Kubernetes
        </p>
        <div className="public-contact-links">
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <a href={profile.phoneHref}>{profile.phone}</a>
        </div>
      </section>
    </div>
  );
}
