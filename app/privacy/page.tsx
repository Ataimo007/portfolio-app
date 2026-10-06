import LegalPage, { type LegalSection } from "@/components/legal-page";
export const metadata = {
  title: "Privacy Policy",
  description:
    "How Ataimo Edem handles information in the portfolio and client portal, including Google sign-in, consultations and private messages.",
  alternates: { canonical: "/privacy" },
};
const sections: LegalSection[] = [
  {
    id: "operator",
    title: "Who operates this service",
    body: (
      <p>
        Ataimo Edem operates this portfolio and client portal at ataimo.com.
        This policy explains how information is handled when you browse the
        site, create an account, request a consultation or communicate through
        the portal.
      </p>
    ),
  },
  {
    id: "information",
    title: "Information we collect",
    body: (
      <>
        <p>
          Account information includes your name, email address, account
          identifier and access roles. If you register with a password, the
          identity service manages your credentials. The portfolio application
          does not receive your Google password.
        </p>
        <p>
          When you use the portal, we store consultation requests, proposed
          schedules, timezone information, job status and the messages you
          exchange with Ataimo. Information you submit by email or through an
          available contact form may include your name, company, email and
          message.
        </p>
        <p>
          Infrastructure may process IP addresses, request timing, browser
          details and authentication events for security and troubleshooting.
          Public platform status reports use aggregate service health; they do
          not publish private messages or client records.
        </p>
      </>
    ),
  },
  {
    id: "google",
    title: "Google sign-in",
    body: (
      <>
        <p>
          If you choose Google sign-in, we request basic identity permissions:
          openid, profile and email. We use your Google account identifier, name
          and email to authenticate you and connect you to your portal profile.
          The identity service may receive a profile image through these basic
          permissions; displaying it is not required to use the portal.
        </p>
        <p>
          We do not request access to Gmail messages, Google Drive files, your
          calendar or your contacts. Google account information is used for
          sign-in and account management, not advertising. We do not sell it or
          use it to train AI models. You can revoke the connection in your
          Google account settings; revocation does not itself delete records
          already stored in the portal.
        </p>
      </>
    ),
  },
  {
    id: "purpose",
    title: "How we use information",
    body: (
      <p>
        We use information to provide secure account access, review consultation
        requests, manage agreed work, support private communication, answer
        enquiries, prevent abuse and maintain the service. Where applicable law
        requires a legal basis, these activities relate to requested services,
        legitimate interests in security and service operation, legal
        obligations, or consent where required. Marketing use would require a
        separate appropriate basis.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Who can access information",
    body: (
      <>
        <p>
          Your portal information is accessible to you and Ataimo, with
          administrative access where needed to operate the service. Other
          clients are not intended to have access to your jobs or messages.
        </p>
        <p>
          The application runs on Microsoft Azure infrastructure in West Europe.
          Authentication, database storage and operational monitoring are
          managed as part of this deployment. Your chosen sign-in provider
          handles its own authentication under its own privacy policy.
          Contacting the support Gmail address involves Google’s email service.
          Information may also be disclosed when legally required or necessary
          to address fraud or security incidents.
        </p>
        <p>
          We do not sell personal information. This Azure deployment does not
          enable the optional Vercel analytics and speed-insights integrations.
          Email delivery integrations, if enabled, process the information
          necessary to deliver messages.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <p>
        The application and identity service use essential session and sign-in
        cookies to authenticate you, protect the login flow and maintain access.
        Application session cookies are secure and inaccessible to browser
        JavaScript. Application sessions expire after at most 30 minutes;
        identity-provider sessions have their own lifecycle. The site may store
        interface preferences in your browser. These functions are not
        advertising tracking.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Retention and security",
    body: (
      <>
        <p>
          Account, consultation, job and message records remain stored while
          needed to provide the service, preserve relevant work history or meet
          legitimate legal and security needs. The current application does not
          automatically delete these records after a fixed period. You can
          request deletion or a review of what remains necessary through the
          contact address below; some records may need to be retained where law
          or a dispute requires it.
        </p>
        <p>
          We use HTTPS, authenticated access and controls intended to separate
          client records. No system can guarantee absolute security. Do not
          place passwords, API keys, payment-card details or other secrets in
          consultation messages.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your choices and requests",
    body: (
      <>
        <p>
          You can choose a supported login method, sign out and revoke a
          social-login connection at its provider. Contact Ataimo to request
          access, correction, a copy of your information, deletion, or to raise
          a privacy concern. We may need to verify your identity before acting.
        </p>
        <p>
          Your rights depend on applicable law and may include objection,
          restriction, portability, withdrawal of consent, and a complaint to a
          relevant data-protection authority. Revoking Google access and
          deleting your portal account are separate requests.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy as the service changes. The effective date
        above identifies the current version. Material changes will be
        communicated through the website or another appropriate channel.
      </p>
    ),
  },
];
export default function Privacy() {
  return (
    <LegalPage
      title="Privacy, clearly explained."
      summary="Your identity, your work and your conversations deserve clear boundaries. Here is how this portfolio and its client portal handle your information."
      sections={sections}
    />
  );
}
