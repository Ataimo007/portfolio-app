# Implementation status

Current workspace phase (2026-10-06): see [WORKSPACE_COMPLETION.md](WORKSPACE_COMPLETION.md) for booked/active consultation stages, tasks, direct private chat, owner mailbox and PWA notifications. Historical sections below describe earlier phases and their original verification boundaries.

Updated 5 October 2026. The existing portfolio content and approved design are preserved. Local Kubernetes infrastructure and the client-portal integrations are implemented and deployed. Azure K3s deployment and receive-first mail are also live; SMTP2GO outbound relay is configured, with external delivery testing pending. See the later dated sections and infra/azure/VALIDATION.md for current cloud evidence and account setup.

## Earlier infrastructure milestone — Envoy Gateway and centralized relational databases

Envoy Gateway v1.9.2 control/data planes are deployed in the new `ingress` namespace. Four Gateway API HTTPRoutes serve ataimo.com, keycloak.ataimo.com, grafana.ataimo.com and redpanda.ataimo.com (Console); Prometheus/broker/unknown hosts have no route. Exactly one gateway port forward replaces the individual forwards. Helm controller and proxy/routing values are tracked in infra/local-kubernetes/values/.

Keycloak was already using its isolated PostgreSQL database. Grafana is now migrated from SQLite to its own PostgreSQL database/role, preserving original files/PVC and verified table data. SQL activity confirms both applications use the shared database namespace; negative database-access checks passed. Keycloak admin browser login and Grafana credentials were verified through Envoy. All 18 portfolio tests passed through the canonical domain in 27.2 seconds.

The Dev Container hosts mappings are applied. The Mac hosts write failed with EACCES and remains a user administrator action; Mac-side browsing/port forwarding is not represented as verified. No TLS, public DNS, remote registry or cloud changes were made. See [gateway evidence](../../infra/local-kubernetes/GATEWAY_EVIDENCE.md) and the updated [runbook](../../infra/local-kubernetes/README.md). Earlier milestone evidence below remains historical; this update is the current ingress/Grafana state.

| Capability | Local implementation | Verified deployment evidence | Remaining |
| --- | --- | --- | --- |
| Deployment automation | `infra/local-kubernetes/`: Helm charts, values, build/load/deploy/verify/forward scripts | Entire script completed on existing ARM64 `kind-portfolio` | Remote registry, Azure/K3s production deployment |
| PostgreSQL | Official image, persistent volume, isolated `portal` and `keycloak` roles/databases | SQL query succeeds; portal role denied identity database access | Versioned application migrations and portal queries |
| Identity | Keycloak `ataimo` realm, roles, PKCE client foundation | Readiness UP; OIDC discovery matches local issuer; metrics scrape UP | Actual app sessions, callback/backchannel, client type, owner provisioning and authorization tests |
| Streaming | One Redpanda broker; persistent volume; no RabbitMQ in canonical stack | Cluster healthy; synthetic Kafka record produced/consumed; metrics scrape UP | Outbox, publisher/worker, real consultation/chat processing |
| Monitoring | Prometheus Operator, Prometheus, Grafana on isolated PostgreSQL, exporters, persistent storage | Grafana database healthy; Prometheus returned 15 actual local scrape targets; Keycloak/Redpanda targets UP | Request instrumentation, collector, sanitized public status UI, logs/traces if justified |
| App container | Locally built Next.js image loaded into Kind, non-root pod, HTTP probes | Portfolio and `/api/health` served by app namespace | Registry publishing, CI image provenance and production hardening |
| Consultation/chat | Earlier draft schema preserved | No application booking or chat flow verified | Request → approval calendar, client jobs and authorized private messaging |
| Infrastructure experience | Existing decorative R3F scene preserved | Existing UI verified from Kubernetes | Topology registry and truthful status/infrastructure UI |
| Mail and recovery | Existing prior drafts/reference assets preserved | No external mailbox, relay delivery, off-host backup or restore verification | Supported mail platform decision, SMTP/DNS inputs, measured recovery |

## Evidence and limitations

