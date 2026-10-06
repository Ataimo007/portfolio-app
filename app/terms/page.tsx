import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal-page";
export const metadata = {
  title: "Terms of Service",
  description:
    "Terms for using Ataimo Edem’s portfolio, client portal, consultation bookings and private messaging.",
  alternates: { canonical: "/terms" },
};
const sections: LegalSection[] = [
  {
    id: "scope",
    title: "About these terms",
    body: (
      <p>
        These terms apply to Ataimo Edem’s portfolio and client portal at
        ataimo.com. By using the service, you agree to these terms. If you do
        not agree, do not use the protected portal. A separate written
        consultancy agreement may set additional terms for paid work; that
        agreement controls the relevant engagement where it conflicts with these
        general website terms.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <p>
        Provide accurate account details, use an identity you are authorised to
        use, and protect your sign-in credentials. You are responsible for
        activity you authorise through your account. Notify Ataimo if you
        suspect unauthorised access. Social sign-in is optional where other
        supported methods are available and remains subject to the provider’s
        terms.
      </p>
    ),
  },
  {
    id: "bookings",
    title: "Consultation requests and work",
    body: (
      <>
        <p>
          A booking submission is a request. A consultation is confirmed only
          when Ataimo approves it. Available times, scope and scheduling may
          change; contact Ataimo to discuss a cancellation or rescheduling.
        </p>
        <p>
          Creating an account, requesting a slot or exchanging a portal message
          does not by itself establish a paid engagement. Fees, deliverables,
          timelines, confidentiality obligations and other project-specific
          commitments must be agreed separately. Portal job status helps track
          work and is not a replacement for an agreed statement of work.
        </p>
      </>
    ),
  },
  {
    id: "conduct",
    title: "Responsible use",
    body: (
      <p>
        Do not attempt unauthorised access, impersonate others, upload unlawful
        or harmful material, send spam, probe client records, interfere with
        service availability or misuse the portal to transmit secrets. Use
        private messages for legitimate consultation and project communication.
        Share only information you have permission to share.
      </p>
    ),
  },
  {
    id: "ownership",
    title: "Content and intellectual property",
    body: (
      <>
        <p>
          Portfolio content, branding and original materials belong to Ataimo or
          their respective rights holders. You may view and share links to
          public pages. Software linked from the portfolio remains subject to
          its own licence; third-party names and logos remain the property of
          their owners.
        </p>
        <p>
          You retain rights to information you submit. You permit its processing
          to operate the portal and carry out your requested communication or
          agreed work. Ownership and licensing of consultancy deliverables must
          be defined in the relevant project agreement.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy and communication",
    body: (
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains account
        information, social sign-in, private messages, service providers and
        your options. The portal is not intended as a repository for passwords,
        credentials or highly sensitive personal data. Contact Ataimo to agree
        an appropriate channel when work requires confidential information.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Service availability",
    body: (
      <p>
        We aim to provide a useful, reliable service, but maintenance, updates
        or infrastructure failures can affect availability. Public portfolio
        material is general information and does not guarantee a particular
        project outcome. No availability commitment or response time applies
        unless agreed separately. Your mandatory consumer or other statutory
        rights are not excluded.
      </p>
    ),
  },
  {
    id: "access",
    title: "Access restrictions",
    body: (
      <p>
        We may restrict or suspend access to address abuse, unauthorised
        activity, security incidents or a breach of these terms. Where
        appropriate, we will provide an explanation and a way to raise a
        concern. You can stop using the portal or contact Ataimo to request
        account closure; retention is addressed in the Privacy Policy.
      </p>
    ),
  },
  {
    id: "updates",
    title: "Changes and questions",
    body: (
      <p>
        We may update these terms as the service develops and will publish the
        effective date of the current version. Contact Ataimo at
        contact@ataimo.com with questions or concerns, including matters
        requiring clarification before an engagement.
      </p>
    ),
  },
];
export default function Terms() {
  return (
    <LegalPage
      title="A clear basis for working together."
      summary="Straightforward terms for browsing the portfolio, requesting a consultation and using the client portal."
      sections={sections}
    />
  );
}
