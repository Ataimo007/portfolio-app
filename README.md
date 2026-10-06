# Ataimo Edem — Portfolio

A Next.js App Router portfolio built from the supplied handoff. `PLAN.md` remains the product and design specification; the original assets and verified Markdown content are preserved.

## Develop in the Dev Container

1. Start Docker Desktop.
2. Open this folder in VS Code and install the recommended **Dev Containers** extension on the host.
3. Run **Dev Containers: Reopen in Container** from the command palette.
4. The container installs locked application dependencies and Chromium for Playwright.
5. In its terminal, run `npm run dev`, then open the forwarded port 3000.

The image includes Node 22, Git and Codex CLI 0.160.0. A named volume stores `node_modules` inside Docker, avoiding host/container binary mismatches and macOS bind-mount deletion issues. VS Code installs Codex, ESLint, Prettier, Tailwind IntelliSense, path autocomplete, Playwright, GitLens and GitHub Actions support. TypeScript/JavaScript IntelliSense and autocomplete are built into VS Code and use the workspace TypeScript version.

The Docker-outside-of-Docker feature provides Docker CLI, Compose and access to Docker Desktop's engine as the `node` user. Run `docker ps` inside the container to inspect the same services as on your Mac. After changing this configuration, use **Dev Containers: Rebuild and Reopen in Container**. Docker socket access permits managing all containers on that engine. Bind-mount source paths passed to Docker must exist on the Mac, rather than only inside the Dev Container.

Run `codex login --device-auth` inside the container to authenticate. The named `ataimo-portfolio-codex` volume retains container-local Codex configuration across rebuilds without mounting your host credentials. Codex plugins are selected after login through `/plugins`; none are silently connected to external services. See the [official Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli).

For the container started during implementation, the preview runs at `http://localhost:3000`. Its commands can also be run with `docker exec -it ataimo-portfolio-dev bash`. Stop it with `docker stop ataimo-portfolio-dev`; remove that temporary container before reusing its port through VS Code.

### Azure development tools

The Dev Container installs Azure CLI and Terraform 1.14.6 through the official Dev Container features, plus the Azure CLI and HashiCorp Terraform editor extensions. After these configuration changes, run **Dev Containers: Rebuild and Reopen in Container**. Then authenticate from the container terminal:

