#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
umask 077
mkdir -p "$INFRA_DIR/.local"
BACKUP="$INFRA_DIR/.local/grafana-postgres-$(date -u +%Y%m%d%H%M%S).sql"
kubectl exec -n database postgres-0 -- pg_dump -U ataimo grafana > "$BACKUP"
trap 'kubectl scale deployment monitoring-grafana -n monitoring --replicas=1' EXIT
kubectl scale deployment monitoring-grafana -n monitoring --replicas=0
kubectl wait --for=delete pod -n monitoring -l app.kubernetes.io/name=grafana --timeout=2m
helm upgrade --install grafana-migrate "$INFRA_DIR/charts/maintenance" -n monitoring -f "$INFRA_DIR/values/grafana-migrate.yaml" --wait --wait-for-jobs --timeout 5m
REVISION="$(helm list -n monitoring -f '^grafana-migrate$' -o json | python3 -c 'import json,sys;print(json.load(sys.stdin)[0]["revision"])')"
kubectl logs -n monitoring "job/grafana-migrate-$REVISION"
kubectl scale deployment monitoring-grafana -n monitoring --replicas=1
kubectl rollout status deployment/monitoring-grafana -n monitoring --timeout=5m
