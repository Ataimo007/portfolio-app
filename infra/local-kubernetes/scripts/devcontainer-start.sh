#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
if docker inspect "$CLUSTER_NAME-control-plane" >/dev/null 2>&1; then
  "$INFRA_DIR/scripts/connect-kind.sh"
  sudo node "$INFRA_DIR/scripts/update-hosts.cjs" /etc/hosts
fi
