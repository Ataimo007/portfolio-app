# Validation record

Current outcome: Azure infrastructure and the application stack are deployed and verified. Public web DNS cutover was approved and executed. Social-provider OAuth remains unconfigured. Earlier sections below record the predeployment checks and initial MFA failure.

## Checks completed locally on 2026-10-05

- Login theme deployed to local Keycloak; four provider assets loaded at 16×16px on desktop and mobile, with no horizontal overflow. Screenshots are in ignored infra/local-kubernetes/.local/login-polish-{desktop,mobile}.png.
- Terraform 1.14.6 initialized against signed azurerm 4.74.0; terraform fmt -check and validate passed. This is static/provider-schema validation, **not** an Azure plan or quota check.
- Ansible provision and deploy playbooks passed syntax-check with ansible-core 2.19.13 and ansible.posix 2.1.0. No remote tasks ran.
- Helm lint passed for existing gateway/theme/service charts and certificate charts rendered for Cloudflare and Azure DNS. Both solvers used placeholder validation inputs, not operational credentials.
- Rendered cloud gateway has four HTTPS listeners, four HTTP redirect listeners, route authentication for Console and a LoadBalancer service. Kubernetes server-side dry-run accepted Gateway/HTTPRoute/EnvoyProxy/SecurityPolicy resources against the existing Envoy CRDs; no resources were applied.
- Cloud theme rendering uses the HTTPS portfolio link. Cloud values use K3s pod CIDRs for trusted proxy headers, HTTPS canonical identity URLs and secure application HTTP policy.
- Source bundle exclusion checks passed; runtime private files, node_modules and Terraform caches are excluded.
- npm lint, typecheck and production build passed. Ten desktop/mobile status tests passed, including an explicitly mocked Azure environment label. This test fixture does not represent live Azure telemetry.

## Unverified at preparation time (historical)

Azure authentication, region/SKU availability and quota, actual terraform plan/apply, VM provisioning, SSH trust, data disk mount, Helm installation on K3s, image import, ACME DNS challenge, certificate issuance/renewal, cloud routing, DNS cutover and real social-provider login. Cloud backups and high availability are not configured.

## Azure execution attempt — 2026-10-05

User selected westeurope, Standard_D2as_v5, administrator CIDR 0.0.0.0/0, DNS label ataimo-platform, Azure DNS ataimo.com in resource group shared, and ACME email edemataimo@gmail.com. A dedicated ED25519 SSH pair was generated under ignored infra/azure/.local, with private-key permissions 0600.

Azure CLI read access and an ARM token were verified. The requested VM family reports quota 20 with current usage 0. The Terraform plan contains 14 additions and no updates/deletions, including a zone-scoped DNS managed identity. Terraform apply failed when Azure rejected resource-group creation with HTTP 401 RequestDisallowedByAzure: the login lacks MFA required for resource writes. Terraform state contains no created resources. Renew the Azure CLI login with MFA, then regenerate the saved plan before retrying.

Authoritative checks show the .com parent delegates to the four Azure nameservers. The Azure zone apex NS answer also contains ns1.olitt.com and ns1.olitt.net; these stale child-zone entries need removal while retaining all four Azure assigned nameservers. No registrar update is needed. No DNS records have been changed during this attempt.

## Successful Azure deployment — 2026-10-05

The renewed MFA login initially left a non-MFA token cached under the exact ARM audience used by Terraform. Refreshing that audience through the authenticated Azure CLI session resolved the rejection. The login helper now requests Terraform's management.azure.com scope directly.

