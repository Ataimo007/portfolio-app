#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes -l ataimo.com/environment=azure -o name | grep -q .
cd "$ROOT"
IMAGE="ataimo-portfolio:azure-$(date -u +%Y%m%d%H%M%S)"
docker build --build-arg SITE_URL=https://ataimo.com -t "$IMAGE" .
WORKER_IMAGE="${IMAGE/ataimo-portfolio:/ataimo-portfolio-worker:}"
docker build --target worker --build-arg SITE_URL=https://ataimo.com -t "$WORKER_IMAGE" .
ARCHIVE="$(mktemp /tmp/ataimo-app.XXXXXX.tar)"
trap 'python3 -c '\''import pathlib,sys; pathlib.Path(sys.argv[1]).unlink(missing_ok=True)'\'' "$ARCHIVE"' EXIT
docker save -o "$ARCHIVE" "$IMAGE" "$WORKER_IMAGE"
k3s ctr images import "$ARCHIVE"
helm upgrade portal-jobs infra/local-kubernetes/charts/portal-jobs -n app --reuse-values --set-string image="$IMAGE" --set-string workerImage="$WORKER_IMAGE" --set-string integrationSecret=portal-integrations --wait --wait-for-jobs --timeout 10m
helm upgrade portfolio infra/local-kubernetes/charts/service -n app --reuse-values --set-string image="$IMAGE" --set-string integrationSecret=portal-integrations --wait --timeout 10m
printf '%s\n' "$IMAGE" > infra/azure/.local/image
