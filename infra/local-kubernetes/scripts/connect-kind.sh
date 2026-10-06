#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
mkdir -p "$(dirname "$KUBECONFIG")"
umask 077
kind get kubeconfig --name "$CLUSTER_NAME" > "$KUBECONFIG"
if test -f /.dockerenv; then
  endpoint="$(docker port "$CLUSTER_NAME-control-plane" 6443/tcp | head -1)"
  port="${endpoint##*:}"
  kubectl config set-cluster "kind-$CLUSTER_NAME" --server="https://host.docker.internal:$port" --tls-server-name=127.0.0.1
fi
require_cluster
kubectl get nodes
