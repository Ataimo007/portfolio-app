#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
: "${APP_IMAGE:?Supply immutable registry image}"
: "${WORKER_IMAGE:?Supply immutable worker registry image}"
kubectl get nodes -l ataimo.com/environment=azure -o name | grep -q .
kubectl get secret portal-credentials -n app >/dev/null
python3 "$ROOT/infra/local-kubernetes/scripts/bootstrap_credentials.py"
SITE_URL=https://ataimo.com python3 "$ROOT/infra/local-kubernetes/scripts/sync-keycloak.py"
PULL_VALUES=()
if [ -f "$ROOT/infra/azure/.local/registry-values.json" ]; then
  PULL_VALUES=(-f "$ROOT/infra/azure/.local/registry-values.json")
fi
helm upgrade portal-jobs "$ROOT/infra/local-kubernetes/charts/portal-jobs" -n app --reuse-values \
  --set-string image="$APP_IMAGE" --set-string workerImage="$WORKER_IMAGE" \
  --set-string integrationSecret=portal-integrations "${PULL_VALUES[@]}" --wait --wait-for-jobs --timeout 10m
helm upgrade portfolio "$ROOT/infra/local-kubernetes/charts/service" -n app --reuse-values \
  --set-string image="$APP_IMAGE" --set-string integrationSecret=portal-integrations \
  "${PULL_VALUES[@]}" --wait --timeout 10m
kubectl rollout status deployment/portfolio -n app --timeout=5m
kubectl rollout status deployment/portfolio-worker -n app --timeout=5m
