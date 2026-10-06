#!/usr/bin/env bash
set -euo pipefail
if test "$(uname -s)" != Darwin; then
  echo 'Run this script in a Mac terminal, outside the Dev Container.' >&2
  exit 1
fi
source "$(dirname "$0")/common.sh"
for tool in kind kubectl; do
  command -v "$tool" >/dev/null || { echo "Install $tool on the Mac first." >&2; exit 1; }
done
LOCAL_PORT="${LOCAL_PORT:-80}"
if lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Mac port $LOCAL_PORT already has a listener. Stop that forward or service first:" >&2
  lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >&2
  exit 1
fi
"$INFRA_DIR/scripts/connect-kind.sh"
echo "Forwarding the Mac's localhost:$LOCAL_PORT to Envoy Gateway. Keep this terminal open."
if test "$LOCAL_PORT" -lt 1024; then
  exec sudo /usr/bin/env "PATH=$PATH" "KUBECONFIG=$KUBECONFIG" "CLUSTER_NAME=$CLUSTER_NAME" "LOCAL_PORT=$LOCAL_PORT" /bin/bash "$INFRA_DIR/scripts/port-forward.sh"
fi
exec /bin/bash "$INFRA_DIR/scripts/port-forward.sh"
