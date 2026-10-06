#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
IMAGE="${IMAGE:-ataimo-portfolio:kind-$(date -u +%Y%m%d%H%M%S)}"
docker build --build-arg SITE_URL=http://ataimo.com -t "$IMAGE" "$PROJECT_DIR"
docker build --target worker --build-arg SITE_URL=http://ataimo.com -t "$IMAGE-worker" "$PROJECT_DIR"
kind load docker-image "$IMAGE" --name "$CLUSTER_NAME"
kind load docker-image "$IMAGE-worker" --name "$CLUSTER_NAME"
mkdir -p "$INFRA_DIR/.local"
printf '%s\n' "$IMAGE" > "$INFRA_DIR/.local/image"
printf '%s\n' "$IMAGE-worker" > "$INFRA_DIR/.local/worker-image"