- `scripts/connect-kind.sh`: connected to existing `portfolio` cluster, Kubernetes v1.37.0, default local-path storage. No new cluster created. Tool binaries installed for ARM64 and checked against upstream checksums: kubectl v1.37.1, Helm v4.3.0, Kind v0.33.0. Dev Container configuration persists Kubernetes tooling, Kind and editor extensions; a full Dev Container rebuild has not been exercised in this task.
- `scripts/build-load.sh`: successful standalone production Docker build, including TypeScript/build checks, loaded into Kind as `ataimo-portfolio:kind-20261005090140`. No remote push. Image digest `sha256:d7429e4afacfd147d64cce611c2a8ccf5dee64aadddab843185b6c3cb88aaa6c`.
- `scripts/deploy.sh`: successful full execution after fixing two obsolete Redpanda configuration properties, Grafana startup resources, and health probe timing. All Helm releases report deployed. Credentials remain Kubernetes Secrets, managed by Helm; no credential values appear in committed files or this log.
- `scripts/verify.sh`: workload rollouts, bound PVCs, SQL, portal role login, Redpanda health, application HTTP, Keycloak readiness/discovery, Grafana database health and live Prometheus query passed. The last full deployment query returned 15 measured scrape targets; this count is an observation, not a hardcoded UI value or guaranteed future count.
- PostgreSQL cross-database negative check: portal credentials cannot connect to Keycloak database. Application role/session access isolation is not yet implemented.
- `scripts/smoke-streaming.sh`: passed produce/consume of explicitly synthetic records in `ataimo-platform-smoke`, including a repeat run. No actual chat or contact event pipeline is implied.
- Agent-browser: Kubernetes portfolio loaded, expected headings/links present, no reported page errors; screenshot `notes/previews/kubernetes-portfolio.png`. No visual redesign in this phase.
- Initial browser checks under concurrent deployment and host memory pressure failed; application/control-plane probes restarted services. Docker has approximately 8 GiB total. Legacy Compose services were stopped, retaining containers/volumes. Current Kubernetes workload probes were adjusted; tests use one worker after rollouts. This is functional acceptance, not a production load/performance guarantee.
- Tests originally hardcoded port 3001 in contact origin and no-JavaScript navigation. They now use Playwright's configured base URL. Full final suite evidence is recorded in `infra/local-kubernetes/DEPLOYMENT_EVIDENCE.md`.
- `npm run lint` and `npm run typecheck` passed after code/test configuration changes. App build passed inside Docker.
- No Git repository/remote was inferred or configured. No Azure/DNS/TLS/production SMTP actions were performed. Kind storage is local development persistence, not an off-host backup or HA deployment.

## Next milestone

Implement Keycloak sessions/authorization plus versioned PostgreSQL migrations, then consultation request-and-approval/calendar/client jobs, private portal chat, durable Redpanda processing and a measured local status UI. Follow the adopted execution order in IMPLEMENTATION_PLAN.md and the local runbook. Keep verified local metrics, illustrative flows and future remote deployment claims distinct.

## Client portal implementation — 5 October 2026

Supersedes the earlier “next milestone” and unimplemented application rows above. Server-side confidential Keycloak OIDC sessions, transactional/versioned application migrations, owner-managed consultation slots, client requests, atomic approval/decline, client jobs, private per-job chat, durable outbox/Redpanda notifications, and an allowlisted public local-status UI are implemented and deployed to the existing Kind cluster. Current portfolio content, design and public routes are retained.

Routes: `/portal`, `/status`, protected `/api/portal` and job-message APIs, server-side `/api/auth` login/callback/logout, public `/api/platform/status`. PostgreSQL uses only the isolated portal role for runtime queries. The worker runs in `app`; migrations run as Helm-owned jobs. No synthetic bookings, users or jobs are permanent application data. Public registration remains disabled. Real owner identity is awaiting selection; use the invitation/role script described in PORTAL_OPERATIONS.md.

