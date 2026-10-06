#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
cd "$PROJECT_DIR"
npm run build:platform
WORKER_IMAGE="ataimo-portfolio-worker:kind-$(date -u +%Y%m%d%H%M%S)"
docker build -f workers/Dockerfile -t "$WORKER_IMAGE" dist
kind load docker-image "$WORKER_IMAGE" --name "$CLUSTER_NAME"
IMAGE="$(kubectl get deployment portfolio -n app -o jsonpath='{.spec.template.spec.containers[0].image}')"
helm upgrade --install portal-jobs "$INFRA_DIR/charts/portal-jobs" -n app --set-string image="$IMAGE" --set-string workerImage="$WORKER_IMAGE" --wait --wait-for-jobs --timeout 5m
printf '%s\n' "$WORKER_IMAGE" > "$INFRA_DIR/.local/worker-image"
