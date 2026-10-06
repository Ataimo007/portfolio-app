#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export KUBECONFIG="$CLOUD/.local/kubeconfig"
bash "$CLOUD/scripts/configure-tls.sh" staging
bash "$CLOUD/scripts/configure-tls.sh" production
if [ "${MAIL_ENABLED:-true}" = true ]; then
  bash "$CLOUD/scripts/deploy-mail.sh"
  if [ -n "${SMTP2GO_USERNAME:-}" ] && [ -n "${SMTP2GO_PASSWORD:-}" ]; then
    python3 - "$CLOUD" <<'PY'
import json,os,sys
from pathlib import Path
os.umask(0o077)
(Path(sys.argv[1])/'.local/relay.json').write_text(json.dumps({'username':os.environ['SMTP2GO_USERNAME'],'password':os.environ['SMTP2GO_PASSWORD']}))
PY
    python3 "$CLOUD/scripts/configure-mail-relay.py" --credentials-file "$CLOUD/.local/relay.json"
    bash "$CLOUD/scripts/deploy-mail.sh"
  fi
fi
python3 "$CLOUD/scripts/configure-workspace.py"
kubectl rollout restart deployment/portfolio deployment/portfolio-worker -n app
kubectl rollout status deployment/portfolio -n app --timeout=5m
python3 "$CLOUD/ci/publish-dns.py"