- Terraform created all 14 resources successfully: Standard_D2as_v5 in westeurope, static IP 20.229.210.201 and FQDN ataimo-platform.westeurope.cloudapp.azure.com. Azure DNS managed identity has DNS Zone Contributor scoped to the existing zone only.
- SSH host key was verified against Azure Run Command. Ansible provisioning completed: ok=24, changed=16, failed=0, unreachable=0. K3s node Ready, v1.35.9+k3s1; Traefik absent; persistent data disk mounted before first startup.
- Ansible stack deployment completed: ok=7, changed=6, failed=0, unreachable=0. VM-native app/worker images were built and imported, and the migration job completed.
- All deployed application/dependency workloads Ready. PostgreSQL has separate portfolio, keycloak and grafana databases.
- Staging and production DNS-01 issuance succeeded. Production Certificate Ready with letsencrypt-production issuer and expiry 2027-01-03T17:21:32Z. Automatic renewal is configured; future renewal itself has not been observed.
- verify.sh passed with trusted HTTPS using curl --resolve: application health, identity discovery, Grafana health, Redpanda Console unauthenticated 401, HTTP 301 redirect. DNS names were pinned to the VM IP for these checks; this is not evidence of public DNS cutover.
- Live cloud status API reported environment azure-k3s, mode live, stale=false and all seven measured components healthy, ready=1, desired=1. These are real Prometheus-derived readings, not fixture data.
- Chromium verified real cloud username/password OIDC login, private client workspace, secure HttpOnly session cookie and logout. Mobile cloud login had four loaded 16px logos and trusted TLS. The temporary Keycloak identity and PostgreSQL client profile were removed. No consultation/job/chat demonstration data was added.
- Azure zone apex NS correction succeeded with conditional write and backup; four Azure assigned nameservers remain, two stale Olitt entries removed. No registrar changes, apex A cutover, mail changes or www changes were performed.

Private evidence logs: .local/apply-mfa-normalized.log, provision.log, deploy.log, login-verification.log, dns-correction.log and cloud-login-mobile.png. SSH keys, credentials, Terraform state and kubeconfigs remain ignored/private.

Remaining: allow recursive DNS caches to refresh, remove the Mac's local hosts override for normal cloud browsing, configure provider OAuth credentials and verify real social login. Full booking approval/private-chat flows were previously validated locally and have not been re-run end-to-end in the cloud. SMTP, backups/restore and HA remain outside this completed deployment.

## Approved DNS cutover — 2026-10-05

User explicitly approved updating ataimo.com and the identity, Grafana and Redpanda Console subdomains. publish-dns.py applied conditional record updates with an original-record backup. Apex A now points to 20.229.210.201, because the zone apex cannot use a conventional CNAME alongside required NS/SOA records. keycloak/grafana/redpanda CNAMEs point to ataimo-platform.westeurope.cloudapp.azure.com, with TTL 300. Azure authoritative queries returned all four expected answers. Mail and www were preserved. Existing local hosts overrides still need removal for normal cloud browsing. SSH login as ataimo was verified using the dedicated key and verified project known_hosts file.

## Administrator access and mail foundation — 5 October 2026

Ansible provision rerun succeeded: 26 tasks OK, 4 changed, 0 failed. Standalone checksum-verified kubectl v1.35.9 replaces the K3s compatibility symlink. Administrator kubeconfig is copied to `/home/ataimo/.kube/config` with owner `ataimo`, mode 0600; root K3s configuration stays private.

Mail foundation Helm chart lint passed; release deployed in namespace `mail`. Mailu upstream chart 2.8.0 rendered with the proposed values. Runtime mail delivery is not implemented or verified. Existing MX/mail CNAME and TXT records were inspected and preserved. Required mailbox/migration and relay-account inputs are documented in `mail/README.md`. Social provider console steps and production HTTPS callbacks were updated in `docs/platform/SOCIAL_LOGIN_SETUP.md`.

Live SSH verification passed as ordinary `ataimo`: `kubectl get nodes` reported Ready, `helm list -A` succeeded, and user kubeconfig permissions were 0600. Mail certificate issuance was pending DNS propagation at this checkpoint; it was not reported as issued.

Subsequent readiness wait passed: `mail/mail-tls` Certificate is Ready. Production certificate issuance for both mail hostnames succeeded; future automatic renewal remains untested.

## Google consent assets deployment — 5 October 2026

App-only Azure rollout completed, portfolio Helm revision 3, image `ataimo-portfolio:azure-20261005210006`, one ready replica. Trusted HTTPS policy requests and byte-identical PNG delivery passed. Live browser checks verified mobile terms have no horizontal overflow, contents precede the text, and the homepage links to both policies. Browser error check returned no errors. Local lint, TypeScript and production builds passed. Social Google login remains unverified; credentials are entered privately by the owner.

## Session-aware navigation — 5 October 2026

