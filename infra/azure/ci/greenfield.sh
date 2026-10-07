#!/usr/bin/env bash
set -euo pipefail
umask 077
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
: "${TF_STATE_RESOURCE_GROUP:?Configure remote state}"
: "${TF_STATE_STORAGE_ACCOUNT:?Configure remote state}"
: "${TF_STATE_CONTAINER:?Configure remote state}"
export TF_VAR_subscription_id="$ARM_SUBSCRIPTION_ID"
export TF_VAR_location="${AZURE_LOCATION:-westeurope}"
export TF_VAR_name="${AZURE_VM_NAME:-ataimo-platform}"
export TF_VAR_dns_label="${AZURE_DNS_LABEL:-ataimo-platform}"
export TF_VAR_vm_size="${AZURE_VM_SIZE:-Standard_D2as_v5}"
export TF_VAR_admin_cidrs="${AZURE_ADMIN_CIDRS:-[\"0.0.0.0/0\"]}"
export TF_VAR_ssh_public_key_path="$CLOUD/.local/ci-ssh-key.pub"
export TF_VAR_azure_dns_zone_id="/subscriptions/$ARM_SUBSCRIPTION_ID/resourceGroups/${AZURE_DNS_RESOURCE_GROUP:-shared}/providers/Microsoft.Network/dnszones/ataimo.com"
export TF_VAR_mail_enabled="${MAIL_ENABLED:-true}"
terraform -chdir="$CLOUD/terraform" init -input=false \
  -backend-config="resource_group_name=$TF_STATE_RESOURCE_GROUP" \
  -backend-config="storage_account_name=$TF_STATE_STORAGE_ACCOUNT" \
  -backend-config="container_name=$TF_STATE_CONTAINER" \
  -backend-config="key=${TF_STATE_KEY:-ataimo-platform.tfstate}" \
  -backend-config=use_oidc=true -backend-config=use_azuread_auth=true
terraform -chdir="$CLOUD/terraform" validate
if [ -n "$(terraform -chdir="$CLOUD/terraform" state list)" ]; then
  echo 'Remote state already manages resources but the VM is missing. Restore/reconcile state before fresh deployment.' >&2
  exit 1
fi
terraform -chdir="$CLOUD/terraform" plan -input=false -out="$CLOUD/.local/ci.tfplan"
terraform -chdir="$CLOUD/terraform" show -json "$CLOUD/.local/ci.tfplan" > "$CLOUD/.local/ci-plan.json"
python3 "$CLOUD/ci/check-plan.py" "$CLOUD/.local/ci-plan.json"
terraform -chdir="$CLOUD/terraform" apply -input=false "$CLOUD/.local/ci.tfplan"
terraform -chdir="$CLOUD/terraform" output -json > "$CLOUD/.local/outputs.json"
python3 - "$CLOUD" <<'PY'
import json,sys
from pathlib import Path
root=Path(sys.argv[1]);config=json.loads((root/'.local/config.json').read_text())
config['dns']['azure']['managedIdentityClientID']=json.loads((root/'.local/outputs.json').read_text())['dns_identity_client_id']['value']
(root/'.local/config.json').write_text(json.dumps(config))
PY
