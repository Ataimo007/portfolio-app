#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
if test "${1:-}" != --discard-grafana-data; then
  echo 'Usage: reset-grafana.sh --discard-grafana-data (deletes Grafana database and local PVC contents)' >&2
  exit 1
fi
require_cluster
umask 077
mkdir -p "$INFRA_DIR/.local"
kubectl exec -n database postgres-0 -- pg_dump -U ataimo grafana > "$INFRA_DIR/.local/grafana-before-reset-$(date -u +%Y%m%d%H%M%S).sql"
trap 'kubectl scale deployment monitoring-grafana -n monitoring --replicas=1' EXIT
kubectl scale deployment monitoring-grafana -n monitoring --replicas=0
kubectl wait --for=delete pod -n monitoring -l app.kubernetes.io/name=grafana --timeout=2m
helm upgrade --install grafana-reset "$INFRA_DIR/charts/maintenance" -n monitoring -f "$INFRA_DIR/values/grafana-reset.yaml" --wait --wait-for-jobs --timeout 5m
kubectl exec -i -n database postgres-0 -- psql -U ataimo -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DROP DATABASE grafana WITH (FORCE);
CREATE DATABASE grafana OWNER grafana;
REVOKE ALL ON DATABASE grafana FROM PUBLIC;
SQL
kubectl exec -n database postgres-0 -- psql -U ataimo -d grafana -v ON_ERROR_STOP=1 -c 'ALTER SCHEMA public OWNER TO grafana;'
kubectl scale deployment monitoring-grafana -n monitoring --replicas=1
kubectl rollout status deployment/monitoring-grafana -n monitoring --timeout=5m
python3 "$INFRA_DIR/scripts/verify-login.py"