Portfolio Helm rollout succeeded with image `ataimo-portfolio:azure-20261005212320`, one ready replica. Trusted HTTPS `/api/auth/session` returned `{"authenticated":false}` without credentials. The endpoint uses private no-store caching and returns only authentication status. Local lint, typecheck and build passed; all four desktop/mobile session-navigation tests passed using controlled responses. Broader real authenticated portal-page checks are deferred per owner instruction. Owner confirmed successful Google SSO separately. Exact authorised test identity deletion and application session revocation were verified; other client records were preserved.

## Microsoft publisher-domain document — 5 October 2026

Owner-provided association JSON added to `public/.well-known/microsoft-identity-association.json` and deployed via the app-only Ansible flow. Image `ataimo-portfolio:azure-20261005221141` has one ready replica. Trusted HTTPS GET at `https://ataimo.com/.well-known/microsoft-identity-association.json` returned HTTP 200, application/json, and exactly the requested application ID `26526d95-2632-4564-9a48-d741ca3d07c9`, without authentication. Microsoft console approval was not performed or claimed.

## Social login button alignment — 5 October 2026

Live inspection found the upstream PatternFly space-between utility overrides the custom centered layout. Scoped social-button CSS now explicitly overrides that utility and uses the shared spacing token for 16px icons. Identity-theme Helm revision 2 and Keycloak revision 3 deployed in Azure. Both Helm charts linted successfully.

Live desktop and 390px mobile browser checks passed for GitHub, Google, LinkedIn and Microsoft: icon-to-label gap exactly 8px, vertical centre offset 0px, combined group centre offset below 0.01px, all four images loaded, no mobile horizontal overflow and no browser errors. Screenshots were inspected. No provider sign-in or account-linking flow was replayed for this CSS change.

The initial Keycloak rolling update was CPU-unschedulable because the single VM could not reserve two identity pods. Deployment strategy was adjusted to maxSurge 0/maxUnavailable 1, persisted in the shared chart's optional strategy support, Azure values renderer and installed Helm values. This one-node profile briefly interrupts new sign-ins during identity replacement; readiness subsequently passed. No credentials or social-provider settings were changed.

## Existing-browser stylesheet invalidation — 5 October 2026

Owner screenshot `image.png` still showed split social buttons despite fresh-browser alignment checks. Investigation confirmed fresh live CSS centres the group but Keycloak served unchanged, cacheable stylesheet URLs. The earlier rollout did not invalidate existing browser caches.

Identity theme now derives `ataimoAssetVersion` from its CSS content and appends it to the stylesheet URLs emitted by the custom template. Identity-theme revision 3 and Keycloak revision 4 deployed successfully. Helm lint and rendered properties validation passed. The same browser session that visited the previous unversioned URLs loaded the new versioned URLs through ordinary navigation, without clearing browser data. Desktop/mobile checks again measured an 8px icon-label gap, zero vertical offset and less than 0.01px group centre offset for all four providers; all icons loaded and there was no mobile overflow or browser error. Desktop screenshot inspected. No social credentials or sign-in flows changed.

## Receive-first mail — 5 October 2026

Owner approved both admin@ataimo.com and ataimo@ataimo.com, hello/contact aliases and replacing unused woza.me mail records. SMTP2GO registration needs the new work mailbox before relay credentials can be obtained.

Terraform validate passed; inspected plan added only public-mail NSG rule (25/465/587/993), with no VM replacement or resizing. Apply succeeded. Helm Mailu 2.8.0 / application 2024.06.58 runs in mail with bounded resources, persisted 20Gi mail/2Gi cache volumes, restricted mailu/roundcube PostgreSQL databases, mail network policies and private validating Unbound. Public DNSSEC AD responses and internal PostgreSQL DNS resolution passed. Single-node mail Deployments use Recreate; initial bootstrap DNS and overlapping queue-writer failures were resolved before DNS cutover. Final pods are Ready.

Envoy webmail HTTPS route Accepted/ResolvedRefs; production mail Certificate Ready. Trusted browser login opened Roundcube and Mailu administration. Trusted TLS handshakes passed on 465 and 993; STARTTLS and real mailbox authentication passed on 587. Two independent external check-host probes reached public SMTP 25; the development connection and a separate checker could not reach port 25, so those failures were not interpreted as server failures. Those TCP probes prove reachability, not third-party message delivery.

