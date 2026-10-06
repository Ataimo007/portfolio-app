#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
for ns in database identity monitoring streaming app ingress; do
  kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f -
done
mkdir -p "$INFRA_DIR/.local"
chmod 700 "$INFRA_DIR/.local"
python3 "$INFRA_DIR/scripts/bootstrap_credentials.py"
helm repo add redpanda https://charts.redpanda.com --force-update
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update
helm repo update
helm upgrade --install postgres "$INFRA_DIR/charts/service" -n database -f "$INFRA_DIR/values/postgres.yaml" --wait --timeout 10m
kubectl exec -i -n database postgres-0 -- bash -s < "$INFRA_DIR/scripts/database-roles.sh"
"$INFRA_DIR/scripts/deploy-identity.sh"
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack --version 91.9.0 -n monitoring -f "$INFRA_DIR/values/monitoring.yaml" --wait --timeout 15m
helm upgrade --install redpanda redpanda/redpanda --version 26.2.4 -n streaming -f "$INFRA_DIR/values/redpanda.yaml" --wait --timeout 15m
helm upgrade --install redpanda-console redpanda/console --version 3.9.0 -n streaming -f "$INFRA_DIR/values/console.yaml" --wait --timeout 10m
if ! test -f "$INFRA_DIR/.local/image"; then "$INFRA_DIR/scripts/build-load.sh"; fi
IMAGE="$(cat "$INFRA_DIR/.local/image")"
WORKER_IMAGE="$(cat "$INFRA_DIR/.local/worker-image")"
helm upgrade --install portal-jobs "$INFRA_DIR/charts/portal-jobs" -n app --set-string image="$IMAGE" --set-string workerImage="$WORKER_IMAGE" --wait --wait-for-jobs --timeout 5m
helm upgrade --install portfolio "$INFRA_DIR/charts/service" -n app -f "$INFRA_DIR/values/app.yaml" --set-string image="$IMAGE" --wait --timeout 10m
"$INFRA_DIR/scripts/deploy-gateway.sh"
python3 "$INFRA_DIR/scripts/sync-keycloak.py"
"$INFRA_DIR/scripts/verify.sh"
"$INFRA_DIR/scripts/verify-gateway.sh"
