# Gateway and shared PostgreSQL evidence

Recorded 2026-10-05T10:12:05.389243+00:00. Existing ARM64 `kind-portfolio`, Kubernetes v1.37.0. Portfolio design/content preserved; no app feature integration or remote deployment claimed.

## Deployed

- Envoy Gateway Helm v1.9.2 in `ingress`, including Gateway API CRDs; both controller and managed Envoy data plane run there. Controller values: `values/envoy-gateway.yaml`; data-plane/host values: `values/gateway.yaml`.
- Project-owned Gateway chart creates four hostname-specific HTTP listeners and HTTPRoutes, with namespace-restricted attachment. Gateway Programmed=True, route Accepted=True/ResolvedRefs=True with current observed generation. ClusterIP proxy service only, HTTP port 80.
- Console Helm 3.9.0 in `streaming`, using private Kafka/Admin API connections. No broker or Prometheus route.
- Keycloak uses `keycloak` DB/role on `postgres.database.svc.cluster.local:5432` in `database`; real pg_stat_activity confirms the connection. Its canonical issuer and existing client origins/callback were updated to the gateway domains without replacing the realm.
- Grafana uses dedicated `grafana` DB/role on the same PostgreSQL service. Real pg_stat_activity confirms the connection. Credentials deployed using the existing Helm Secret release.
- Grafana SQLite migration: 87 imported tables individually row-count verified in one PostgreSQL transaction; target-specific migration logs retained, sequences reset. Original SQLite, consistent SQLite backup, original PVC, and ignored pre-import PostgreSQL dump preserved. Admin, two data sources, permissions and 29 unified resource records migrated. Marker prevents replay overwriting new PostgreSQL settings.
- App image rebuilt with SITE_URL=http://ataimo.com, loaded/deployed as `ataimo-portfolio:kind-20261005095554`. No remote registry push.
- Individual service forwards stopped; exactly one `kubectl port-forward -n ingress service/envoy-ingress-ataimo-31259e0e 80:80` observed. Forwarding reconnects after pod replacement.

## Verified

```text
gateway.gateway.networking.k8s.io/ataimo condition met
portfolio: route accepted, references resolved
keycloak: route accepted, references resolved
grafana: route accepted, references resolved
redpanda-console: route accepted, references resolved
ataimo.com: gateway HTTP verified
keycloak.ataimo.com: gateway HTTP verified
grafana.ataimo.com: gateway HTTP verified
redpanda.ataimo.com: gateway HTTP verified
prometheus.ataimo.com: no route (404)
broker.ataimo.com: no route (404)
unknown.ataimo.com: no route (404)
```

- `scripts/verify.sh`: workload/PVC/service/real SQL/broker/monitoring checks passed with the canonical issuer.
- `scripts/verify-login.py`: actual Grafana admin credentials authenticated `/api/user` through Envoy after migration; no password printed.
- Keycloak: actual administrator browser login through `http://keycloak.ataimo.com/admin/master/console/`, with Realm settings visible and no browser page errors. Password held in memory only. Admin API also updated the existing portfolio client.
- Grafana role negative checks: denied connections to both Keycloak and portfolio databases. Earlier portal→Keycloak isolation remains in place.
- `PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://ataimo.com npm test -- --workers=1 --timeout=90000`: all 18 desktop/mobile tests passed in 27.2 seconds through Envoy.
- Helm chart lint, shell syntax, npm lint and TypeScript checks passed. Docker image production build passed.
- Data-plane one-second probes caused restarts during shared local build load. Controller/data-plane probe settings now use longer bounded timeouts; proxy concurrency is two workers. Replacement proxy and controller were observed Ready with zero restarts after the change. This is local functional evidence, not production load acceptance or an uptime guarantee.

## Still needed on the Mac

The Mac hosts file was read via a read-only Docker bind mount. An authorized write attempt was rejected with EACCES; it remains unchanged. Original file is backed up in ignored `.local/mac-hosts.before`. The Dev Container hosts file was updated successfully. The Mac needs its own administrator action:

```bash
sudo node "/Users/ataimoedem/Documents/pd/apps/ataimo-portfolio/infra/local-kubernetes/scripts/update-hosts.cjs" /etc/hosts
```

VS Code configuration forwards only port 80 with requireLocalPort=true. Mac browser access is not claimed as verified from inside this container; apply the hosts command and ensure VS Code's local port 80 forward, or run the one gateway forward directly on the Mac. The runbook documents the macOS privileged-port fallback. No actual public DNS record was changed.

## Limits

Envoy Gateway v1.9 officially lists tested Kubernetes releases only through 1.36; this node is 1.37. Stable v1.9.2 routing was verified here, but cloud deployment needs a supported version pair. HTTP is intentional for this local milestone. cert-manager, DNS-01 issuer credentials and public certificates are deferred; no ACME/DNS changes made. Prometheus and Redpanda use native TSDB/log storage, not PostgreSQL; no extra relational DB is needed for Console or Envoy.

## Grafana encoding repair — 2026-10-05

User reported upstream request timeouts during dashboard navigation. Grafana logs showed unified-storage JSON parsing failures and slow/cancelled quota and provisioning requests. Inspection confirmed SQLite byte values had been adapted into PostgreSQL text as hexadecimal bytea strings. Previous row-count and login checks did not detect this migration error.

Backed up the Grafana database to ignored, mode-0600 `.local/grafana-before-encoding-repair.sql`; stopped Grafana during a transactional repair; decoded 29 resource and 29 resource-history values to UTF-8 JSON; verified API-version fields (24 dashboards and five checktypes); restarted Grafana. Database and admin credentials retained. Migration script now decodes SQLite bytes for PostgreSQL text columns.

Verified through Envoy: admin authentication, nonempty dashboard search, dashboard API listing, quota usage with required group/resource parameters, and provisioning settings. Grafana pod 3/3 ready with zero restarts at verification. These checks run from the Dev Container; user browser refresh remains the Mac-side confirmation.

## Fresh Grafana initialization — 2026-10-05

At user request, discarded active Grafana data: backed up PostgreSQL privately, stopped Grafana, cleared the Grafana PVC with the Helm-managed `grafana-reset` job, recreated only the `grafana` database with owner/isolated access, and restarted without any SQLite import. Existing credentials retained; 24 Helm dashboards regenerated. Repeatable workflow: `scripts/reset-grafana.sh --discard-grafana-data`.

Initial browser verification still exposed runtime stalls on the clean database. CRI statistics showed Grafana consuming approximately 12.6 CPU cores near its 512 MiB cap. Updated Helm values to a 1 GiB limit, 512 MiB request, GOMAXPROCS=2, and GOMEMLIMIT=800MiB. Authenticated dashboard, quotas, and provisioning APIs pass after rollout.

Final verification: Helm monitoring revision 6 deployed successfully. Headless Chromium authenticated through Envoy, loaded the dashboard list and an individual CoreDNS dashboard, observed no HTTP 5xx responses, and verified the annotations API. This confirms the local browser flow from the Dev Container; Mac user session must log in again after reset.