Controlled authenticated SMTP submission to both mailboxes and all three aliases reached the appropriate local IMAP inboxes. Delivery logs confirmed each alias destination; test messages were removed using UID-scoped expunge. Unknown local recipient rejected with 550. Unauthenticated external recipient rejected with 554 Relay access denied; Postfix trusts only loopback for unauthenticated network relaying. No external email was sent.

Conditional DNS cutover backed up original records and replaced mail CNAME/MX with mail/webmail A -> 20.229.210.201 and MX 10 mail.ataimo.com. Corrected SPF to a single v=spf1 -all receive-only record, published the Mailu DKIM public key and DMARC p=none. Public recursive MX/A/TXT answers verified. SOA, www and existing site/SSO routes preserved; portfolio and Grafana health returned HTTPS 200.

Postfix external delivery is intentionally deferred, with no dummy SMTP2GO credentials. Bootstrap passwords stored only in ignored 0600 private file/Kubernetes Secrets, excluded from source bundles. Python compilation and shell syntax checks passed. Mail guide distinguishes deployed components, controlled local messages, TCP probes and pending real inbound/outbound/renewal/restore checks.

The complete `deploy-mail.sh` rerun exited successfully, preserving credentials, mailboxes and existing gateway routes (Mailu revision 7, mail-foundation revision 4, gateway revision 3). Repeat local submission/inbox checks passed with UID-scoped cleanup. Node CPU reservations measured 1900m/2000m, memory reservations 3884Mi and actual memory approximately 5.2Gi at this checkpoint; memory limits are overcommitted, so this is a small development/test profile, not evidence of capacity under production load.

## SMTP2GO authenticated relay — 6 October 2026

Owner supplied SMTP credentials and confirmed SMTP2GO sender-domain verification. Hidden-output credential helper verified trusted STARTTLS and SMTP authentication from the Azure admin workload before storing the credentials in Helm-managed Secret mail/mailu-relay. Temporary local input file was deleted; no password is embedded in scripts, chart values or these notes.

Owner-created provider CNAMEs resolved: s1028308._domainkey -> dkim.smtp2go.net, em1028308 -> return.smtp2go.net, link -> track.smtp2go.net. SMTP2GO's verified return-path supplies SPF; no unnecessary apex SPF include was added, and existing Mailu DKIM/DMARC records were preserved. Received-message SPF/DKIM/DMARC results are not yet verified.

Complete mail deployment succeeded: Mailu revision 8, mail-foundation revision 5 and gateway revision 4. deploy-mail.sh automatically selects the relay overlay when the mailu-relay Secret exists, and restarts Postfix to load mounted configuration. Postfix now uses [mail.smtp2go.com]:587, SASL authentication, secure TLS policy pinned to mail.smtp2go.com and minimum TLS 1.2. SMTP and relay transports replace the receive-only retry hold; local LMTP remains unchanged. Runtime Postfix credential map was compared with Secret-injected credentials without disclosure, and connection/STARTTLS/authentication from the Postfix container passed.

No external test email has been sent. Recipient authorization is pending; SMTP authentication alone is not evidence of final delivery. Keycloak SMTP and verification/reset email remain unconfigured. The posted SMTP password should be rotated using the hidden-prompt helper after setup.

## Authorized external mail test — 6 October 2026, 00:06 UTC

Owner explicitly authorized the proposed test to edemataimo@gmail.com. Exactly one message, subject Ataimo mail server — outbound delivery test, was sent from admin@ataimo.com through public Mailu SMTP submission on 587 using trusted STARTTLS and mailbox authentication. Message-ID 94da9b5e-acd1-43f6-8a98-a0b813ddc2ab@ataimo.com; Postfix queue ID CE92D24131D. Postfix logged a verified TLS 1.3 connection to mail.smtp2go.com:587, then status=sent, DSN 2.0.0, upstream 250 OK id=1xDshg-AIkwcC8mb83-OSEl; local queue entry removed. This proves successful handoff to SMTP2GO, not final Gmail delivery or Inbox placement. Owner receipt/header/reply confirmation requested and remains pending. No access to Gmail inbox was assumed.

