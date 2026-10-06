import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / '.local'
LOCAL.mkdir(mode=0o700, exist_ok=True)
os.umask(0o077)

def az(*args):
    return json.loads(subprocess.check_output(['az', *args, '-o', 'json'], text=True))

def choose_route(requested, names, expected):
    if expected in names:
        return 'brownfield'
    if names:
        raise ValueError('Resource group contains other VMs; refusing a fresh deployment.')
    if requested != 'greenfield':
        raise ValueError('No existing platform VM. Run workflow_dispatch with route greenfield.')
    return 'greenfield'

def prepare():
    group = os.environ.get('AZURE_RESOURCE_GROUP', 'ataimo-platform-rg')
    name = os.environ.get('AZURE_VM_NAME', 'ataimo-platform')
    exists = az('group', 'exists', '--name', group)
    machines = az('vm', 'list', '-g', group) if exists else []
    route = choose_route(os.environ.get('REQUESTED_ROUTE', 'auto'), [vm['name'] for vm in machines], name)
    if route == 'greenfield' and exists:
        resources = az('resource', 'list', '-g', group)
        raise ValueError('The resource group exists without the VM. Restore/import state and investigate before provisioning.')
    config = {
        'domain': 'ataimo.com', 'acme_email': os.environ.get('ACME_EMAIL', 'edemataimo@gmail.com'),
        'dns': {'provider': 'azuredns', 'zone': 'ataimo.com', 'azure': {
            'subscriptionID': os.environ['ARM_SUBSCRIPTION_ID'],
            'resourceGroupName': os.environ.get('AZURE_DNS_RESOURCE_GROUP', 'shared'),
            'managedIdentityClientID': ''}}
    }
    if route == 'brownfield':
        vm = az('vm', 'show', '-g', group, '-n', name, '--show-details')
        identities = vm.get('identity', {}).get('userAssignedIdentities', {})
        identity = next((v for k, v in identities.items() if k.endswith('/' + name + '-dns')), None)
        if not identity:
            raise ValueError('Expected DNS managed identity is missing from the existing VM.')
        public_ip = az('network', 'public-ip', 'show', '-g', group, '-n', name + '-ip')
        config['dns']['azure']['managedIdentityClientID'] = identity['clientId']
        values = {'public_ip': public_ip['ipAddress'], 'vm_fqdn': public_ip['dnsSettings']['fqdn'],
                  'admin_username': vm['osProfile']['adminUsername'], 'resource_group': group,
                  'vm_name': name, 'dns_identity_client_id': identity['clientId']}
        (LOCAL / 'outputs.json').write_text(json.dumps({k: {'value': v} for k, v in values.items()}))
    (LOCAL / 'config.json').write_text(json.dumps(config, indent=2))
    key = os.environ['AZURE_SSH_PRIVATE_KEY']
    (LOCAL / 'ci-ssh-key').write_text(key.rstrip() + '\n')
    subprocess.run(['ssh-keygen', '-y', '-f', str(LOCAL / 'ci-ssh-key')], check=True,
                   stdout=(LOCAL / 'ci-ssh-key.pub').open('w'))
    (LOCAL / 'registry-values.json').write_text(json.dumps({'imagePullSecrets': [{'name': 'dockerhub-pull'}]}))
    with open(os.environ['GITHUB_ENV'], 'a') as output:
        output.write(f'DEPLOY_ROUTE={route}\nSSH_PRIVATE_KEY={LOCAL / "ci-ssh-key"}\n')
    print('Selected deployment route: ' + route)

if __name__ == '__main__':
    prepare()
