#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$CLOUD/.local/bin:$PATH"
kubectl get nodes -l ataimo.com/environment=azure -o name | grep -q .
kubectl create namespace mail --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install ataimo-mail-foundation "$CLOUD/mail" -n mail --wait
kubectl wait -n mail certificate/mail-tls --for=condition=Ready --timeout=5m
python3 "$CLOUD/scripts/mail-credentials.py"
python3 "$CLOUD/scripts/render-mail-values.py"
helm repo add mailu https://mailu.github.io/helm-charts/ --force-update
RELAY_VALUES=()
if kubectl get secret mailu-relay -n mail >/dev/null 2>&1; then
  RELAY_VALUES=(-f "$CLOUD/values/mail-relay.yaml")
fi
helm upgrade --install mailu mailu/mailu --version 2.8.0 -n mail -f "$CLOUD/values/mailu.yaml" -f "$CLOUD/.local/values/mail-dns.json" "${RELAY_VALUES[@]}" --wait --timeout 10m
if [ ${#RELAY_VALUES[@]} -gt 0 ]; then
  kubectl rollout restart deployment/mailu-postfix -n mail
  kubectl rollout status deployment/mailu-postfix -n mail --timeout=3m
fi
python3 "$CLOUD/scripts/mail-accounts.py"
helm upgrade --install gateway "$CLOUD/../local-kubernetes/charts/gateway" -n ingress \
  -f "$CLOUD/values/mail-gateway.yaml" --set serviceType=LoadBalancer \
  --set tls.enabled=true --set consoleBasicAuth.enabled=true --wait
kubectl wait -n ingress gateway/ataimo --for=condition=Programmed --timeout=5m
if [ ${#RELAY_VALUES[@]} -gt 0 ]; then
  echo 'Mail runtime deployed with authenticated SMTP2GO relay. External delivery requires a recipient-side check.'
else
  echo 'Receive-first mail runtime deployed. Outbound remains deferred until an approved SMTP relay is configured.'
fi