The Mac gateway routing and fresh Grafana state are now user-confirmed. Grafana's SQLite data migration is historical: active Grafana storage is freshly initialized PostgreSQL, with its increased local memory allowance and Go concurrency settings.

Integration tests against real local Keycloak completed code/PKCE login for temporary owner, two clients and read-only viewer; verified HttpOnly/Lax cookies, origin checks, unauthorized mutations, anonymous APIs, invalid/tampered callbacks, one-winner concurrent approval, cross-client message denial, chat retry idempotency, owner reply polling, Redpanda notification creation, job completion/read-only messaging, expired-session rejection and logout. Temporary accounts and relational data removed. Synthetic broker envelopes retain the topic's development retention period. Public snapshot observed seven measured components with local-kind mode; no Azure/live-production claim.

Operations and boundaries are documented in [PORTAL_OPERATIONS.md](PORTAL_OPERATIONS.md). SMTP/email delivery, external chat apps, payments/calendar-provider sync, automatic token refresh/backchannel logout, advanced scheduling, full infrastructure 3D topology, Azure/TLS/registry/CI/GitOps, and off-host restore remain separate work. Owner invitations request OTP enrollment; no real owner MFA completion has been claimed. Local HTTP cookies are explicitly development-only. Runtime dependency audit found zero vulnerabilities; five high findings remain in the pre-existing development-only ESLint dependency chain (audit suggests an inappropriate major downgrade, not applied).

### Final local acceptance evidence

- App image `ataimo-portfolio:kind-20261005115146` and its `-worker` image loaded into Kind. Helm `portal-jobs` revision 6 and `portfolio` revision 9 deployed successfully; checksum-verified migration Job completed, app and worker ready. No registry push.
- Real-service integration acceptance passed with controlled identity network failure: existing sessions and public pages remained usable, and new login returned the designed recovery state. Earlier controlled Kafka network failure verified that a successfully saved message remained in PostgreSQL/outbox and was published after connectivity recovery. Duplicate event replay created no duplicate notification. Temporary firewall rules, accounts and database fixtures were removed; synthetic broker metadata follows development retention.
- A synthetic event referencing nonexistent random job/recipient UUIDs was safely routed to a sanitized `reference-unavailable` dead-letter record by the deployed worker; no customer data was used.
- Browser regression run: 25 of 26 passed together; the remaining desktop navigation/resume test timed out with a closed browser protocol session and passed an isolated rerun in 9.3 seconds. All eight new portal/status UI cases passed in the full run. This is functional acceptance rather than a performance/load guarantee.
- ESLint, TypeScript, portal-jobs Helm lint, deployment shell syntax and Python helper compilation passed. App/worker Docker production builds passed. A subsequent source production build also passed with page-generation concurrency capped at two workers to reduce shared local resource pressure; running images were built before that build-only concurrency setting.
- Kind scheduler/controller-manager lease tuning and rollback are documented in [ADR-0003](ADR-0003-client-portal.md); original static-pod files are preserved in ignored local storage. This adjustment addresses observed local controller instability and is not cloud sizing or high availability.

## Branded accounts and simplified navigation — 5 October 2026

The new public navigation has Home, Portfolio, Contact Us and Login. Portfolio groups Experience, Projects, Expertise, Resume and About Me; resume downloading lives on Resume. `/login` and `/signup` open ordinary portfolio-branded username/password forms backed by the existing OIDC flow. Keycloak branding has been removed from user-facing copy. Public registration now grants client-only access, while owner access remains explicitly provisioned and demo-viewer stays read-only even with inherited client access. This supersedes earlier invitation-only registration statements.

Helm identity-theme revision 2 and Keycloak revision 10 deployed; portfolio revision 10 and portal-jobs revision 7 deployed. App and worker image tag is `kind-20261005131232`. The custom theme is version-pinned, mounted read-only and shares generated application tokens/self-hosted fonts. See [BRANDED_ACCOUNTS.md](BRANDED_ACCOUNTS.md) for deployment, social credential setup, and production inputs.

