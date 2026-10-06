import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
resolver = subprocess.check_output(['kubectl', 'get', 'service', 'mail-resolver', '-n', 'mail', '-o', 'jsonpath={.spec.clusterIP}'], text=True).strip()
if not resolver or resolver == 'None':
    raise SystemExit('Mail resolver Service is required.')
config = {'nameservers': [resolver], 'searches': ['mail.svc.cluster.local', 'svc.cluster.local', 'cluster.local'],
          'options': [{'name': 'ndots', 'value': '1'}]}
values = {name: {'dnsPolicy': 'None', 'dnsConfig': config} for name in ('admin', 'postfix', 'rspamd', 'webmail')}
path = root / '.local/values/mail-dns.json'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(values, indent=2))
print('Private validating mail DNS configuration rendered.')
