# Ataimo.com — platform and portfolio execution handoff

Prepared 5 October 2026. Owner: Ataimo Edem. Audience: Codex CLI working in the existing portfolio repository.

## Copy-paste execution prompt

Read this entire handoff and the repository's AGENTS.md instructions. Inspect the existing application, project documentation, package manager, Git state and deployment assets before changing files. Preserve the current portfolio content and design unless a change is needed for the requirements below. This document extends the existing project; it does not instruct you to replace it or overwrite an existing PLAN.md.

First produce docs/platform/REPO_ASSESSMENT.md with the current stack, implemented capabilities, gaps, proposed integration points and conflicts with this handoff. Then implement the phases below in dependency order. Track progress and evidence in docs/platform/IMPLEMENTATION_STATUS.md. Make routine choices autonomously and record architectural decisions. Ask only for missing information that blocks dependent work; continue independent implementation. Do not invent GitHub URLs, credentials, deployments or live telemetry. Build and test locally before requesting any required deployment inputs. Do not provision billable resources, change public DNS or send real email merely to validate local code. Report precisely what works locally, what is deployed, and what is blocked.

The intended outcome is a containerized professional portfolio backed by a portable self-managed platform, with an interactive 3D view of the actual architecture, real sanitized observability, Keycloak login for protected functionality, and self-hosted inbound mail and mailboxes with an external SMTP relay for outbound delivery. Use the existing application stack where practical.

## 1. Agreed scope and constraints

- Domain: ataimo.com. Actual domain ownership and DNS access must be checked before changes.
- Initial compute: one Azure Ubuntu VM running single-node K3s. The user has a Visual Studio Enterprise Azure benefit; verify the actual Azure offer and current usage terms. Treat the benefit as a development/demo environment until production hosting eligibility is established.
- Single node means a single failure domain. Multiple pods do not provide node-level availability. Never label this architecture HA.
- Package the application as a Docker image. Helm and GitOps define deployment; Terraform defines Azure resources; cloud-init or Ansible bootstraps the host.
- Cloudflare Free is retained only for DNS and useful web edge security/CDN. Do not introduce Pages, R2, Workers or managed databases by default. Make bypass/migration possible.
- Self-manage PostgreSQL, Keycloak, Redpanda, mailboxes and observability. Add services in phases, with useful application behavior and explicit resource budgets.
- SMTP2GO is the preferred replaceable outbound smart host, subject to account approval, verified sender domain and current plan limits. Do not assume unrestricted outbound TCP/25 on the Visual Studio benefit.
- Backups must leave the VM. A second directory or PVC on the same disk is not disaster recovery.
- Never publish customer identifiers, support incident material, private repositories or operational secrets in the portfolio.

## 2. Logical architecture

Web: browser → Cloudflare web proxy → Azure NSG → Traefik → portfolio frontend/API. API → PostgreSQL when persistence is required. Protected browser interactions → Keycloak OIDC. Application events → Redpanda → worker.

Telemetry: instrumented application and exporters → OpenTelemetry Collector / Prometheus → private monitoring. A private scheduled collector produces an allowlisted public snapshot → portfolio status API → 3D model and accessible status list. Loki holds private logs; select a private trace backend if traces will be stored.

Mail inbound: sender MX → mail.ataimo.com TCP/25 → mail platform → spam filtering → mailbox storage → IMAPS/webmail.
Mail outbound: client TCP/587 with authentication and TLS → local submission service → authenticated SMTP2GO relay TCP/587 → recipient MX.

Delivery: GitHub Actions → container registry → Git-reviewed desired image digest → Argo CD → K3s. GitHub repository and workflow links must be populated from actual remotes.

## 3. Suggested repository layout

Adapt to existing conventions instead of imposing a second application structure:

- docs/platform/: assessment, ADRs, architecture, implementation status, operations, recovery and migration.
- infra/terraform/azure/: VM, networking, public IP, storage and budget configuration.
- infra/bootstrap/: idempotent host and K3s installation.
- deploy/helm/portfolio/: frontend/API/worker and telemetry snapshot collector.
- deploy/gitops/: root Argo application and component definitions.
- deploy/platform/: pinned upstream configuration for identity, database, streaming, monitoring and certificates.
- deploy/mail/: chosen mail stack, relay templates, DNS checklist and backup jobs.
- Existing app directories: infrastructure scene, status views, auth integration and API routes.
- .github/workflows/: CI, image build, scanning and controlled GitOps update.

Keep secret examples separate from real secrets. Terraform state is sensitive; use secured remote state with locking supported by the selected backend. Never commit kubeconfig, realm secrets or rendered credentials.

## 4. Identity and login