Real registration browser verification passed: invalid credentials, password policy rejection, successful registration, client-only profile/session creation, owner-action denial, logout and mobile overflow. The created synthetic user/profile was deleted. Existing real-service portal acceptance passed again: four-role SSO, request/approval race, private chat isolation/idempotency, event replay deduplication, completion, expiry and logout. Build, ESLint, TypeScript and Helm/helper syntax checks passed. Social OAuth remains unconfigured and unverified until provider applications/credentials are supplied; disabled options are labelled honestly. Email verification/reset delivery is not enabled without SMTP. No cloud or public DNS changes were made.

Final branded-navigation regression: all 28 desktop/mobile Playwright cases passed in 27.0 seconds after updating the tests for the new disclosure behavior, scoped navbar header and native no-JavaScript submenu activation. App and worker Ready with zero restarts at final inspection; migration revision 7 completed. Initial obsolete test assumptions and a transient gateway restart were resolved before final acceptance.

## Credential cards and provider logos — 5 October 2026

Resume certifications now use a responsive two-column desktop / one-column mobile grid with Microsoft-published Expert, Associate and Fundamentals artwork. AZ-303 is labelled as an exam record with the Microsoft logo. Original issue dates and historical-status disclosure are preserved; public detail links do not claim personal credential verification. Artwork provenance is in `public/badges/SOURCES.md`.

The branded login has four provider logos: Google, LinkedIn, GitHub and Microsoft; configured provider buttons also inherit the upstream logo rendering. Identity theme revision 3 / Keycloak revision 11 and portfolio revision 11 deployed locally. App image `ataimo-portfolio:kind-20261005133502` built/loaded successfully. No OAuth credentials were supplied and social authentication remains disabled/unverified. Microsoft helper configuration now uses Graph User.Read and captures tenant/account audience. See [SOCIAL_LOGIN_SETUP.md](SOCIAL_LOGIN_SETUP.md) for registration, exact broker callbacks, scopes and private credential entry; current custom-domain HTTP needs an HTTPS/accepted-localhost decision before Google sign-in.

Validation: build, ESLint, TypeScript and Python helper compilation passed; desktop/mobile browser checks confirmed four loaded credential images, correct grid columns, no overflow and four loaded provider logos. Screenshots inspected. All four relevant desktop/mobile navigation, route and resume-download regression cases passed in 18.9 seconds. No new dependencies, real email, cloud/TLS or public DNS changes.

## Google consent assets — 5 October 2026

Added public `/privacy` and `/terms` pages, shared responsive legal-page layout, footer links and sitemap entries. Policies describe the current Azure service, basic Google identity scopes, private consultation/job/message records, essential cookies, current retention limitations and contact-based data requests. No legal-review or Google-approval claim is made.

Original AE monogram vector and 512×512 / 120×120 PNG exports are stored in `public/brand`. Logo provenance/palette and production Google Branding inputs are documented there and in SOCIAL_LOGIN_SETUP.md. Google OAuth secrets were not supplied to this agent; real provider sign-in remains unverified until the owner configures credentials and completes an account test.

Local ESLint, TypeScript and production build passed. Local desktop/mobile browser checks verified public content, footer links and no horizontal overflow; inherited mobile nav ordering was corrected. Azure app-only deployment uses `infra/azure/scripts/deploy-app.sh`, preserving identity and other dependency configuration. Trusted HTTPS requests verified both policy pages and byte-identical public logo delivery; a live browser loaded the privacy page without bypassing certificate validation.

## SSO navigation and Google test identity — 5 October 2026

Owner reported a successful real Google login on Azure. This is owner-confirmed provider behaviour; the agent did not independently replay Google authentication.

Navigation now checks a minimal, private, non-cacheable `/api/auth/session` endpoint. Verified application sessions show Profile → `/portal`; signed-out users see Login → `/login`. Unknown/loading states retain an Account link, and a failed status check provides account recovery without falsely reporting logout. Navigation and focus/visibility changes refresh session status; aborted stale responses do not overwrite newer checks. Public portfolio pages remain statically generated.

