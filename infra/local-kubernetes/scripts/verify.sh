#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
for ns in database identity monitoring streaming app ingress; do
  while IFS= read -r resource; do
    kubectl rollout status -n "$ns" "$resource" --timeout=5m
  done < <(kubectl get deployment,statefulset,daemonset -n "$ns" -o name)
  kubectl get pods,pvc -n "$ns"
done
kubectl exec -n database postgres-0 -- psql -U ataimo -d portfolio -c 'SELECT 1;'
kubectl exec -n database postgres-0 -- bash -c 'PGPASSWORD="$PORTAL_DB_PASSWORD" psql -h 127.0.0.1 -U portal -d portfolio -v ON_ERROR_STOP=1 -c "SELECT current_user;"'
kubectl exec -n streaming redpanda-0 -c redpanda -- rpk cluster health
kubectl exec -i -n app deployment/portfolio -- node - <<'JS'
(async () => {
  const urls = {
    portfolio: "http://portfolio.app.svc.cluster.local:3000/api/health",
    keycloak: "http://keycloak.identity.svc.cluster.local:9000/health/ready",
    identity: "http://keycloak.identity.svc.cluster.local:8080/realms/ataimo/.well-known/openid-configuration",
    grafana: "http://monitoring-grafana.monitoring.svc.cluster.local/api/health",
    prometheus: "http://monitoring-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090/api/v1/query?query=up",
  };
  for (const [service, url] of Object.entries(urls)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`${service}: HTTP ${response.status}`);
    const body = await response.json();
    if (service === "portfolio" && body.status !== "ok") throw new Error("Portfolio unhealthy");
    if (service === "keycloak" && body.status !== "UP") throw new Error("Keycloak unhealthy");
    if (service === "identity" && body.issuer !== "http://keycloak.ataimo.com/realms/ataimo") throw new Error("Unexpected issuer");
    if (service === "grafana" && body.database !== "ok") throw new Error("Grafana persistence unhealthy");
    if (service === "prometheus") {
      if (body.status !== "success" || !body.data.result.some(result => result.value[1] === "1")) throw new Error("No live scrape targets");
      console.log(`prometheus: ${body.data.result.length} measured scrape targets`);
    } else console.log(`${service}: verified`);
  }
})().catch(error => { console.error(error.message); process.exit(1); });
JS
helm list -A
