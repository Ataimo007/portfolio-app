#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
: "${WORKER_IMAGE:?Supply the immutable worker image containing the identity mail guard}"
python3 "$ROOT/infra/azure/scripts/configure-registration-protection.py"
helm upgrade --install identity-theme "$ROOT/infra/local-kubernetes/charts/identity-theme" -n identity --set-string portfolioUrl=https://ataimo.com --wait
REVISION="$(find "$ROOT/infra/local-kubernetes/charts/identity-theme/files" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d ' ' -f1)"
GUARD_REVISION="$(kubectl get secret identity-mail-guard -n identity -o json | python3 -c 'import sys,json,hashlib; print(hashlib.sha256(json.dumps(json.load(sys.stdin)["data"],sort_keys=True).encode()).hexdigest())')"
PULL=()
if kubectl get secret dockerhub-pull -n identity >/dev/null 2>&1; then PULL=(--set 'imagePullSecrets[0].name=dockerhub-pull'); fi
helm upgrade keycloak "$ROOT/infra/local-kubernetes/charts/service" -n identity --reuse-values \
 --set identityMailGuard.enabled=true --set-string identityMailGuard.image="$WORKER_IMAGE" \
 --set-string identityMailGuard.revision="$GUARD_REVISION" \
 --set-string themeRevision="$REVISION" "${PULL[@]}" --wait --timeout 10m
SITE_URL=https://ataimo.com python3 "$ROOT/infra/local-kubernetes/scripts/sync-keycloak.py"