ESLint, TypeScript and production build passed. Four desktop/mobile Playwright cases passed using controlled session responses: signed-out, signed-in, expiry/focus refresh, and unavailable status. Broader authenticated portal-page testing is deferred at the owner's request.

The exact owner-authorised Google test identity was removed from Keycloak's ataimo realm and absence verified. Its one active PostgreSQL portfolio session was revoked; client records were preserved. No other identity, social-provider configuration, job or message was deleted.

GitHub OAuth is already supported by the existing provider integration. Registration uses homepage `https://ataimo.com` and callback `https://keycloak.ataimo.com/realms/ataimo/broker/github/endpoint`. Enter client ID/secret through the existing hidden-prompt helper, targeting `ataimo-azure`; do not enable device flow or request repository access for sign-in.

## Social sign-in alignment — 5 October 2026

Deployed a scoped override for PatternFly's social-button space-between utility. Icons and provider names now form centred groups with an 8px gap and token-based 16px icon sizing. Live desktop/mobile checks passed for all four configured provider buttons; no login flow was rerun. Single-node Keycloak update strategy now avoids CPU-blocked surge pods and is persisted in the Azure configuration. See infra/azure/VALIDATION.md for measured evidence.

### Social styling cache correction

The owner's screenshot showed the previous split layout. Added content-versioned identity stylesheet URLs so the centred-button styling reaches existing browsers, rather than relying on a fresh browser or hard refresh. Reused-browser desktop/mobile alignment and asset loading passed on Azure. See infra/azure/VALIDATION.md.

## Azure receive-first mail — 5 October 2026

Mailu/Roundcube now run in namespace mail with separate mailu and roundcube PostgreSQL databases in database. Created admin@ataimo.com and ataimo@ataimo.com; hello/contact deliver to ataimo and postmaster to admin. Webmail/admin HTTPS, mail-client encryption/authentication, controlled local inbox delivery, alias destinations and relay denial were verified. Public SMTP port 25 reached by two external probes. Approved replacement of unused woza.me mail DNS completed and public records checked.

No real external email sent. SMTP2GO registration confirmation receipt remains the owner's next check; outbound relay, provider sender-domain verification, external delivery, Keycloak verification/password-reset SMTP and off-host backup/restore remain pending. Receive-only SPF and deferred outbound transports prevent a false claim that external sending works. See [mail deployment and client settings](../../infra/azure/mail/README.md) and [test evidence](../../infra/azure/VALIDATION.md).

## SMTP2GO relay — 6 October 2026

Authenticated SMTP2GO outbound relay is configured on Azure via a Helm-managed Kubernetes Secret. Workload and Postfix-container trusted STARTTLS/authentication passed, provider DNS aliases resolved, and deployed Postfix enables certificate-verified relay transport rather than the earlier receive-only hold. Deployments preserve that relay configuration automatically. External recipient delivery and received-message SPF/DKIM/DMARC remain unverified pending an authorized recipient test. Keycloak verification/password-reset SMTP still remains separate work. See infra/azure/VALIDATION.md for evidence and infra/azure/mail/README.md for rotation/deployment commands.

### Authorized external relay test — 6 October 2026

One owner-authorized test email was submitted through Mailu and accepted by SMTP2GO over certificate-verified TLS 1.3; Postfix removed its successfully relayed queue entry. Recipient-side receipt/SPF/DKIM/DMARC and inbound reply remain pending. Port 465 authenticated TLS passed. Mail client instructions are in infra/azure/mail/CLIENT_SETUP.md.

### 2026-10-06 — Infrastructure showcase

Homepage platform section and `/platform` added with a shared infrastructure graph, labeled interactive diagram, optional demand-rendered 3D view and matching native-scroll background model. Includes native and social identity, core four Envoy domains, isolated PostgreSQL databases, Redpanda, monitoring, Mailu and SMTP2GO. The worker now collects aggregate resource telemetry; public API stays restricted to validated snapshots. See `ARCHITECTURE_SHOWCASE.md` for measurement semantics and test evidence.

The owner has confirmed receipt of the prior external email test, a reply and successful phone IMAP access. This is owner-confirmed mail delivery/client evidence; SPF/DKIM/DMARC results from the received headers have not been independently inspected.

