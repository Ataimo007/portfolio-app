# Repository assessment

Assessment date: 5 October 2026. Scope: complete review of ATAIMO_PLATFORM_HANDOFF.md and read-only inspection of current repository and local Docker service state. No application, infrastructure or DNS changes made during this assessment.

## Current stack and repository

- Next.js 16.3.8 App Router, React 19, TypeScript, npm/package-lock.json, Node 22.
- Tailwind CSS 4, CSS theme tokens in app/globals.css and app/brand.css; Geist Sans, JetBrains Mono and Instrument Serif.
- React Three Fiber, Drei and Three.js; native IntersectionObserver, requestAnimationFrame and delta-based camera transitions. Preserve the approved cream/cobalt editorial design and real portfolio content.
- Dev Container with Codex CLI, editor tooling, Docker-outside-of-Docker and persistent development volumes.
- No AGENTS.md found in the workspace. .codexrules contains UI rules; treat its wording as project guidance, not system authority.
- Git inspection fails because this workspace is not a Git repository. No actual app remote, branch, commit, visibility or registry is known. Existing portfolio project links in content/site.ts are supplied content; they do not establish this application's remote.

## Capability/evidence matrix

| Capability | Repository evidence | Actual assessment status |
| --- | --- | --- |
| Public portfolio, case studies, CV and contact UI | app routes, content/site.ts, public resume PDF | Implemented locally; preserve |
| Interactive homepage | components/portfolio-motion.tsx, scroll-architecture-scene.tsx, scroll-camera-controller.tsx | Decorative architectural scene; not runtime topology or telemetry |
| Contact API | app/api/contact/route.ts, lib/contact.ts, lib/send-contact.ts | Validation/origin/size handling and synchronous Resend adapter; returns unavailable when unconfigured; no durable processing or verified external delivery |
| Production container | Dockerfile, standalone output | Non-root multi-stage image definition and locally running Compose app; running image freshness not established |
| CI | .github/workflows/ci.yml | Local workflow definition; execution on GitHub unverified |
| PostgreSQL | compose.yaml, SQL/init assets | Local container reported healthy by Docker; current data/schema not queried during this assessment |
| Keycloak | Compose and realm assets | Local container running; no application OIDC/session integration |
| Event broker | Compose broker service | RabbitMQ container reported healthy; application does not use it; Redpanda absent |
| Development mail | Mailpit container | Local container reported healthy; captures development mail; not inbound internet mail or mailboxes |
| Kubernetes | infra/kubernetes Kustomize assets | Draft manifests with placeholder hosts/images; not evidence of a deployed cluster |
| Mail deployment | optional infra/kubernetes/mail.yaml | Docker-mailserver draft, not in default stack; no mailbox/webmail/relay/alignment evidence |
| Azure IaC, Helm and Argo CD | No matching implementation directories | Not implemented |
| Public status and private observability | No status route/collector/monitoring definitions | Not implemented; no verified live telemetry |
| Backups and recovery | No off-host restore evidence | Not established |

Docker inspection observed the development container and local Compose app, PostgreSQL, Keycloak, RabbitMQ and Mailpit running. These run on the Mac Docker engine accessed from the Dev Container; they are not Azure/K3s deployments. Container health is not an end-to-end product check.

## Conflicts to reconcile