Port 465 certificate-verified implicit TLS and real mailbox SMTP authentication/NOOP passed without sending another message. Mail client instructions added for macOS Mail and Gmail mobile, using the user's own Mailu server/credentials. Gmail web feature-retirement guidance verified against current Google primary documentation; no POP exposure or forwarding changes made.

### 2026-10-06 — Public architecture and Prometheus resources

Deployed portfolio and telemetry worker through the existing Azure image-build / Helm path. `/platform` returned trusted HTTPS 200. `/api/platform/status` returned schemaVersion 1, live mode, azure-k3s, healthy workload readiness and `stale:false`, including sanitized Prometheus CPU, memory, running-pod and uptime readings. At 00:53:14 UTC: CPU 66.44% (five-minute average during image building), memory 66.40%, 29 running pods, uptime 24,604 seconds. These are actual collected readings; UI tests use explicit mocked fixtures separately. No raw Prometheus labels, addresses, arbitrary queries or customer data were returned.

The owner also confirmed receipt and reply to the prior SMTP2GO outbound delivery test and phone IMAP access. Received-message authentication headers have not been independently examined.

Final live browser check: `/platform` rendered real Prometheus data on desktop (1440px) and mobile (390px), with one visible h1, no horizontal overflow and no page errors. The optional 3D viewer mounted successfully. The app and worker deployments each had 1/1 ready replicas. A transient gateway 503 was observed during an image rollout and resolved once the new endpoint was ready; this single-node stack is not advertised as zero-downtime or highly available.

Latest image: `ataimo-portfolio:azure-20261006010837` and matching worker tag; portfolio Helm revision 11, portal-jobs revision 7. After final rollout, the Envoy control plane had a liveness restart and temporarily retained the previous application endpoint, while the app service itself returned 200. The controller reconciled the new EndpointSlice and public HTTPS recovered. At 01:12:10 UTC the public API returned fresh actual Prometheus metrics (CPU 46.73%, memory 65.60%, 29 pods) and `stale:false`. Gateway controller usage after recovery was 24m CPU / 88Mi memory against 384Mi limit; events showed probe timeouts/refusals, not an established memory-limit diagnosis. Move image building off the running VM during the CI/CD phase and review controller startup/probe resilience; no unrelated gateway configuration was changed in this UI task.

### Layered architecture deployment · 2026-10-06

Deployed `ataimo-portfolio:azure-20261006040359` with the existing app/worker Helm deployment script. App and worker pods were ready; migration job completed. Envoy controller and data-plane pods were ready with no new restart during this deployment. Public `/platform` and `/api/platform/status` returned HTTPS 200. At 04:06:47 UTC the public Prometheus snapshot reported healthy workloads, 54.65% CPU, 70.82% memory and 29 running pods. These are time-specific measured values, not demonstration data or permanent capacity claims.

Local production build, typecheck and lint passed. Ten architecture/telemetry cases passed across desktop/mobile. The broader portfolio run initially timed out during overlapping browser verification; isolated WebGL checks passed, then all 18 portfolio cases passed in a single-worker rerun. No production behavior was changed to mask those timeouts.

### Pod telemetry and public contact deployment · 2026-10-06

Deployed matching app/worker images tagged `azure-20261006052556`; both deployments became ready. New worker collection was verified through the public HTTPS API with source Prometheus, fresh generation time 05:28:57 UTC, 31 pod records and 29 non-null CPU/memory measurements. Live desktop/mobile browser checks confirmed 31 table rows, namespace filtering (three app records), two independent five-item homepage rankings, actionable contact email/phone links and no page overflow or browser errors. Live screenshots use `pods-*-live.png`; local demonstration screenshots explicitly use `pods-*-fixture.png`.

Envoy's controller restarted once during the VM build/rollout, producing a brief public 503 while the app and worker remained ready. Routing recovered through controller reconciliation without infrastructure mutation, and subsequent API/page/browser checks passed. Existing single-VM capacity remains relevant to future CI/CD: the application image build currently runs on that same VM.

