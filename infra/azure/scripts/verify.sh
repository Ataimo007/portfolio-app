#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$CLOUD/.local/bin:$PATH"
export KUBECONFIG="${KUBECONFIG:-$CLOUD/.local/kubeconfig}"
IP="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["public_ip"]["value"])' "$CLOUD/.local/outputs.json")"
kubectl wait -n ingress certificate/ataimo-gateway --for=condition=Ready --timeout=2m
curl --fail --silent --show-error --resolve "ataimo.com:443:$IP" https://ataimo.com/api/health
curl --fail --silent --show-error --resolve "keycloak.ataimo.com:443:$IP" https://keycloak.ataimo.com/realms/ataimo/.well-known/openid-configuration -o /dev/null
curl --fail --silent --show-error --resolve "grafana.ataimo.com:443:$IP" https://grafana.ataimo.com/api/health -o /dev/null
CODE="$(curl --silent --show-error --resolve "redpanda.ataimo.com:443:$IP" -o /dev/null -w '%{http_code}' https://redpanda.ataimo.com/)"
test "$CODE" = 401 || { echo "Console should require authentication; received $CODE" >&2; exit 1; }
CODE="$(curl --silent --show-error --resolve "ataimo.com:80:$IP" -o /dev/null -w '%{http_code}' http://ataimo.com/)"
test "$CODE" = 301
kubectl get pods -A
printf '\nCloud HTTPS checks passed. DNS cutover and real-provider SSO still require separate verification.\n'
