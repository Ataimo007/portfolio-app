# Handoff review and implementation

The handoff is internally consistent: seven main routes, five prioritised engineering projects, a dark cyan/warm architectural visual direction, and static-first progressive enhancement. Verified role dates were retained, including the overlap between Tek Experts Stage 3 and Tyk. Certifications were taken from the supplied resume and labelled by issue date rather than asserting current validity.

The branding banner supplied palette and systems imagery, not a webpage layout. The portrait and resume are real assets. Source-reference documents stay outside `public/`.

Implemented: complete content routes, local MDX case studies, typed shared content, semantic web resume, original PDF download, accessible native expandable controls, synthetic interactive route example, server-side validated contact with configurable delivery, SEO, social artwork, restrained CSS motion, lazy desktop 3D hero and static fallbacks, CI and browser journeys.

Optional remaining polish: scroll-driven architecture layers, a spatial expertise constellation and richer project scenes; public project screenshots when supplied. The 3D hero is an initial topology implementation, not the full cinematic scroll narrative. No production deployment or live email configuration is included.

Development and verification use the Docker image defined by `.devcontainer/Dockerfile`. VS Code extension installation occurs when reopening the folder in the container; CLI dependencies are verified directly inside the running container.

## Architectural homepage revision

The homepage now uses the selected architectural artwork in a full-width, sticky scroll scene with reversible crossfades, a subtle camera-like zoom, chapter indicators and a progress rail. WebP assets total roughly 201 KB (see actual files for current sizes). Introduction and calls to action remain server-rendered HTML. Mobile, reduced motion and no-JavaScript visits receive the opening composition without a long pinned sequence. The old WebGL component is no longer imported by the homepage.

This is a still-scene motion prototype, not the continuous AI-generated video demonstrated in the reference. The original artwork, storyboard and generation prompts live in `notes/concepts/`. A continuous clip remains dependent on video-generation service access; it should replace the still transitions after visual review. Existing case studies, resume and contact behaviour are preserved. Scroll reversal and static fallback checks replace the previous homepage WebGL checks in the browser journeys.

## Connected live 3D revision

Reverted the cinematic still-scene homepage following review. The homepage now presents one enlarged, centered live Three.js architecture across three connected sections: Design (API gateway), Scale (cloud/Kubernetes), and Evolve (migration). Pointer movement tilts the model; scrolling rearranges the infrastructure, preserves its signal connections and animates extruded headings plus HTML descriptions. Text geometry uses a locally hosted Three.js example typeface. One shared canvas pauses offscreen. Mobile, reduced motion and failed WebGL use the earlier static topology graphic with ordinary readable content. The architectural raster concepts remain as design history and are no longer loaded by the homepage.

## Current version: second design restored

Restored the original two-column homepage: introduction on the left and the floating, mouse-responsive 3D topology on the right. Removed the cinematic/connected scroll components and their styles; restored the original model scale, curved routes and restrained pointer motion. The later artwork and screenshots remain as design history only.

## Consultation platform foundation (Kubernetes target)

Confirmed direction: keep the second portfolio design; deploy to K3s on a single Azure VM; private portal chat; consultation requests require Ataimo's approval. Added production application image/standalone output, Kustomize deployment templates for PostgreSQL, Keycloak, RabbitMQ, application and HTTPS ingress, and an optional SMTP/IMAP mailbox template. Compose is local testing only. Database schema reserves pending/approved appointments with an overlap exclusion constraint and separates portal and identity databases. No Azure resources or live Kubernetes workloads have been deployed.

Verified: 13 core and 3 optional mail Kubernetes resources pass strict schema validation; local service startup and imported Keycloak OIDC/PKCE/email-verification settings; database overlap/cancellation/empty-message checks; production image builds and serves home/case study/resume as non-root; lint/typecheck/build and 12 browser tests pass. Initial npm image build failed on a connection reset; cached retry succeeded. Login/calendar/client-dashboard/chat/worker product integration is still pending, and internet SMTP delivery is not configured. See `notes/CONSULTANCY_PLATFORM.md` and `infra/kubernetes/README.md`.