Validation: application/worker production builds, lint/typecheck, three collector unit cases and 46 browser cases passed across serial suites and focused reruns. An old contact test prohibited a phone number; it was updated to assert the newly authorized telephone link, and both desktop/mobile contact cases passed. No external email test messages were sent. Read-only live Mailu alias lookup confirmed hello/contact still deliver to ataimo@ataimo.com.

### Shared header contact links · 2026-10-06

Deployed `ataimo-portfolio:azure-20261006060759`. The shared header now renders contact@ataimo.com and +234 816 0594 893 as visible mailto/tel links alongside the original four-entry menu. Build/TypeScript/lint and eight navigation/session browser cases passed. Desktop/tablet/mobile local captures verified readable full contact text and no overflow. Public HTTPS subsequently returned the updated header after a brief Envoy controller restart/reconciliation 503, consistent with the previously documented on-VM build contention.

### Contact visibility and compact left header correction · 2026-10-06

Deployed `ataimo-portfolio:azure-20261006062215`. Homepage service description and literal email/phone links now explicitly use on-accent white text on the blue contact panel, at 18px and 20px respectively. Header contact details sit beside the brand in the left group with smaller typography; desktop header height is restored to 80px, with mobile within the prior two-row height. Production build, lint/TypeScript and ten navigation/session/contrast checks passed. Tests measure contrast >=4.5:1 for all three contact texts and confirm header height/placement.

Public HTTPS returned the new compact-header and contact-services markup after the brief existing Envoy rollout reconciliation 503 recovered. Live desktop/tablet/mobile header and scrolled contact-section captures were reviewed with no page overflow or browser errors. Capture verification waits for live rankings to settle before scrolling, avoiding a screenshot taken during telemetry layout shift. Final screenshots are header-*-live.png and contact-callout-*-live.png under .impeccable/review.

## Client/owner workspace and PWA — 2026-10-06

App and worker `azure-20261006072157` deployed by Helm; migration 002 applied by the migration job. App and worker are Ready with zero restarts on the current rollout. Account-specific push and owner mailbox credentials are supplied by a separate app-namespace Secret. Deployment waits for migration jobs before updating the app.

Real cloud acceptance verified booking approval/booked/active/completed stages, task completion guard, profile persistence, private job and direct chat isolation/idempotency, mobile client/owner messaging and Redpanda notification processing. A real self-addressed SMTP/IMAP test appeared in Inbox and Sent, and its uniquely tagged copies were removed. Real branded mobile native sign-in/code-PKCE callback/logout passed with a temporary Keycloak client account that was deleted afterward. Live Chromium PWA installability/service-worker/offline recovery passed. Push API device binding/transfer/opt-out and mocked push retries passed; physical-phone delivery and actual owner role/MFA remain pending. Full evidence and limits: docs/platform/WORKSPACE_COMPLETION.md.

## 2026-10-06 — Mobile motion, navigation and public PWA installation

App and worker image `azure-20261006184513` deployed successfully; migration job 15 completed, both pods Ready with zero restarts. Local lint/typecheck/production build passed. Desktop/mobile suite had 65/66 passing together; corrected the final hidden-menu assertion and all eight affected tests passed on targeted rerun. Live HTTPS mobile verification passed scroll canvas continuity and DPR 1, sticky hamburger navigation across routes, signed-out install access, no horizontal overflow and reduced-motion fallback. Live Chromium PWA installability, manifest, service worker and offline recovery passed. Evidence scripts: `tests/integration/mobile-layout-cloud.mjs`, `tests/integration/pwa-cloud.mjs`. Physical-phone performance/installation remain device-level checks.

### Direction-aware header and blue contact transparency

Release `azure-20261006190802` deployed with both Deployments Ready. Lint, typecheck and production build passed; all 14 relevant desktop/mobile cases passed across the main run and corrected short-page assertion rerun. Live mobile checks passed header hide/return across public routes, preserved installation and scroll architecture, plus reduced-motion fallback. The blue contact background is 84% opaque; live visual capture confirms architecture visibility and clear white contact text. Evidence: `tests/scroll-header.spec.ts`, `tests/integration/mobile-layout-cloud.mjs`, `.impeccable/review/contact-translucent-mobile-live.png`.

## 2026-10-07 — Live desktop correction and proportional mobile scrolling

