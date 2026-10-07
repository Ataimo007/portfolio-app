# Ataimo portfolio platform

A Next.js portfolio and client workspace with branded Keycloak SSO, consultation approval, job tracking, private messaging, an owner mailbox and a public Prometheus telemetry view. Tailwind 4 tokens and a shared React Three Fiber infrastructure graph power the portfolio and scroll-responsive background. The PWA supports anonymous installation and authenticated workspace access.

## Development

Open this project in VS Code and choose **Dev Containers: Reopen in Container**. The container includes Node, Docker tooling, Azure CLI, Terraform and Codex CLI; see [.devcontainer](.devcontainer/devcontainer.json). Authenticate tools using your own account. Local credentials and authoring skill packages are not part of this repository.

```sh
npm ci
npm run dev
```

Copy `.env.example` for application settings. For the complete local dependency stack, follow [local Kubernetes setup](infra/local-kubernetes/README.md). Cloud setup and operational evidence live in [Azure infrastructure](infra/azure/README.md) and [validation](infra/azure/VALIDATION.md).

```sh
npm run lint
npm run typecheck
npm run build
npm test -- --workers=1
npm run build:platform
```

## Container responsibilities

The Dockerfile builds two production targets:

- `runtime`: Next.js website and authenticated/public APIs, plus the migration executable used by a separate Kubernetes migration job.
- `worker`: background Redpanda/outbox processing, notification delivery and collection of sanitized Prometheus telemetry. It does not serve the portfolio UI.

App and worker share versioned source but run as separate Kubernetes Deployments. Migrations complete before app rollout. Public assets, fonts, logos and the downloadable resume are under `public`; original editable assets remain local.

## Continuous delivery

[GitHub Actions](https://github.com/Ataimo007/portfolio-app/actions) checks the application and infrastructure, builds Linux AMD64 images, publishes to `ataimo007/ataimo-portfolio` and `ataimo007/ataimo-portfolio-worker`, and deploys immutable digests to Azure K3s.

A push to `main` updates the existing application. Explicit empty-target greenfield runs use Terraform, Ansible and Helm for the VM, K3s and dependencies. See [CI/CD settings and route rules](infra/azure/ci/README.md), including the private remote-state backend. Existing databases, identity, broker, monitoring and mail are preserved during app updates.

## Repository scope

Tracked files include app/server/worker source, content, runtime public assets, tests, build configuration, the development container, delivery workflows, infrastructure automation and current operating/design documentation. Local skill installations, handoff prompts, exploratory design captures, original portrait/resume sources, private state, credentials and generated outputs are ignored. Untracking local authoring files does not delete them from the workspace or erase them from earlier Git history.

For implemented functionality and verification limits, see [implementation status](docs/platform/IMPLEMENTATION_STATUS.md) and [workspace completion](docs/platform/WORKSPACE_COMPLETION.md).
