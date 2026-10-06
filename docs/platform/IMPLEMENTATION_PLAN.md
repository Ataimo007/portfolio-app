# Implementation plan

## Adopted execution order — 5 October 2026

The latest user instruction overrides the earlier cloud-first milestone proposal below. Develop and test on the existing `portfolio` Kind cluster using Helm, then package/publish for remote infrastructure later. Preserve the approved portfolio UI.

1. **Local infrastructure:** `infra/local-kubernetes/` provides project-owned service/credential charts, pinned upstream charts, checked-in values, Kind connection, image build/load, deployment, port-forwarding and verification scripts. Namespaces: database, identity, monitoring, streaming, app. No cloud provisioning or image publishing in this phase.
2. **Identity and persistence:** integrate real Keycloak sessions/roles and versioned PostgreSQL migrations. Do not equate a healthy IdP with app SSO.
3. **Consultation portal:** request-then-approve bookings, availability/conflict prevention, client job profiles and current/active/completed states. This scope is now explicitly restored.
4. **Private communication:** persisted authorized portal chat, Redpanda outbox events and delivery/notification workers. External platforms only when required later.
5. **Observed infrastructure UI:** allowlisted collector and local measured telemetry, with explicit environment/time/stale/unknown labels. No fabricated Azure status.
6. **Remote promotion:** reviewed registry, Azure/K3s, DNS/TLS, backups and deployment inputs; production resource/security acceptance remains separate from Kind functional tests.

Detailed development runbook: [Local Kubernetes](../../infra/local-kubernetes/README.md). The handoff phases below remain the wider roadmap; their earlier first-slice recommendation is superseded by this order. Existing Compose data is preserved.

## Objective and scope

Preserve the approved portfolio and implement ATAIMO_PLATFORM_HANDOFF.md in dependency order. Deliver a portable single-node K3s platform, useful protected functionality, truthful infrastructure visualization, private observability with sanitized public snapshots, durable contact processing and self-hosted inbound mail/mailboxes with an outbound relay. Single node is not HA.

Local Kubernetes implementation is now authorized and underway. No cloud provisioning, DNS changes or real email validation is authorized implicitly by this plan.

## Architecture decisions to record before implementation

- Existing Next.js app remains the frontend/API; no second web framework. Separate worker and snapshot collector deployments.
- PostgreSQL persists application data and outbox, with isolated Keycloak database/role. Use versioned migrations instead of relying on first-start init scripts.
- Redpanda replaces RabbitMQ in the intended platform; stage transition without deleting existing local volumes. One canonical event broker.
- SOPS with age is the proposed starting secrets approach, subject to review. Its recovery key belongs outside Git and must have an off-host recovery copy; Terraform backend/credentials are separate sensitive inputs.
- Helm and Argo CD become production desired state; old Kustomize definitions remain references during conversion, not competing controllers.
- Mail platform choice is an ADR after official support/resource validation. Mailcow on host Compose is a candidate; a supported Mailu deployment is another. Never force an unsupported platform into K3s.
- Keep public status anonymous, fixed-schema and snapshot-only. No public access to Prometheus/Grafana/Loki/Kubernetes/Azure APIs.
- Preserve prior consultancy schema; booking, client jobs and chat are explicitly restored as the next application integration phases.

## Phases and acceptance gates

### Phase 0 — assessment and decisions

Current deliverables: REPO_ASSESSMENT.md, this plan, IMPLEMENTATION_STATUS.md and DEPLOYMENT_INPUTS.md. Next: topology specification, ADRs, resource/cost worksheet, service inventory, migration map and threat/visibility boundaries. Do not overwrite existing PLAN.md.

Gate: review scope changes (identity, broker, mail, earlier consultancy), authoritative deployment layout, explicit service budgets and deferred inputs. Proposed sizing is a hypothesis until a region/SKU budget and load evidence exist.

### Phase 1 — reproducible local/container foundation

Reuse Dockerfile and Dev Container. Add configuration validation, public liveness/readiness endpoints, build-context/secret exclusions and clean-install/image checks. Extend CI to image build/scanning, registry publishing and reviewed digest updates only after actual Git remotes/registry exist. Pin chosen images and tooling during implementation.

Gate: clean npm install/check and image smoke tests; no secrets in build context/layers; meaningful health endpoints. Public-site health must not depend on optional Keycloak or monitoring being online.

### Phase 2 — infrastructure experience with honest demo state

Add one topology registry and /infrastructure, plus a subtle homepage teaser. Show web edge, Azure VM, K3s workloads, storage, off-host backup and separately hosted mail if selected. Support rotation/zoom/selection, component purpose/dependencies/references and separate illustrative web/OIDC/event/mail flows. Add equivalent accessible text/2D view. Model schema and public status contract first; provide only explicitly labeled demo fixtures and unknown/unavailable state until a real collector exists.

Gate: keyboard/touch/desktop/mobile selection; no-WebGL and reduced-motion paths; planned/configured/deployed/live-verified distinctions; empty/stale/offline/demo states; source-not-published fallback; no invented links or metrics. This phase can finish before cloud credentials exist.

### Phase 3 — deployment assets, then authorized Azure deployment