Deployed app/worker image `azure-20261007063519`; migration job 17 completed, both app pods Ready with zero restarts. The previous committed desktop correction had not been deployed. The live header is now stationary above 900px; mobile directly tracks scroll differences with no timed slide, immediate reversal, and no continued movement after scrolling pauses. Lint, typecheck and production build passed. Targeted desktop/mobile header/menu/install checks passed after timeout-affected navigation checks were isolated from WebGL rendering. The initial wider run included browser timeouts and is not claimed as a full-suite pass.

Live HTTPS acceptance (`tests/integration/scroll-header-cloud.mjs`) passed at 390px/1440px for desktop stability, partial mobile distances/reversal, stopped-scroll stability, open menus and reduced motion. Legacy container import used the local import path after runtime restart failures. Envoy required replacement after losing readiness; the single VM lacked spare CPU for surge scheduling. Persisted maxSurge 0/maxUnavailable 1 in gateway Helm values and upgraded gateway release 5, restoring public access. Future single-replica gateway replacements can briefly interrupt traffic.

## 2026-10-07 — Terraform remote-state storage and migration

Created dedicated `ataimo-terraform-rg` / `ataimotfstate` / private `tfstate` container in West Europe. Standard LRS StorageV2, TLS 1.2 minimum/HTTPS, public blob access and shared-key authentication disabled; blob versioning and 30-day blob/container recovery configured. Current administrator granted Blob Data Contributor.

Backed up existing state privately, confirmed destination `ataimo-platform.tfstate` absent, and migrated using the partial Azure backend. Terraform acquired/released the state lock. Remote lineage, all 15 resource identities/addresses and outputs match the local backup exactly; remote blob is present and unlocked. No infrastructure apply, resource recreation or workload deployment performed. CI backend initialization now uses the committed partial `backend.tf`. The future GitHub OIDC principal still needs its own state-data role assignment. GitHub variable values are documented in `infra/azure/state/README.md`.


## 2026-10-07 — First real GitHub Actions delivery

Repository: https://github.com/Ataimo007/portfolio-app. Run https://github.com/Ataimo007/portfolio-app/actions/runs/37696878695 completed successfully for source commit `638c779`, after correcting Azure trust to match GitHub's exact ID-qualified production OIDC subject. All 68 desktop/mobile browser tests, lint, typecheck, production build, four infrastructure unit tests, Helm checks, Ansible syntax and worker bundling passed. The earlier run stopped at page-load timeouts; serving the packaged WebP portrait directly removed the image-optimizer dependency and the complete GitHub suite passed. A local targeted browser run still had request timeouts and is not reported as passing.

Published and deployed immutable images:

- App: `docker.io/ataimo007/ataimo-portfolio@sha256:c508527d3472577e5bb6155436bee2cb807f5e472aa5c8a0b62f97f089feae5e`
- Worker/migration: `docker.io/ataimo007/ataimo-portfolio-worker@sha256:7991119a0bb1de60909ebc339f71bacf7879c4fc97fd34d403405f9d79ac49cb`

Actions detected the existing Azure VM and selected brownfield. Azure OIDC, authenticated host-key verification, dedicated SSH access, Kubernetes pull credentials, remote Ansible deployment and registry-based Helm updates all executed successfully. Migration 18 completed; app and worker were Ready with zero restarts. `portfolio` changed from revision 21 to 22 and `portal-jobs` from 17 to 18. All other 17 Helm releases retained their revisions. No Terraform apply, dependency reinstall or local image import occurred.

Actions verified live TLS homepage, anonymous install page and application health. Controller live acceptance passed desktop stationary/mobile proportional header behavior, menu/reduced-motion behavior, Chromium PWA installability, service worker, private-cache exclusion and offline recovery. Public telemetry returned `mode=live`, `environment=azure-k3s`, `overall=healthy`, `stale=false`, source `prometheus` with a fresh timestamp. These are actual deployed measurements. No demonstration data was added. Physical-phone push remains the previously documented device-level check; no new claim of provider login or mailbox delivery testing is made here.

Greenfield Terraform/Ansible/dependency/TLS/mail automation remains implemented and statically validated, but fresh-cloud provisioning has not been executed. The current infrastructure was preserved. Main pushes now perform image publication and app-only delivery; explicit greenfield runs require a genuinely empty target and state.


