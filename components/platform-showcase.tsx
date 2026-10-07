import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PlatformDiagram from "./platform-diagram";
import PlatformTelemetry from "./platform-telemetry";
import { publicRoutes } from "@/lib/infrastructure";
export default function PlatformShowcase({
  detailed = false,
}: {
  detailed?: boolean;
}) {
  const Heading = detailed ? "h1" : "h2";
  return (
    <section
      className="section platform-showcase scene"
      id="platform"
      data-scene="Platform"
    >
      <div className="section-heading" data-reveal="terminal">
        <div>
          <Heading>
            The portfolio is
            <br />
            <em>part of the work.</em>
          </Heading>
        </div>
        <div className="section-aside">
          <p>
            A running system, from identity and private conversations to
            infrastructure and mail.
          </p>
          {!detailed && (
            <Link className="text-link" href="/platform">
              Explore the platform <ArrowUpRight size={18} />
            </Link>
          )}
        </div>
      </div>
      <div className="platform-architecture" data-reveal="grid-card">
        <PlatformDiagram />
        <div className="platform-architecture-copy">
          <h3>
            One platform.
            <br />
            Connected by design.
          </h3>
          <p>
            Containerized Next.js on a single Azure VM, orchestrated with K3s
            and deployed through Helm. Envoy Gateway routes encrypted traffic;
            cert-manager manages Let’s Encrypt certificates through Azure DNS.
          </p>
          <p>
            <Link
              className="text-link"
              href="https://github.com/Ataimo007/portfolio-app"
            >
              Explore the source on GitHub <ArrowUpRight size={16} />
            </Link>
          </p>
          <p>
            GitHub Actions tests and publishes the app and worker to Docker Hub.
            Fresh deployments use Terraform for Azure and Ansible for K3s;
            existing deployments update only the application through Helm and
            kubectl.
          </p>
          <dl className="platform-routes">
            {publicRoutes.map(([host, service]) => (
              <div key={host}>
                <dt>{service}</dt>
                <dd>{host}</dd>
              </div>
            ))}
          </dl>
          <p className="platform-mail-note">
            Mailu adds webmail.ataimo.com and mailbox access through
            mail.ataimo.com. Outbound email travels through SMTP2GO over TLS on
            port 587 because Azure restricts outbound SMTP on port 25. Port 22
            is SSH, not SMTP.
          </p>
        </div>
      </div>
      <PlatformTelemetry detailed={detailed} />
      {detailed && (
        <div className="platform-details">
          <section>
            <h3>Identity, without friction.</h3>
            <p>
              Keycloak powers branded registration and sign-in with native
              accounts, Google, GitHub, LinkedIn and Microsoft. PostgreSQL holds
              dedicated databases and roles for each database-backed service.
            </p>
          </section>
          <section>
            <h3>From a request to a conversation.</h3>
            <p>
              Clients request consultations for owner approval, track
              engagements and exchange private messages. A transactional outbox
              and background worker publish events to Redpanda for notification
              processing. The broker stays private.
            </p>
          </section>
          <section>
            <h3>Observe the system.</h3>
            <p>
              Prometheus measures the cluster; Grafana presents operational
              dashboards. This public view reads validated aggregate snapshots
              from the worker. It exposes neither a Prometheus query endpoint
              nor customer data.
            </p>
            <Link className="text-link" href="/status">
              View workload readiness <ArrowUpRight size={16} />
            </Link>
          </section>
          <section>
            <h3>Mail with a dedicated route.</h3>
            <p>
              Mailu provides SMTP, IMAP and Roundcube webmail. Incoming mail
              reaches port 25; clients use IMAP 993 and authenticated submission
              465 or 587. SMTP2GO handles outbound delivery, with a verified
              sender domain and TLS. Mailbox accounts are separate from
              portfolio SSO.
            </p>
          </section>
        </div>
      )}
    </section>
  );
}
