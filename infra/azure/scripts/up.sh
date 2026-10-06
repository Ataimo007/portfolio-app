#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export ANSIBLE_COLLECTIONS_PATH="$CLOUD/.local/collections"
export PATH="$CLOUD/.local/venv/bin:$CLOUD/.local/bin:$PATH"
: "${SSH_PRIVATE_KEY:?Set the SSH private key path first}"
for tool in az terraform ansible-playbook kubectl helm ssh; do
  command -v "$tool" >/dev/null || { echo "Missing controller tool: $tool" >&2; exit 1; }
done
python3 "$CLOUD/scripts/render-values.py"
"$CLOUD/scripts/plan.sh"
"$CLOUD/scripts/apply.sh"
python3 "$CLOUD/scripts/trust-host.py"
"$CLOUD/scripts/provision.sh"
"$CLOUD/scripts/deploy.sh"
