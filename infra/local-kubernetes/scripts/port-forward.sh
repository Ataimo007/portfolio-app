#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
LOCAL_PORT="${LOCAL_PORT:-80}"
trap 'exit 0' INT TERM
while true; do
  SERVICE="$(kubectl get service -n ingress -l gateway.envoyproxy.io/owning-gateway-name=ataimo,gateway.envoyproxy.io/owning-gateway-namespace=ingress -o jsonpath='{.items[0].metadata.name}')"
  if test -z "$SERVICE"; then echo 'Envoy data-plane service is not ready.' >&2; exit 1; fi
  kubectl port-forward -n ingress "service/$SERVICE" "$LOCAL_PORT:80" || echo 'Gateway forwarding disconnected; reconnecting.' >&2
  sleep 2
done