1. **Broker:** handoff requires Redpanda; existing local/manifests use RabbitMQ and AMQP_URL. Preserve existing data until a controlled migration; introduce Redpanda in phase 6, retire RabbitMQ as an active target, and do not maintain two canonical production broker stacks.
2. **Identity:** existing realm is portfolio, roles client/consultant, registrationAllowed=true. New default is ataimo, owner/admin and demo-viewer, invite-only/no public signup. Create a versioned migration path; importing a realm again does not safely update an existing initialized realm. No silent user deletion.
3. **Mail:** existing draft uses Docker-mailserver and lacks the complete chosen mail platform. Select one maintained supported stack; do not deploy the old draft beside it. Mailpit remains development-only.
4. **Email flow:** synchronous Resend adapter differs from PostgreSQL outbox → Redpanda → idempotent worker → SMTP relay. Retain safe unavailable behavior until the durable path is wired; do not report relay acceptance as recipient delivery.
5. **Deployment:** existing Kustomize assets are useful references, but Helm/GitOps must become the authoritative target, with explicit retirement of duplicate desired-state definitions.
6. **Domain:** app/layout.tsx, sitemap.ts, robots.ts and Dockerfile currently default to ataimoedem.com; production target is ataimo.com. Centralize and validate SITE_URL before publication. Domain ownership/DNS control is not proven.
7. **Earlier consultancy work:** booking, client jobs and private chat schemas are present, but their UI/API flows are not implemented. The new handoff prioritizes owner administration and optional demo access. Preserve schema/content; defer consultancy features pending roadmap confirmation.
8. **Subscription:** Microsoft states Visual Studio monthly credits are dev/test only. Verify the actual offer; production portfolio and real mailbox hosting need an eligible production subscription. No billable provisioning authorized by this planning request.
9. **Secrets/build hygiene:** expand ignore and build-context protections for Terraform state, kubeconfigs, keys, generated secrets and local Codex artifacts before new infrastructure is introduced. Existing environment files were not printed or copied.

## Integration points

- Keep existing app structure. Add /infrastructure, a homepage teaser, lib/platform topology/schema modules, and /api/platform/status.
- Use one stable component-ID registry; separate desired architecture, environment-specific implementation state and runtime health. Component selection/details/text list share that registry.
- Keep public content independent of auth and telemetry availability. Unknown/stale status must not prevent portfolio rendering.
- Reuse contact validation/UI with a durable intake service; add proper migration-managed DB access and transactionally write submission/outbox.
- Add a maintained server-side OIDC integration, server-enforced roles, secure cookies, private owner views and friendly identity-provider outage handling.
- Build collector/worker as separate deployable processes, not permanent background jobs inside Next.js request handlers.
- Introduce docs/platform, deploy/helm, deploy/gitops, deploy/platform, infra/terraform/azure and infra/bootstrap incrementally. Keep mail deployment separate when upstream requires host Compose.

## Test evidence and limits

Latest recorded application checks from the preceding UI implementation: lint, typecheck, production build and 18 desktop/mobile Playwright tests passed. Those tests cover routes, keyboard navigation, resume download, responsive behavior, contact failure/success adapter mocks, reduced motion, no-JavaScript content and persistent camera behavior. They do not prove OIDC, live status, Redpanda, internet mail or Azure deployment. No new full application test run was performed for this documentation-only assessment.

Fresh evidence in this assessment: complete handoff read; route/dependency/workflow/container/manifests/schema review; Git-state check; docker ps service/health inspection; official Azure benefit and SMTP guidance reviewed. No actual Azure, DNS, SMTP2GO, Kubernetes or private monitoring credentials were inspected.

## Verified reference implications

- Visual Studio credit restrictions: https://azure.microsoft.com/en-us/pricing/member-offers/credit-for-visual-studio-subscribers/ — dev/test, no production entitlement inferred.
- Azure SMTP: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/troubleshoot-outbound-smtp-connectivity — outbound TCP/25 varies by subscription; authenticated TCP/587 relay is the intended path. Inbound TCP/25 still needs an external test.
- Mail platform checkpoints: https://mailu.io/ and https://docs.mailcow.email/ — shortlist only; no selected/pinned deployment asserted.

## Adopted local application integration update

The app now includes openid-client/jose server-side Keycloak sessions, pg-backed versioned migrations, protected consultancy/calendar/job/private-chat APIs and a portal extending the incumbent design. A bundled KafkaJS worker handles outbox notifications and sanitized measured local status. Helm migration/worker assets live alongside the adopted local infrastructure directory. No second frontend structure, replacement visual identity, fabricated repository link, external email delivery or cloud telemetry was added. PORTAL_OPERATIONS.md and ADR-0003-client-portal.md record account setup, runtime boundaries and release limitations.
