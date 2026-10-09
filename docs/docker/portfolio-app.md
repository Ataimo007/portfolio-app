# Ataimo Portfolio — application image

The web application powering [ataimo.com](https://ataimo.com), Ataimo Edem's engineering portfolio and private consultancy workspace.

## What this image does

This image runs the Next.js application, including the public portfolio, downloadable résumé, project case studies, interactive Three.js architecture presentation, and a live infrastructure telemetry interface. It also serves authenticated client and owner workspaces for consultation requests and approvals, engagement/task tracking, private conversations, profile preferences, in-app notifications and owner mailbox access.

Identity is delegated to Keycloak through OpenID Connect and PKCE. The deployment supports native registration, email verification/password recovery, and configured Google, GitHub, LinkedIn and Microsoft providers. Provider registrations and credentials must be supplied separately. The application is installable as a PWA; notification delivery requires Web Push configuration and browser permission.

## Companion worker

Use this image with [ataimo007/ataimo-portfolio-worker](https://hub.docker.com/r/ataimo007/ataimo-portfolio-worker). The application handles web requests; the worker processes background events, email, push notifications and telemetry snapshots. Run matching versions from the same pipeline build.

## Runtime and packaging

- Node.js 22, Next.js standalone server; Linux AMD64.
- Runs as the non-root `node` user; HTTP listens on port 3000.
- Includes public assets, the PDF résumé, database migrations and the bundled migration runner.
- Default command: `node server.js`.
- Migrations are run separately as a Kubernetes Job: `node scripts/migrate.cjs`.
- PostgreSQL, Keycloak, Redpanda, Prometheus and the mail stack are external dependencies, not bundled servers.

## Configuration and deployment

Use the maintained Helm charts, values and automation in the [source repository](https://github.com/Ataimo007/portfolio-app). They configure the database, OIDC integration, session signing, event broker and optional mail/push integrations using Kubernetes Secrets. Never bake secrets into an image or publish them in an example command.

Core settings include `SITE_URL`, `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_SECRET`, and a strong `SESSION_SECRET`. Private cluster routing can use `KEYCLOAK_INTERNAL_URL`. Mail integration uses `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD`; Web Push requires VAPID keys. Consult the repository's integration documentation for the complete configuration.

The reference deployment uses an Azure VM running K3s, Envoy Gateway/Gateway API, cert-manager with Let's Encrypt, PostgreSQL, Keycloak, Redpanda, Prometheus/Grafana and Mailu. Terraform, Ansible and Helm automate infrastructure and workloads; GitHub Actions builds and publishes both images and rolls out the application from Docker Hub.

## Tags and reproducibility

`v1.0.0` is the current application-version alias. Each delivery also publishes `v1.0.0-build.<run-number>` and `sha-<git-commit>`. Version aliases can advance to a newer build within the same application version; use a build tag or, preferably, an image digest to reproduce a deployment exactly. Bump `package.json` for the next application release. The app and worker share the same release version.

## Copyright, license and third-party notices

Copyright © 2026 Ataimo Edem. All rights reserved for original project material. This is a publicly inspectable portfolio project, not an open-source distribution grant. See [LICENSE](https://github.com/Ataimo007/portfolio-app/blob/main/LICENSE), [COPYRIGHT.md](https://github.com/Ataimo007/portfolio-app/blob/main/COPYRIGHT.md) and [PATENTS.md](https://github.com/Ataimo007/portfolio-app/blob/main/PATENTS.md). No patent registration or patent-pending status is asserted. Public availability of this image does not grant permission to commercialize or redistribute the original portfolio or branding.

Third-party software, fonts and vendor marks retain their respective owners and licenses. Project rights notices are included under `/app/licenses`; dependency license terms remain applicable independently. The image is provided as-is under the project's license terms.

Questions, permission requests and engineering enquiries: contact@ataimo.com.
