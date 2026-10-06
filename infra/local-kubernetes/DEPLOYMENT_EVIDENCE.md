# Local deployment evidence

Recorded 2026-10-05T09:23:48.637628+00:00. Environment: existing ARM64 Kind cluster `portfolio`, context `kind-portfolio`, Kubernetes v1.37.0. This is verified local infrastructure, not an Azure deployment.

## Accepted checks

| Check | Command | Result |
| --- | --- | --- |
| Full infrastructure automation | `scripts/deploy.sh` | Exit 0; all releases deployed; existing PVCs/credentials preserved on rerun |
| Service verification | `scripts/verify.sh` | Exit 0; actual SQL, broker, identity, application, Grafana and Prometheus responses |
| Database isolation | Portal-role TCP connection to Keycloak DB | Denied, as required |
| Streaming smoke | `scripts/smoke-streaming.sh` | Synthetic local record produced/consumed successfully, including rerun |
| App production image | `scripts/build-load.sh` | Build and TypeScript checks passed; image loaded into Kind |
| Charts | `helm lint` service chart with each app/Postgres/Keycloak values; credential chart | All passed |
| Shell syntax | `bash -n` for each script | Passed |
| Source checks | `npm run lint`; `npm run typecheck` | Passed |
| Browser automation | Agent-browser against `http://localhost:3000` | Expected portfolio DOM, screenshot, no reported page errors |
| Desktop/mobile tests | `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npm test -- --workers=1 --timeout=90000` | 18 passed (25.7s) |

Actual final service-check output:

```text
Healthy:                          true
portfolio: verified
keycloak: verified
identity: verified
grafana: verified
prometheus: 14 measured scrape targets
```

Additional actual Prometheus query `up{namespace=~"identity|streaming"}` returned Keycloak and Redpanda values of `1`. Target counts and statuses are observations at verification time, not synthetic fixtures or a guaranteed ongoing uptime claim.

## Deployment inventory

- Postgres image: `postgres:17.9-bookworm`.
- Keycloak image: `quay.io/keycloak/keycloak:26.8.0`.
- Redpanda chart 26.2.4, broker v26.2.3.
- kube-prometheus-stack chart 91.9.0, operator v0.94.1, Grafana 13.2.3.
- Portfolio image: `ataimo-portfolio:kind-20261005090140`; digest `sha256:d7429e4afacfd147d64cce611c2a8ccf5dee64aadddab843185b6c3cb88aaa6c`.
- Persistent claims: PostgreSQL 4Gi, Redpanda 4Gi, Prometheus 4Gi, Grafana 1Gi; all Bound.
- Services are ClusterIP; browser access uses local port forwards. No external registry push, public ingress, DNS changes or cloud provisioning.

## Resolved issues and acceptance limits

Redpanda rejected obsolete `id_allocator_replication` and `transaction_coordinator_replication` settings; removed them and confirmed configuration job completion. Grafana needed a larger local memory budget and startup grace. A Helm server-side apply migration from RollingUpdate to Recreate rejected a retained strategy field; the checked-in strategy now uses RollingUpdate with zero surge and one unavailable replica to avoid concurrent SQLite writers.

Initial browser execution during rollouts and substantial host memory pressure produced timeouts and probe restarts, including control-plane/controller restarts. Legacy Compose services were stopped without removing their containers or data, releasing capacity. App/operator probes use bounded longer timeouts, Redpanda uses overprovisioned CPU scheduling, and final tests ran after rollouts with one worker. Existing port-3001 test assumptions were replaced with the configured Playwright base URL. Final application tests all passed in 25.7 seconds; no production load test or 60/120 FPS guarantee is inferred.

One synthetic topic, `ataimo-platform-smoke`, remains for repeatable functional checks. No real booking/chat/contact events were published. External email delivery was not attempted. Keycloak discovery/readiness proves the IdP foundation only; app SSO is still pending. Full Dev Container rebuild, remote deployment, hardening and off-host recovery are separate acceptance gates.

Runbooks and next phases: [README](README.md) and [platform plan](../../docs/platform/IMPLEMENTATION_PLAN.md).