## 2026-10-07 — Clean repository and CI/CD architecture rollout

Successful Actions run: https://github.com/Ataimo007/portfolio-app/actions/runs/37700551336, source `cbacda5`. All 68 browser tests and infrastructure checks passed from a checkout without local skill packages, source asset copies or design experiments. Local targeted architecture/telemetry checks: 18 passed. Secret scan of staged source: no leaks.

App digest: `docker.io/ataimo007/ataimo-portfolio@sha256:f6448002d73a817ad830773c13d22164765bf6acb28a79b3758993412903f8c0`. Worker digest: `docker.io/ataimo007/ataimo-portfolio-worker@sha256:2c7aa6f414e596307fb72ce6a945f2edf95555ee0fa65fa4d784ed7bc9c55110`. Migration 19 completed; app/worker Ready with zero restarts. Only the two app release revisions changed; all other 17 releases were preserved.

Live desktop/mobile (1440px/390px) verification passed six delivery nodes, Terraform detail selection, component logo responses, 3D viewer mounting, scroll-background rendering and no horizontal page overflow. The live-check harness was corrected to await React rendering and fetch SVGs through Chromium's Azure host mapping rather than the controller's localhost DNS mapping. No app defect was inferred from those harness failures. The earlier superseded Actions run was canceled before delivery. Actual fresh infrastructure provisioning remains unexecuted.


## 2026-10-08 — Memory resize and notification delivery

Terraform planned exactly one in-place VM update, changing only `size` from `Standard_D2as_v5` to `Standard_E2as_v5`; 0 additions/deletions/replacements. Applied against the existing remote state. Azure reports provisioning succeeded and the VM running; public IP remains `20.229.210.201`. The node reports 16,368,260 Ki memory and Ready; the VM reports roughly 15 GiB usable, 4 GiB used and 11 GiB available at the post-resize check. K3s/containerd are active, no Pending/Failed workloads were present, and public HTTPS health returned 200. The resize rebooted the VM; existing app pods showed one restart before the subsequent app rollout. Future Terraform defaults/examples, CI fallback and GitHub `AZURE_VM_SIZE` now specify E2as_v5.

Application source `a141fc7` deployed by successful Actions run https://github.com/Ataimo007/portfolio-app/actions/runs/37735365700 (deployment rerun after a transient GitHub OIDC token-fetch failure). All 72 desktop/mobile tests, email/push unit checks, lint/typecheck/build and infrastructure validation passed. Earlier attempts exposed an ambiguous test selector and a genuine mobile popover anchoring issue; both were corrected before delivery. Migration `003_notifications_email.sql` applied in job 20. App/worker are Ready with zero restarts on the new rollout. Helm revisions: portfolio 23→24 and portal-jobs 19→20; the other 17 dependency releases retained their revisions.

App image: `docker.io/ataimo007/ataimo-portfolio@sha256:c4e16197519dd664c08305b7147ae198840f6d3081c2bb016f72e0248aa82639`. Worker image: `docker.io/ataimo007/ataimo-portfolio-worker@sha256:d12a6bd1e053b26f35cb04722378d8aab08e4216c85d21c3c8e17465edc8a23a`.

Controlled live acceptance passed real native SSO/code-PKCE signup callback, one welcome to the owner's hello alias, paired sign-in alerts to admin/Gmail, paired incoming-message alerts despite a repeated chat POST, notification isolation, read ownership/origin checks, token unsubscribe and responsive header inbox. All five SMTP submissions succeeded; the welcome was received/read through the owner's IMAP-backed API with hello sender and unsubscribe footer. Mailu Postfix logs confirmed two successful SMTP2GO handoffs for the Gmail recipient; Gmail inbox placement remains owner-confirmed rather than independently observed. Loaded desktop/mobile notification captures were reviewed at 1440px/390px. Temporary identities, profiles, sessions, conversations and queued test email records were removed. No production account was granted an owner role.

Owner enrollment remains pending the user's exact intended sign-in account. Optional email destinations do not establish an administrator identity. Device push uses the existing subscription pipeline and passed mocked delivery tests; physical-phone delivery is not newly claimed. Repository remains public with licensing/visibility awaiting the user's selection.
