import json
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[1]
outputs = json.loads((root / '.local/outputs.json').read_text())
ip = outputs['public_ip']['value']
result = subprocess.check_output([
    'az', 'vm', 'run-command', 'invoke', '--resource-group', outputs['resource_group']['value'],
    '--name', outputs['vm_name']['value'], '--command-id', 'RunShellScript',
    '--scripts', 'cat /etc/ssh/ssh_host_ed25519_key.pub', '--output', 'json',
], text=True)
trusted = set(re.findall(r'ssh-ed25519\s+([A-Za-z0-9+/=]+)', result))
if len(trusted) != 1:
    raise SystemExit('Could not obtain one trusted host key through Azure Run Command.')
scan = subprocess.run(['ssh-keyscan', '-T', '10', '-t', 'ed25519', ip], capture_output=True, text=True, timeout=30, check=True)
lines = [line for line in scan.stdout.splitlines() if len(line.split()) == 3 and line.split()[1] == 'ssh-ed25519' and line.split()[2] in trusted]
if not lines:
    raise SystemExit('SSH host key does not match the key returned by Azure. Connection refused.')
path = root / '.local/known_hosts'
path.write_text('\n'.join(lines) + '\n'); path.chmod(0o600)
print('SSH host key verified against authenticated Azure Run Command.')
