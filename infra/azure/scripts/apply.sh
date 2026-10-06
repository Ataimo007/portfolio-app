#!/usr/bin/env bash
set -euo pipefail
umask 077
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$CLOUD/.local/bin:$PATH"
az account show --output none
test -f "$CLOUD/.local/azure.tfplan" || { echo 'Run plan.sh first.' >&2; exit 1; }
terraform -chdir="$CLOUD/terraform" apply "$CLOUD/.local/azure.tfplan"
umask 077
terraform -chdir="$CLOUD/terraform" output -json > "$CLOUD/.local/outputs.json"
python3 - "$CLOUD" <<'PYCONFIG'
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
outputs = json.loads((root / '.local/outputs.json').read_text())
config = json.loads((root / '.local/config.json').read_text())
if config['dns']['provider'] == 'azuredns':
    config['dns']['azure']['managedIdentityClientID'] = outputs['dns_identity_client_id']['value']
    (root / '.local/config.json').write_text(json.dumps(config, indent=2))
print('Azure managed identity added to private certificate configuration.')
PYCONFIG
echo 'VM created. Run trust-host.py then provision.sh.'
