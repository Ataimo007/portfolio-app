#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLOUD="$ROOT/infra/azure"
LOCAL="$ROOT/infra/local-kubernetes"
export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
kubectl get nodes -l ataimo.com/environment=azure -o name | grep -q . || { echo 'An Azure-labelled K3s node is required.' >&2; exit 1; }
python3 "$CLOUD/scripts/render-values.py"
for ns in database identity monitoring streaming app ingress cert-manager; do
  kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f -
done
python3 "$LOCAL/scripts/bootstrap_credentials.py"
python3 "$CLOUD/scripts/cloud-secrets.py" console
helm repo add redpanda https://charts.redpanda.com --force-update
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update
helm repo update
helm upgrade --install envoy-gateway oci://docker.io/envoyproxy/gateway-helm --version v1.9.2 -n ingress -f "$LOCAL/values/envoy-gateway.yaml" --wait --timeout 10m
helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager --version v1.21.2 -n cert-manager -f "$CLOUD/values/cert-manager.yaml" --wait --timeout 10m
helm upgrade --install postgres "$LOCAL/charts/service" -n database -f "$LOCAL/values/postgres.yaml" --wait --timeout 10m
kubectl exec -i -n database postgres-0 -- bash -s < "$LOCAL/scripts/database-roles.sh"
python3 "$LOCAL/scripts/sync-theme-tokens.py"
helm upgrade --install identity-theme "$LOCAL/charts/identity-theme" -n identity --set-string portfolioUrl=https://ataimo.com --wait
REVISION="$(find "$LOCAL/charts/identity-theme/files" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d ' ' -f1)"
helm upgrade --install keycloak "$LOCAL/charts/service" -n identity -f "$CLOUD/.local/values/keycloak.json" --set-string themeRevision="$REVISION" --wait --timeout 10m
SITE_URL=https://ataimo.com python3 "$LOCAL/scripts/sync-keycloak.py"
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack --version 91.9.0 -n monitoring -f "$CLOUD/.local/values/monitoring.json" --wait --timeout 15m
helm upgrade --install redpanda redpanda/redpanda --version 26.2.4 -n streaming -f "$LOCAL/values/redpanda.yaml" -f "$CLOUD/values/redpanda.yaml" --wait --timeout 15m
helm upgrade --install redpanda-console redpanda/console --version 3.9.0 -n streaming -f "$LOCAL/values/console.yaml" -f "$CLOUD/values/console.yaml" --wait --timeout 10m
if [ -n "${APP_IMAGE:-}" ]; then
  IMAGE="$APP_IMAGE"
  WORKER="${WORKER_IMAGE:?Registry worker image required}"
else
  TAG="${IMAGE_TAG:-azure-$(date -u +%Y%m%d%H%M%S)}"
  IMAGE="ataimo-portfolio:$TAG"
  WORKER="ataimo-portfolio-worker:$TAG"
  cd "$ROOT"
  docker build --build-arg SITE_URL=https://ataimo.com -t "$IMAGE" .
  docker build --build-arg SITE_URL=https://ataimo.com --target worker -t "$WORKER" .
  ARCHIVE="$(mktemp /tmp/ataimo-images.XXXXXX.tar)"
  trap 'rm -f "$ARCHIVE"' EXIT
  docker save -o "$ARCHIVE" "$IMAGE" "$WORKER"
  k3s ctr images import --local "$ARCHIVE"
fi
PULL_VALUES=()
if [ -f "$CLOUD/.local/registry-values.json" ]; then
  PULL_VALUES=(-f "$CLOUD/.local/registry-values.json")
fi
helm upgrade --install portal-jobs "$LOCAL/charts/portal-jobs" -n app --set-string image="$IMAGE" --set-string workerImage="$WORKER" --set-string environment=azure-k3s --set-string integrationSecret=portal-integrations "${PULL_VALUES[@]}" --wait --wait-for-jobs --timeout 5m
helm upgrade --install portfolio "$LOCAL/charts/service" -n app -f "$CLOUD/.local/values/app.json" --set-string image="$IMAGE" --set-string integrationSecret=portal-integrations "${PULL_VALUES[@]}" --wait --timeout 10m
printf '%s\n' "$IMAGE" > "$CLOUD/.local/image"
echo 'Workloads installed. Issue staging then production certificates with configure-tls.sh before publishing DNS.'
