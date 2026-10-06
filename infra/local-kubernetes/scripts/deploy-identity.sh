#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
python3 "$INFRA_DIR/scripts/sync-theme-tokens.py"
THEME_REVISION="$(python3 - "$INFRA_DIR/charts/identity-theme/files" <<'PY'
import hashlib
from pathlib import Path
import sys
root = Path(sys.argv[1])
content = b''.join(str(path.relative_to(root)).encode() + path.read_bytes() for path in sorted(root.rglob('*')) if path.is_file())
print(hashlib.sha256(content).hexdigest())
PY
)"
helm upgrade --install identity-theme "$INFRA_DIR/charts/identity-theme" -n identity --wait --timeout 5m
helm upgrade --install keycloak "$INFRA_DIR/charts/service" -n identity -f "$INFRA_DIR/values/keycloak.yaml" --set-string themeRevision="$THEME_REVISION" --wait --timeout 10m
python3 "$INFRA_DIR/scripts/sync-keycloak.py"
