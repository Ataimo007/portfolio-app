#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
helm upgrade --install envoy-gateway oci://docker.io/envoyproxy/gateway-helm --version v1.9.2 -n ingress --create-namespace -f "$INFRA_DIR/values/envoy-gateway.yaml" --wait --timeout 10m
helm upgrade --install gateway "$INFRA_DIR/charts/gateway" -n ingress -f "$INFRA_DIR/values/gateway.yaml" --wait --timeout 5m
kubectl wait -n ingress gateway/ataimo --for=condition=Programmed --timeout=3m
DEPLOYMENT="$(kubectl get deployment -n ingress -l gateway.envoyproxy.io/owning-gateway-name=ataimo -o jsonpath='{.items[0].metadata.name}')"
kubectl rollout status -n ingress "deployment/$DEPLOYMENT" --timeout=5m
