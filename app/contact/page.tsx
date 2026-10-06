import { Intro, SocialLinks } from "@/components/site";
import ContactForm from "@/components/contact-form";
import { profile } from "@/content/site";
import Link from "next/link";
export const metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
};
export default function Page() {
  return (
    <div className="page">
      <Intro
        label="START A CONVERSATION"
        title="Let’s build something that solves a difficult problem."
      />
      <div className="contact-grid">
        <div>
          <h2>Good systems start with a conversation.</h2>
          <p>
            For customer engineering, API architecture, platform challenges or
            collaboration — get in touch.
          </p>
          <a className="email-link" href={`mailto:${profile.email}`}>
            {profile.email} <span aria-hidden="true">↗</span>
          </a>
          <div className="public-contact-links">
            <a href={profile.phoneHref}>{profile.phone}</a>
          </div>
          <SocialLinks />
          <Link className="button primary" href="/portal">
            Book a consultation
          </Link>
          <p className="eyebrow">BASED IN LAGOS, NIGERIA</p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
