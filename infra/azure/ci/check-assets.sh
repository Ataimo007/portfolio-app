#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
for file in infra/azure/ci/*.sh infra/azure/scripts/deploy-stack.sh; do bash -n "$file"; done
python3 -m unittest discover -s tests/infra -p 'test_*.py'
helm lint infra/local-kubernetes/charts/service
helm lint infra/local-kubernetes/charts/portal-jobs
helm template portfolio infra/local-kubernetes/charts/service --set-string image=docker.io/example/portfolio:ci --set 'imagePullSecrets[0].name=dockerhub-pull' >/dev/null
helm template portal-jobs infra/local-kubernetes/charts/portal-jobs --set-string image=docker.io/example/portfolio:ci --set-string workerImage=docker.io/example/worker:ci --set 'imagePullSecrets[0].name=dockerhub-pull' >/dev/null
ansible-playbook -i localhost, infra/azure/ansible/deploy-registry.yml --syntax-check
