import Image from "next/image";
import { Intro } from "@/components/site";
import CareerJourney from "@/components/career-journey";
export const metadata = { title: "About", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <div className="page about-page">
      <Intro
        label="THE PERSON BEHIND THE PLATFORM"
        title="Built on curiosity. Grounded in experience."
      />
      <section className="about-grid">
        <Image
          className="portrait"
          src="/images/ataimo-portrait-4x5.webp"
          unoptimized
          alt="Ataimo Edem, Customer Success Engineer and solutions architect"
          width={640}
          height={800}
          priority
          sizes="(max-width: 700px) 100vw, 40vw"
        />
        <div>
          <h2>I started as a software engineer.</h2>
          <p className="lede">
            I learned cloud by troubleshooting production systems. I moved into
            architecture by helping customers design them. Today, I bring those
            disciplines together in Customer Engineering.
          </p>
          <p>
            I work at the intersection of enterprise customers, complex
            infrastructure and API platforms. My work combines hands-on
            engineering, architecture guidance, production troubleshooting and
            customer advocacy across cloud, Kubernetes and hybrid environments.
          </p>
          <p>
            At Tyk, I support enterprise customers across EMEA throughout the
            post-sales lifecycle — from architecture and implementation through
            production troubleshooting, upgrades, migrations, observability and
            long-term platform evolution.
          </p>
          <p className="eyebrow">LAGOS, NIGERIA · GLOBAL PERSPECTIVE</p>
        </div>
      </section>
      <CareerJourney />
      <section className="education">
        <p className="eyebrow">EDUCATION / 2012 – 2018</p>
        <h2>Federal University of Technology Minna</h2>
        <p>Bachelor’s degree, Computer Engineering</p>
      </section>
    </div>
  );
}
