#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$CLOUD/.local/bin:$PATH"
LOCAL="$CLOUD/../local-kubernetes"
MODE="${1:-staging}"
case "$MODE" in staging|production) ;; *) echo 'Use staging or production.' >&2; exit 1 ;; esac
kubectl get nodes -l ataimo.com/environment=azure -o name | grep -q . || exit 1
python3 "$CLOUD/scripts/render-values.py"
PROVIDER="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["dns"]["provider"])' "$CLOUD/.local/config.json")"
if [ "$PROVIDER" = cloudflare ]; then
  if ! kubectl get secret dns-challenge-credentials -n cert-manager >/dev/null 2>&1; then
    python3 "$CLOUD/scripts/cloud-secrets.py" cloudflare
  fi
fi
helm upgrade --install certificates "$CLOUD/charts/certificates" -n ingress -f "$CLOUD/.local/values/certificates.json" --set-string environment="$MODE" --wait
# Wait for a Ready certificate signed by the requested issuer, not an old staging secret.
python3 - "$MODE" <<'PY'
import base64, json, subprocess, sys, time
expected = 'letsencrypt-' + sys.argv[1]
deadline = time.monotonic() + 900
while time.monotonic() < deadline:
    cert = json.loads(subprocess.check_output(['kubectl','get','certificate','ataimo-gateway','-n','ingress','-o','json']))
    ready = any(c['type']=='Ready' and c['status']=='True' and c.get('observedGeneration')==cert['metadata']['generation'] for c in cert.get('status',{}).get('conditions',[]))
    secret = subprocess.run(['kubectl','get','secret','ataimo-gateway-tls','-n','ingress','-o','json'],capture_output=True,text=True)
    if ready and secret.returncode == 0:
        annotations = json.loads(secret.stdout)['metadata'].get('annotations',{})
        if annotations.get('cert-manager.io/issuer-name') == expected:
            print('Requested certificate is Ready.')
            break
    time.sleep(5)
else:
    raise SystemExit('Certificate not ready after 15 minutes; inspect Certificate and Challenge resources.')
PY
if [ "$MODE" = production ]; then
  MAIL_VALUES=()
  if kubectl get deployment mailu-front -n mail >/dev/null 2>&1; then
    MAIL_VALUES=(-f "$CLOUD/values/mail-gateway.yaml")
  fi
  helm upgrade --install gateway "$LOCAL/charts/gateway" -n ingress "${MAIL_VALUES[@]}" --set serviceType=LoadBalancer --set tls.enabled=true --set consoleBasicAuth.enabled=true --wait
  kubectl wait -n ingress gateway/ataimo --for=condition=Programmed --timeout=5m
fi
