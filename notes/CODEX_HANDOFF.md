# Codex handoff — 3 October 2026

## Active coordination

- The user confirmed that this session resumed successfully in the Dev Container.
- The Dev Container CLI session owns application, infrastructure and configuration implementation.
- The desktop session has read this handoff and will make no further code/configuration edits, run builds, or change running services unless the user explicitly assigns separate work.
- Record progress and any changes in file ownership here. Coordinate ownership before editing a file another session is working on; this file is a coordination record, not an automatic lock.

## User decisions

- Latest user specification supersedes the earlier restored design: premium monochrome dark UI, Tailwind 4 technical grid, native data-attribute scroll reveals, and one persistent R3F Canvas with hero/top-down/macro camera stages. The native architecture is implemented; read `notes/NATIVE_SCROLL_ARCHITECTURE.md`.
- Build a consultancy portal with Keycloak SSO, PostgreSQL, calendar booking, client profiles and requested/active/completed jobs.
- Clients request slots; the owner approves before confirmation.
- Private portal chat first. External messaging only when required.
- Production target: Kubernetes on one Azure VM; K3s is recommended. Compose is for local development. No Azure deployment has been made.
- Exact production domain and Azure subscription type remain unconfirmed. Opening NSG port 25 alone does not guarantee outbound SMTP access.

## Implemented and verified

- Next.js portfolio and restored 3D design. Latest full app check passed lint, typecheck, build and 12 browser tests before the Dev Container changes.
- Production Dockerfile and standalone Next.js output.
- Local Compose services: PostgreSQL, Keycloak, RabbitMQ, Mailpit and optional app; all were running at handoff.
- PostgreSQL schema, isolated database roles, Keycloak realm import, Kubernetes manifests and optional mail manifest. Core manifests were schema-validated; no live Kubernetes deployment.
- Dev Container: Node 22, Codex CLI 0.160.0, VS Code extensions, persistent node_modules and Codex volumes. Docker-outside-of-Docker is installed and access to the Mac's engine was verified as the node user.

## Still pending

The app does NOT yet implement Keycloak login, portal pages, database reads, booking/calendar flows, chat or a notification worker. Read `notes/CONSULTANCY_PLATFORM.md` and `infra/kubernetes/README.md` before continuing these phases.

RabbitMQ is planned for background confirmations, reminders and chat notifications. Chat history belongs in PostgreSQL. Initial chat updates can use authenticated polling. Notification events use the database outbox; the worker is not implemented yet.

## Environment and commands

- Container workspace: `/workspaces/ataimo-portfolio`.
- Host Docker is shared: `docker ps` shows the existing services. Docker bind-mount source paths must exist on the Mac, not merely in the container.
- Compose credentials are in ignored `.env.compose`; do not print or commit them. Read configuration as needed without exposing secrets.
- Existing local URLs on the Mac: portfolio preview 3000, Compose app 3002, Keycloak 8080, RabbitMQ management 15672, Mailpit 8025. From inside the container use `host.docker.internal` for host-published ports.
- Run `npm run check` for app changes. Avoid concurrent builds against the same `.next` directory.
- The workspace is not currently a Git repository.

## Session continuity

Host session ID: `01a0fd50-c3a4-7722-88d9-97435b6e39e9`. Its saved JSONL was copied into the container's persistent Codex sessions volume. Resume with an explicit container workspace path because the recorded session used the Mac path.

If resume is incompatible, start a new Codex chat and ask it to read this file, `notes/CONSULTANCY_PLATFORM.md`, `README.md` and `.devcontainer/devcontainer.json`, inspect current service health and continue the authorized consultancy implementation while preserving the agreed design.

## Portfolio refinement

Impeccable and upstream Taste were applied to the existing monochrome homepage. The migration project is a featured wide diagram/copy card, with two supporting projects below; mobile remains stacked. Section headings are simplified, body typography and section spacing improved, and interactive elements have token-based press feedback with reduced-motion support. Existing factual copy and native R3F camera/reveal behavior remain. Preview runs on container port 3003; forward it through VS Code to view on the Mac. Screenshot artifacts are in `notes/previews/impeccable-*.png`. Lint, typecheck, production build and 18 desktop/mobile tests passed during this refinement.

## Full editorial rebrand

The latest visual world supersedes the earlier monochrome/cyan/light refinements. Read PRODUCT.md and DESIGN.md. The new identity lives in app/brand.css: warm paper, cream panels, cobalt actions, Instrument Serif emphasis, and fluid scene spacing. Homepage has native scene index and entry reveals, CSS live texture, and 600 live points in the existing single R3F canvas. All factual content/routes remain. Mobile/reduced-motion retain the static architecture SVG. Preview port 3003. All 18 tests pass after restoring the mobile fallback. An independent Impeccable visual review found no blockers beyond that now-fixed fallback. Prior DESIGN.md preserved in notes/design-before-rebrand.md.