The CV, projects, infrastructure page and public status must work without an account. Login exists for a meaningful protected area: owner administration and an optional private demo area. No public sign-up by default. Invite-only demo access may be enabled later.

Use Keycloak with an ataimo realm and separate application clients/roles. Start with owner/admin and demo-viewer. Do not reuse mail passwords as Keycloak passwords. Mail and webmail OIDC integration is a separate capability and must not be assumed supported by the chosen mail platform.

Use OIDC Authorization Code flow with PKCE where appropriate. Prefer the existing framework's maintained server-side auth integration and secure HttpOnly session cookies. Validate issuer, audience, signature, expiry and state/nonce; restrict redirect URIs. Enforce authorization at server/API boundaries, not merely by hiding UI. MFA for owner administration; minimum demo privileges. Provide logout, expired-session handling and friendly identity-provider outage behavior. Never store tokens in localStorage. No visitor login is required to see sanitized telemetry.

Keycloak must use production configuration, a correctly configured external hostname and trusted proxy headers, persistent PostgreSQL storage, and a private administration path where feasible. Use separate DBs/users for application and Keycloak; sharing one PostgreSQL instance does not mean sharing schemas or superuser credentials.

Acceptance: anonymous visitor sees all public content; protected API rejects anonymous and wrong-role callers; allowed user completes login/logout; callback tampering and expired session fail safely; Keycloak outage leaves public portfolio usable.

## 5. Self-hosted mail

Select a maintained stack after checking its current official installation/support guidance. Mailu is a candidate; Mailcow's native Docker Compose deployment is another. Do not force a Compose-only stack into unsupported Kubernetes manifests. If a host-level Compose mail service is selected, document it honestly outside K3s in the topology, reserve ports and isolate storage/networks from the cluster. Do not operate two mail stacks.

Capabilities: inbound SMTP, authenticated submission, IMAPS, spam filtering, DKIM, aliases, mailbox administration and webmail. Proposed primary mailbox ataimo@ataimo.com and aliases hello@ataimo.com/contact@ataimo.com are defaults pending owner confirmation, not existing addresses.

Use a static public mail address, DNS-only mail A record and an MX record pointing to that name. No mail proxy through Cloudflare's ordinary HTTP proxy. Do not advertise IPv6 mail until routing, DNS and TLS have been tested. Obtain a publicly trusted certificate for IMAP/SMTP: a Cloudflare Origin CA certificate alone is not trusted by ordinary mail clients.

Create an exact DNS worksheet from the selected mail platform and relay onboarding: MX, SPF (one SPF record), DKIM selectors, DMARC reporting/alignment and PTR feasibility. Start DMARC enforcement conservatively based on actual reports; add MTA-STS/TLS-RPT only after MX certificates and HTTPS policy hosting are stable. Keep DKIM selectors for platform and relay distinct where needed; verify message alignment empirically. PTR/rDNS is especially relevant if direct outbound delivery is introduced later.

Configure relayhost conceptually as [mail.smtp2go.com]:587, using current provider instructions, authenticated SMTP and certificate-verified TLS. Store relay credentials as secrets. Enforce authenticated submission and reject unauthenticated relay to external recipients. Bound attachment sizes, quotas, queue growth and retry duration. Handle daily/monthly relay limits: do not show 'delivered' merely because submission was accepted; surface queued, deferred and bounced states to the owner. Ensure the chosen provider accepts personal mailbox traffic, forwarding and bounce behavior before enabling those paths. Do not create catch-all forwarding automatically.

Webmail belongs on a separate HTTPS hostname such as webmail.ataimo.com; native mail uses mail.ataimo.com. Use DNS-01 certificate issuance when origin HTTP access is restricted. Receiving on TCP/25 must be validated from an external sender; it is not established merely by opening an NSG port.

Acceptance: external inbound message arrives in IMAP/webmail; authenticated outbound message reaches an external mailbox via relay; SPF/DKIM/DMARC pass for the intended identity; unauthenticated relay fails; persistent mail survives service restart; queue/quotas/backup and restore are tested with controlled test mailboxes. Real email tests require owner-provided destinations and authorization.

## 6. Public observability contract

Never let the browser query Prometheus, Kubernetes, Grafana, Loki or Azure directly. Keep those endpoints private. The public API exposes a fixed schema and fixed queries, not a PromQL proxy.

Proposed GET /api/platform/status response:

```json
{
  "schemaVersion": 1,
  "mode": "live",
  "generatedAt": "2026-10-05T07:00:00Z",
  "staleAfterSeconds": 120,
  "overall": "healthy",
  "components": [
    {"id": "portfolio", "state": "healthy", "ready": 1, "desired": 1},
    {"id": "postgres", "state": "unknown"}
  ],
  "metrics": {"cpuUtilizationPercent": 24, "memoryUtilizationPercent": 51},
  "deployment": {"revision": "public-commit-sha", "deployedAt": "2026-10-05T06:00:00Z"}
}
```

