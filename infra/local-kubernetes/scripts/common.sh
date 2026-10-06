#!/usr/bin/env bash
set -euo pipefail
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(cd "$INFRA_DIR/../.." && pwd)"
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/ataimo-kind}"
CLUSTER_NAME="${CLUSTER_NAME:-portfolio}"
EXPECTED_CONTEXT="kind-$CLUSTER_NAME"
require_cluster() {
  test "$(kubectl config current-context)" = "$EXPECTED_CONTEXT" || { echo "Expected context $EXPECTED_CONTEXT; refusing deployment." >&2; exit 1; }
  kubectl get node "$CLUSTER_NAME-control-plane" >/dev/null
}
