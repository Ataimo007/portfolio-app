#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export ANSIBLE_COLLECTIONS_PATH="$CLOUD/.local/collections"
export PATH="$CLOUD/.local/venv/bin:$CLOUD/.local/bin:$PATH"
python3 "$CLOUD/scripts/bundle.py"
ansible-playbook -i "$CLOUD/.local/inventory.json" "$CLOUD/ansible/deploy-app.yml"
