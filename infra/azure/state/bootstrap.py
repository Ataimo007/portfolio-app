import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'
LOCAL.mkdir(exist_ok=True, mode=0o700)
os.umask(0o077)

def az(*args):
    result = subprocess.run(['az', *args, '-o', 'json'], check=True, capture_output=True, text=True)
    return json.loads(result.stdout) if result.stdout.strip() else None

account = az('account', 'show')
principal = az('ad', 'signed-in-user', 'show')['id']
group = 'ataimo-terraform-rg'
name = 'ataimotfstate'
existing = az('storage', 'account', 'list', '-g', group) if az('group', 'exists', '--name', group) else []
matching = [v for v in existing if v.get('tags', {}).get('purpose') == 'terraform-state' and v['name'].startswith(name)]
if len(matching) > 1:
    raise SystemExit('Multiple state accounts found; select one explicitly before proceeding.')
if matching:
    name = matching[0]['name']
elif not az('storage', 'account', 'check-name', '--name', name)['nameAvailable']:
    name += hashlib.sha256(account['id'].encode()).hexdigest()[:8]
    if not az('storage', 'account', 'check-name', '--name', name)['nameAvailable']:
        raise SystemExit('Chosen storage name is unavailable; refusing reuse.')
az('group', 'create', '-n', group, '-l', 'westeurope', '--tags', 'application=ataimo-portfolio', 'purpose=terraform-state')
print('State resource group ready.', flush=True)
storage = az('storage', 'account', 'create', '-g', group, '-n', name, '-l', 'westeurope',
             '--sku', 'Standard_LRS', '--kind', 'StorageV2', '--https-only', 'true',
             '--min-tls-version', 'TLS1_2', '--allow-blob-public-access', 'false',
             '--allow-shared-key-access', 'false', '--tags', 'application=ataimo-portfolio', 'purpose=terraform-state')
print('Private state storage account ready: ' + name, flush=True)
az('storage', 'account', 'blob-service-properties', 'update', '-g', group, '-n', name,
   '--enable-versioning', 'true', '--enable-delete-retention', 'true', '--delete-retention-days', '30',
   '--enable-container-delete-retention', 'true', '--container-delete-retention-days', '30')
roles = az('role', 'assignment', 'list', '--assignee', principal, '--scope', storage['id'])
if not any(v['roleDefinitionName'] == 'Storage Blob Data Contributor' for v in roles):
    az('role', 'assignment', 'create', '--assignee-object-id', principal, '--assignee-principal-type', 'User',
       '--role', 'Storage Blob Data Contributor', '--scope', storage['id'])
az('storage', 'container-rm', 'create', '--resource-group', group, '--storage-account', name, '--name', 'tfstate', '--public-access', 'off')
config = {'resource_group_name': group, 'storage_account_name': name, 'container_name': 'tfstate',
          'key': 'ataimo-platform.tfstate', 'subscription_id': account['id'], 'tenant_id': account['tenantId'],
          'use_azuread_auth': True, 'use_cli': True, 'use_oidc': False}
(LOCAL / 'state-backend.json').write_text(json.dumps(config, indent=2))
print('Versioning, 30-day recovery and administrator data role configured. Backend settings saved privately.', flush=True)
