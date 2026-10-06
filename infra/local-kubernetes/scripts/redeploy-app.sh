#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
python3 "$INFRA_DIR/scripts/bootstrap_credentials.py"
"$INFRA_DIR/scripts/deploy-identity.sh"
"$INFRA_DIR/scripts/build-load.sh"
IMAGE="$(cat "$INFRA_DIR/.local/image")"
helm upgrade --install portal-jobs "$INFRA_DIR/charts/portal-jobs" -n app --set-string image="$IMAGE" --set-string workerImage="$IMAGE-worker" --wait --wait-for-jobs --timeout 5m
helm upgrade --install portfolio "$INFRA_DIR/charts/service" -n app -f "$INFRA_DIR/values/app.yaml" --set-string image="$IMAGE" --wait --timeout 5m