2026-10-06: Layered full-width architecture refinement deployed on Azure (`azure-20261006040359`). Client → Envoy → five service nodes → PostgreSQL/Redpanda/Prometheus, with a separately bounded external SMTP2GO workaround. Vendor logos appear on raised 3D badges; the same model powers the background. Directional signals are illustrative, while resource measurements remain actual Prometheus snapshots. Local build/lint/typecheck and 28 relevant browser cases passed across two serial suites; public page/API returned 200 and workloads were ready.

2026-10-06: Pod telemetry and custom public contact details deployed with app/worker tag `azure-20261006052556`. Homepage shows separate CPU/memory top-five lists; `/platform#telemetry` shows node resources and all pod records with sortable CPU/memory/name columns, namespace filter, phase, readiness and restart totals. The verified fresh public Prometheus snapshot contained 31 pod records and 29 measured running pods; completed pods have unavailable usage rather than invented zeros. Desktop/mobile live checks passed without overflow or browser errors. Public enquiries use contact@ataimo.com and +234 816 0594 893; live alias lookup confirmed hello/contact remain aliases of the ataimo mailbox. Evidence, including a brief recovered Envoy 503 during rollout, is in infra/azure/VALIDATION.md.

2026-10-06: Public contact details are now also displayed in the shared header on every page (`azure-20261006060759`), preserving the four-entry menu and session-aware account link. The earlier homepage contact block remains near the bottom under “Let’s think it through.” Local navigation/session checks passed on desktop/mobile; header captures cover desktop/tablet/mobile. See Azure validation for rollout evidence.

2026-10-06: Corrected homepage contact contrast and header placement (`azure-20261006062215`). Service description/email/phone are explicitly white and legible on the blue panel. Contact details moved into the left brand group with smaller typography, restoring the desktop navbar to 80px. Ten navigation/session/contrast checks passed; actual deployed desktop/tablet/mobile header and scrolled contact-section captures confirmed the final presentation without overflow or browser errors.

## 2026-10-06 — Source control and CI/CD preparation

The navbar scroll behavior is now limited to mobile widths up to 900px; desktop remains sticky without sliding. Mobile motion is 280ms with the existing native easing and reduced-motion behavior. All 68 desktop/mobile application tests passed; lint/typecheck/build and four deployment-routing/plan unit tests passed.

Added `.github/workflows/delivery.yml` and reusable quality checks. Main pushes build and publish AMD64 app/worker images to Docker Hub, then select the existing-VM app-only path. Manual greenfield requests provision only an empty target using the current Terraform/K3s Ansible/Helm assets. Existing VMs always select brownfield; partial resources or missing state reconciliation fail explicitly. The registry path contains no local Docker build/import. Images use digests and private image pull settings on app, worker and migration job. Fresh TLS/mail/workspace/DNS automation reuses current scripts; existing provider credentials and mail data are preserved on app updates.

Validated workflow syntax with actionlint, Terraform configuration with `validate`, both Helm charts with lint/render checks, Ansible playbook syntax, shell syntax, and staged-file secret scanning. Runtime `.local`, Terraform state, kubeconfig, environment credentials, private keys and generated review artifacts are ignored. GitHub CLI remains unauthenticated and a target repository/Docker Hub namespace has not been supplied; no remote push, registry publication, Actions run, fresh provisioning or current-release update is claimed. Required setup is documented in `infra/azure/ci/README.md`.

## 2026-10-07 — Navbar correction deployed

Desktop header now remains visible/stationary on the actual Azure release. Mobile offset follows native scroll distance directly rather than a timed direction-triggered animation. Focus/menu/reduced-motion/resize safeguards remain. Image `azure-20261007063519` is deployed, with real HTTPS desktop/mobile acceptance passing. Gateway recovery and capacity-aware Helm rollout settings are recorded in `infra/azure/VALIDATION.md`. GitHub/Docker Hub credentials and repository destination remain pending; this release used the existing authorized direct deployment path.
