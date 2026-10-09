# Ataimo Portfolio — background worker image

The web application powering [ataimo.com](https://ataimo.com), Ataimo Edem's engineering portfolio and private consultancy workspace.

## What this image does

This image runs the background processing service for the portfolio and consultancy platform. It publishes durable application events from the PostgreSQL outbox to Redpanda, consumes events for notifications, processes Web Push deliveries, sends queued welcome/login/private-message emails, checks the owner mailbox for notification events, and gathers Prometheus telemetry snapshots for the application UI. It maintains a worker heartbeat and removes expired application sessions and rate-limit entries.

Email jobs support retries and unsubscribe preferences for optional notifications. Push payloads use generic wording rather than private message contents. Broker-backed and SMTP-backed delivery rely on the configured external services; network failures can delay work. Retrying SMTP delivery is at-least-once and may produce duplicates when acceptance is ambiguous.

## Companion application

Use with [ataimo007/ataimo-portfolio](https://hub.docker.com/r/ataimo007/ataimo-portfolio). The application serves the public website, APIs, authentication callbacks and client/owner workspaces. This worker does not serve the portfolio UI and is not a standalone mail server, identity provider or broker. Run matching versions from the same pipeline build.

## Runtime and packaging

- Node.js 22; bundled background-service code; Linux AMD64.
- Runs as the non-root `node` user.
- Default command: `node worker.cjs`.
- Exposes port 3001 for worker health checks; keep it internal.
- Requires the application PostgreSQL schema to be migrated before startup.
- PostgreSQL, Redpanda, Prometheus and SMTP/IMAP services are external dependencies.
- Use the deployment's single-worker replica configuration unless concurrency and event-consumer behavior have been assessed for a different topology.

## Configuration and deployment

Use the maintained Helm charts, values and automation in the [source repository](https://github.com/Ataimo007/portfolio-app). They configure the database, OIDC integration, session signing, event broker and optional mail/push integrations using Kubernetes Secrets. Never bake secrets into an image or publish them in an example command.

Core settings include `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `REDPANDA_BROKERS`, `PROMETHEUS_URL`, `PLATFORM_ENVIRONMENT` and `SITE_URL`. Email and mailbox integration use `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD`; Web Push requires VAPID keys. The worker does not use interactive login credentials. Consult the repository's integration documentation for the complete configuration.

The reference deployment uses an Azure VM running K3s, Envoy Gateway/Gateway API, cert-manager with Let's Encrypt, PostgreSQL, Keycloak, Redpanda, Prometheus/Grafana and Mailu. Terraform, Ansible and Helm automate infrastructure and workloads; GitHub Actions builds and publishes both images and rolls out the application from Docker Hub.

## Tags and reproducibility

`v1.0.0` is the current application-version alias. Each delivery also publishes `v1.0.0-build.<run-number>` and `sha-<git-commit>`. Version aliases can advance to a newer build within the same application version; use a build tag or, preferably, an image digest to reproduce a deployment exactly. Bump `package.json` for the next application release. The app and worker share the same release version.

## Copyright, license and third-party notices

Copyright © 2026 Ataimo Edem. All rights reserved for original project material. This is a publicly inspectable portfolio project, not an open-source distribution grant. See [LICENSE](https://github.com/Ataimo007/portfolio-app/blob/main/LICENSE), [COPYRIGHT.md](https://github.com/Ataimo007/portfolio-app/blob/main/COPYRIGHT.md) and [PATENTS.md](https://github.com/Ataimo007/portfolio-app/blob/main/PATENTS.md). No patent registration or patent-pending status is asserted. Public availability of this image does not grant permission to commercialize or redistribute the original portfolio or branding.

Third-party software, fonts and vendor marks retain their respective owners and licenses. Project rights notices are included under `/app/licenses`; dependency license terms remain applicable independently. The image is provided as-is under the project's license terms.

Questions, permission requests and engineering enquiries: contact@ataimo.com.
