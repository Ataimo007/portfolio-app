# Local Kubernetes development

The existing ARM64 `portfolio` Kind cluster is the primary development environment. Helm-managed infrastructure preserves the approved portfolio content/design. Legacy Compose services are stopped, with containers/volumes retained. No registry push, cloud deployment or public DNS modification has occurred.

| Namespace | Components | Storage |
| --- | --- | --- |
| database | PostgreSQL, credentials | 4Gi PVC; separate `portfolio`/`portal`, `keycloak`/`keycloak`, `grafana`/`grafana` database/role pairs |
| identity | Keycloak, credentials | Dedicated Keycloak database on shared PostgreSQL |
| monitoring | Prometheus Operator, Prometheus, Grafana, exporters, credentials | Prometheus 4Gi TSDB PVC; Grafana PostgreSQL config DB and retained 1Gi asset/backup PVC |
| streaming | Redpanda and Redpanda Console | Broker 4Gi log PVC; Console uses Kafka/Admin APIs, no relational DB |
| app | Portfolio, client portal, event/status worker and migration jobs | Locally built, non-root app and worker images; portal data in PostgreSQL |
| ingress | Envoy Gateway control plane, managed Envoy proxy, Gateway configuration | Gateway API CRDs, GatewayClass, EnvoyProxy, Gateway and four HTTPRoutes |

PostgreSQL clients use `postgres.database.svc.cluster.local:5432`, with isolated credentials and restricted database CONNECT permissions. Prometheus and Redpanda retain their native storage engines; routing infrastructure/Console do not require PostgreSQL. Future relational dependencies must have a dedicated database/least-privilege role on this PostgreSQL instance, migrations and backups.

The client portal is available at `http://ataimo.com/portal`; measured local readiness is at `http://ataimo.com/status`. See [portal operations](../../docs/platform/PORTAL_OPERATIONS.md) for owner/client invitations, migration behavior, booking approval, private chat, event recovery and test commands. The `charts/portal-jobs` release runs versioned migrations and the worker; application redeployment builds and loads both images. Worker-only updates use `scripts/redeploy-worker.sh`.

## Install and update

```bash
infra/local-kubernetes/scripts/connect-kind.sh
infra/local-kubernetes/scripts/build-load.sh
infra/local-kubernetes/scripts/deploy.sh
```

Scripts default to `CLUSTER_NAME=portfolio`, `KUBECONFIG=$HOME/.kube/ataimo-kind`, and require context `kind-portfolio`. Connection uses a dedicated kubeconfig; Docker Desktop endpoint adaptation applies only inside containers. No new cluster is created and no existing PVCs are deleted.

All installation settings are in `values/`. Project-owned charts are `charts/service`, `charts/credentials`, `charts/gateway`, and the one-time maintenance job chart. Upstream versions are pinned in deployment scripts: kube-prometheus-stack 91.9.0, Redpanda 26.2.4, Console 3.9.0 and Envoy Gateway v1.9.2. Envoy installs Gateway API/extension CRDs with its Helm chart. Both its control plane and managed data plane run in `ingress`; HTTPRoutes live alongside their backends and are attached using namespace-restricted listeners.

`values/envoy-gateway.yaml` controls Envoy Gateway's controller. `values/gateway.yaml` controls hostnames, routes and the Envoy data plane. The latter uses two worker threads, bounded resource settings and longer health probe timeouts for shared local build capacity.

```bash
infra/local-kubernetes/scripts/redeploy-app.sh
infra/local-kubernetes/scripts/deploy-gateway.sh
```

App builds use unique tags, load into Kind, and record `.local/image`. `SITE_URL` is `http://ataimo.com` during build/runtime. Generated files and backups are ignored by Git/Docker. Credentials are generated once and preserved; Helm receives them through stdin and stores release values in Kubernetes Secrets. This is local development secret storage, not the final production solution.

## One gateway, four sites

```bash
infra/local-kubernetes/scripts/port-forward.sh
```

This forwards only the Envoy data-plane service, local port 80 to service port 80. It reconnects after pod replacement; Ctrl+C stops it. `LOCAL_PORT=8080` is available for troubleshooting, but canonical service URLs use port 80. VS Code's Dev Container configuration forwards only port 80 and requires the matching local port. If VS Code cannot bind Mac port 80, run the gateway forward directly in a Mac terminal using the host kubeconfig/Kind tools. Keep exactly one port-80 forward active.

| Site | URL |
| --- | --- |
| Portfolio | http://ataimo.com |
| Keycloak administration | http://keycloak.ataimo.com/admin |
| Grafana | http://grafana.ataimo.com |
| Redpanda Console | http://redpanda.ataimo.com |

Prometheus and the Redpanda broker have no HTTPRoute. Unknown, `prometheus.ataimo.com`, and `broker.ataimo.com` hostnames return 404. Console connects to the broker privately; exposing Console does not expose Kafka listeners.

### Hosts files

The Dev Container `/etc/hosts` has these mappings; its startup hook regenerates them after a rebuild:

```text
127.0.0.1 ataimo.com keycloak.ataimo.com grafana.ataimo.com redpanda.ataimo.com
```

The Mac's `/private/etc/hosts` was mounted and read, but writing it through Docker was denied with EACCES. **The Mac hosts update is still a user action requiring macOS administrator privileges.** In a Mac terminal, from this project directory:

```bash
sudo node infra/local-kubernetes/scripts/update-hosts.cjs /etc/hosts
```

The updater is idempotent, preserves unrelated aliases/comments, removes conflicting entries only for these four domains, and manages a clearly marked block. The original Mac hosts file is backed up in ignored `.local/mac-hosts.before`. No DNS provider records are changed. Editing only the container hosts file does not configure the Mac browser.

