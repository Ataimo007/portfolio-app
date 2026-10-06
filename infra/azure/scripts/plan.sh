#!/usr/bin/env bash
set -euo pipefail
umask 077
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$CLOUD/.local/bin:$PATH"
command -v az >/dev/null || { echo 'Azure CLI is unavailable here. Run on your logged-in controller or authenticate this environment.' >&2; exit 1; }
az account show --output none
python3 "$CLOUD/scripts/render-values.py"
terraform -chdir="$CLOUD/terraform" init
terraform -chdir="$CLOUD/terraform" validate
terraform -chdir="$CLOUD/terraform" plan -out="$CLOUD/.local/azure.tfplan"
chmod 600 "$CLOUD/.local/azure.tfplan"
terraform -chdir="$CLOUD/terraform" show "$CLOUD/.local/azure.tfplan"
