#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
case "${1:-grafana}" in
  grafana) namespace=monitoring; secret=grafana-credentials; key=password ;;
  keycloak) namespace=identity; secret=keycloak-credentials; key=admin-password ;;
  *) echo 'Use grafana or keycloak' >&2; exit 1 ;;
esac
printf 'Username: admin\nPassword: '
kubectl get secret "$secret" -n "$namespace" -o "jsonpath={.data.$key}" | base64 --decode
printf '\n'