The example is illustrative, not evidence of a deployment. Define healthy/degraded/unavailable/unknown separately; a missing sample is unknown. Overall state must be derived from documented component checks. Define units, denominators and measurement windows, especially CPU and memory. Include request rate, latency and error rate only if sufficient traffic exists; low sample counts must not imply confident performance claims.

Generate snapshots centrally every 30–60 seconds; cache and serve them cheaply, bound query duration and response size, rate-limit public requests, and stop polling when the page is hidden. Mark snapshots older than 120 seconds stale. Failure must show unavailable/stale with last successful timestamp, never silently replace live values with fictional healthy numbers.

Public fields exclude IPs, pod/node names, namespaces where sensitive, user/customer labels, request contents, mail subjects/addresses, secrets, logs and private repository URLs. Mail health is aggregate service health only. Deployment revision links are allowed only for a public repository. Private dashboards remain behind private access and authorization.

Acceptance: contract tests, timeout/missing/stale sample tests, allowlist checks, bounded responses and load verification; public endpoint cannot execute caller-selected queries. Metrics have source definitions. No account needed for public status.

## 7. Interactive 3D infrastructure experience

Route: /infrastructure, with a homepage teaser. Use React Three Fiber/Three.js if compatible with the existing React project; otherwise select an equivalent that fits. Lazy-load WebGL and keep core portfolio usable before it loads.

Provide a layered spatial model: web edge → Azure VM boundary → K3s boundary → workloads; show host-level mail separately if chosen. Visitors can rotate, zoom, select a component and open a readable detail panel. Include architecture purpose, deployment type, persistent storage, dependencies, current status when available, ADR/runbook and real GitHub references.

Animate separately selectable web request, OIDC login, event processing and inbound/outbound mail flows. Flow animations explain topology; they are illustrative unless backed by explicitly correlated traces. Label them as illustrations, never as a live individual visitor trace.

Live Mode colors components using the public snapshot. Planned, configured, deployed and live-verified are distinct states. Show single-node limitations and backups outside the VM. Replica counts come from the actual snapshot, not a hardcoded two-pod claim.

Maintain one topology registry with component IDs, labels, dependencies, explanatory text, source references and implementation state. Resolve GitHub URLs from the actual remote and branch/commit; show 'source not published yet' if needed. No fabricated links.

Accessibility/performance: keyboard-operable component list and equivalent 2D/text view, touch controls, readable labels, reduced-motion support, no essential information conveyed only by color. Cap pixel ratio, simplify mobile geometry, pause offscreen animations, avoid permanent bloom-heavy rendering, and provide WebGL failure fallback. Preserve existing design direction. This handoff supplies behavior and architecture, not a replacement brand/design system.

Acceptance: desktop and mobile selection, reduced motion, keyboard view, WebGL disabled fallback, live/stale/offline/demo states, valid source links and no hydration/console errors. Demonstration mode is explicitly labeled with synthetic data.

## 8. Infrastructure, security and operations

Choose VM sizing from a resource worksheet, not K3s's bare minimum. Budget CPU/RAM/disk requests and limits for each service, retention and peak usage; leave OS/headroom. Keycloak, streaming and observability can exceed a small VM's capacity. Price the actual Azure region/SKU, disk, public IP, egress and off-host backup; free credit is not zero consumption. No paid provisioning without explicit scope and credentials.

Use non-root host access, patched OS, SSH restricted to approved admin access, least-privilege NSG rules and private Kubernetes API. Web 443 origin access is restricted to Cloudflare addresses where practical, using strict TLS and trusted proxy configuration. Native mail ports 25/587/993 require their own rules. DNS-only mail on the same public IP reveals the web origin IP, so do not claim Cloudflare hides the origin or protects native SMTP from DDoS. Firewall restrictions still protect the web ports. Consider a separate mail IP/host as a later isolation improvement.

Use cert-manager DNS-01 with narrowly scoped DNS credentials where applicable. NetworkPolicies, service accounts and RBAC limit workload access. Do not assume isolation works without checking the chosen CNI and host-network mail paths. Keep DB/Redpanda/admin/monitoring ports private. Secure Argo CD and monitoring through private access rather than publishing unrestricted admin pages.

Choose one secrets approach and document bootstrap/recovery: SOPS with encrypted Git secrets, or External Secrets with a real configured store. Installing External Secrets alone does not create a secret backend. Pin images/chart versions and preferably image digests; document upgrades and compatibility. Bound log, metric and event retention.

