#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
export ANSIBLE_COLLECTIONS_PATH="$CLOUD/.local/collections"
export PATH="$CLOUD/.local/venv/bin:$CLOUD/.local/bin:$PATH"
: "${SSH_PRIVATE_KEY:?Set SSH_PRIVATE_KEY to the matching private key path}"
python3 - "$CLOUD" "$SSH_PRIVATE_KEY" <<'PY'
import json, sys
from pathlib import Path
root = Path(sys.argv[1]); outputs = json.loads((root / '.local/outputs.json').read_text())
node = {'ansible_host': outputs['public_ip']['value'], 'vm_fqdn': outputs['vm_fqdn']['value'],
        'ansible_user': outputs['admin_username']['value'], 'ansible_ssh_private_key_file': str(Path(sys.argv[2]).expanduser()),
        'ansible_ssh_common_args': '-o StrictHostKeyChecking=yes -o UserKnownHostsFile=' + str(root / '.local/known_hosts')}
(root / '.local/inventory.json').write_text(json.dumps({'all': {'children': {'k3s': {'hosts': {'ataimo': node}}}}}))
(root / '.local/inventory.json').chmod(0o600)
PY
EXTRA_VARS=()
if [ -n "${NODE_CONFIG_ARCHIVE:-}" ]; then
  test -f "$NODE_CONFIG_ARCHIVE"
  EXTRA_VARS=(--extra-vars "$(python3 -c 'import json,os; print(json.dumps({"node_config_archive": os.path.abspath(os.environ["NODE_CONFIG_ARCHIVE"])}))')")
fi
ansible-playbook -i "$CLOUD/.local/inventory.json" "$CLOUD/ansible/provision.yml" "${EXTRA_VARS[@]}"
python3 - "$CLOUD" <<'PY'
import json, sys, yaml
from pathlib import Path
root = Path(sys.argv[1]); outputs = json.loads((root / '.local/outputs.json').read_text())
data = yaml.safe_load((root / '.local/kubeconfig.raw').read_text())
for cluster in data['clusters']:
    cluster['name'] = 'ataimo-azure'
    cluster['cluster']['server'] = 'https://' + outputs['public_ip']['value'] + ':6443'
for user in data['users']:
    user['name'] = 'ataimo-azure-admin'
for context in data['contexts']:
    context['name'] = 'ataimo-azure'
    context['context'].update(cluster='ataimo-azure', user='ataimo-azure-admin')
data['current-context'] = 'ataimo-azure'
path = root / '.local/kubeconfig'
path.write_text(yaml.safe_dump(data)); path.chmod(0o600)
print('Separate Azure kubeconfig saved; local Kind configuration preserved.')
PY
