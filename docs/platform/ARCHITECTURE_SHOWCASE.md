# Public architecture and telemetry

The homepage and `/platform` describe the deployed portfolio architecture. `lib/infrastructure.ts` owns the component inventory, relationships and four core HTTPS routes. Mail adds a fifth HTTPRoute for webmail; IMAP and SMTP use separate mail service ports. The diagram is a logical topology, not a physical scale model or an indication of high availability.

`InfrastructureModel` is shared by the scrolling R3F background and the optional interactive model. The default labeled diagram and component controls remain readable without WebGL. Mobile and reduced-motion visitors do not run the continuous background canvas. The optional model loads on request and renders on demand; pointer and camera movement do not use React scroll state.

The existing worker collects fixed Prometheus queries every 30 seconds and stores sanitized snapshots in PostgreSQL. CPU is aggregate node utilization over five minutes; memory is total minus available node memory. Running pods include all cluster namespaces; uptime is time since node boot. Missing, nonfinite, negative or out-of-range results become null. Source series must be fresh within 120 seconds. There is no public query parameter or internal metric-label passthrough. The existing status API validates snapshots, caches database reads for five seconds and applies its process-local request cap.

The UI polls every 30 seconds, pauses while hidden, supports manual refresh, marks data stale after 120 seconds and withholds numeric readings on stale snapshots or request errors. These are periodic snapshots, not a push stream. Older readiness-only snapshots remain compatible and show resource readings unavailable.

Mailu receives SMTP on port 25 and provides IMAP 993 and authenticated submission 465/587. Outbound mail is relayed through SMTP2GO on TLS port 587 because of Azure outbound port 25 restrictions. Port 22 is SSH. Mailu and SMTP2GO accounts are independent of portfolio SSO.

## Verification

2026-10-06: TypeScript, ESLint, Next.js production build and worker bundling passed. New browser tests cover measured resource display, stale suppression, source outage/recovery, SMTP2GO details, mobile overflow and reduced-motion architecture access. These automated tests use explicit mocked snapshots; they are not live telemetry evidence.

The actual collector queries were run inside the existing Azure worker against private Prometheus and returned CPU 16.01%, memory 70.48%, 29 running pods and node uptime 24,304 seconds at the time of collection. These are observed values, not permanent portfolio claims. Deployment and post-deployment checks are recorded in `infra/azure/VALIDATION.md`.

Desktop and mobile captures confirmed no horizontal overflow and an optional WebGL model mounted successfully. Preserve the approved warm paper, cobalt, evergreen and clay token system. No new fonts, animation libraries or operational services are introduced.

CI/CD, remote source control and Docker Hub publishing remain future work. Single-VM resilience and off-host backups are unchanged.

Final regression evidence: the serial desktop/mobile run passed 41 checks, then its remaining canvas-continuity check passed after updating the test to bring Contact into view rather than assuming a fixed page percentage. All 42 targeted checks are therefore verified across the run and its focused rerun. The initial concurrent run hit environment memory pressure and browser timeouts; it is not reported as a pass. Continuous-background DOM labels were removed; the demand-rendered inspection model retains labels. The dedicated page uses a visible h1. Final captures and review notes are under `.impeccable/review/`.

The optional 3D viewer uses token-colored canvas-texture sprite labels, keeping labels inside WebGL rather than inserting per-frame DOM overlays. The background omits labels, while the accessible DOM diagram and component selector carry all component names and details. This is a logical infrastructure visualization; rotating it does not trigger real operational actions.

## Layered architecture revision · 6 October 2026

The homepage and `/platform` now share a full-width diagram. Clients sit outside the single Azure VM; traffic progresses through Envoy Gateway, a straight row of five application services, and a separate data/events/metrics row. Grafana and Prometheus are distinct, as are Redpanda Console and its private broker. SMTP2GO sits outside the VM boundary and represents the external TLS 587 workaround for Azure outbound SMTP port 25 restrictions. Mail clients bypass HTTP ingress; webmail uses Envoy. Both `mail.ataimo.com` and `webmail.ataimo.com` appear in the domain list.

Local vendor artwork is listed in `public/brand/infrastructure/sources.json`. The interactive model mounts original logos on raised three-dimensional badges and shares its structure with the scrolling background. Directional arrows and moving signals illustrate dependencies; they do not represent verified live packets. Native animation pauses when offscreen, hidden or reduced motion is requested. Small screens scroll the diagram within its own panel instead of compressing labels or overflowing the page.

Local verification: production build, TypeScript and ESLint passed; 10 architecture/telemetry Playwright cases passed across desktop and mobile. Telemetry fixtures in those tests are demonstration inputs, distinct from the public API's measured Prometheus snapshots. Desktop, mobile and 3D captures are recorded under `.impeccable/review/`.

## Pod resource views · 6 October 2026

The homepage adds separate vertical top-five rankings for running pods by CPU and memory. `/platform#telemetry` places overall single-node resource measurements above a complete pod table, sortable by CPU, memory or name and filterable by namespace. Additional fields are phase, readiness and container restart total. Completed/pending pods remain visible; absent usage is unavailable rather than zero.

The worker performs five fixed Prometheus queries per collection, covering pod inventory, CPU, memory, readiness and restarts. CPU is a five-minute rate in millicores; memory is the summed container working set in bytes, displayed as MiB. Container series are deduplicated before aggregation. Only fresh source samples are accepted. The public schema permits bounded pod/namespace names and the specified numeric/status fields, with at most 500 rows; it does not expose arbitrary metric labels, node addresses, container environment or customer data. Browser queries remain confined to validated snapshots and stop when hidden. Stale/outage states withhold resource tables and rankings.

Local evidence: production app and worker builds, lint/typecheck, three collector tests and 28 targeted desktop/mobile browser tests passed. `.impeccable/review/pods-*-fixture.png` captures explicitly use demonstration fixtures; deployed Prometheus data is verified separately. Existing live Prometheus probes returned all five queries successfully, with 31 inventory records and 29 measured running pods at the time of inspection.

Public enquiries now use contact@ataimo.com and +234 816 0594 893 on the homepage/contact page. Live Mailu alias lookup confirmed contact@ataimo.com and hello@ataimo.com both deliver to ataimo@ataimo.com; no mailbox messages were read or modified.