Use Redpanda for a meaningful feature such as durable contact processing/audit events. Implement validated contact submission → durable outbox in PostgreSQL → publisher → event topic → idempotent worker → mail delivery. Avoid transactional dual-write loss, unlimited retries and duplicate sends. A single broker is not highly available. Contact form cannot become an open email relay; use a fixed destination, input limits and abuse controls. Do not put arbitrary visitor addresses in the From header; use a verified domain sender and validated Reply-To.

Back up PostgreSQL, mailboxes, configuration and necessary recovery secrets to off-host storage. Define an initial target RPO <=24h and RTO <=4h as goals requiring demonstrated restore evidence. Quiesce or use application-consistent backup methods. Include K3s control-plane recovery appropriate to its datastore. Test full reconstruction on an isolated host; record actual times, never claim targets achieved without evidence. Alert on disk pressure, missing backup, certificate expiry, stuck mail queues and service failure through a channel independent of the broken mail service when possible.

## 9. Execution phases and completion gates

| Phase | Work | Gate |
|---|---|---|
| 0 | Repository assessment, ADRs, topology and resource worksheet | Existing work preserved; inputs/gaps documented |
| 1 | Docker image, local development, CI, configuration validation | Clean reproducible build; health/readiness; no secrets in image |
| 2 | 3D page, registry, source panels, explicit demo mode | Accessible/mobile/fallback flows pass |
| 3 | Azure IaC, host bootstrap, K3s, Helm, certificates, GitOps | Validated plan/manifests; authorized deployment has reachable TLS app |
| 4 | PostgreSQL and Keycloak protected area | Auth and authorization checks pass; public site remains independent |
| 5 | Private observability, snapshot service, live 3D mode | Real bounded telemetry; stale/outage/privacy checks pass |
| 6 | Redpanda/outbox/worker useful feature | Idempotence, retry and broker-outage checks pass |
| 7 | Mail platform, DNS, SMTP relay, clients | Inbound/outbound/no-open-relay and alignment verified |
| 8 | Recovery, hardening, budgets, migration and public documentation | Isolated restore demonstrated; limitations and operating instructions accurate |

Implement phases independently where dependencies permit, but do not expose an untested mailbox or label demo telemetry live. A finished local implementation may precede credentials/deployment; record the distinction. Run repository-required tests plus meaningful auth, telemetry, mail-relay, event durability and restore checks; avoid tests that merely mirror implementation.

## 10. Inputs needed at deployment time

Azure tenant/subscription/offer, region and credit budget; acceptable VM sizing; domain registrar and DNS ownership; actual GitHub repository/visibility and container registry; owner identity and desired protected demo; confirmed mailbox names; SMTP2GO approved account and verified domain; secret-store choice; off-host backup location/access; authorized external email test recipients. Never request these as plaintext secrets in chat: configure them in the execution environment or chosen secret store.

## 11. Required final deliverables from implementing Codex

Working application and containers; IaC/bootstrap; Helm/GitOps; Keycloak integration; topology registry and accessible 3D experience; sanitized status API with source definitions; mail deployment/relay and DNS worksheet; environment examples; CI; resource/cost worksheet; ADRs; setup/upgrade/incident/backup/restore/migration runbooks; test evidence; implementation status with deployed versus local versus blocked items. Public 'Behind this site' copy must reflect the final actual architecture.

## 12. Reference checkpoints

These are verification sources, not instructions to freeze current prices or versions. Recheck official documentation during implementation:

- Azure outbound SMTP rules: https://learn.microsoft.com/en-us/azure/virtual-network/troubleshoot-outbound-smtp-connectivity
- Visual Studio Azure benefit terms: https://azure.microsoft.com/en-us/pricing/member-offers/credit-for-visual-studio-subscribers/
- SMTP2GO Free plan: https://support.smtp2go.com/hc/en-gb/articles/223087947-Free-Plan (checked 5 October 2026: 1,000/month, 200/day; actual account restrictions must be confirmed).
- Cloudflare email DNS proxy limitations: https://developers.cloudflare.com/dns/troubleshooting/email-issues/
- Cloudflare Free WAF baseline: https://developers.cloudflare.com/learning-paths/prevent-ddos-attacks/baseline/enable-waf/
- Keycloak server guidance: https://www.keycloak.org/guides
- K3s requirements: https://docs.k3s.io/installation/requirements
- Mailu: https://mailu.io/ ; Mailcow: https://docs.mailcow.email/
- Redpanda deployment guidance: https://docs.redpanda.com/

This file is an implementation specification derived from the agreed conversation. It is not evidence that any infrastructure is already deployed and does not replace earlier portfolio content plans.