If the domains refuse connections despite correct Mac hosts entries, the container-only listener has not been forwarded to the Mac. Run this in a **Mac terminal, outside the Dev Container**, from the repository directory:

```bash
bash infra/local-kubernetes/scripts/forward-macos.sh
```

The helper checks for an occupied Mac port, generates the Mac kubeconfig, and uses macOS administrator privileges for port 80 while preserving the kubectl executable path. Keep the terminal open; Ctrl+C stops the forward. Disable VS Code's local port-80 forwarding when using this direct Mac forward. The container's separate loopback listener may remain active for development checks.

Verify from the Mac with `curl --noproxy '*' -fsS http://ataimo.com/api/health`; it should return `{"status":"ok","service":"portfolio"}`. Hosts entries resolve names only; they do not start a listener or expose a ClusterIP service.

## Credentials

Both local administrative usernames are `admin`. Retrieve passwords in your own terminal:

```bash
infra/local-kubernetes/scripts/credentials.sh grafana
infra/local-kubernetes/scripts/credentials.sh keycloak
```

Keep terminal output private. Grafana's original administrator hash/settings were migrated; successful authenticated `/api/user` verification confirms the existing secret still works. Keycloak disables registration, has owner/admin/client/demo-viewer roles, and a PKCE client foundation. Its canonical issuer is `http://keycloak.ataimo.com/realms/ataimo`; trusted proxy headers are restricted to the Kind pod CIDR. The existing realm client was updated to the app hostname using `scripts/sync-keycloak.py`, rather than relying on imports to overwrite an existing realm.

No app SSO flow is implemented yet. The future server-side session integration must finalize client type and callback/backchannel behavior. Keycloak administrator browser login through this HTTP gateway was verified in local Chromium. Production will use HTTPS.

## Grafana database migration

The one-time Helm maintenance jobs created a consistent SQLite backup and copied compatible Grafana application tables into the PostgreSQL schema initialized by the same Grafana version. Migration ran with Grafana stopped, in one transaction, verified every imported row count, preserved target-specific migration history and reset sequences. Users, data sources, encrypted data, permissions, orgs and unified dashboard/resource data were copied. A PVC marker prevents replay overwriting new PostgreSQL settings.

Original `/data/grafana.db`, `/data/grafana.pre-postgres.db`, and the persistent Grafana volume remain intact; an ignored SQL backup of the pre-import PostgreSQL DB is also retained. These local backups are not off-host disaster recovery. `scripts/migrate-grafana.sh` is an explicit maintenance operation for an existing SQLite deployment, not part of normal deploys/fresh installs. Fresh installs use PostgreSQL directly. Maintenance jobs/values are checked in; no credential values are embedded.

## Verify

```bash
infra/local-kubernetes/scripts/verify.sh
infra/local-kubernetes/scripts/verify-gateway.sh
python3 infra/local-kubernetes/scripts/verify-login.py
infra/local-kubernetes/scripts/smoke-streaming.sh
PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://ataimo.com npm test -- --workers=1 --timeout=90000
```

Checks use actual SQL, pod rollouts, PVCs, broker health, Keycloak readiness/discovery, Grafana DB health/admin authentication, Prometheus scrape data, Gateway/HTTPRoute status and real HTTP host routing. Streaming smoke records are explicitly synthetic. Portfolio tests run through Envoy on the configured domain. No real consultation/chat events, external email or Azure telemetry are implied.

## Limits and later TLS

This is one node/broker with local-path storage, not HA or off-host backup. Docker has approximately 8 GiB shared with the Dev Container; build/browser bursts can create pressure. Redpanda's small functional-test memory budget is below production recommendations. Namespace organization alone is not a security boundary; public deployment requires network policy, authorization, secrets, retention, backups and load evidence. Console is currently unauthenticated and the gateway forward binds loopback only.

Envoy Gateway v1.9's published tested Kubernetes range ends at 1.36, while this Kind node is 1.37. The stable v1.9.2 control/data planes and actual routes were verified locally; this does not establish upstream support or production compatibility. Use a supported version pair for cloud promotion, without replacing this existing cluster just for local tests.

For cloud TLS: install cert-manager by Helm with Gateway API support, configure a Let's Encrypt DNS-01 ClusterIssuer using a scoped DNS-provider token, request `ataimo.com` plus `*.ataimo.com` in an `ingress`-namespace Certificate, and attach its Secret to HTTPS listeners. Verify DNS challenge issuance/renewal before adding HTTP→HTTPS redirects and updating canonical app/Keycloak/Grafana URLs. No ACME issuer, token, certificate request or DNS change has been created in this HTTP milestone.

Next: Keycloak sessions/authorization and PostgreSQL migrations, request-and-approve consultations/calendar/client jobs, authorized private chat, Redpanda outbox/worker, and an allowlisted live-status UI.

References: [Envoy Helm installation](https://gateway.envoyproxy.io/docs/tasks/quickstart/), [data-plane customization](https://gateway.envoyproxy.io/docs/tasks/operations/customize-envoyproxy/), [compatibility matrix](https://gateway.envoyproxy.io/news/releases/matrix/), [Grafana database configuration](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/).

## Fresh Grafana reset

To explicitly discard Grafana data while retaining its configured admin and PostgreSQL credentials:

```bash
bash infra/local-kubernetes/scripts/reset-grafana.sh --discard-grafana-data
```

This stops Grafana, backs up its database under ignored `.local`, clears only the Grafana PVC through a Helm maintenance job, recreates only the `grafana` database owned by `grafana`, and restarts Grafana. Helm-provisioned dashboards and Prometheus datasource are regenerated. It does not import SQLite data. Prometheus history, Keycloak, and portfolio databases remain untouched. Existing browser sessions are invalidated: log in again.