Terraform Azure resources and budget alerts; protected remote state; idempotent host/bootstrap; single-node K3s; Traefik; Helm; Argo CD; cert-manager DNS-01; reviewed network rules and secrets bootstrap. Prepare offline validation first. Add service-specific CPU/RAM/storage/retention budgets and OS headroom before choosing a VM. Deploy only with approved scope and environment-provided credentials.

Gate A (local): Terraform validate, chart lint/render, schema checks and bootstrap checks. No real Terraform plan claimed without provider/account inputs. Gate B (deployment): approved subscription, reachable strict-TLS application, private control/admin services and accurate deployed topology. Actual deployment may pause while subsequent local implementation continues.

### Phase 4 — PostgreSQL and protected Keycloak functionality

Add DB migrations and application connection boundaries. Create ataimo realm/client/role migration, disabled public registration, owner MFA and server-side OIDC sessions. Initial protected owner view should expose meaningful platform/contact administration; demo viewer gets only allowlisted demo functions. OIDC mail/webmail integration remains separate scope.

Gate: anonymous public content works; protected APIs reject anonymous/wrong-role users; permitted login/logout; invalid callback/state/nonce/expiry fails; IdP outage cannot take down portfolio. Run integration tests against real local Keycloak, not mocks alone.

### Phase 5 — private observability and sanitized live mode

Instrument application/exporters. Configure private Prometheus, OTel Collector and bounded Loki retention; choose a trace backend only with a clear use/resource requirement. Snapshot collector uses allowlisted IDs/queries and documented metric definitions, writes snapshots every 30–60 seconds, marks age >120 seconds stale, and preserves last-success evidence. Public API bounds sizes/timeouts, caches and rate-limits; browser pauses polling when hidden.

Gate: privacy/allowlist/timeout/missing/stale/low-traffic/load tests. Demonstrate collector integration locally; label local telemetry by environment. Azure live verification requires actual deployed checks. No fabricated fallback numbers, caller-selected queries or raw logs.

### Phase 6 — Redpanda and durable contact processing

Persist validated contact submission and outbox in one PostgreSQL transaction. Publish versioned events; worker enforces idempotent handling, bounded retries/backoff, dead-letter handling and owner-visible queue/deferred/failure states. Use fixed destination and verified From/validated Reply-To. Add abuse controls. Mailpit is the local SMTP sink; SMTP2GO integration remains inactive without approved credentials.

Gate: broker outage cannot lose accepted submissions; restart/replay tests; poison events and timeout behavior; duplicate delivery safeguards. SMTP acceptance and worker acknowledgment are not atomic: explicitly handle uncertain outcomes rather than promise exactly-once recipient delivery or blindly resend.

### Phase 7 — supported mail platform and relay

Select and pin one supported platform after resource/port review. Deploy inbound SMTP, submission, IMAPS, filtering, aliases/admin and webmail. Reserve Traefik/mail ports and isolate storage/networks. Produce exact DNS worksheet: DNS-only mail A/MX, one SPF, platform/relay DKIM, conservative DMARC, publicly trusted TLS and PTR feasibility. Configure authenticated certificate-verified SMTP2GO relay on 587; bound quotas/queues. No catch-all or direct outbound SMTP by default.

Gate A (local): configuration/relay controls/persistence/test mailbox and backup checks with isolated sinks. Gate B (authorized live): external inbound and outbound arrive, alignment passes, unauthenticated external relay fails, persistence survives restart. Record submission, queue, relay acceptance, bounce and verified receipt as separate evidence.

### Phase 8 — recovery, hardening and operating evidence

Off-host backups of DB, mail, config and recovery secrets; K3s datastore-appropriate recovery; isolated reconstruction; disk/certificate/queue/backup alerts through an independent channel. Upgrade/incident/recovery/migration runbooks and actual resource/cost observations. Public behind-this-site copy is generated/reconciled with what really exists.

Gate: demonstrated isolated restore with measured RPO/RTO, not merely scheduled backup jobs. RPO <=24h and RTO <=4h are goals until measured. Full deployment and migration limitations are published honestly.

## First reviewable implementation milestone

Recommend phases 0–2 as the first slice: establish decisions/resource worksheet, add reproducible health/config foundation, then deliver the infrastructure page and status schema in labeled demo/unknown mode. This produces something reviewable without buying resources or depending on DNS, Azure, SMTP or GitHub access. Review that slice before approving deployment scope.

## Dependency and release strategy

Phase 2 is local-first. Deployment assets in phase 3 can be authored/validated locally while phases 4–6 get local integration coverage; phase 3 live acceptance waits on deployment inputs. Phase 7 external mail verification and phase 8 off-host recovery need authorized external resources. Introduce heavyweight services gradually; do not size the entire stack from K3s minimum requirements. Do not advertise real mailboxes, reliable delivery or live Azure telemetry until their respective gates pass.

## Evidence vocabulary

- **Local implementation:** code plus local tests; record which environment/components were exercised.
- **Deployment assets validated:** manifests/IaC checks only, no implied running resources.
- **Deployed:** resources confirmed in a named environment with revision/time evidence.
- **Demonstration:** synthetic fixtures, clearly labeled and separate from live snapshots.
- **Live verified:** bounded measured data from the identified actual environment, with source/time/measurement window.
- **Blocked/deferred:** identify the missing input or dependency; continue independent work.