```sh
az version
terraform version
az login --use-device-code
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

Open the displayed Microsoft device-login URL in your browser and enter the code. The `ataimo-portfolio-azure` named volume retains the container's own Azure login across rebuilds; it does not import your Mac's login. Use `az logout` to sign out. Terraform uses that authenticated Azure CLI session for the [Azure deployment](infra/azure/README.md).

### Codex MCP servers

The Dev Container image includes `@modelcontextprotocol/server-filesystem@2026.8.31` and `@modelcontextprotocol/server-puppeteer@2025.5.12`. Both are registered in the container's persistent Codex configuration. Restart Codex or reload the VS Code window after registration; use `codex mcp list` to inspect them.

Filesystem access is limited to `/workspaces/ataimo-portfolio`. Puppeteer uses the Chromium installed by Playwright, in headless mode with `--no-sandbox` inside the container. The original Puppeteer MCP package is deprecated. If the Playwright Chromium revision changes, update `PUPPETEER_LAUNCH_OPTIONS` in the Puppeteer MCP configuration to point to the new executable.

## Commands

```sh
npm run dev        # development server, binds 0.0.0.0:3000
npm run lint
npm run typecheck
npm run check      # lint, typecheck, production build, browser tests
npm run build
npm test           # browser journeys against the production build
npm run start      # preview the production build
```

Run `npm run build` before `npm test`. Tests start an isolated production server on port 3001 with email delivery disabled, and run on desktop and mobile Chromium, including all routes, project navigation, private-source disclosure, resume download, contact validation, reduced motion, WebGL loss and JavaScript-disabled navigation. GitHub Actions runs lint, typecheck, build and tests on pushes and pull requests.

## Implementation

- All seven main pages and five project case studies are implemented.
- Structured career, project, expertise and certification content lives in `content/site.ts`; detailed case studies are local trusted MDX in `content/projects/`.
- Geist fonts are packaged locally. Next Image serves the supplied WebP portraits; the original PDF is served at `/resume/ataimo-edem-resume.pdf`.
- The desktop hero dynamically loads React Three Fiber / Three.js and Drei. A floating isometric scene connects a sculpted gateway to server stacks, containers, identity, cloud, data and telemetry modules. Cyan request packets and warm authentication signals travel along curved routes. Pointer movement is restrained; off-screen rendering pauses and pixel ratio is capped.
- Mobile, reduced-motion, low-power and WebGL-unavailable clients use the semantic HTML / SVG fallback. The logical CPU threshold is a conservative heuristic, not a measured device capability score.
- Native details controls provide expandable experience and expertise. CSS handles light motion and architecture-flow accents. The route analyser includes an interactive, explicitly synthetic example.
- Metadata, per-page canonical links, sitemap, robots, Person / CreativeWork JSON-LD, an icon and generated Open Graph image are included.
- Vercel Analytics and Speed Insights load only in Vercel environments.

The phone number is absent from site HTML. The downloadable supplied resume still includes it, as requested by the handoff. No source-reference PDFs or editable resume files are published.

## Contact delivery

Copy `.env.example` to `.env.local` inside the workspace. Set `SITE_URL` to the final public domain. To enable sending, configure `RESEND_API_KEY`, `CONTACT_FROM` (a verified sender) and `CONTACT_TO`. The server-only `lib/send-contact.ts` contains provider integration; the UI does not depend on the provider. See [Resend's sending API](https://resend.com/docs/api-reference/emails/send-email).

Without configuration, valid submissions receive HTTP 503 and an explicit message directing visitors to email. Invalid input returns 400, cross-origin requests return 403, and delivery failures return 502. There is no fake-success path. Successful-provider and failure responses are covered with mocked network calls; no live email is sent by tests.

Before enabling public email delivery, configure platform-level rate limiting / bot protection. An in-memory limiter is unsuitable for serverless instances. The current release keeps delivery unconfigured.

## Deployment

Import the repository into Vercel with the Next.js preset. Commit the lockfile, use Node 22, set `SITE_URL`, and add contact variables only if sending is being enabled. The framework handles the static pages and server API route without a custom `vercel.json`. Domain purchase, repository creation and deployment have not been performed.

## Implementation options

| Approach                                          | Best fit                                                                            | Tradeoff                                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Next.js + MDX + progressive R3F (implemented)** | The supplied plan: case studies, React interactions, server-side contact and Vercel | More runtime JavaScript than a purely static site; WebGL is isolated and optional |
| **Next.js with SVG only**                         | Keeping the existing app while simplifying visual maintenance                       | Removes the signature 3D experience; retains content and server contact           |
| **Astro with interactive islands**                | A predominantly editorial portfolio with very few interactions                      | A framework change and separate React islands would be needed for this handoff    |

The [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation) documents the App Router stack. [Astro's architecture](https://docs.astro.build/en/concepts/why-astro/) prioritises content and selectively hydrated islands. Given this handoff, retain the implemented Next.js approach.

## Further polish

The supplied pack has no project screenshots; case studies use sanitised architecture flows and labelled synthetic examples. Add genuine public screenshots when available. Advanced scroll choreography, a full 3D expertise constellation and 3D project scenes remain optional polish. CSS/SVG already explains the project flows, so Motion and GSAP were not added for overlapping effects.

## Consultation platform foundation

The current portfolio design is preserved. See [Consultation platform plan](notes/CONSULTANCY_PLATFORM.md) for the Kubernetes deployment, local Compose test services, request/approval flow, database design, planned SSO/calendar/chat integration, and custom-domain email requirements. The new infrastructure is separate from the existing development container; product integration is the next phase.

## Native scroll architecture

See [the native DOM + R3F guide](notes/NATIVE_SCROLL_ARCHITECTURE.md) for the file structure, complete hook/controller/Canvas code, reveal integration and deployment commands. The homepage uses a monochrome Tailwind 4 theme, locally hosted Geist Sans and JetBrains Mono, and one fixed Canvas with delta-based camera damping.

## GitHub Actions delivery

See [CI/CD setup and deployment routes](infra/azure/ci/README.md) for Docker Hub publication, Azure OIDC, remote Terraform state and fresh/app-only deployments. Pushes to `main` update an existing Azure stack; fresh provisioning is an explicit workflow-dispatch route. Private `.local` controller files, credentials, environments and Terraform state remain excluded from Git.
